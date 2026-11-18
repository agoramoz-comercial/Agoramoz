#!/usr/bin/env python3
"""Initialise the .wie-x/ project state folder (Module 10.2) from templates/.

Only the files relevant to the complexity level are created (Module 10.2: "Use only relevant files").
Existing files are NEVER overwritten (Module 17.4 — protect existing work).

Usage:
  python3 scripts/wiex_init.py --name "My Project" --level L3 [--dir /path/to/project] [--domain saas] [--id PRJ-001]
"""
import argparse, datetime, pathlib, re, sys
from _common import ROOT

LEVEL_FILES = {
    "L0": [],
    "L1": ["STATE.md", "TASKS.md"],
    "L2": ["STATE.md", "REQUIREMENTS.md", "IMPLEMENTATION-PLAN.md", "TASKS.md", "DECISIONS.md", "QA.md"],
    "L3": ["STATE.md", "REQUIREMENTS.md", "IMPLEMENTATION-PLAN.md", "MASTER-PROMPT.md", "TASKS.md", "DECISIONS.md",
           "RESEARCH.md", "SECURITY.md", "QA.md", "RETROSPECTIVE.md"],
}
LEVEL_FILES["L4"] = LEVEL_FILES["L3"] + ["TEMPLATE-RECORD.md"]

def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--name", required=True)
    ap.add_argument("--level", default="L2", choices=list(LEVEL_FILES))
    ap.add_argument("--dir", default=".")
    ap.add_argument("--id", default=None)
    ap.add_argument("--domain", default="general")
    ap.add_argument("--with-template-record", action="store_true", help="also create TEMPLATE-RECORD.md")
    a = ap.parse_args()

    files = list(LEVEL_FILES[a.level])
    if a.with_template_record and "TEMPLATE-RECORD.md" not in files:
        files.append("TEMPLATE-RECORD.md")
    if not files:
        print("L0 (direct task): no state files needed (Module 10.2).")
        return 0
    target = pathlib.Path(a.dir).resolve() / ".wie-x"
    target.mkdir(parents=True, exist_ok=True)
    pid = a.id or "PRJ-" + re.sub(r"[^A-Z0-9]+", "-", a.name.upper()).strip("-")[:24]
    subs = {"{{PROJECT_NAME}}": a.name, "{{PROJECT_ID}}": pid, "{{LEVEL}}": a.level,
            "{{DATE}}": datetime.date.today().isoformat(), "{{DOMAIN}}": a.domain.upper()}
    created, kept = [], []
    for f in files:
        dst = target / f
        if dst.exists():
            kept.append(f); continue
        txt = (ROOT / "templates" / f).read_text(encoding="utf-8")
        for k, v in subs.items():
            txt = txt.replace(k, v)
        dst.write_text(txt, encoding="utf-8")
        created.append(f)
    print(f"Project {pid} · level {a.level} · {target}")
    if created: print("  created: " + ", ".join(created))
    if kept: print("  kept existing (not overwritten): " + ", ".join(kept))
    return 0

if __name__ == "__main__":
    sys.exit(main())
