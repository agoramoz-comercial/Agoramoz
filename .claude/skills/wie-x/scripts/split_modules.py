#!/usr/bin/env python3
"""Split WIE-X-v4.0-MASTER.md into modules/MNN-<slug>.md for progressive context loading (Module 09).

The master file stays the canonical source; this script regenerates modules/ verbatim.
Usage: python3 scripts/split_modules.py   (run from the wie-x/ folder or anywhere)
"""
import re, sys, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
MASTER = ROOT / "WIE-X-v4.0-MASTER.md"
OUT = ROOT / "modules"

def slug(s):
    s = s.lower().replace("&", "and")
    s = re.sub(r"\(.*?\)", "", s)
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")[:60]

def main():
    text = MASTER.read_text(encoding="utf-8")
    parts = re.split(r"(?m)^(## MODULE (\d\d) — (.+))$", text)
    OUT.mkdir(exist_ok=True)
    for f in OUT.glob("M*.md"):
        f.unlink()
    n = 0
    for i in range(1, len(parts), 4):
        heading, num, title, body = parts[i], parts[i + 1], parts[i + 2], parts[i + 3]
        body = re.sub(r"\n---\s*$", "\n", body.rstrip() + "\n")
        content = (f"<!-- Generated from WIE-X-v4.0-MASTER.md by scripts/split_modules.py — edit the master, not this file. -->\n"
                   f"{heading}\n{body}")
        (OUT / f"M{num}-{slug(title)}.md").write_text(content, encoding="utf-8")
        n += 1
    print(f"{n} modules written to {OUT}")
    return 0 if n == 40 else 1

if __name__ == "__main__":
    sys.exit(main())
