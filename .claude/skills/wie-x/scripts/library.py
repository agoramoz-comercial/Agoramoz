#!/usr/bin/env python3
"""WIE-X Project Template Library (Modules 29, 30, 31).

Commands:
  add <path>                 Add a template package (folder containing TEMPLATE-RECORD.md, or the file itself).
                             Scans for secrets first and refuses if any are found (Module 29.5 / 18.4).
                             Never overwrites a stored version (Module 29.7): a new version keeps the old one in history/.
  search "<query>" [--min-status Q1] [--top 5]
                             Mandatory search before planning a substantial project (Module 30.1).
  list                       List all templates with status.
  status <template_id> <Q0|Q1|Q2|Q3|Q4|REJECTED|ARCHIVED> [--score N] [--critical N] [--approved-by NAME]
                             Change qualification. Q4 requires score >= 90, zero critical failures and an approver.
  reuse-plan <template_id>   Print the Module 30.3 reuse assessment skeleton for a new project.

Library location: <wie-x>/library (override with --lib PATH or WIEX_LIBRARY env var).
"""
import argparse, datetime, json, os, pathlib, re, shutil, sys
from _common import ROOT, front_matter

ORDER = ["Q0", "Q1", "Q2", "Q3", "Q4"]
ALL_STATUS = ORDER + ["REJECTED", "ARCHIVED"]
SECRET_PATTERNS = [
    (r"AKIA[0-9A-Z]{16}", "AWS access key"),
    (r"-----BEGIN [A-Z ]*PRIVATE KEY-----", "private key"),
    (r"\bsk-[A-Za-z0-9_\-]{20,}", "API secret key (sk-…)"),
    (r"\bgh[pousr]_[A-Za-z0-9]{30,}", "GitHub token"),
    (r"\bxox[abpr]-[A-Za-z0-9\-]{10,}", "Slack token"),
    (r"AIza[0-9A-Za-z_\-]{35}", "Google API key"),
    (r"(?i)\b(password|passwd|secret|api[_-]?key|token)\s*[:=]\s*['\"]?[^\s'\"<>{}]{8,}", "credential assignment"),
    (r"(?i)postgres(ql)?://[^\s:]+:[^\s@]+@", "database URL with password"),
]

def lib_dir(a):
    p = pathlib.Path(a.lib or os.environ.get("WIEX_LIBRARY") or ROOT / "library")
    (p / "templates").mkdir(parents=True, exist_ok=True)
    return p

def load_index(lib):
    f = lib / "index.json"
    return json.loads(f.read_text(encoding="utf-8")) if f.exists() else {"templates": {}}

def save_index(lib, idx):
    (lib / "index.json").write_text(json.dumps(idx, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

def scan_secrets(folder):
    hits = []
    for f in folder.rglob("*"):
        if f.is_file() and f.stat().st_size < 2_000_000:
            try: txt = f.read_text(encoding="utf-8")
            except Exception: continue  # noqa: E722
            for pat, label in SECRET_PATTERNS:
                for m in re.finditer(pat, txt):
                    line = txt.count("\n", 0, m.start()) + 1
                    hits.append(f"{f.name}:{line} — {label}")
    return hits

def tokens(s):
    if isinstance(s, list): s = " ".join(s)
    return {t for t in re.findall(r"[a-z0-9áéíóúãõç\+\#\.]{2,}", (s or "").lower())}

def cmd_add(a):
    lib = lib_dir(a); src = pathlib.Path(a.path).resolve()
    folder = src if src.is_dir() else src.parent
    rec = folder / "TEMPLATE-RECORD.md"
    if not rec.exists():
        print("TEMPLATE-RECORD.md not found"); return 2
    hits = scan_secrets(folder)
    if hits:
        print("REFUSED — possible secrets found (remove them first, Module 29.5):\n  " + "\n  ".join(hits)); return 1
    meta = front_matter(rec.read_text(encoding="utf-8"))
    tid, ver, status = meta.get("template_id"), meta.get("version", "1.0.0"), meta.get("status", "Q0")
    if not tid or "{{" in tid:
        print("template_id missing in front matter"); return 2
    if status not in ALL_STATUS:
        print(f"invalid status {status}"); return 2
    if status == "Q4" and not _q4_ok(meta):
        print("REFUSED — Q4 requires score >= 90, critical_failures = 0 and approved_by (Module 29.3/31)."); return 1
    idx = load_index(lib); dst = lib / "templates" / tid
    cur = idx["templates"].get(tid)
    if cur and cur["version"] == ver:
        print(f"REFUSED — {tid} v{ver} already stored. Bump the version (Module 29.7: never overwrite)."); return 1
    if dst.exists():
        hist = dst / "history" / cur["version"]
        hist.mkdir(parents=True, exist_ok=True)
        for f in dst.iterdir():
            if f.name != "history": shutil.move(str(f), hist / f.name)
    else:
        dst.mkdir(parents=True)
    for f in folder.iterdir():
        if f.is_file(): shutil.copy2(f, dst / f.name)
        elif f.is_dir() and f.name != "history": shutil.copytree(f, dst / f.name, dirs_exist_ok=True)
    body = rec.read_text(encoding="utf-8")
    idx["templates"][tid] = {
        "name": meta.get("name", tid), "category": meta.get("category", ""), "tags": meta.get("tags", []),
        "stack": meta.get("stack", []), "version": ver, "status": status,
        "score": meta.get("score") or None, "critical_failures": int(meta.get("critical_failures") or 0),
        "approved_by": meta.get("approved_by") or None, "last_review": meta.get("last_review"),
        "summary": " ".join(body.split("## Origin")[-1].split()[:80]) if "## Origin" in body else "",
        "path": f"templates/{tid}", "history": (cur or {}).get("history", []) + ([cur["version"]] if cur else []),
    }
    save_index(lib, idx)
    print(f"Stored {tid} v{ver} [{status}] in {dst}" + (f" (previous v{cur['version']} kept in history/)" if cur else ""))
    return 0

def _q4_ok(meta):
    try: score = float(meta.get("score") or 0)
    except ValueError: score = 0
    return score >= 90 and int(meta.get("critical_failures") or 0) == 0 and bool(meta.get("approved_by"))

def cmd_search(a):
    idx = load_index(lib_dir(a)); q = tokens(a.query)
    minrank = ORDER.index(a.min_status) if a.min_status in ORDER else 0
    res = []
    for tid, t in idx["templates"].items():
        if t["status"] in ("REJECTED",): continue
        if t["status"] in ORDER and ORDER.index(t["status"]) < minrank: continue
        fields = {"tags": 3, "category": 3, "stack": 2, "name": 2, "summary": 1}
        score = sum(w * len(q & tokens(t.get(f))) for f, w in fields.items())
        if score: res.append((score, tid, t))
    res.sort(key=lambda x: (-x[0], x[1]))
    if not res:
        print("No matching templates. Proceed with a fresh plan (record the search in STATE.md)."); return 0
    print("| Relevance | Template | Status | Version | Category | Tags |\n|---|---|---|---|---|---|")
    for s, tid, t in res[: a.top]:
        flag = " (archived)" if t["status"] == "ARCHIVED" else ""
        print(f"| {s} | {tid} — {t['name']}{flag} | {t['status']} | {t['version']} | {t['category']} | {', '.join(t['tags'])} |")
    print("\nNext: run `reuse-plan <id>` and assess REUSE / ADAPT / REPLACE / REVALIDATE / DO NOT REUSE (Module 30.3).")
    return 0

def cmd_list(a):
    idx = load_index(lib_dir(a))
    if not idx["templates"]:
        print("Library is empty."); return 0
    print("| Template | Name | Status | Version | Score |\n|---|---|---|---|---|")
    for tid, t in sorted(idx["templates"].items()):
        print(f"| {tid} | {t['name']} | {t['status']} | {t['version']} | {t.get('score') or '—'} |")
    return 0

def cmd_status(a):
    lib = lib_dir(a); idx = load_index(lib); t = idx["templates"].get(a.template_id)
    if not t: print("unknown template"); return 2
    if a.new_status not in ALL_STATUS: print("invalid status"); return 2
    if a.score is not None: t["score"] = a.score
    if a.critical is not None: t["critical_failures"] = a.critical
    if a.approved_by: t["approved_by"] = a.approved_by
    if a.new_status == "Q4" and not _q4_ok({"score": t.get("score"), "critical_failures": t.get("critical_failures"), "approved_by": t.get("approved_by")}):
        print("REFUSED — Q4 requires score >= 90, zero critical failures and an approver."); return 1
    old = t["status"]; t["status"] = a.new_status; t["last_review"] = datetime.date.today().isoformat()
    save_index(lib, idx)
    print(f"{a.template_id}: {old} → {a.new_status}")
    return 0

def cmd_reuse(a):
    idx = load_index(lib_dir(a)); t = idx["templates"].get(a.template_id)
    if not t: print("unknown template"); return 2
    print(f"# Reuse assessment — {a.template_id} v{t['version']} [{t['status']}]\n")
    print("> Module 30.4: never assume architecture, technologies, dependencies, security, requirements or prompts still fit.\n")
    print("| Element | Decision (REUSE / ADAPT / REPLACE / REVALIDATE / DO NOT REUSE) | Evidence | Action |\n|---|---|---|---|")
    for e in ["Requirements", "Implementation blueprint", "Architecture", "Technology stack: " + ", ".join(t.get("stack") or []),
              "Master prompt", "Specialist prompts", "Component patterns", "Integrations", "Data model",
              "Security decisions", "Configuration / deployment", "Test cases", "Platform adapters"]:
        print(f"| {e} | | | |")
    if t["status"] in ("Q0", "Q1"):
        print("\nWarning: template is not verified (status " + t["status"] + ") — treat every element as REVALIDATE.")
    return 0

def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--lib")
    sp = ap.add_subparsers(dest="cmd", required=True)
    p = sp.add_parser("add"); p.add_argument("path"); p.set_defaults(f=cmd_add)
    p = sp.add_parser("search"); p.add_argument("query"); p.add_argument("--min-status", default="Q0"); p.add_argument("--top", type=int, default=5); p.set_defaults(f=cmd_search)
    p = sp.add_parser("list"); p.set_defaults(f=cmd_list)
    p = sp.add_parser("status"); p.add_argument("template_id"); p.add_argument("new_status"); p.add_argument("--score", type=float); p.add_argument("--critical", type=int); p.add_argument("--approved-by"); p.set_defaults(f=cmd_status)
    p = sp.add_parser("reuse-plan"); p.add_argument("template_id"); p.set_defaults(f=cmd_reuse)
    a = ap.parse_args()
    return a.f(a)

if __name__ == "__main__":
    sys.exit(main())
