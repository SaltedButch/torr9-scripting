#!/usr/bin/env python3

from __future__ import annotations

import argparse
import shutil
import subprocess
import sys
from pathlib import Path

from build_userscripts import BuildError, discover_scripts, load_config


def parse_arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Validate userscript JavaScript syntax with node --check."
    )
    parser.add_argument(
        "--script",
        action="append",
        dest="scripts",
        help="Validate only one specific script id. Can be provided multiple times.",
    )
    parser.add_argument(
        "--node-bin",
        default="node",
        help="Node.js binary to use. Default: node.",
    )
    return parser.parse_args()


def validate_script_syntax(node_bin: str, source_path: Path) -> None:
    result = subprocess.run(
        [node_bin, "--check", str(source_path)],
        capture_output=True,
        text=True,
        check=False,
    )
    if result.returncode != 0:
        error_output = (result.stderr or result.stdout).strip() or "unknown syntax error"
        raise BuildError(f"{source_path}: JavaScript syntax check failed\n{error_output}")


def main() -> int:
    args = parse_arguments()

    try:
        if shutil.which(args.node_bin) is None:
            raise BuildError(
                f"Node.js binary '{args.node_bin}' was not found. Install Node.js to run syntax checks."
            )

        config = load_config()
        selected_scripts = set(args.scripts or []) or None
        scripts = discover_scripts(config, selected_scripts)

        for script in scripts:
            validate_script_syntax(args.node_bin, script.source_path)
            print(f"syntax ok {script.script_id}")

        return 0
    except BuildError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
