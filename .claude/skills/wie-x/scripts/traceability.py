#!/usr/bin/env python3
"""Requirements traceability & verification check (Modules 04.4, 25, 26).

Reads .wie-x/REQUIREMENTS.md, TASKS.md and QA.md and verifies the chain
REQ → Task → Test → Result for every Mandatory/Important requirement.

Exit code: 0 = all Mandatory requirements traced and verified; 1 = gaps (gate not passed); 2 = files missing.

Usage: python3 scripts/traceability.py [--dir /path/to/project] [--strict]
  --strict also fails on Important requirements lacking verification.
"""
import argparse, pathlib, sys
from _common import find_table, ids

PASS = ("TESTED AND PASSED", "VERIFIED BY INSPECTION", "VERIFIED BY AUTOMATED TEST", "VERIFIED BY EXTERNAL EVIDENCE")
FAIL = ("TESTED AND FAILED",)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dir", default=".")
    ap.add_argument("--strict", action="store_true")
    a = ap.parse_args()
    d = pathlib.Path(a.dir).resolve() / ".wie-x"
    try:
        req = find_table((d / "REQUIREMENTS.md").read_text(encoding="utf-8"), ["ID", "Requirement", "Type"])
        tasks = find_table((d / "TASKS.md").read_text(encoding="utf-8"), ["ID", "Requirements", "Status"])
        qa = find_table((d / "QA.md").read_text(encoding="utf-8"), ["Test ID", "Requirement", "Status"])
    except FileNotFoundError as e:
        print(f"Missing state file: {e.filename}"); return 2

    tasks_by_req, tests_by_req = {}, {}
    for t in tasks:
        for r in ids(t.get("Requirements"), "REQ"):
            tasks_by_req.setdefault(r, []).append((t["ID"], t.get("Status", "")))
    for q in qa:
        for r in ids(q.get("Requirement"), "REQ"):
            tests_by_req.setdefault(r, []).append((q["Test ID"], q.get("Status", "").upper()))

    gaps = 0
    print("| REQ | Type | Tasks | Tests | Result |\n|---|---|---|---|---|")
    for r in req:
        rid, typ = r.get("ID", ""), r.get("Type", "").strip().lower()
        if not rid.startswith("REQ-") or typ in ("out of scope", "future"):
            continue
        tk = tasks_by_req.get(rid, []); ts = tests_by_req.get(rid, [])
        passed = any(s.startswith(PASS) for _, s in ts)
        failed = any(s.startswith(FAIL) for _, s in ts)
        if not tk: res = "NO TASK"
        elif not ts: res = "NO TEST"
        elif failed and not passed: res = "FAILED"
        elif passed: res = "VERIFIED"
        else: res = "NOT VERIFIED"
        blocking = typ == "mandatory" or (a.strict and typ == "important")
        if res != "VERIFIED" and blocking:
            gaps += 1; res = "✗ " + res
        tasks_txt = ", ".join(x for x, _ in tk) or "—"
        tests_txt = ", ".join("%s (%s)" % (x, s or "") for x, s in ts) or "—"
        print(f"| {rid} | {r.get('Type', '')} | {tasks_txt} | {tests_txt} | {res} |")
    orphans = sorted(set(tests_by_req) - {r.get("ID") for r in req})
    if orphans:
        print(f"\nWarning: tests reference unknown requirements: {', '.join(orphans)}")
    print(f"\n{'GATE PASSED' if gaps == 0 else f'GATE NOT PASSED — {gaps} blocking gap(s)'} (requirements → tasks → tests → result)")
    return 0 if gaps == 0 else 1

if __name__ == "__main__":
    sys.exit(main())
