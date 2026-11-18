#!/usr/bin/env python3
"""ZCE Context Assembly (CODEFORGE §7) — build a task-specific, layered context package for one model call.

  python3 context_pack.py --task T-001 [--dir project] [--budget 12000] [--out ctx.md] [--switch]

§18.3: identifies layers, retrieves information, reports version conflicts (files changed since the last package for this task),
preserves constraints, excludes unrelated history, lists missing information, and records the package version + source references.
--switch adds what §17.6 requires on model switching: known limitations and outstanding blockers.

Layers: C0 core · C1 project · C2 requirements · C3 task · C4 technical (files, contracts) · C5 evidence · C6 history.
C0, C2 and C3 are canonical and NEVER truncated (§7.3); C4–C6/C1 are trimmed to the token budget.
Token counts are ESTIMATES (≈ chars / 4) — the provider's reported usage is the real number (§7.4).
The package ends with a constraint check proving every acceptance criterion is present.
"""
import argparse, hashlib, json, pathlib, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
est = lambda s: max(1, len(s) // 4)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--task", required=True); ap.add_argument("--dir", default="."); ap.add_argument("--budget", type=int, default=12000)
    ap.add_argument("--out"); ap.add_argument("--max-file-chars", type=int, default=12000); ap.add_argument("--switch", action="store_true")
    a = ap.parse_args()
    base = pathlib.Path(a.dir).resolve()
    sys.path.insert(0, str(ROOT / "scripts"))
    import cf
    r = cf.load(type("A", (), {"dir": str(base)})())
    t = r["tasks"].get(a.task)
    if not t:
        print(f"unknown task {a.task}"); return 2
    comps = {k: r["components"][k] for k in t["components"] if k in r["components"]}
    reqs = set(t["requirements"]) | {q for c in comps.values() for q in c["requirements"]}
    L = {}
    L["C0"] = (ROOT / "templates" / "C0-core.md").read_text(encoding="utf-8")
    L["C2"] = "# C2 — Requirements (canonical)\n" + "\n".join(
        f"- **{q}** ({r['requirements'][q]['type']}{', CRITICAL' if r['requirements'][q]['critical'] else ''}): {r['requirements'][q]['text']}\n"
        + "".join(f"  - AC: {ac}\n" for ac in r["requirements"][q]["acceptance"]) for q in sorted(reqs) if q in r["requirements"])
    deps = ", ".join(f"{d}={r['tasks'].get(d, {}).get('status', '?')}" for d in t["deps"]) or "none"
    L["C3"] = (f"# C3 — Task {a.task}: {t['title']}\nObjective: {t['objective']}\nExpected output: {t['expected'] or '—'}\n"
               f"Stage: {t['stage']} · attempt {t['attempts']}/{t['budget']} · stop condition: {t['stop']}\nDependencies: {deps}\n"
               "Acceptance criteria:\n" + "".join(f"- {x}\n" for x in t["acceptance"]))
    contracts = []
    for k, c in comps.items():
        contracts.append(f"## {k} {c['name']} ({c['kind']}, {c['status']})\n" + "".join(f"- {f}: {c['contract'].get(f, '—')}\n" for f in cf.CONTRACT_FIELDS)
                         + (("Flow: " + " → ".join(c["flow"]) + "\n") if c["flow"] else ""))
    files_txt, sources, missing_info = [], [], []
    for k, c in comps.items():
        missing_info += [f"{k}: contract field '{g}' undefined" for g in cf.contract_gaps(c)]
        for f in c["files"]:
            p = base / f
            if p.is_file():
                body = p.read_text(encoding="utf-8", errors="ignore")
                sources.append((f, hashlib.sha256(body.encode()).hexdigest()[:12]))
                cut = len(body) > a.max_file_chars
                files_txt.append(f"### {f}{' (truncated)' if cut else ''}\n```\n{cf.redact(body[:a.max_file_chars])}\n```\n")
            else:
                files_txt.append(f"### {f}\n(MISSING FILE — graph/repo mismatch)\n"); missing_info.append(f"{k}: file {f} missing")
    if not comps:
        missing_info.append("task is linked to no component — technical context cannot be assembled")
    open_deps = [d for d in t["deps"] if r["tasks"].get(d, {}).get("status") != "VERIFIED"]
    missing_info += [f"dependency {d} not VERIFIED" for d in open_deps]
    missing_info += [f"test {k} not executed" for k, x in r["tests"].items() if set(x["targets"]) & (reqs | set(comps)) and x["status"] in cf.NOT_RUN]
    prev = None
    evf0 = base / ".codeforge" / "events.jsonl"
    if evf0.exists():
        for line in evf0.read_text(encoding="utf-8").splitlines():
            e = json.loads(line)
            if e.get("kind") == "context" and e.get("task") == a.task and e.get("sources"):
                prev = e
    conflicts = []
    if prev:
        old = dict(prev["sources"])
        conflicts = [f"{f}: changed since package {prev.get('package_id')} ({old[f]} → {h})" for f, h in sources if f in old and old[f] != h]
    L["C4"] = "# C4 — Technical context\n" + "".join(contracts) + "".join(files_txt)
    tests = [(k, x) for k, x in r["tests"].items() if set(x["targets"]) & (reqs | set(comps))]
    ev = []
    evf = base / ".codeforge" / "events.jsonl"
    if evf.exists():
        for line in evf.read_text(encoding="utf-8").splitlines()[-400:]:
            e = json.loads(line)
            if e.get("kind") in ("error", "terminal.end") and (e.get("task") == a.task):
                ev.append(e)
    L["C5"] = "# C5 — Evidence\n" + "".join(f"- {k} [{x['layer']}] {x['name']}: {x['status']} {x['evidence']}\n" for k, x in tests) + \
              "".join(f"- {e['ts']} {e['kind']} exit={e.get('exit', '')} {e.get('command', '')}\n  {str(e.get('message') or e.get('tail', ''))[-400:]}\n" for e in ev[-5:])
    if a.switch:
        lim = [f"{k}: {', '.join(cf.contract_gaps(c))} undefined" for k, c in comps.items() if cf.contract_gaps(c)]
        lim += [f"{s_['id']} [{s_['severity']}] {s_['title']}" for s_ in r["security"] if s_["status"] == "OPEN"]
        lim += [f"{f_['id']} [{f_['severity']}] {f_['area']}" for f_ in r.get("redteam", []) if f_["status"] != "RESOLVED"]
        blk = [f"{k}: {x.get('blocker')}" for k, x in r["tasks"].items() if x.get("status") == "BLOCKED"] + \
              [f"{x['id']} pending approval: {x['action']}" for x in r["pending_approvals"] if x["status"] == "PENDING"]
        L["C3"] += "\nKnown limitations (§17.6):\n" + ("".join(f"- {x}\n" for x in lim) or "- none recorded\n") + \
                   "Outstanding blockers (§17.6):\n" + ("".join(f"- {x}\n" for x in blk) or "- none\n") + \
                   "Decisions:\n" + ("".join(f"- {d.get('id', '')} {d.get('decision', d)}\n" for d in r.get("decisions", [])) or "- none\n")
    L["C6"] = "# C6 — History\n" + "".join(f"- attempt {f['attempt']}: cause={f['cause']} strategy={f['strategy'] or '—'} {f['detail']}\n" for f in t["failures"]) + \
              "".join(f"- decision: {d}\n" for d in r.get("decisions", [])[-5:])
    L["C1"] = f"# C1 — Project\n{r['project']['name']} ({r['project']['id']}) · {r['project']['type']} · complexity {r['project']['complexity']}\nObjective: {r['project']['objective']}\n"
    order = ["C0", "C1", "C2", "C3", "C4", "C5", "C6"]
    mandatory = est(L["C0"] + L["C2"] + L["C3"])
    remaining = a.budget - mandatory
    out, used = {}, {}
    for k in ["C0", "C2", "C3"]:
        out[k] = L[k]
    for k in ["C5", "C6", "C1", "C4"]:
        txt = L[k]
        if est(txt) > max(0, remaining):
            txt = txt[: max(0, remaining) * 4] + "\n…(trimmed to budget — canonical source: .codeforge/record.json)\n" if remaining > 50 else f"# {k} omitted (budget)\n"
        out[k] = txt; remaining -= est(txt)
    pkg = "\n\n".join(out[k] for k in order)
    phash = hashlib.sha256(pkg.encode()).hexdigest()[:12]
    pid = f"CTX-{a.task}-v{r['version']}-{phash}"
    header = (f"<!-- context package {pid} · record v{r['version']} · layers C0–C6 -->\n"
              f"Source references: record .codeforge/record.json v{r['version']}; requirements {', '.join(sorted(reqs)) or '—'}; "
              + (", ".join(f"{f}@sha256:{h}" for f, h in sources) or "no files") + "\n"
              f"Version conflicts: {'; '.join(conflicts) or 'none detected'}\n"
              f"Missing information: {'; '.join(missing_info) or 'none detected'}\n\n")
    pkg = header + pkg
    missing = [ac for ac in t["acceptance"] if ac not in pkg] + [ac for q in reqs if q in r["requirements"] for ac in r["requirements"][q]["acceptance"] if ac not in pkg]
    total = est(pkg)
    pkg += f"\n\n---\nConstraint check: {'all acceptance criteria present' if not missing else 'MISSING: ' + '; '.join(missing)} · estimated tokens ≈ {total} (budget {a.budget})"
    if mandatory > a.budget:
        pkg += f"\n⚠ Canonical layers alone (≈{mandatory}) exceed the budget — they were NOT cut (§7.3). Increase the budget or split the task."
    cf.emit(type("A", (), {"dir": str(base)})(), "context", task=a.task, est_tokens=total, budget=a.budget, layers={k: est(v) for k, v in out.items()},
            package_id=pid, package_hash=phash, sources=sources, missing=len(missing_info), conflicts=len(conflicts))
    if a.out:
        pathlib.Path(a.out).write_text(pkg, encoding="utf-8"); print(f"context package → {a.out} (≈{total} tokens est.)")
    else:
        print(pkg)
    return 0 if not missing else 1


if __name__ == "__main__":
    sys.exit(main())
