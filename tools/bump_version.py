#!/usr/bin/env python3

from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPTS_DIR = ROOT / "src" / "userscripts"
VERSION_RE = re.compile(r"^(?P<prefix>//\s*@version\s+)(?P<version>\S+)(?P<suffix>.*)$")


def iter_scripts() -> dict[str, Path]:
    scripts: dict[str, Path] = {}
    for source_path in sorted(SCRIPTS_DIR.rglob("*.user.js")):
        script_id = source_path.relative_to(SCRIPTS_DIR).as_posix()[: -len(".user.js")].replace("/", "-")
        scripts[script_id] = source_path
    return scripts


def validate_version(version: str) -> None:
    if not re.fullmatch(r"\d+(?:\.\d+)*", version):
        raise ValueError("Version must use numeric segments like 2.15 or 2.15.1")


def bump_script_version(source_path: Path, next_version: str) -> None:
    source_lines = source_path.read_text(encoding="utf-8").splitlines()
    updated_lines: list[str] = []
    changed = False

    for line in source_lines:
        match = VERSION_RE.match(line)
        if not match:
            updated_lines.append(line)
            continue

        updated_lines.append(f"{match.group('prefix')}{next_version}{match.group('suffix')}")
        changed = True

    if not changed:
        raise RuntimeError(f"{source_path}: missing @version metadata line")

    source_path.write_text("\n".join(updated_lines) + "\n", encoding="utf-8")


def main(argv: list[str]) -> int:
    if len(argv) != 3:
        print("usage: python3 tools/bump_version.py <script-id> <version>", file=sys.stderr)
        return 1

    script_id = argv[1]
    next_version = argv[2]

    try:
        validate_version(next_version)
        scripts = iter_scripts()
        if script_id not in scripts:
            available = ", ".join(sorted(scripts)) or "none"
            raise RuntimeError(f"Unknown script id '{script_id}'. Available ids: {available}")

        bump_script_version(scripts[script_id], next_version)
        print(f"updated {script_id} to v{next_version}")
        return 0
    except (RuntimeError, ValueError) as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
