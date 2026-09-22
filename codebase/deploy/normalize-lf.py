#!/usr/bin/env python3
"""Normalize shell/PM2 config files to LF (run before zipping on Windows)."""
from __future__ import annotations

import os
import sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
EXTS = {".sh", ".bash", ".cjs"}
EXTRA = {"deploy.sh"}


def normalize_file(path: str) -> bool:
    with open(path, "rb") as fh:
        data = fh.read()
    converted = data.replace(b"\r\n", b"\n").replace(b"\r", b"\n")
    if converted == data:
        return False
    with open(path, "wb") as fh:
        fh.write(converted)
    return True


def main() -> int:
    target = sys.argv[1] if len(sys.argv) > 1 else ROOT
    changed = 0
    for dirpath, _, files in os.walk(target):
        for name in files:
            _, ext = os.path.splitext(name)
            if ext.lower() not in EXTS and name not in EXTRA:
                continue
            path = os.path.join(dirpath, name)
            if normalize_file(path):
                changed += 1
                print(path)
    print(f"converted {changed} file(s) to LF", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
