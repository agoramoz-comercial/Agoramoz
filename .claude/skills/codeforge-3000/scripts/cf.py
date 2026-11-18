#!/usr/bin/env python3
"""ZABATAINA CODEFORGE 3000 — Engineering engine (stdlib only).

Persistent, sealed engineering record in <project>/.codeforge/record.json + append-only events.jsonl.
Implements: requirements with IDs (M02), functional flow contracts (M15), tests linked to what they validate (M16),
Universal Engineering Graph with traceability / impact / integrity (Part VII), controlled loops with attempt budgets
(Part VIII), checkpoints and recovery (§7.5), approvals (§3.8), real terminal capture and live events (Part IX),
release governance generated → implemented → tested → verified → approved → released (M20).

Every refusal names the rule enforced. Run `cf.py <command> -h`.

  init · req · comp · test · link · node · graph (check|impact|trace|export) · task (loop) · run · event
  approve · security · checkpoint · resume · status · report
"""
import argparse, datetime as dt, fnmatch, hashlib, json, os, pathlib, re, shlex, subprocess, sys, tempfile, time
import xml.etree.ElementTree as ET

if __name__ == "__main__":          # one module identity for extensions that `import cf` (shared Refused class, shared state)
    sys.modules.setdefault("cf", sys.modules[__name__])

LIFECYCLE = ["GENERATED", "IMPLEMENTED", "TESTED", "VERIFIED", "APPROVED", "RELEASED"]      # M20
TEST_STATES = ["DESIGNED", "WRITTEN", "PASSED", "FAILED", "SKIPPED", "BLOCKED"]               # §21.7 (+ legacy NOT_EXECUTED)
NOT_RUN = ("DESIGNED", "WRITTEN", "NOT_EXECUTED")                                              # never counted as passed
TASK_FLOW = ["CREATED", "VALIDATED", "READY", "IN_PROGRESS", "UNDER_VERIFICATION", "VERIFIED"] # §21.2
TASK_EXC = ["BLOCKED", "FAILED", "NEEDS_APPROVAL", "DEFERRED", "CANCELLED"]
FAILURE_CLASSES = ["REQUIREMENT_FAILURE", "IMPLEMENTATION_FAILURE", "CONFIGURATION_FAILURE", "DATA_FAILURE",
                   "DEPENDENCY_FAILURE", "ENVIRONMENT_FAILURE", "INTEGRATION_FAILURE", "PERMISSION_FAILURE",
                   "SECURITY_FAILURE", "PERFORMANCE_FAILURE", "TEST_FAILURE", "EXTERNAL_SERVICE_FAILURE"]  # §20.4
FAILURE_ALIASES = {"code": "IMPLEMENTATION_FAILURE", "configuration": "CONFIGURATION_FAILURE", "data": "DATA_FAILURE",
                   "dependency": "DEPENDENCY_FAILURE", "environment": "ENVIRONMENT_FAILURE", "specification": "REQUIREMENT_FAILURE"}
RISKS = ["LOW", "MEDIUM", "HIGH", "CRITICAL"]
LOOP = ["PLAN", "BUILD", "INSPECT", "TEST", "REPAIR", "REGRESSION", "VERIFY", "RECORD"]       # §9.1
CONTRACT_FIELDS = ["role", "trigger", "input", "validation", "permission", "business_rule", "service",
                   "api", "data_op", "persistence", "response", "ui_change", "error_handling"]  # M15
INTERACTIVE = {"button", "form", "link", "input", "menu", "toggle", "page", "screen", "modal", "gesture", "command"}
KINDS = INTERACTIVE | {"api", "service", "db", "job", "integration", "library", "config", "infra", "agent", "other"}
RELS = ["depends_on", "calls", "produces", "consumes", "persists", "authorizes", "validates", "tests",
        "implements", "replaces", "affects"]                                                   # Part VII / §19.3 (DEPENDS_ON… accepted)
NODE_TYPES = ["requirement", "user", "role", "permission", "page", "component", "event", "state", "business_rule", "service",
              "api", "db", "database_entity", "integration", "test", "security_control", "deployment", "documentation", "other"]  # §19.2
DEFAULT_BUDGET = 3


class Refused(Exception):
    pass


def now():
    return dt.datetime.now().isoformat(timespec="seconds")


def base(a):
    return pathlib.Path(getattr(a, "dir", None) or os.environ.get("CODEFORGE_DIR") or ".").resolve()


def cfdir(a):
    return base(a) / ".codeforge"


def digest(r):
    return hashlib.sha256(json.dumps({k: v for k, v in r.items() if k != "integrity"}, sort_keys=True, ensure_ascii=False).encode()).hexdigest()


def load(a, verify=True):
    f = cfdir(a) / "record.json"
    if not f.exists():
        raise Refused(f"No engineering record at {f}. Run `cf.py init` (never invent a recovered checkpoint).")
    try:
        r = json.loads(f.read_text(encoding="utf-8"))
    except json.JSONDecodeError as e:
        raise Refused(f"Record corrupted (invalid JSON: {e}). Restore from a checkpoint: `cf.py resume --from vN`.")
    if verify and r.get("integrity") != digest(r):
        raise Refused("Record integrity check FAILED (edited outside the engine or corrupted). "
                      "Restore with `cf.py resume --from vN` or re-seal a deliberate edit with `cf.py graph check --reseal`.")
    return r


def emit(a, kind, **data):
    d = cfdir(a); d.mkdir(parents=True, exist_ok=True)
    ev = {"ts": now(), "kind": kind, **data}
    with open(d / "events.jsonl", "a", encoding="utf-8") as fh:
        fh.write(json.dumps(ev, ensure_ascii=False) + "\n")
    return ev


def save(a, r, action, detail="", agent=None, task=None):
    r["version"] += 1
    r["updated"] = now()
    r["history"].append({"ts": now(), "v": r["version"], "action": action, "detail": detail})
    r["integrity"] = digest(r)
    d = cfdir(a)
    fd, tmp = tempfile.mkstemp(dir=d, suffix=".tmp")
    with os.fdopen(fd, "w", encoding="utf-8") as fh:
        json.dump(r, fh, indent=2, ensure_ascii=False)
    os.replace(tmp, d / "record.json")
    emit(a, "record", action=action, detail=detail, version=r["version"], agent=agent or os.environ.get("CODEFORGE_AGENT", ""),
         task=task or os.environ.get("CODEFORGE_TASK", ""))


def csv(s):
    return [x.strip() for x in (s or "").split(",") if x.strip()]


def semi(s):
    return [x.strip() for x in re.split(r"[;\n]", s or "") if x.strip()]


def nid(existing, prefix):
    n = [int(m.group(1)) for k in existing for m in [re.match(rf"^{re.escape(prefix)}-(\d+)$", k)] if m]
    return f"{prefix}-{(max(n) + 1 if n else 1):03d}"


def all_nodes(r):
    return set(r["requirements"]) | set(r["components"]) | set(r["tests"]) | set(r["nodes"])


def git(a, *args):
    try:
        p = subprocess.run(["git", "-C", str(base(a)), *args], capture_output=True, text=True, timeout=10)
        return p.stdout.strip() if p.returncode == 0 else None
    except Exception:  # noqa: BLE001
        return None


# ------------------------------------------------------------------ init / requirements
def cmd_init(a):
    d = cfdir(a)
    if (d / "record.json").exists():
        raise Refused("An engineering record already exists — use `cf.py resume`.")
    d.mkdir(parents=True, exist_ok=True)
    r = {"project": {"id": a.id or "CF-" + re.sub(r"[^A-Z0-9]+", "-", a.name.upper()).strip("-")[:20], "name": a.name,
                     "objective": a.objective, "type": a.type, "complexity": a.complexity, "created": now(), "preview_url": a.preview or ""},
         "version": 0, "updated": now(), "requirements": {}, "components": {}, "tests": {}, "nodes": {}, "edges": [],
         "tasks": {}, "approvals": [], "pending_approvals": [], "security": [], "decisions": [], "checkpoints": [],
         "usage": [], "history": []}
    r["project"]["git_base"] = git(a, "rev-parse", "HEAD") or ""      # baseline for §27C technical changes
    save(a, r, "init", a.name)
    print(f"CODEFORGE record created at {d}  ({r['project']['id']})")


def cmd_req(a):
    r = load(a)
    if a.action == "add":
        area = re.sub(r"[^A-Z0-9]", "", (a.area or "GEN").upper())[:10] or "GEN"
        rid = nid(r["requirements"], f"REQ-{area}")
        r["requirements"][rid] = {"text": a.text, "type": a.type, "priority": a.priority, "critical": a.critical,
                                  "acceptance": semi(a.acceptance), "status": "GENERATED", "out_of_scope": False, "created": now()}
        save(a, r, "req.add", rid); print(f"{rid}: {a.text}"); return
    q = r["requirements"].get(a.text)
    if not q:
        raise Refused(f"Unknown requirement {a.text}")
    if a.action == "scope-out":
        if not a.reason:
            raise Refused("Moving a requirement out of scope needs --reason (§3.5 never silently omit a requirement).")
        q["out_of_scope"] = True; q["scope_reason"] = a.reason
        save(a, r, "req.scope_out", f"{a.text}: {a.reason}"); print(f"{a.text} marked OUT OF SCOPE — {a.reason}")


# ------------------------------------------------------------------ components (M15 functional contracts)
def contract_gaps(c):
    if c["kind"] not in INTERACTIVE:
        return []
    return [f for f in CONTRACT_FIELDS if not str(c["contract"].get(f, "")).strip()]


def cmd_comp(a):
    r = load(a)
    if a.action == "add":
        if a.kind not in KINDS:
            raise Refused(f"kind must be one of {sorted(KINDS)}")
        reqs = csv(a.req)
        bad = [x for x in reqs if x not in r["requirements"]]
        if bad:
            raise Refused(f"Unknown requirements: {bad}")
        cid = a.id or nid(r["components"], "CMP")
        if cid in all_nodes(r):
            raise Refused(f"{cid} already exists")
        r["components"][cid] = {"name": a.name, "kind": a.kind, "requirements": reqs, "files": csv(a.files), "critical": a.critical,
                                "contract": {}, "flow": semi(a.flow), "status": "GENERATED", "evidence": [], "created": now()}
        for q in reqs:
            r["edges"].append({"from": cid, "rel": "implements", "to": q})
        save(a, r, "comp.add", cid); print(f"{cid} ({a.kind}) {a.name}")
        if a.kind in INTERACTIVE:
            print(f"  ⚠ interactive component: define its behaviour contract (M15): cf.py comp contract {cid} --role … --trigger …")
        return
    c = r["components"].get(a.name)
    if not c:
        raise Refused(f"Unknown component {a.name}")
    cid = a.name
    if a.action == "contract":
        for f in CONTRACT_FIELDS:
            v = getattr(a, f, None)
            if v is not None:
                c["contract"][f] = v
        if a.flow:
            c["flow"] = semi(a.flow)
        save(a, r, "comp.contract", cid)
        gaps = contract_gaps(c)
        print(f"{cid} contract updated" + (f" — still missing: {', '.join(gaps)}" if gaps else " — complete"))
        return
    if a.action == "status":
        to = a.status.upper()
        if to not in LIFECYCLE:
            raise Refused(f"status must be one of {LIFECYCLE}")
        cur = c["status"]
        if LIFECYCLE.index(to) != LIFECYCLE.index(cur) + 1:
            raise Refused(f"{cid} is {cur}; next allowed is {LIFECYCLE[min(LIFECYCLE.index(cur) + 1, 5)]} "
                          "(M20: preserve the difference between generated, implemented, tested, verified, approved, released).")
        tests = [t for t in r["tests"].values() if cid in t["targets"]]
        if to == "IMPLEMENTED":
            if not c["files"] and not a.evidence:
                raise Refused("IMPLEMENTED needs --files or --evidence pointing at real code (§3.1 evidence over claims).")
            if contract_gaps(c):
                raise Refused(f"Interactive component without complete behaviour contract: missing {contract_gaps(c)} "
                              "(M15 golden rule: NO INTERACTIVE COMPONENT WITHOUT DEFINED BEHAVIOUR).")
        if to == "TESTED":
            ran = [t for t in tests if t["status"] in ("PASSED", "FAILED")]
            if not ran:
                raise Refused("TESTED requires at least one linked test that was actually executed (M16: unexecuted tests never count).")
        if to == "VERIFIED":
            if not tests:
                raise Refused("No linked tests — no verification path (M15 golden rule).")
            notp = [k for k, t in r["tests"].items() if cid in t["targets"] and t["status"] != "PASSED"]
            if notp:
                raise Refused(f"Linked tests not PASSED: {', '.join(notp)}")
        if to == "APPROVED":
            if not a.by:
                raise Refused("APPROVED requires --by <human> (§3.8 human authority).")
            r["approvals"].append({"target": cid, "by": a.by, "scope": "component approval", "ts": now()})
        if to == "RELEASED":
            blockers = release_blockers(r)
            try:
                import cf_gov
                gates = cf_gov.compute_gates(r, base(a), cf_gov.events(a))[:9]
                blockers += [f"gate {n}: {st}" for n, st, _ in gates if st not in ("PASSED", "N/A")]
            except ImportError:
                pass
            if blockers:
                raise Refused("Release checks failed (M18, §21.6): " + "; ".join(blockers))
        if a.files:
            c["files"] = sorted(set(c["files"] + csv(a.files)))
        c["evidence"] += csv(a.evidence)
        c["status"] = to
        save(a, r, "comp.status", f"{cid} → {to}"); print(f"{cid}: {cur} → {to}")


def release_blockers(r):
    out = []
    failing = [k for k, t in r["tests"].items() if t["status"] == "FAILED"]
    if failing:
        out.append(f"failing tests {failing}")
    crit = [s["id"] for s in r["security"] if s["severity"] in ("CRITICAL", "HIGH") and s["status"] == "OPEN"]
    if crit:
        out.append(f"open critical/high security findings {crit}")
    rt = [f["id"] for f in r.get("redteam", []) if f["severity"] == "CRITICAL" and f["status"] != "RESOLVED" and not f.get("exception")]
    if rt:
        out.append(f"unresolved critical Red Team findings without authorized exception {rt} (§21.8)")
    unver = [k for k, q in r["requirements"].items() if q["critical"] and not q["out_of_scope"] and req_status(r, k) not in ("VERIFIED", "APPROVED", "RELEASED")]
    if unver:
        out.append(f"critical requirements not verified {unver}")
    return out


def req_status(r, rid):
    comps = [c for c in r["components"].values() if rid in c["requirements"]]
    tests = [t for t in r["tests"].values() if rid in t["targets"] or any(x in t["targets"] for x, c in r["components"].items() if rid in c["requirements"])]
    if not comps:
        return "NOT IMPLEMENTED"
    order = [LIFECYCLE.index(c["status"]) for c in comps]
    lo = LIFECYCLE[min(order)]
    if lo in ("VERIFIED", "APPROVED", "RELEASED") and (not tests or any(t["status"] != "PASSED" for t in tests)):
        return "TESTED"
    return lo


# ------------------------------------------------------------------ tests (M16)
def cmd_test(a):
    r = load(a)
    if a.action == "add":
        targets = csv(a.targets)
        bad = [x for x in targets if x not in r["requirements"] and x not in r["components"]]
        if not targets or bad:
            raise Refused(f"A test must be linked to the requirement/component it validates (M16). Unknown/missing: {bad or 'none given'}")
        tid = a.id or nid(r["tests"], "TST")
        st0 = "WRITTEN" if (a.command or a.file) else "DESIGNED"          # §21.7 designed ≠ written ≠ executed
        r["tests"][tid] = {"name": a.name, "layer": a.layer, "targets": targets, "command": a.command or "", "file": a.file or "",
                           "match": csv(a.match), "status": st0, "evidence": "", "runs": [], "created": now()}
        for t in targets:
            r["edges"].append({"from": tid, "rel": "tests", "to": t})
        save(a, r, "test.add", tid)
        print(f"{tid} [{a.layer}] → {', '.join(targets)} ({st0} — not executed)" + (f" · groups runner cases matching {csv(a.match)}" if a.match else "")); return
    if a.action == "write":
        t = r["tests"].get(a.name)
        if not t:
            raise Refused(f"Unknown test {a.name}")
        if not (a.file or a.command):
            raise Refused("A WRITTEN test needs --file (test source) or --command (how to run it).")
        if a.file and not (base(a) / a.file).exists():
            raise Refused(f"Test file {a.file} does not exist (§28.6: never classify unwritten work).")
        t["file"] = a.file or t.get("file", ""); t["command"] = a.command or t["command"]
        if t["status"] in NOT_RUN:
            t["status"] = "WRITTEN"
        save(a, r, "test.write", a.name); print(f"{a.name}: WRITTEN (still not executed)"); return
    if a.action == "result":
        t = r["tests"].get(a.name)
        if not t:
            raise Refused(f"Unknown test {a.name}")
        st = a.status.upper()
        if st not in TEST_STATES:
            raise Refused(f"status must be one of {TEST_STATES}")
        if st in ("DESIGNED", "WRITTEN"):
            raise Refused("Use `test add`/`test write` for DESIGNED/WRITTEN; `result` records executions.")
        if st in ("PASSED", "FAILED") and not a.evidence:
            raise Refused("An executed result needs --evidence (log path, CI URL, run id). Never record a result for a test that was not run.")
        t["status"] = st; t["evidence"] = a.evidence or ""; t["runs"].append({"ts": now(), "status": st, "evidence": a.evidence or ""})
        save(a, r, "test.result", f"{a.name} {st}")
        emit(a, "test", test=a.name, status=st, evidence=a.evidence or "")
        print(f"{a.name}: {st}"); return
    if a.action == "run":
        t = r["tests"].get(a.name)
        if not t or not t["command"]:
            raise Refused("test run needs a test with --command")
        emit(a, "test.start", test=a.name, command=t["command"])
        res = run_capture(a, t["command"], f"test {a.name}")
        st = "PASSED" if res["exit"] == 0 else "FAILED"
        r = load(a)
        t = r["tests"][a.name]
        t["status"] = st; t["evidence"] = res["log"]
        t["runs"].append({"ts": now(), "status": st, "evidence": res["log"], "seconds": res["seconds"], "detail": res["tail"][-400:] if st == "FAILED" else ""})
        save(a, r, "test.run", f"{a.name} {st}")
        emit(a, "test", test=a.name, status=st, evidence=res["log"], seconds=res["seconds"], detail=res["tail"][-400:] if st == "FAILED" else "")
        print(f"{a.name}: {st} (exit {res['exit']}, log {res['log']})"); return 0 if st == "PASSED" else 1
    if a.action == "import":
        f = pathlib.Path(a.name)
        root = ET.parse(f).getroot()
        cases = list(root.iter("testcase"))
        upd, unk = 0, []
        grouped = {k for k, t in r["tests"].items() if t.get("match")}
        used = set()
        for k in sorted(grouped):                       # pattern-linked tests aggregate many runner cases (any failure → FAILED)
            t = r["tests"][k]
            hits = []
            for i, c in enumerate(cases):
                keys = [c.get("classname", ""), c.get("name", ""), c.get("file", ""), f"{c.get('classname', '')}::{c.get('name', '')}"]
                if any(fnmatch.fnmatch(x, pat) for pat in t["match"] for x in keys if x):
                    hits.append(c); used.add(i)
            if not hits:
                print(f"  {k}: pattern {t['match']} matched no test case — status unchanged")
                continue
            nf = sum(1 for c in hits if c.find("failure") is not None or c.find("error") is not None)
            ns = sum(1 for c in hits if c.find("skipped") is not None)
            npass = len(hits) - nf - ns
            st = "FAILED" if nf else "PASSED" if npass else "SKIPPED"
            secs = round(sum(float(c.get("time") or 0) for c in hits), 2)
            firstf = next((c for c in hits if c.find("failure") is not None or c.find("error") is not None), None)
            el = (firstf.find("failure") if firstf is not None and firstf.find("failure") is not None else firstf.find("error")) if firstf is not None else None
            detail = (f"{firstf.get('classname', '')}::{firstf.get('name', '')}: " + ((el.get("message") or "") + " " + (el.text or ""))[:300]) if el is not None else ""
            ev = f"{f}: {len(hits)} cases — {npass} passed, {nf} failed, {ns} skipped"
            t["status"] = st; t["evidence"] = ev
            t["runs"].append({"ts": now(), "status": st, "evidence": ev, "seconds": secs, "detail": detail, "cases": len(hits), "failed": nf, "skipped": ns})
            emit(a, "test", test=k, status=st, evidence=ev, seconds=secs, detail=detail); upd += 1
            print(f"  {k}: {st} ({len(hits)} cases: {npass} passed, {nf} failed, {ns} skipped)")
        for i, c in enumerate(cases):
            if i in used:
                continue
            name = c.get("name", ""); cls = c.get("classname", "")
            st = "FAILED" if (c.find("failure") is not None or c.find("error") is not None) else "SKIPPED" if c.find("skipped") is not None else "PASSED"
            secs = float(c.get("time") or 0)
            fail_el = c.find("failure") if c.find("failure") is not None else c.find("error")
            detail = ((fail_el.get("message") or "") + " " + (fail_el.text or ""))[:400] if fail_el is not None else ""
            hit = [k for k, t in r["tests"].items() if k not in grouped and (k in name or k in cls or t["name"] == name)]
            if not hit:
                unk.append(name); continue
            for k in hit:
                r["tests"][k]["status"] = st; r["tests"][k]["evidence"] = f"{f}::{cls}::{name}"
                r["tests"][k]["runs"].append({"ts": now(), "status": st, "evidence": str(f), "seconds": secs, "detail": detail}); upd += 1
                emit(a, "test", test=k, status=st, evidence=str(f), seconds=secs, detail=detail)
        save(a, r, "test.import", f"{f} ({upd} updated)")
        print(f"Imported {f}: {len(cases)} test cases · {upd} registry tests updated" + (f"; {len(unk)} unlinked cases ignored — link them with "
              "`test add NAME --targets REQ --match 'tests/admin/*'` or put the TST id in the case name" if unk else ""))


# ------------------------------------------------------------------ graph (Part VII)
def cmd_node(a):
    r = load(a)
    if a.id in all_nodes(r):
        raise Refused(f"{a.id} exists")
    t = a.type.lower().replace(" ", "_")
    if t not in NODE_TYPES:
        raise Refused(f"node type must be one of {NODE_TYPES} (§19.2)")
    r["nodes"][a.id] = {"type": t, "name": a.name, "critical": a.critical}
    save(a, r, "node.add", a.id); print(f"node {a.id} ({a.type})")


def cmd_link(a):
    r = load(a)
    a.rel = a.rel.lower()
    if a.rel not in RELS:
        raise Refused(f"rel must be one of {RELS}")
    nodes = all_nodes(r)
    miss = [x for x in (a.src, a.dst) if x not in nodes]
    if miss:
        raise Refused(f"Broken relationship — unknown node(s) {miss} (§8.3)")
    e = {"from": a.src, "rel": a.rel, "to": a.dst}
    if e in r["edges"]:
        print("edge exists"); return
    r["edges"].append(e); save(a, r, "graph.link", f"{a.src} {a.rel} {a.dst}"); print(f"{a.src} —{a.rel}→ {a.dst}")


def integrity(r, base_dir=None):
    issues = []
    nodes = all_nodes(r)
    for e in r["edges"]:
        if e["from"] not in nodes or e["to"] not in nodes:
            issues.append(("BROKEN_RELATIONSHIP", f"{e['from']} {e['rel']} {e['to']}"))
    for k, q in r["requirements"].items():
        if q["out_of_scope"]:
            continue
        if not any(k in c["requirements"] for c in r["components"].values()):
            issues.append(("ORPHAN_REQUIREMENT", f"{k} has no implementing component (requirement without implementation)"))
        linked_tests = [t for t in r["tests"].values() if k in t["targets"] or any(x in t["targets"] for x, c in r["components"].items() if k in c["requirements"])]
        if q["critical"] and not linked_tests:
            issues.append(("NO_VERIFICATION_PATH", f"{k} is critical and has no test (M15 golden rule)"))
    for k, c in r["components"].items():
        if not c["requirements"] and not any(e["from"] == k or e["to"] == k for e in r["edges"]):
            issues.append(("ORPHAN_COMPONENT", f"{k} is linked to no requirement or node (UI component without requirement)"))
        gaps = contract_gaps(c)
        if gaps:
            issues.append(("UNDEFINED_BEHAVIOUR", f"{k} ({c['kind']}) missing contract fields: {', '.join(gaps)}"))
        if (c["critical"] or any(r["requirements"].get(q, {}).get("critical") for q in c["requirements"])) and \
                c["status"] not in ("VERIFIED", "APPROVED", "RELEASED"):
            issues.append(("UNVERIFIED_CRITICAL_NODE", f"{k} is {c['status']}"))
        if base_dir:
            for f in c["files"]:
                if not (base_dir / f).exists():
                    issues.append(("GRAPH_REPO_MISMATCH", f"{k} references missing file {f}"))
    for k, t in r["tests"].items():
        if t["status"] in NOT_RUN:
            issues.append(("TEST_NOT_EXECUTED", f"{k} {t['name']} ({t['status']})"))
    for k, c in r["components"].items():
        if c["kind"] not in ("config", "library", "infra") and not any(k in t["targets"] or set(t["targets"]) & set(c["requirements"]) for t in r["tests"].values()):
            issues.append(("MISSING_TEST_COVERAGE", f"{k} {c['name']} has no linked test (§19.5)"))
    deps = {}
    for e in r["edges"]:
        if e["rel"] in ("depends_on", "calls"):
            deps.setdefault(e["from"], []).append(e["to"])
    for s in deps:
        stack, seen = list(deps[s]), set()
        while stack:
            x = stack.pop()
            if x == s:
                issues.append(("CIRCULAR_DEPENDENCY", s)); break
            if x in seen:
                continue
            seen.add(x); stack += deps.get(x, [])
    return issues


def impact(r, node):
    rev = {}
    for e in r["edges"]:
        if e["rel"] in ("depends_on", "calls", "consumes", "implements", "validates", "authorizes", "persists", "affects"):
            rev.setdefault(e["to"], []).append(e["from"])
        if e["rel"] in ("produces", "affects"):
            rev.setdefault(e["from"], []).append(e["to"])
    out, stack = set(), [node]
    while stack:
        x = stack.pop()
        for y in rev.get(x, []):
            if y not in out and y != node:
                out.add(y); stack.append(y)
    affected = out | {node}
    tests = sorted(k for k, t in r["tests"].items() if set(t["targets"]) & affected)
    return sorted(out), tests


def node_type(r, n):
    if n in r["requirements"]:
        return "requirement"
    if n in r["components"]:
        return r["components"][n]["kind"]
    if n in r["tests"]:
        return "test"
    return r["nodes"].get(n, {}).get("type", "other")


def neighbors(r, n):
    return {e["to"] for e in r["edges"] if e["from"] == n} | {e["from"] for e in r["edges"] if e["to"] == n}


def impact_detail(r, node):
    """§19.6: direct, indirect, interfaces, data, tests, security and deployment implications."""
    aff, tests = impact(r, node)
    direct = sorted(e["from"] for e in r["edges"] if e["to"] == node and e["rel"] in ("depends_on", "calls", "consumes", "implements", "validates", "authorizes", "persists", "affects")) + \
        sorted(e["to"] for e in r["edges"] if e["from"] == node and e["rel"] in ("produces", "affects"))
    direct = sorted(set(direct))
    indirect = sorted(set(aff) - set(direct))
    scope = set(aff) | {node} | neighbors(r, node)
    pick = lambda types: sorted(x for x in scope if node_type(r, x) in types)
    c = r["components"].get(node, {})
    interfaces = pick({"api", "integration", "service"}) + ([f"contract api: {c['contract']['api']}"] if c.get("contract", {}).get("api") else [])
    data = pick({"db", "database_entity"}) + ([f"contract data op: {c['contract']['data_op']}"] if c.get("contract", {}).get("data_op") else [])
    security = pick({"security_control", "permission", "role"}) + [s["id"] for s in r["security"] if s["status"] == "OPEN" and s.get("location") and any(s["location"] in f for x in scope if x in r["components"] for f in r["components"][x]["files"])]
    deploy = pick({"deployment", "infra"})
    return {"direct": direct, "indirect": indirect, "interfaces": interfaces, "data": data, "tests": tests, "security": security, "deployment": deploy}


def trace_row(r, k):
    comps = [x for x, c in r["components"].items() if k in c["requirements"]]
    tests = [x for x, t in r["tests"].items() if k in t["targets"] or set(t["targets"]) & set(comps)]
    reach = set()
    for x in comps:
        stack = [x]
        while stack:
            y = stack.pop()
            for e in r["edges"]:
                if e["from"] == y and e["rel"] in ("calls", "depends_on", "persists", "consumes", "produces") and e["to"] not in reach:
                    reach.add(e["to"]); stack.append(e["to"])
    apis = sorted({x for x in reach if node_type(r, x) in ("api", "integration", "service")} | {r["components"][x]["contract"].get("api") for x in comps if r["components"][x]["contract"].get("api")})
    data = sorted({x for x in reach if node_type(r, x) in ("db", "database_entity")} | {r["components"][x]["contract"].get("data_op") for x in comps if r["components"][x]["contract"].get("data_op")})
    sec = sorted({e["from"] for e in r["edges"] if e["rel"] in ("authorizes", "validates") and (e["to"] in comps or e["to"] == k) and node_type(r, e["from"]) in ("security_control", "permission", "role")}
                 | {r["components"][x]["contract"].get("permission") for x in comps if r["components"][x]["contract"].get("permission")})
    evidence = [r["tests"][x]["evidence"] for x in tests if r["tests"][x]["status"] == "PASSED" and r["tests"][x]["evidence"]]
    return comps, tests, apis, data, sec, evidence


def cmd_graph(a):
    r = load(a, verify=not getattr(a, "reseal", False))
    if a.action == "check":
        if a.reseal:
            save(a, r, "graph.reseal", "manual edit accepted"); print("Record re-sealed (logged).")
        iss = integrity(r, base(a))
        if git(a, "rev-parse", "--is-inside-work-tree"):
            dirty = git(a, "status", "--porcelain")
            tracked = {f for c in r["components"].values() for f in c["files"]}
            for line in (dirty or "").splitlines():
                path = line[3:].strip()
                if path.startswith(".codeforge"):
                    continue
                if tracked and path not in tracked:
                    iss.append(("UNTRACKED_CHANGE", f"{path} changed but belongs to no component"))
        if not iss:
            print("GRAPH INTEGRITY OK"); return 0
        crit = {"BROKEN_RELATIONSHIP", "ORPHAN_REQUIREMENT", "NO_VERIFICATION_PATH", "UNDEFINED_BEHAVIOUR", "CIRCULAR_DEPENDENCY", "GRAPH_REPO_MISMATCH"}
        for k, msg in iss:
            print(f"{'✗' if k in crit else '!'} {k:<26} {msg}")
        return 1 if any(k in crit for k, _ in iss) else 0
    if a.action == "impact":
        if a.node not in all_nodes(r):
            raise Refused(f"Unknown node {a.node}")
        aff, tests = impact(r, a.node)
        det = impact_detail(r, a.node)
        crit = [x for x in aff if r["components"].get(x, {}).get("critical") or r["requirements"].get(x, {}).get("critical")]
        risk = "HIGH" if crit or len(aff) > 5 or det["security"] or det["deployment"] else "MEDIUM" if aff else "LOW"
        j = lambda v: ", ".join(v) or "none"
        print(f"CHANGE IMPACT — {a.node} (§19.6)\n  1. Direct dependencies:   {j(det['direct'])}\n  2. Indirect dependencies: {j(det['indirect'])}\n"
              f"  3. Affected interfaces:   {j(det['interfaces'])}\n  4. Affected data:         {j(det['data'])}\n"
              f"  5. Affected tests:        {', '.join(tests) or 'NONE — add tests before changing (no verification path)'}\n"
              f"  6. Security implications: {j(det['security'])}\n  7. Deployment implications: {j(det['deployment'])}\n"
              f"  Critical affected: {j(crit)} · Risk: {risk}")
        if risk == "HIGH":
            print("  High-impact component: review the dependency relationships above before modifying it (§19.6).")
        emit(a, "impact", node=a.node, affected=aff, tests=tests, risk=risk); return
    if a.action == "trace":
        print("| Requirement | Critical | Specification | Components | APIs | Data | Security controls | Tests | Evidence | Status |\n|---|---|---|---|---|---|---|---|---|---|")
        for k, q in r["requirements"].items():
            comps, tests, apis, data, sec, ev = trace_row(r, k)
            st = "OUT OF SCOPE — " + q.get("scope_reason", "") if q["out_of_scope"] else req_status(r, k)
            tl = ", ".join("%s:%s" % (x, r["tests"][x]["status"]) for x in tests) or "—"
            cl = ", ".join("%s:%s" % (x, r["components"][x]["status"]) for x in comps) or "—"
            crit = "yes" if q["critical"] else ""
            spec = "; ".join(q["acceptance"]) or "—"
            missing = [n for n, v in (("components", comps), ("tests", tests), ("evidence", ev)) if not v] if q["critical"] and not q["out_of_scope"] else []
            print(f"| {k} | {crit} | {spec} | {cl} | {', '.join(apis) or '—'} | {', '.join(data) or '—'} | {', '.join(sec) or '—'} | {tl} | {len(ev)} | {st}{' — missing ' + ', '.join(missing) if missing else ''} |")
        return
    if a.action == "export":
        nodes = [{"id": k, "type": "requirement", "label": q["text"][:40], "status": req_status(r, k)} for k, q in r["requirements"].items()]
        nodes += [{"id": k, "type": c["kind"], "label": c["name"], "status": c["status"]} for k, c in r["components"].items()]
        nodes += [{"id": k, "type": "test", "label": t["name"], "status": t["status"]} for k, t in r["tests"].items()]
        nodes += [{"id": k, "type": n["type"], "label": n["name"], "status": ""} for k, n in r["nodes"].items()]
        print(json.dumps({"nodes": nodes, "edges": r["edges"]}, indent=2, ensure_ascii=False))


# ------------------------------------------------------------------ loops (Part VIII)
def task_deps_open(r, t):
    return [d for d in t["deps"] if r["tasks"].get(d, {}).get("status") != "VERIFIED"]


def set_task(t, status, note=""):
    t["log"].append({"ts": now(), "status_from": t["status"], "status": status, "stage": t["stage"], "note": note})
    t["status"] = status


def cmd_task(a):
    """Zero-Skip task registry (§21) combined with the Continuous Engineering Loop (§9, §20)."""
    r = load(a)
    T = r["tasks"]
    if a.action == "add":
        if not a.objective or not a.acceptance:
            raise Refused("Every loop needs --objective and --acceptance (§9.2, §20.3).")
        if a.risk and a.risk.upper() not in RISKS:
            raise Refused(f"--risk must be one of {RISKS}")
        missing_deps = [d for d in csv(a.deps) if d not in T]
        if missing_deps:
            raise Refused(f"Unknown dependencies {missing_deps}")
        bad = [x for x in csv(a.req) if x not in r["requirements"]] + [x for x in csv(a.comp) if x not in r["components"]]
        if bad:
            raise Refused(f"Unknown requirement/component references {bad}")
        tid = nid(T, "T")
        T[tid] = {"title": a.title, "description": a.description or "", "objective": a.objective, "initial_state": a.initial or "",
                  "inputs": semi(a.inputs), "expected": a.expected or "", "acceptance": semi(a.acceptance),
                  "requirements": csv(a.req), "components": csv(a.comp), "deps": csv(a.deps), "agent": a.agent or "", "model": a.model or "",
                  "resources": a.resources or "", "risk": (a.risk or "MEDIUM").upper(), "budget": a.budget or DEFAULT_BUDGET,
                  "execution_budget": a.exec_budget or "", "attempts": 0, "stage": "PLAN", "status": "CREATED",
                  "stop": a.stop or "attempt budget exhausted → BLOCKED", "approval_required": bool(a.approval_required), "approval": None,
                  "next_action": "validate (requirement reference, responsible agent, expected result)",
                  "evidence": [], "failures": [], "handoffs": [], "reviews": [], "log": [{"ts": now(), "status": "CREATED", "stage": "PLAN"}]}
        save(a, r, "task.add", tid); print(f"{tid} CREATED — {a.title} (budget {T[tid]['budget']} attempts, risk {T[tid]['risk']})"); return
    t = T.get(a.title)
    if not t:
        raise Refused(f"Unknown task {a.title}")
    tid = a.title
    t.setdefault("status", "CREATED")
    if t["status"] in ("VERIFIED", "CANCELLED") and a.action != "show":
        raise Refused(f"{tid} is {t['status']}")
    if a.action == "validate":
        if t["status"] != "CREATED":
            raise Refused(f"{tid} is {t['status']}; validate requires CREATED (§21.2)")
        miss = [n for n, v in (("requirement reference", t["requirements"]), ("responsible agent", t["agent"]), ("expected result", t["expected"]),
                               ("acceptance criteria", t["acceptance"])) if not v]
        if miss:
            raise Refused(f"{tid} cannot be VALIDATED — missing {', '.join(miss)} (§21.1 task registry).")
        set_task(t, "VALIDATED"); t["next_action"] = "release to READY when dependencies are VERIFIED"
    elif a.action == "ready":
        if t["status"] != "VALIDATED":
            raise Refused(f"{tid} is {t['status']}; ready requires VALIDATED (§21.2)")
        open_ = task_deps_open(r, t)
        if open_:
            raise Refused(f"{tid} cannot be READY: mandatory dependencies not VERIFIED {open_} (§21.3)")
        if t["approval_required"] and not t["approval"]:
            set_task(t, "NEEDS_APPROVAL"); t["next_action"] = "human approval required (cf.py task approve T --by NAME)"
            save(a, r, "task.needs_approval", tid); print(f"{tid} → NEEDS_APPROVAL"); return
        set_task(t, "READY"); t["next_action"] = "advance to BUILD"
    elif a.action == "approve":
        if not a.by:
            raise Refused("--by <human> required (§21.10)")
        if t["status"] != "NEEDS_APPROVAL":
            raise Refused(f"{tid} is {t['status']}, not NEEDS_APPROVAL")
        t["approval"] = {"by": a.by, "ts": now(), "scope": t["title"]}
        r["approvals"].append({"target": tid, "by": a.by, "scope": "task " + t["title"], "ts": now()})
        set_task(t, "READY", f"approved by {a.by}")
    elif a.action == "advance":
        if t["status"] in ("BLOCKED", "FAILED", "DEFERRED", "NEEDS_APPROVAL", "CREATED", "VALIDATED"):
            raise Refused(f"{tid} is {t['status']}" + (": validate and release it first (§21.2)" if t["status"] in ("CREATED", "VALIDATED") else f": {t.get('blocker', '')}"))
        open_ = task_deps_open(r, t)
        if open_:
            raise Refused(f"Dependencies not VERIFIED: {open_} (§21.3)")
        i = LOOP.index(t["stage"])
        nxt = "TEST" if t["stage"] == "REPAIR" else "REGRESSION" if t["stage"] == "TEST" else LOOP[i + 1]
        if t["stage"] in ("BUILD", "REPAIR"):
            t["attempts"] += 1          # every build/repair is an attempt against the budget (§9.2)
        if nxt == "VERIFY":
            notimpl = [c for c in t["components"] if r["components"][c]["status"] not in ("IMPLEMENTED", "TESTED", "VERIFIED", "APPROVED", "RELEASED")]
            if notimpl:
                raise Refused(f"Components {notimpl} are not IMPLEMENTED — generated code is not implemented functionality (§28.18). "
                              "Apply the change to the project and run `comp status … IMPLEMENTED --files …`.")
            linked = [k for k, x in r["tests"].items() if set(x["targets"]) & set(t["requirements"] + t["components"])]
            bad = [k for k in linked if r["tests"][k]["status"] != "PASSED"]
            if not linked:
                raise Refused("No linked tests — cannot reach VERIFY (no verification path).")
            if bad:
                raise Refused(f"Linked tests not PASSED: {bad} — record a failure (`task fail`) and REPAIR.")
        if nxt == "RECORD" and not (t["evidence"] or a.evidence):
            raise Refused("RECORD requires --evidence of the verified result.")
        if nxt == "RECORD" and t.get("risk") == "CRITICAL" and not any(rv["verdict"] == "pass" for rv in t.get("reviews", [])) and not a.no_reviewer:
            raise Refused("CRITICAL task: an independent review is required before RECORD (`cf.py review T --reviewer … --verdict pass --evidence …`), "
                          "or state why none is available with --no-reviewer \"reason\" (§17.7).")
        if nxt == "RECORD" and a.no_reviewer:
            t.setdefault("reviews", []).append({"ts": now(), "reviewer": None, "verdict": "unavailable", "evidence": a.no_reviewer, "notes": "no independent reviewer available"})
        t["evidence"] += csv(a.evidence)
        t["stage"] = nxt
        if t["status"] == "READY":
            set_task(t, "IN_PROGRESS")
        if nxt == "VERIFY":
            set_task(t, "UNDER_VERIFICATION")
        if nxt == "RECORD":
            set_task(t, "VERIFIED"); t["next_action"] = "done"
        else:
            t["next_action"] = f"complete {nxt}"
        t["log"].append({"ts": now(), "stage": nxt, "status": t["status"]})
        save(a, r, "task.advance", f"{tid} → {nxt}", agent=t["agent"], task=tid)
        print(f"{tid}: {LOOP[i]} → {nxt} · {t['status']}"); return
    elif a.action == "fail":
        cls = FAILURE_ALIASES.get((a.cause or "").lower(), (a.cause or "").upper())
        if cls not in FAILURE_CLASSES:
            raise Refused(f"--cause must classify the failure: {', '.join(FAILURE_CLASSES)} (§20.4)")
        if not a.detail:
            raise Refused("--detail required: expected vs. actual behaviour and the captured log (§20.5 steps 1–3)")
        t["failures"].append({"ts": now(), "attempt": t["attempts"], "cause": cls, "detail": a.detail, "strategy": a.strategy or "", "log": a.log or ""})
        same = [f for f in t["failures"][:-1] if f["strategy"] and f["strategy"] == (a.strategy or "")]
        if t["attempts"] >= t["budget"] or len(same) >= 1 and len([f for f in t["failures"] if f["strategy"] == (a.strategy or "")]) >= 3:
            set_task(t, "BLOCKED", "anti-loop")
            t["blocker"] = f"attempt budget {t['budget']} exhausted or strategy repeated — last cause: {cls}"
            t["next_action"] = "stop, review previous attempts, change the diagnostic approach, identify missing information, escalate (§20.6)"
            save(a, r, "task.blocked", tid, task=tid)
            print(f"{tid} BLOCKED — {t['blocker']}. {t['next_action']}"); return 1
        if same:
            print(f"⚠ Strategy '{a.strategy}' already failed — choose a different correction (§20.6).")
        t["stage"] = "REPAIR"; t["log"].append({"ts": now(), "stage": "REPAIR", "cause": cls})
        t["next_action"] = "smallest safe correction, then TEST and REGRESSION (§20.5)"
        save(a, r, "task.fail", f"{tid} cause={cls}", task=tid)
        print(f"{tid} → REPAIR (attempt {t['attempts']}/{t['budget']}, {cls})"); return
    elif a.action == "block":
        if not a.detail:
            raise Refused("--detail required")
        set_task(t, "BLOCKED"); t["blocker"] = a.detail; t["next_action"] = a.next or "resolve blocker"
    elif a.action == "unblock":
        if t["status"] != "BLOCKED":
            raise Refused(f"{tid} is {t['status']}")
        if not a.strategy:
            raise Refused("--strategy required: describe the NEW approach (§20.6 change the diagnostic approach)")
        t["budget"] = t["attempts"] + (a.budget or DEFAULT_BUDGET); t["stage"] = "PLAN"
        set_task(t, "VALIDATED", "re-planned: " + a.strategy); t["next_action"] = "release to READY"
    elif a.action in ("defer", "cancel"):
        if not a.detail:
            raise Refused(f"{a.action} requires --detail (no silent omission, §28.12)")
        crit = [q for q in t["requirements"] if r["requirements"][q]["critical"]]
        if a.action == "cancel" and crit and not a.force:
            raise Refused(f"{tid} serves critical requirement(s) {crit}; cancelling needs --force and a recorded decision (§3.5).")
        set_task(t, "DEFERRED" if a.action == "defer" else "CANCELLED", a.detail)
    elif a.action == "reopen":
        if t["status"] != "DEFERRED":
            raise Refused("only DEFERRED tasks can be reopened")
        set_task(t, "VALIDATED", "reopened")
    elif a.action == "show":
        print(json.dumps({tid: t}, indent=2, ensure_ascii=False)); return
    save(a, r, f"task.{a.action}", tid, task=tid)
    print(f"{tid} → {t['status']}")


# ------------------------------------------------------------------ terminal capture & events (Part IX)
def run_capture(a, command, reason):
    d = cfdir(a) / "runs"; d.mkdir(parents=True, exist_ok=True)
    stamp = dt.datetime.now().strftime("%Y%m%d-%H%M%S-%f")
    log = d / f"{stamp}.log"
    emit(a, "terminal.start", command=command, reason=reason, agent=os.environ.get("CODEFORGE_AGENT", ""), task=os.environ.get("CODEFORGE_TASK", ""))
    t0 = time.time()
    p = subprocess.run(command, shell=True, cwd=str(base(a)), capture_output=True, text=True)
    out = (p.stdout or "") + (("\n[stderr]\n" + p.stderr) if p.stderr else "")
    out = redact(out)
    log.write_text(f"$ {command}\n{out}\n[exit {p.returncode}]\n", encoding="utf-8")
    res = {"command": command, "exit": p.returncode, "seconds": round(time.time() - t0, 2), "log": str(log.relative_to(base(a))),
           "tail": out[-2000:]}
    emit(a, "terminal.end", **res, task=os.environ.get("CODEFORGE_TASK", ""))
    if p.returncode != 0:
        emit(a, "error", source="terminal", command=command, message=out[-600:])
    return res


SECRET_RX = re.compile(r"(AKIA[0-9A-Z]{16}|sk-[A-Za-z0-9_\-]{20,}|gh[pousr]_[A-Za-z0-9]{30,}|xox[abpr]-[A-Za-z0-9\-]{10,}|AIza[0-9A-Za-z_\-]{35}|-----BEGIN [A-Z ]*PRIVATE KEY-----)")


try:                                                     # M17 redaction adapted from ECC (scripts/redaction.py, NOTICE-ECC.md)
    sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
    from redaction import redact as _redact
except ImportError:                                      # pragma: no cover — the legacy pattern still protects logs
    _redact = None


def redact(s):
    """Never expose secrets in logs, context packages or diffs (M17): PEM blocks, JWTs, assignments, tokens."""
    if _redact is not None:
        return _redact(s)
    return SECRET_RX.sub("[REDACTED-SECRET]", s)


CMD_RULES = [   # (category, regex, risk) — first match wins (§3.8, §13.5, §21.10)
    ("DESTRUCTIVE", r"\brm\s+-[a-z]*r|\bgit\s+clean\s+-[a-z]*f|\bgit\s+reset\s+--hard|\bgit\s+push\b.*(--force|-f\b)|\bdrop\s+(table|database|schema)\b|\btruncate\s+table\b|\bkubectl\s+delete\b|\bterraform\s+destroy\b|\bmkfs\b|\bdd\s+if=",
     "irreversible deletion or history rewrite"),
    ("PRODUCTION_DB", r"\b(psql|mysql|mongosh|sqlcmd)\b.*\b(delete\s+from|update\s+\w+\s+set|alter\s+table|insert\s+into)\b", "modifies a database through a client"),
    ("DEPLOY_PUBLISH", r"\bterraform\s+apply\b|\bnpm\s+publish\b|\bvercel\b.*--prod|\bdocker\s+push\b|\bgit\s+push\b|\bfirebase\s+deploy\b|\bfly(ctl)?\s+deploy\b|\bkubectl\s+apply\b|\bhelm\s+(install|upgrade)\b|\bgh\s+release\s+create\b",
     "external publication or deployment"),
    ("SECRETS", r"\bgh\s+secret\s+set\b|\bvercel\s+env\s+add\b|\bkubectl\s+create\s+secret\b|\baws\s+secretsmanager\b|\bgcloud\s+secrets\b", "manages secrets"),
    ("PERMISSIONS", r"\bsudo\b|\bchmod\s+(-R\s+)?[0-7]*7[0-7]{0,2}\b|\bchown\b|\bsetfacl\b", "changes permissions or elevates privileges"),
    ("GLOBAL_CONFIG", r"\bgit\s+config\s+--global\b|\bnpm\s+config\s+set\b|\bsetx\b|\bdefaults\s+write\b|\bsystemctl\s+(enable|disable|start|stop)\b", "changes global configuration"),
    ("INSTALL", r"\b(apt(-get)?|dnf|yum|pacman|apk)\s+(install|add|remove)\b|\bbrew\s+(install|uninstall)\b|\b(npm|pnpm)\s+(i|install|add)\s+(-g\s+)?[^-\s]\S*|\byarn\s+(global\s+)?add\b|\bpip3?\s+install\s+(?!-r\b)[^-\s]\S*|\bcargo\s+install\b|\bgem\s+install\b|\bgo\s+install\b|\bcurl\b.*\|\s*(ba)?sh",
     "installs or changes software (§13.5: version, compatibility, licence and resources must be stated)"),
]
CMD_RULES = [(c, re.compile(rx, re.I), risk) for c, rx, risk in CMD_RULES]


def classify_command(cmd):
    for cat, rx, risk in CMD_RULES:
        if rx.search(cmd):
            return cat, risk
    return None, None


def cmd_run(a):
    cmd = " ".join(shlex.quote(x) if " " in x else x for x in a.command)
    cat, risk = classify_command(cmd)
    if cat and not a.approved_by:
        r = load(a)
        r["pending_approvals"].append({"id": nid({p["id"]: 1 for p in r["pending_approvals"]}, "AP"), "action": cmd, "category": cat,
                                       "risk": risk, "scope": a.scope or f"single command in {base(a)}", "reason": a.reason or "",
                                       "requested": now(), "status": "PENDING"})
        save(a, r, "approval.requested", f"[{cat}] {cmd}")
        raise Refused(f"'{cmd}' is {cat} ({risk}) — added to the APPROVAL CENTER with its scope and risk (§3.8, §21.10). "
                      "Re-run with --approved-by <human> after explicit approval.")
    if a.approved_by:
        r = load(a)
        r["approvals"].append({"target": cmd, "by": a.approved_by, "scope": "single command", "ts": now()})
        for p in r["pending_approvals"]:
            if p["action"] == cmd and p["status"] == "PENDING":
                p["status"] = f"APPROVED by {a.approved_by}"
        save(a, r, "approval.granted", cmd)
    res = run_capture(a, cmd, a.reason or "")
    print(res["tail"][-1500:])
    print(f"[exit {res['exit']} · {res['seconds']}s · log {res['log']}]")
    return res["exit"]


def cmd_event(a):
    data = json.loads(a.data) if a.data else {}
    if a.kind == "usage":
        need = [k for k in ("provider", "model") if k not in data]
        if need:
            raise Refused(f"usage events need {need} and provider-reported token counts (§7.4: never estimate silently)")
    ev = emit(a, a.kind, message=a.message, agent=a.agent or os.environ.get("CODEFORGE_AGENT", ""),
              task=a.task or os.environ.get("CODEFORGE_TASK", ""), tool=a.tool or "", status=a.status or "", **data)
    if a.kind == "usage":
        r = load(a); r["usage"].append(ev); save(a, r, "usage", f"{data.get('provider')}/{data.get('model')}")
    print("event recorded")


def cmd_approve(a):
    r = load(a)
    p = next((x for x in r["pending_approvals"] if x["id"] == a.id), None)
    if not p:
        raise Refused(f"Unknown approval request {a.id}")
    if not a.by:
        raise Refused("--by <human> required")
    p["status"] = ("APPROVED by " if not a.reject else "REJECTED by ") + a.by
    r["approvals"].append({"target": p["action"], "by": a.by, "scope": "pending request " + a.id, "ts": now(), "rejected": a.reject})
    save(a, r, "approval", f"{a.id} {p['status']}"); print(f"{a.id}: {p['status']} — this approval covers only: {p['action']}")


def cmd_security(a):
    r = load(a)
    if a.action == "add":
        sid = nid({s["id"]: 1 for s in r["security"]}, "SEC")
        r["security"].append({"id": sid, "title": a.title, "severity": a.severity, "location": a.location or "", "status": "OPEN", "ts": now()})
        save(a, r, "security.add", sid); print(f"{sid} [{a.severity}] {a.title}")
    else:
        s = next((x for x in r["security"] if x["id"] == a.title), None)
        if not s:
            raise Refused("unknown finding")
        if not a.evidence:
            raise Refused("Closing a finding requires --evidence of the fix/verification.")
        s["status"] = "RESOLVED"; s["evidence"] = a.evidence; save(a, r, "security.resolve", a.title); print(f"{a.title} RESOLVED")


# ------------------------------------------------------------------ checkpoints & status
def checkpoint_verified(r, base_dir):
    crit = {"BROKEN_RELATIONSHIP", "UNDEFINED_BEHAVIOUR", "CIRCULAR_DEPENDENCY", "GRAPH_REPO_MISMATCH"}
    return not any(t["status"] == "FAILED" for t in r["tests"].values()) and not any(k in crit for k, _ in integrity(r, base_dir))


def cmd_checkpoint(a):
    r = load(a)
    d = cfdir(a) / "checkpoints"; d.mkdir(parents=True, exist_ok=True)
    head = git(a, "rev-parse", "--short", "HEAD")
    dirty = git(a, "status", "--porcelain")
    tc = {}
    for t in r["tests"].values():
        tc[t["status"]] = tc.get(t["status"], 0) + 1
    cp = {"id": f"v{r['version'] + 1}", "ts": now(), "note": a.note or "", "project_id": r["project"]["id"], "record_version": r["version"] + 1,
          "git_head": head or "no git",
          "current_task": next((k for k, t in r["tasks"].items() if t.get("status") in ("IN_PROGRESS", "UNDER_VERIFICATION", "READY")), ""),
          "completed_tasks": [k for k, t in r["tasks"].items() if t.get("status") in ("VERIFIED", "CANCELLED")],
          "verified_tasks": [k for k, t in r["tasks"].items() if t.get("status") == "VERIFIED"],
          "active_tasks": [k for k, t in r["tasks"].items() if t.get("status") in ("READY", "IN_PROGRESS", "UNDER_VERIFICATION")],
          "unverified_changes": [l[3:] for l in (dirty or "").splitlines() if not l[3:].startswith(".codeforge")],
          "modified_files": [l[3:] for l in (dirty or "").splitlines() if not l[3:].startswith(".codeforge")],
          "blockers": [k for k, t in r["tasks"].items() if t.get("status") == "BLOCKED"],
          "decisions": [x["id"] for x in r["decisions"]], "test_results": tc,
          "pending_approvals": [x["id"] for x in r["pending_approvals"] if x["status"] == "PENDING"],
          "next_action": a.next or "", "verified": checkpoint_verified(r, base(a))}
    r["checkpoints"].append(cp)
    save(a, r, "checkpoint", cp["id"])
    (d / f"{cp['id']}.json").write_text((cfdir(a) / "record.json").read_text(encoding="utf-8"), encoding="utf-8")
    print(f"Checkpoint {cp['id']} saved ({'VERIFIED' if cp['verified'] else 'UNVERIFIED — failing tests or critical graph issues'}; "
          f"git {cp['git_head']}, {len(cp['unverified_changes'])} unverified changes, {len(cp['pending_approvals'])} pending approvals)")


def cmd_resume(a):
    d = cfdir(a)
    target = a.from_
    if a.last_verified:
        r0 = load(a, verify=False)
        ver = [c["id"] for c in r0["checkpoints"] if c.get("verified")]
        if not ver:
            raise Refused("No verified checkpoint exists — do not assume previous work completed (§20.7).")
        target = ver[-1]
    if target:
        src = d / "checkpoints" / f"{target}.json"
        if not src.exists():
            raise Refused(f"Checkpoint {target} not found — available: {sorted(p.stem for p in (d / 'checkpoints').glob('*.json'))}")
        r = json.loads(src.read_text(encoding="utf-8"))
        if r.get("integrity") != digest(r):
            raise Refused("Checkpoint file is itself corrupted.")
        (d / "record.json").write_text(json.dumps(r, indent=2, ensure_ascii=False), encoding="utf-8")
        emit(a, "record", action="restore", detail=target)
        print(f"Restored record from checkpoint {target}")
    cmd_status(a)


def cmd_status(a):
    r = load(a)
    p = r["project"]
    tc = {}
    for t in r["tests"].values():
        tc[t["status"]] = tc.get(t["status"], 0) + 1
    cc = {}
    for c in r["components"].values():
        cc[c["status"]] = cc.get(c["status"], 0) + 1
    iss = integrity(r, base(a))
    last = r["checkpoints"][-1] if r["checkpoints"] else None
    print(f"# {p['name']} ({p['id']}) · record v{r['version']} · {r['updated']}\nObjective: {p['objective']}")
    print(f"Requirements: {len(r['requirements'])} · Components: {len(r['components'])} " + str(cc) + f" · Tests: {len(r['tests'])} " + str(tc))
    print("Tasks: " + ", ".join(f"{k} {t.get('status')}@{t['stage']}" for k, t in r["tasks"].items()) if r["tasks"] else "Tasks: none")
    print(f"Pending approvals: {sum(1 for x in r['pending_approvals'] if x['status'] == 'PENDING')} · Open security findings: "
          f"{sum(1 for s in r['security'] if s['status'] == 'OPEN')} · Graph issues: {len(iss)}")
    print(f"Last checkpoint: {last['id'] + ' ' + last['ts'] if last else 'none'}")
    nx = next_action(r)
    print(f"Next: {nx}")


def next_action(r):
    """§25 NEXT: the next valid action, respecting the zero-skip lifecycle."""
    T = r["tasks"]
    order = {"UNDER_VERIFICATION": 0, "IN_PROGRESS": 1, "READY": 2, "NEEDS_APPROVAL": 3, "VALIDATED": 4, "CREATED": 5}
    cands = sorted(((order[t.get("status")], k) for k, t in T.items() if t.get("status") in order), key=lambda x: x)
    for _, k in cands:
        t = T[k]
        st = t.get("status")
        if st == "VALIDATED" and task_deps_open(r, t):
            continue
        return f"{k} [{st}@{t['stage']}] — {t.get('next_action', '')}"
    pend = [x["id"] for x in r["pending_approvals"] if x["status"] == "PENDING"]
    if pend:
        return f"human approval pending: {', '.join(pend)}"
    blocked = [k for k, t in T.items() if t.get("status") == "BLOCKED"]
    if blocked:
        return f"resolve blockers: {', '.join(blocked)}"
    return "resolve graph issues / add tasks"


def cmd_decision(a):
    if not a.rationale:
        raise Refused("A decision needs --rationale (§21.9 record important decisions).")
    r = load(a)
    did = nid({d["id"]: 1 for d in r["decisions"] if isinstance(d, dict) and "id" in d}, "D")
    d = {"id": did, "ts": now(), "decision": a.text, "rationale": a.rationale, "alternatives": a.alternatives or "", "by": a.by or "", "task": a.task or ""}
    r["decisions"].append(d)
    save(a, r, "decision", f"{did} {a.text}", task=a.task)
    emit(a, "decision", id=did, message=a.text, rationale=a.rationale)
    print(f"{did} recorded: {a.text}")


def cmd_report(a):
    r = load(a)
    p = r["project"]
    iss = integrity(r, base(a))
    L = [f"# Engineering Handover — {p['name']} ({p['id']})", f"Record v{r['version']} · {r['updated']}", "", f"**Objective:** {p['objective']}", "",
         "## Requirements traceability"]
    L += ["| Requirement | Text | Status |", "|---|---|---|"] + [f"| {k} | {q['text']} | {'OUT OF SCOPE' if q['out_of_scope'] else req_status(r, k)} |" for k, q in r["requirements"].items()]
    L += ["", "## Components (generated → implemented → tested → verified → approved → released)", "| ID | Kind | Name | Status | Contract gaps |", "|---|---|---|---|---|"]
    L += [f"| {k} | {c['kind']} | {c['name']} | {c['status']} | {', '.join(contract_gaps(c)) or '—'} |" for k, c in r["components"].items()]
    L += ["", "## Tests", "| ID | Layer | Targets | Status | Evidence |", "|---|---|---|---|---|"]
    L += [f"| {k} | {t['layer']} | {', '.join(t['targets'])} | {t['status']} | {t['evidence'] or '—'} |" for k, t in r["tests"].items()]
    L += ["", "## Open issues (graph integrity)"] + ([f"- {k}: {m}" for k, m in iss] or ["- none"])
    L += ["", "## Security findings"] + ([f"- {s['id']} [{s['severity']}] {s['title']} — {s['status']}" for s in r["security"]] or ["- none"])
    L += ["", "## Release checks"] + ([f"- ✗ {b}" for b in release_blockers(r)] or ["- ✓ no blocking failures"])
    L += ["", "## Not completed / limitations", "- Items above that are not VERIFIED are incomplete (§3.10 honest completion)."]
    md = "\n".join(L)
    if a.out:
        pathlib.Path(a.out).write_text(md, encoding="utf-8"); print(f"written {a.out}")
    else:
        print(md)


# ------------------------------------------------------------------ CLI
def main(argv=None):
    ap = argparse.ArgumentParser(prog="cf.py", description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--dir")
    sp = ap.add_subparsers(dest="cmd", required=True)
    p = sp.add_parser("init"); p.add_argument("--name", required=True); p.add_argument("--objective", required=True)
    p.add_argument("--type", default="application"); p.add_argument("--complexity", default="moderate"); p.add_argument("--id"); p.add_argument("--preview")
    p.set_defaults(f=cmd_init)
    p = sp.add_parser("req"); p.add_argument("action", choices=["add", "scope-out"]); p.add_argument("text")
    p.add_argument("--area"); p.add_argument("--type", default="functional", choices=["functional", "non-functional", "security", "performance", "accessibility", "data", "integration", "platform"])
    p.add_argument("--priority", default="P2"); p.add_argument("--critical", action="store_true"); p.add_argument("--acceptance"); p.add_argument("--reason")
    p.set_defaults(f=cmd_req)
    p = sp.add_parser("comp"); p.add_argument("action", choices=["add", "contract", "status"]); p.add_argument("name")
    p.add_argument("status", nargs="?"); p.add_argument("--kind", default="other"); p.add_argument("--req"); p.add_argument("--files")
    p.add_argument("--id"); p.add_argument("--critical", action="store_true"); p.add_argument("--flow", help="';'-separated flow steps")
    p.add_argument("--evidence"); p.add_argument("--by")
    for f in CONTRACT_FIELDS:
        p.add_argument(f"--{f.replace('_', '-')}", dest=f)
    p.set_defaults(f=cmd_comp)
    p = sp.add_parser("test"); p.add_argument("action", choices=["add", "write", "result", "run", "import"]); p.add_argument("name")
    p.add_argument("status", nargs="?"); p.add_argument("--targets"); p.add_argument("--layer", default="unit"); p.add_argument("--command")
    p.add_argument("--file"); p.add_argument("--evidence"); p.add_argument("--id")
    p.add_argument("--match", help="comma-separated glob(s) over JUnit classname/name/file: one registry test aggregates all matching cases"); p.set_defaults(f=cmd_test)
    p = sp.add_parser("node"); p.add_argument("id"); p.add_argument("--type", required=True); p.add_argument("--name", default="")
    p.add_argument("--critical", action="store_true"); p.set_defaults(f=cmd_node)
    p = sp.add_parser("link"); p.add_argument("src"); p.add_argument("rel"); p.add_argument("dst"); p.set_defaults(f=cmd_link)
    p = sp.add_parser("graph"); p.add_argument("action", choices=["check", "impact", "trace", "export"]); p.add_argument("node", nargs="?")
    p.add_argument("--reseal", action="store_true"); p.set_defaults(f=cmd_graph)
    p = sp.add_parser("task", help="zero-skip task + engineering loop: add|validate|ready|approve|advance|fail|block|unblock|defer|cancel|reopen|show")
    p.add_argument("action", choices=["add", "validate", "ready", "approve", "advance", "fail", "block", "unblock", "defer", "cancel", "reopen", "show"])
    p.add_argument("title")
    for k in ("objective", "expected", "acceptance", "req", "comp", "deps", "agent", "model", "stop", "evidence", "cause", "detail", "strategy",
              "description", "initial", "inputs", "resources", "risk", "by", "next", "log"):
        p.add_argument(f"--{k}")
    p.add_argument("--exec-budget", dest="exec_budget", help="time/cost budget, e.g. '30 min' or 'US$5'")
    p.add_argument("--approval-required", action="store_true"); p.add_argument("--force", action="store_true")
    p.add_argument("--no-reviewer", dest="no_reviewer", help="reason no independent reviewer is available (CRITICAL tasks, §17.7)")
    p.add_argument("--budget", type=int); p.set_defaults(f=cmd_task)
    p = sp.add_parser("run", help="run a command with real captured output (terminal monitor)"); p.add_argument("--reason"); p.add_argument("--scope")
    p.add_argument("--approved-by"); p.add_argument("command", nargs=argparse.REMAINDER); p.set_defaults(f=cmd_run)
    p = sp.add_parser("event", help="record a real event (agent activity, tool call, usage)"); p.add_argument("kind")
    p.add_argument("message", nargs="?", default=""); p.add_argument("--agent"); p.add_argument("--task"); p.add_argument("--tool")
    p.add_argument("--status"); p.add_argument("--data", help="JSON, e.g. provider-reported usage"); p.set_defaults(f=cmd_event)
    p = sp.add_parser("approve"); p.add_argument("id"); p.add_argument("--by"); p.add_argument("--reject", action="store_true"); p.set_defaults(f=cmd_approve)
    p = sp.add_parser("security"); p.add_argument("action", choices=["add", "resolve"]); p.add_argument("title")
    p.add_argument("--severity", default="MEDIUM", choices=["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"]); p.add_argument("--location"); p.add_argument("--evidence")
    p.set_defaults(f=cmd_security)
    p = sp.add_parser("checkpoint"); p.add_argument("--note"); p.add_argument("--next"); p.set_defaults(f=cmd_checkpoint)
    p = sp.add_parser("resume"); p.add_argument("--from", dest="from_"); p.add_argument("--last-verified", action="store_true"); p.set_defaults(f=cmd_resume)
    sp.add_parser("status").set_defaults(f=cmd_status)
    p = sp.add_parser("decision", help="record an engineering decision (§10.3, §21.9)"); p.add_argument("text")
    p.add_argument("--rationale"); p.add_argument("--alternatives"); p.add_argument("--by"); p.add_argument("--task"); p.set_defaults(f=cmd_decision)
    p = sp.add_parser("report"); p.add_argument("--out"); p.set_defaults(f=cmd_report)
    try:
        import cf_gov                      # §11–§27 governance extensions (same engine, same record)
        cf_gov.register(sp)
    except ImportError:
        pass
    a = ap.parse_args(argv)
    if a.cmd == "run" and a.command and a.command[0] == "--":
        a.command = a.command[1:]
    try:
        return a.f(a) or 0
    except Refused as e:
        print(f"REFUSED: {e}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    sys.exit(main())
