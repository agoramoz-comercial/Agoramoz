#!/usr/bin/env python3
"""Agentic Organization Factory (CODEFORGE Part III) + Prompt Registry (Part IV §5.4).

Creates departments, agents, skills and prompts as real files with the mandatory fields, and enforces the
qualification lifecycle  DRAFT → GENERATED → TESTING → VERIFIED → REVIEWED → APPROVED → OPERATIONAL  (§4.5).

  factory.py assess "<engineering objective>"                 REUSE / EXTEND / CREATE / COMPOSE recommendation (§4)
  factory.py create dept|agent|skill|prompt NAME [--dept D] [--domain X] [--model M] [--mission "…"]
  factory.py test ITEM --case "…" --result pass|fail --evidence "…"      record a practical test actually run
  factory.py qualify ITEM --scores technical=80,practical=75,…  [--critical-failure "…"]
  factory.py promote ITEM --to STATUS [--by HUMAN]
  factory.py list

Registry: <project>/.codeforge/org/registry.json (override --dir). Files: <project>/.codeforge/org/<kind>s/<ID>.md
"""
import argparse, datetime as dt, json, pathlib, re, sys

FLOW = ["DRAFT", "GENERATED", "TESTING", "VERIFIED", "REVIEWED", "APPROVED", "OPERATIONAL"]
CRITERIA = ["technical", "practical", "evidence", "accuracy", "completeness", "tools", "collaboration", "security", "reliability", "reproducibility"]
PROMPT_SCENARIOS = ["normal execution", "ambiguous requirements", "conflicting instructions", "missing data", "tool failure",
                    "context interruption", "long tasks", "adversarial inputs", "invalid outputs", "model switching"]
SKILL_SCENARIOS = ["normal scenarios", "ambiguous inputs", "missing information", "conflicting requirements", "invalid inputs", "tool failures",
                   "security-sensitive situations", "long-running tasks", "interrupted workflows", "model switching", "regression cases"]   # §16.4
AGENT_MEASURES = ["correctness", "coverage", "code_quality", "test_quality", "security", "documentation", "reliability", "recovery", "tool_use", "reproducibility"]  # §15.7
MIN_TESTS = {"dept": 3, "agent": 3, "skill": len(SKILL_SCENARIOS), "prompt": len(PROMPT_SCENARIOS)}
FIELDS = {   # §15.3 / §15.4 / §16.2 (they extend §4.2–§4.4)
    "dept": ["Department ID", "Name", "Mission", "Scope", "Responsibilities", "Knowledge base", "Agents", "Skills", "Tools", "Permissions", "SOPs",
             "Input and output contracts", "Dependencies", "Evaluation suite", "Quality standards", "Performance metrics", "Documentation", "Governance rules"],
    "agent": ["Unique agent ID", "Role", "Mission", "Technical specialization", "Scope", "Boundaries", "Skills", "Tools", "Permissions",
              "Prohibited actions", "Required inputs", "Expected outputs", "Dependencies", "Acceptance criteria", "Escalation conditions", "Evaluation tests"],
    "skill": ["Skill name", "Unique ID", "Version", "Purpose", "Technical domain", "Trigger conditions", "Required inputs", "Knowledge sources",
              "Operational instructions", "Tools and permissions", "Expected outputs", "Dependencies", "Failure conditions", "Validation rules",
              "Test cases", "Compatibility", "Known limitations", "Maintenance requirements"],
    "prompt": ["Prompt ID", "Target model", "Model capabilities (verified)", "Context constraints", "Output contract", "Tools and permissions",
               "System instructions", "Task instructions", "Verification", "Version", "Change log"],
}
PREFIX = {"dept": "DEPT", "agent": "AGT", "skill": "SKL", "prompt": "PRM"}


def now():
    return dt.datetime.now().isoformat(timespec="seconds")


def reg_path(a):
    d = pathlib.Path(a.dir).resolve() / ".codeforge" / "org"
    d.mkdir(parents=True, exist_ok=True)
    return d


def load(a):
    f = reg_path(a) / "registry.json"
    return json.loads(f.read_text(encoding="utf-8")) if f.exists() else {"items": {}}


def save(a, R):
    (reg_path(a) / "registry.json").write_text(json.dumps(R, indent=2, ensure_ascii=False), encoding="utf-8")


def refuse(msg):
    print(f"REFUSED: {msg}", file=sys.stderr)
    return 2


def words(s):
    return {w for w in re.findall(r"[a-z0-9]{3,}", s.lower()) if w not in {"the", "and", "for", "with", "that", "this", "build", "create"}}


def cmd_assess(a, R):
    obj = words(a.objective)
    depts = [(k, v) for k, v in R["items"].items() if v["kind"] == "dept" and v["status"] not in ("REJECTED",)]
    scored = sorted(((len(obj & words(v["name"] + " " + v.get("mission", "") + " " + v.get("domain", ""))) / max(1, len(obj)), k, v) for k, v in depts), reverse=True)
    strong = [x for x in scored if x[0] >= 0.5]
    partial = [x for x in scored if 0.2 <= x[0] < 0.5]
    if len(strong) == 1:
        rec = f"REUSE {strong[0][1]} ({strong[0][2]['name']}, {strong[0][2]['status']})"
    elif len(strong) > 1 or (strong and partial):
        rec = "COMPOSE " + " + ".join(f"{k}" for _, k, _ in (strong + partial)[:4]) + " into a temporary engineering organization"
    elif partial:
        rec = f"EXTEND {partial[0][1]} ({partial[0][2]['name']}) with the missing competencies"
    else:
        rec = "CREATE a new department (no existing department covers this objective)"
    print(f"Objective: {a.objective}\nRecommendation: {rec}")
    for s, k, v in scored[:5]:
        print(f"  {k} {v['name']:<30} overlap {s:.0%} · {v['status']}")
    print("Do not create unnecessary agents or departments (§4).")
    return 0


def cmd_create(a, R):
    kind = a.kind
    iid = f"{PREFIX[kind]}-{sum(1 for v in R['items'].values() if v['kind'] == kind) + 1:03d}"
    if any(v["kind"] == kind and v["name"].lower() == a.name.lower() for v in R["items"].values()):
        return refuse(f"{kind} '{a.name}' already exists — reuse or extend it (§4).")
    if kind == "skill" and not a.force:
        q = words(a.name + " " + (a.domain or "") + " " + (a.mission or ""))
        sim = [(k, v) for k, v in R["items"].items() if v["kind"] == "skill" and v["status"] not in ("REJECTED", "DEPRECATED")
               and len(q & words(v["name"] + " " + v.get("domain", "") + " " + v.get("mission", ""))) / max(1, len(q)) >= 0.5]
        if sim:
            return refuse(f"similar Skill(s) exist: {[k + ' ' + v['name'] + ' v' + v.get('version', '?') for k, v in sim]} — reuse, extend or replace "
                          "them and record the decision; use --force only with a reason (§16.5).")
    if kind in ("agent", "skill") and a.dept and a.dept not in R["items"]:
        return refuse(f"unknown department {a.dept}")
    d = reg_path(a) / f"{kind}s"; d.mkdir(exist_ok=True)
    path = d / f"{iid}.md"
    pre = {"Unique agent ID": iid, "Department ID": iid, "Unique ID": iid, "Prompt ID": iid, "Skill name": a.name, "Name": a.name, "Version": "0.1.0",
           "Role": a.name, "Mission": a.mission or "", "Technical domain": a.domain or "", "Technical specialization": a.domain or a.mission or "",
           "Target model": a.model or ""}
    pre = {k: v for k, v in pre.items() if v}
    lines = [f"# {kind.upper()} — {a.name} ({iid})", "", f"Status: DRAFT{' · EXPERIMENTAL (not tested)' if kind in ('skill', 'prompt') else ''}",
             f"Department: {a.dept or '—'}", ""]
    for f in FIELDS[kind]:
        lines += [f"## {f}", pre.get(f, "[to define — required]"), ""]
    if kind == "prompt":
        lines += ["## Test suite (§5.4) — record only tests actually run", "| Scenario | Expected | Actual | Result | Evidence |", "|---|---|---|---|---|"]
        lines += [f"| {s} | | | NOT RUN | |" for s in PROMPT_SCENARIOS]
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    R["items"][iid] = {"kind": kind, "name": a.name, "dept": a.dept or "", "domain": a.domain or "", "mission": a.mission or "", "model": a.model or "", "version": "0.1.0",
                       "path": str(path.relative_to(pathlib.Path(a.dir).resolve())), "status": "DRAFT", "tests": [], "qualification": None,
                       "history": [{"ts": now(), "status": "DRAFT"}]}
    if kind in ("agent", "skill") and a.dept:
        R["items"][a.dept].setdefault("members", []).append(iid)
    save(a, R)
    print(f"{iid} {kind} '{a.name}' created → {path} (DRAFT). Fill every '[to define — required]' field.")
    return 0


def filled(a, it):
    t = (pathlib.Path(a.dir).resolve() / it["path"]).read_text(encoding="utf-8")
    return [f for f in FIELDS[it["kind"]] if re.search(rf"## {re.escape(f)}\n\[to define — required\]", t)]


def cmd_test(a, R):
    it = R["items"].get(a.item)
    if not it:
        return refuse("unknown item")
    if not a.evidence:
        return refuse("--evidence of the actual run is required (an agent must not claim competence without practical tests, §4.3).")
    if it["kind"] == "prompt" and a.case not in PROMPT_SCENARIOS:
        return refuse(f"prompt test case must be one of the §5.4 scenarios: {PROMPT_SCENARIOS}")
    if it["kind"] == "skill" and a.case not in SKILL_SCENARIOS:
        return refuse(f"skill test case must be one of the §16.4 scenarios: {SKILL_SCENARIOS}")
    it["tests"].append({"ts": now(), "case": a.case, "result": a.result, "evidence": a.evidence})
    save(a, R); print(f"{a.item}: test '{a.case}' {a.result.upper()} recorded")
    return 0


def cmd_qualify(a, R):
    it = R["items"].get(a.item)
    if not it:
        return refuse("unknown item")
    crit_set = AGENT_MEASURES if it["kind"] == "agent" else CRITERIA       # §15.7 measures for agents, §4.5 criteria otherwise
    sc = dict(kv.split("=") for kv in a.scores.split(",")) if a.scores else {}
    miss = [c for c in crit_set if c not in sc]
    if miss:
        return refuse(f"score all 10 {'§15.7 measures' if it['kind'] == 'agent' else '§4.5 criteria'} (0–100): missing {miss}")
    vals = {c: float(sc[c]) for c in crit_set}
    score = round(sum(vals.values()) / len(vals), 1)
    crit = [x for x in (a.critical_failure or "").split(";") if x.strip()]
    zero_sec = vals.get("security", 100) < 50 or vals.get("evidence", vals.get("correctness", 100)) < 50  # §4.5 / §15.7 zero-override
    verdict = "REJECTED (critical-failure override)" if crit or zero_sec else "QUALIFIED" if score >= 80 else "CORRECT AND RETEST"
    it["qualification"] = {"ts": now(), "scores": vals, "score": score, "critical_failures": crit + (["security or evidence/correctness below 50"] if zero_sec else []), "verdict": verdict}
    save(a, R)
    print(f"{a.item} qualification: {score}/100 → {verdict}" + (f" · critical: {', '.join(it['qualification']['critical_failures'])}" if it["qualification"]["critical_failures"] else ""))
    return 0 if verdict == "QUALIFIED" else 1


def cmd_promote(a, R):
    it = R["items"].get(a.item)
    if not it:
        return refuse("unknown item")
    cur, to = it["status"], a.to.upper()
    if to in ("REJECTED", "DEPRECATED"):
        it["status"] = to; it["history"].append({"ts": now(), "status": to}); save(a, R); print(f"{a.item} → {to}"); return 0
    if to == "UNDER_REVIEW":
        if cur != "VERIFIED":
            return refuse("UNDER_REVIEW follows VERIFIED (§16.3)")
        it["status"] = to; it["history"].append({"ts": now(), "status": to}); save(a, R); print(f"{a.item}: {cur} → {to}"); return 0
    if to == "REVIEWED" and cur == "UNDER_REVIEW":
        cur = "VERIFIED"
    if cur not in FLOW or to not in FLOW or FLOW.index(to) != FLOW.index(cur) + 1:
        return refuse(f"{a.item} is {cur}; next allowed status is {FLOW[FLOW.index(cur) + 1] if cur in FLOW[:-1] else 'none'} (§4.5, no skipping).")
    tests = it["tests"]
    if to == "GENERATED" and filled(a, it):
        return refuse(f"required fields still empty: {filled(a, it)}")
    if to == "TESTING" and not tests:
        return refuse("TESTING requires at least one recorded practical test.")
    if to == "VERIFIED":
        need = MIN_TESTS[it["kind"]]
        cases = {t["case"] for t in tests}
        if it["kind"] in ("prompt", "skill"):
            scen = PROMPT_SCENARIOS if it["kind"] == "prompt" else SKILL_SCENARIOS
            missing = [s for s in scen if s not in cases]
            if missing:
                return refuse(f"{it['kind']} not tested on: {missing} ({'§5.4' if it['kind'] == 'prompt' else '§16.4'}) — it remains EXPERIMENTAL")
        if len(cases) < need:
            return refuse(f"VERIFIED needs ≥ {need} distinct practical tests (has {len(cases)}).")
        last = {}
        for t in tests:
            last[t["case"]] = t["result"]
        failed = [c for c, r in last.items() if r != "pass"]
        if failed:
            return refuse(f"latest result failed for: {failed} — correct and retest.")
    if to == "REVIEWED":
        q = it["qualification"]
        if not q or q["verdict"] != "QUALIFIED":
            return refuse("REVIEWED requires a QUALIFIED score (≥ 80/100, no critical-failure override). Run `qualify`.")
    if to == "APPROVED" and not a.by:
        return refuse("APPROVED requires --by <human> (§3.8).")
    it["status"] = to; it["history"].append({"ts": now(), "status": to, "by": a.by or ""})
    save(a, R); print(f"{a.item}: {cur} → {to}" + (" (no longer EXPERIMENTAL)" if to == "VERIFIED" and it["kind"] in ("skill", "prompt") else ""))
    return 0


def cmd_seed_cf(a, R):
    data = json.loads((pathlib.Path(__file__).resolve().parent.parent / "data" / "agents.json").read_text(encoding="utf-8"))["agents"]
    added = 0
    for ag in data:
        if any(v["kind"] == "agent" and v["name"] == ag["role"] for v in R["items"].values()):
            continue
        ns = type("A", (), {"dir": a.dir, "kind": "agent", "name": ag["role"], "dept": None, "domain": ag["technical_specialization"],
                            "mission": ag["mission"], "model": None, "force": False})()
        cmd_create(ns, R); R = load(a); added += 1
        last = sorted(k for k, v in R["items"].items() if v["kind"] == "agent")[-1]
        R["items"][last]["reference_id"] = ag["id"]; save(a, R)
    print(f"{added} reference agents (§15.5 CF01–CF20) registered as DRAFT — titles do not establish competence; each needs practical tests.")
    return 0


def cmd_search(a, R):
    q = words(a.query)
    hits = sorted(((len(q & words(v["name"] + " " + v.get("domain", "") + " " + v.get("mission", ""))) / max(1, len(q)), k, v) for k, v in R["items"].items()
                   if not a.kind or v["kind"] == a.kind), reverse=True)
    hits = [h for h in hits if h[0] > 0]
    if not hits:
        print("No existing match — creating a new item is justified (record the decision)."); return 0
    for sc, k, v in hits[:10]:
        print(f"{k} {v['kind']:<6} {v['name']:<34} {sc:.0%} · {v['status']} · v{v.get('version', '?')}")
    return 0


def cmd_list(a, R):
    if not R["items"]:
        print("Registry empty."); return 0
    print("| ID | Kind | Name | Dept | Status | Tests | Score |\n|---|---|---|---|---|---|---|")
    for k, v in sorted(R["items"].items()):
        exp = " (EXPERIMENTAL)" if v["kind"] in ("skill", "prompt") and v["status"] in ("DRAFT", "GENERATED", "TESTING") else ""
        print(f"| {k} | {v['kind']} | {v['name']} | {v['dept'] or '—'} | {v['status']}{exp} | {len(v['tests'])} | {(v['qualification'] or {}).get('score', '—')} |")
    return 0


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--dir", default=".")
    sp = ap.add_subparsers(dest="cmd", required=True)
    p = sp.add_parser("assess"); p.add_argument("objective")
    p = sp.add_parser("create"); p.add_argument("kind", choices=list(FIELDS)); p.add_argument("name")
    p.add_argument("--dept"); p.add_argument("--domain"); p.add_argument("--model"); p.add_argument("--mission"); p.add_argument("--force", action="store_true")
    sp.add_parser("seed-cf", help="register the §15.5 reference agents CF01–CF20 as DRAFT")
    p = sp.add_parser("search", help="§16.5 search existing items before creating"); p.add_argument("query"); p.add_argument("--kind", choices=list(FIELDS))
    p = sp.add_parser("test"); p.add_argument("item"); p.add_argument("--case", required=True); p.add_argument("--result", choices=["pass", "fail"], required=True); p.add_argument("--evidence")
    p = sp.add_parser("qualify"); p.add_argument("item"); p.add_argument("--scores"); p.add_argument("--critical-failure")
    p = sp.add_parser("promote"); p.add_argument("item"); p.add_argument("--to", required=True); p.add_argument("--by")
    sp.add_parser("list")
    a = ap.parse_args()
    R = load(a)
    return {"assess": cmd_assess, "create": cmd_create, "test": cmd_test, "qualify": cmd_qualify, "promote": cmd_promote, "list": cmd_list,
            "seed-cf": cmd_seed_cf, "search": cmd_search}[a.cmd](a, R)


if __name__ == "__main__":
    sys.exit(main())
