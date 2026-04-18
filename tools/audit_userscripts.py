#!/usr/bin/env python3

from __future__ import annotations

import argparse
import re
import sys
from dataclasses import dataclass
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPTS_DIR = ROOT / "src" / "userscripts"
TOP_LEVEL_FUNCTION_RE = re.compile(r"^ {4}(?:async\s+)?function\s+(?P<name>[A-Za-z0-9_]+)\s*\(")


@dataclass(frozen=True)
class ScriptMetrics:
    path: Path
    line_count: int
    inner_html_assignments: int
    document_listeners: int
    window_listeners: int
    local_storage_gets: int
    local_storage_sets: int
    local_storage_removes: int
    fetch_calls: int
    oversized_functions: list[tuple[str, int, int]]
    hardcoded_api_keys: list[tuple[int, str]]


def parse_arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run a lightweight maintainability audit on userscripts.")
    parser.add_argument(
        "--max-file-lines",
        type=int,
        default=10000,
        help="Warn when a userscript exceeds this number of lines. Default: 10000.",
    )
    parser.add_argument(
        "--max-function-lines",
        type=int,
        default=200,
        help="Warn when a top-level function exceeds this number of lines. Default: 200.",
    )
    parser.add_argument(
        "--strict",
        action="store_true",
        help="Exit with status 1 when audit warnings are found.",
    )
    return parser.parse_args()


def iter_scripts() -> list[Path]:
    return sorted(SCRIPTS_DIR.rglob("*.user.js"))


def collect_top_level_functions(lines: list[str], max_function_lines: int) -> list[tuple[str, int, int]]:
    functions: list[tuple[int, str]] = []
    for index, line in enumerate(lines, start=1):
        match = TOP_LEVEL_FUNCTION_RE.match(line)
        if match:
            functions.append((index, match.group("name")))

    oversized_functions: list[tuple[str, int, int]] = []
    for offset, (start_line, name) in enumerate(functions):
        end_line = functions[offset + 1][0] - 1 if offset + 1 < len(functions) else len(lines)
        length = end_line - start_line + 1
        if length > max_function_lines:
            oversized_functions.append((name, start_line, length))

    oversized_functions.sort(key=lambda item: (-item[2], item[1], item[0]))
    return oversized_functions


def collect_hardcoded_api_keys(lines: list[str]) -> list[tuple[int, str]]:
    flagged_keys: list[tuple[int, str]] = []
    for index, line in enumerate(lines, start=1):
        if "_API_KEY" not in line:
            continue

        if re.search(r"""['"][^'"]{16,}['"]""", line):
            flagged_keys.append((index, line.strip()))

    return flagged_keys


def collect_metrics(path: Path, max_function_lines: int) -> ScriptMetrics:
    content = path.read_text(encoding="utf-8")
    lines = content.splitlines()

    return ScriptMetrics(
        path=path.relative_to(ROOT),
        line_count=len(lines),
        inner_html_assignments=len(re.findall(r"\.innerHTML\s*=", content)),
        document_listeners=len(re.findall(r"document\.addEventListener\(", content)),
        window_listeners=len(re.findall(r"window\.addEventListener\(", content)),
        local_storage_gets=len(re.findall(r"localStorage\.getItem\(", content)),
        local_storage_sets=len(re.findall(r"localStorage\.setItem\(", content)),
        local_storage_removes=len(re.findall(r"localStorage\.removeItem\(", content)),
        fetch_calls=len(re.findall(r"\bfetch\(", content)),
        oversized_functions=collect_top_level_functions(lines, max_function_lines),
        hardcoded_api_keys=collect_hardcoded_api_keys(lines),
    )


def format_report(metrics: ScriptMetrics, max_file_lines: int) -> tuple[list[str], int]:
    warnings = 0
    report_lines = [
        f"{metrics.path}",
        f"  lines: {metrics.line_count}",
        "  hotspots:"
        f" innerHTML={metrics.inner_html_assignments},"
        f" documentListeners={metrics.document_listeners},"
        f" windowListeners={metrics.window_listeners},"
        f" localStorage(get/set/remove)="
        f"{metrics.local_storage_gets}/{metrics.local_storage_sets}/{metrics.local_storage_removes},"
        f" fetch={metrics.fetch_calls}",
    ]

    if metrics.line_count > max_file_lines:
        warnings += 1
        report_lines.append(
            f"  warning: file exceeds {max_file_lines} lines ({metrics.line_count})"
        )

    if metrics.oversized_functions:
        warnings += len(metrics.oversized_functions)
        report_lines.append("  warning: oversized top-level functions")
        for name, start_line, length in metrics.oversized_functions[:10]:
            report_lines.append(f"    - {name} @ line {start_line}: {length} lines")

    if metrics.hardcoded_api_keys:
        warnings += len(metrics.hardcoded_api_keys)
        report_lines.append("  warning: hardcoded API key candidates")
        for line_number, source_line in metrics.hardcoded_api_keys[:10]:
            report_lines.append(f"    - line {line_number}: {source_line}")

    return report_lines, warnings


def main() -> int:
    args = parse_arguments()
    script_paths = iter_scripts()

    if not script_paths:
        print(f"error: no userscripts found in {SCRIPTS_DIR}", file=sys.stderr)
        return 1

    total_warnings = 0
    for path in script_paths:
        metrics = collect_metrics(path, args.max_function_lines)
        report_lines, warning_count = format_report(metrics, args.max_file_lines)
        total_warnings += warning_count
        print("\n".join(report_lines))

    if args.strict and total_warnings > 0:
        print(f"audit failed with {total_warnings} warning(s)", file=sys.stderr)
        return 1

    print(f"audit completed with {total_warnings} warning(s)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
