#!/usr/bin/env python3
"""Enterprise Functional Atlas (Part VI §23) — show, search, list, fill and add domains.

  atlas.py list [--group "Finance & Capital"]
  atlas.py show EFA-011
  atlas.py search treasury
  atlas.py fill EFA-011 --field purpose --value "..."   (lists: comma-separated; never invent — document real orgs)
  atlas.py add "Revenue Assurance" --group "Finance & Capital" --modules M06,M10   (expand beyond 100)
"""
import argparse, json, pathlib, sys
F = pathlib.Path(__file__).resolve().parent.parent / "data" / "functional-atlas.json"

def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sp = ap.add_subparsers(dest="cmd", required=True)
    p = sp.add_parser("list"); p.add_argument("--group")
    p = sp.add_parser("show"); p.add_argument("id")
    p = sp.add_parser("search"); p.add_argument("term")
    p = sp.add_parser("fill"); p.add_argument("id"); p.add_argument("--field", required=True); p.add_argument("--value", required=True)
    p = sp.add_parser("add"); p.add_argument("name"); p.add_argument("--group", required=True); p.add_argument("--modules", default="")
    a = ap.parse_args()
    db = json.loads(F.read_text(encoding="utf-8")); D = db["domains"]
    find = lambda i: next((d for d in D if d["domain_id"] == i), None)
    if a.cmd == "list":
        for d in D:
            if not a.group or d["group"] == a.group:
                print(f"{d['domain_id']}  {d['department']:<34} {d['group']}")
    elif a.cmd == "show":
        d = find(a.id); print(json.dumps(d, indent=2, ensure_ascii=False) if d else "not found")
    elif a.cmd == "search":
        t = a.term.lower()
        for d in D:
            if t in json.dumps(d, ensure_ascii=False).lower():
                print(f"{d['domain_id']}  {d['department']} ({d['group']})")
    elif a.cmd == "fill":
        d = find(a.id)
        if not d or a.field not in d or a.field == "domain_id":
            print("unknown domain or field"); return 2
        d[a.field] = [x.strip() for x in a.value.split(",")] if isinstance(d[a.field], list) else a.value
        F.write_text(json.dumps(db, indent=2, ensure_ascii=False), encoding="utf-8"); print(f"{a.id}.{a.field} updated")
    elif a.cmd == "add":
        nid = f"EFA-{len(D) + 1:03d}"
        tmpl = {k: ([] if isinstance(v, list) else "") for k, v in D[0].items()}
        tmpl.update({"domain_id": nid, "department": a.name, "group": a.group,
                     "applicable_modules": [m for m in a.modules.split(",") if m], "seniority_levels": D[0]["seniority_levels"]})
        D.append(tmpl); F.write_text(json.dumps(db, indent=2, ensure_ascii=False), encoding="utf-8"); print(f"{nid} added: {a.name}")
    return 0

if __name__ == "__main__":
    sys.exit(main())
