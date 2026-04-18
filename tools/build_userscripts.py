#!/usr/bin/env python3

from __future__ import annotations

import argparse
import json
import re
import shutil
import sys
from dataclasses import dataclass
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
CONFIG_PATH = ROOT / "userscripts.json"
USER_SCRIPT_RE = re.compile(
    r"(?P<header>^// ==UserScript==\n)(?P<meta>.*?)(?P<footer>^// ==/UserScript==\n?)",
    re.MULTILINE | re.DOTALL,
)
META_LINE_RE = re.compile(r"^//\s*@(?P<key>\S+)\s+(?P<value>.*)$")
DEFAULT_NAMESPACE_VALUES = {
    "",
    "http://tampermonkey.net/",
    "https://tampermonkey.net/",
}
REQUIRED_KEYS = {"name", "version", "description"}
URL_METADATA_KEYS = {"icon", "homepageURL", "supportURL", "updateURL", "downloadURL"}


@dataclass(frozen=True)
class RepoConfig:
    repository: str
    source_branch: str
    publish_branch: str
    scripts_dir: Path
    dist_dir: Path

    @property
    def repo_url(self) -> str:
        return f"https://github.com/{self.repository}"

    @property
    def raw_base_url(self) -> str:
        return f"https://raw.githubusercontent.com/{self.repository}/{self.publish_branch}"


@dataclass(frozen=True)
class ScriptDefinition:
    script_id: str
    source_path: Path
    relative_source_path: Path
    user_dist_path: Path
    meta_dist_path: Path


def load_config() -> RepoConfig:
    if not CONFIG_PATH.exists():
        raise BuildError(f"Missing configuration file: {CONFIG_PATH}")

    raw_config = json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
    repository = str(raw_config.get("repository", "")).strip()
    if "/" not in repository:
        raise BuildError("The 'repository' field must look like 'owner/name'.")

    scripts_dir = ROOT / raw_config.get("scripts_dir", "src/userscripts")
    dist_dir = ROOT / raw_config.get("dist_dir", "dist")

    return RepoConfig(
        repository=repository,
        source_branch=str(raw_config.get("source_branch", "main")).strip() or "main",
        publish_branch=str(raw_config.get("publish_branch", "userscripts")).strip() or "userscripts",
        scripts_dir=scripts_dir,
        dist_dir=dist_dir,
    )


def discover_scripts(config: RepoConfig, selected_scripts: set[str] | None) -> list[ScriptDefinition]:
    if not config.scripts_dir.exists():
        raise BuildError(f"Scripts directory not found: {config.scripts_dir}")

    source_paths = sorted(config.scripts_dir.rglob("*.user.js"))
    if not source_paths:
        raise BuildError(f"No userscripts found in {config.scripts_dir}")

    scripts: list[ScriptDefinition] = []
    for source_path in source_paths:
        relative_source_path = source_path.relative_to(ROOT)
        relative_script_path = source_path.relative_to(config.scripts_dir)
        script_id = relative_script_path.as_posix()[: -len(".user.js")].replace("/", "-")

        if selected_scripts and script_id not in selected_scripts:
            continue

        scripts.append(
            ScriptDefinition(
                script_id=script_id,
                source_path=source_path,
                relative_source_path=relative_source_path,
                user_dist_path=config.dist_dir / f"{script_id}.user.js",
                meta_dist_path=config.dist_dir / f"{script_id}.meta.js",
            )
        )

    if selected_scripts and not scripts:
        available = ", ".join(sorted(get_all_script_ids(config))) or "none"
        missing = ", ".join(sorted(selected_scripts))
        raise BuildError(f"Unknown script id(s): {missing}. Available ids: {available}")

    return scripts


def get_all_script_ids(config: RepoConfig) -> set[str]:
    return {
        source_path.relative_to(config.scripts_dir).as_posix()[: -len(".user.js")].replace("/", "-")
        for source_path in config.scripts_dir.rglob("*.user.js")
    }


def parse_arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build Tampermonkey userscripts for publishing.")
    parser.add_argument("--check", action="store_true", help="Validate scripts without writing dist files.")
    parser.add_argument("--list", action="store_true", help="List discovered script ids and exit.")
    parser.add_argument(
        "--script",
        action="append",
        dest="scripts",
        help="Build only one specific script id. Can be provided multiple times.",
    )
    return parser.parse_args()


def read_metadata_block(content: str, source_path: Path) -> tuple[re.Match[str], list[tuple[str, str, str]]]:
    match = USER_SCRIPT_RE.search(content)
    if not match:
        raise BuildError(f"{source_path}: missing // ==UserScript== metadata block")

    metadata_entries: list[tuple[str, str, str]] = []
    for line in match.group("meta").splitlines():
        meta_match = META_LINE_RE.match(line)
        if meta_match:
            metadata_entries.append(("meta", meta_match.group("key"), meta_match.group("value")))
        else:
            metadata_entries.append(("raw", "", line))

    return match, metadata_entries


def extract_metadata_values(entries: list[tuple[str, str, str]]) -> dict[str, str]:
    values: dict[str, str] = {}
    for entry_type, key, value in entries:
        if entry_type == "meta" and key not in values:
            values[key] = value
    return values


def compute_metadata_overrides(
    config: RepoConfig,
    script: ScriptDefinition,
    current_values: dict[str, str],
) -> dict[str, str]:
    namespace = current_values.get("namespace", "").strip()
    if namespace in DEFAULT_NAMESPACE_VALUES:
        namespace = config.repo_url

    return {
        "namespace": namespace or config.repo_url,
        "homepageURL": f"{config.repo_url}/blob/{config.source_branch}/{script.relative_source_path.as_posix()}",
        "supportURL": f"{config.repo_url}/issues",
        "updateURL": f"{config.raw_base_url}/{script.meta_dist_path.name}",
        "downloadURL": f"{config.raw_base_url}/{script.user_dist_path.name}",
    }


def validate_metadata(values: dict[str, str], source_path: Path) -> None:
    missing_keys = sorted(REQUIRED_KEYS - values.keys())
    if missing_keys:
        missing = ", ".join(missing_keys)
        raise BuildError(f"{source_path}: missing required metadata key(s): {missing}")

    if "match" not in values and "include" not in values:
        raise BuildError(f"{source_path}: at least one @match or @include rule is required")

    version = values.get("version", "").strip()
    if not re.fullmatch(r"\d+(?:\.\d+)*", version):
        raise BuildError(
            f"{source_path}: invalid @version '{version}'. Use numeric segments like 2.15 or 2.15.1."
        )

    for key in sorted(URL_METADATA_KEYS & values.keys()):
        validate_metadata_url(key, values[key], source_path)


def validate_metadata_url(key: str, raw_value: str, source_path: Path) -> None:
    value = raw_value.strip()
    if not value:
        raise BuildError(f"{source_path}: invalid @{key} URL: value is empty")

    if any(char.isspace() for char in value):
        raise BuildError(f"{source_path}: invalid @{key} URL '{value}': whitespace is not allowed")

    if "`" in value:
        raise BuildError(f"{source_path}: invalid @{key} URL '{value}': unexpected backtick")

    parsed = urlparse(value)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        raise BuildError(
            f"{source_path}: invalid @{key} URL '{value}': expected an absolute http(s) URL"
        )


def format_metadata_line(key: str, value: str) -> str:
    return f"// @{key:<12} {value}".rstrip()


def merge_metadata_entries(
    entries: list[tuple[str, str, str]],
    overrides: dict[str, str],
) -> list[str]:
    merged_lines: list[str] = []
    applied_keys: set[str] = set()

    for entry_type, key, value in entries:
        if entry_type == "meta":
            next_value = overrides.get(key, value)
            merged_lines.append(format_metadata_line(key, next_value))
            if key in overrides:
                applied_keys.add(key)
            continue

        merged_lines.append(value)

    ordered_keys = ["namespace", "homepageURL", "supportURL", "updateURL", "downloadURL"]
    for key in ordered_keys:
        if key in overrides and key not in applied_keys:
            merged_lines.append(format_metadata_line(key, overrides[key]))

    return merged_lines


def build_outputs(config: RepoConfig, script: ScriptDefinition) -> dict[str, str]:
    source_content = script.source_path.read_text(encoding="utf-8")
    match, metadata_entries = read_metadata_block(source_content, script.source_path)
    metadata_values = extract_metadata_values(metadata_entries)
    validate_metadata(metadata_values, script.source_path)

    overrides = compute_metadata_overrides(config, script, metadata_values)
    merged_entries = merge_metadata_entries(metadata_entries, overrides)
    metadata_block = "// ==UserScript==\n" + "\n".join(merged_entries) + "\n// ==/UserScript=="
    user_script_content = source_content[: match.start()] + metadata_block + source_content[match.end() :]
    meta_script_content = metadata_block + "\n"

    return {
        "id": script.script_id,
        "name": metadata_values["name"],
        "version": metadata_values["version"],
        "source": script.relative_source_path.as_posix(),
        "user_script": user_script_content,
        "meta_script": meta_script_content,
        "download_url": overrides["downloadURL"],
        "update_url": overrides["updateURL"],
    }


def write_if_changed(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.exists() and path.read_text(encoding="utf-8") == content:
        return
    path.write_text(content, encoding="utf-8")


def write_manifest(config: RepoConfig, builds: list[dict[str, str]]) -> None:
    manifest = {
        "repository": config.repository,
        "source_branch": config.source_branch,
        "publish_branch": config.publish_branch,
        "scripts": [
            {
                "id": build["id"],
                "name": build["name"],
                "version": build["version"],
                "source": build["source"],
                "download_url": build["download_url"],
                "update_url": build["update_url"],
            }
            for build in builds
        ],
    }
    manifest_path = config.dist_dir / "manifest.json"
    write_if_changed(manifest_path, json.dumps(manifest, indent=2, ensure_ascii=False) + "\n")


def clean_dist_dir(config: RepoConfig) -> None:
    if config.dist_dir.exists():
        shutil.rmtree(config.dist_dir)
    config.dist_dir.mkdir(parents=True, exist_ok=True)


def list_scripts(config: RepoConfig) -> int:
    for script_id in sorted(get_all_script_ids(config)):
        print(script_id)
    return 0


def main() -> int:
    args = parse_arguments()

    try:
        config = load_config()
        if args.list:
            return list_scripts(config)

        selected_scripts = set(args.scripts or []) or None
        scripts = discover_scripts(config, selected_scripts)
        builds = [build_outputs(config, script) for script in scripts]

        if args.check:
            for build in builds:
                print(f"validated {build['id']} v{build['version']}")
            return 0

        clean_dist_dir(config)
        for script, build in zip(scripts, builds, strict=True):
            write_if_changed(script.user_dist_path, build["user_script"])
            write_if_changed(script.meta_dist_path, build["meta_script"])
            print(f"built {script.user_dist_path.relative_to(ROOT)}")

        write_manifest(config, builds)
        print(f"built {config.dist_dir.relative_to(ROOT) / 'manifest.json'}")
        return 0
    except BuildError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1


class BuildError(RuntimeError):
    pass


if __name__ == "__main__":
    raise SystemExit(main())
