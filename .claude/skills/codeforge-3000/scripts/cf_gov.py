#!/usr/bin/env python3
"""CODEFORGE 3000 — governance extensions of the engine (Master Prompt §11–§28). Registered into `cf.py`.

  adopt      §11 repository adoption registry (seed ECC / CLI-Anything / REA, 13-step audit, ADOPT…MONITOR decisions)
  benchmark  §12 product benchmarking records (8-field deliverable, observed vs. inferred)
  gates      §21.6 ten mandatory quality gates (PASSED / FAILED / BLOCKED / N/A / NEEDS APPROVAL; overrides only to N/A with reason)
  coverage   §21.5 functional coverage matrix
  redteam    §21.8 findings (13 challenge areas, 8 fields, retest, authorized exceptions)
  git        §21.9 preflight (before modifying) and review (before delivery)
  learn      §22.5 engineering memory lifecycle DISCOVERED → … → PUBLISHED
  handoff    §15.6 agent handoff contracts (9 fields)
  review     §17.7 independent review records
  connect    §28.4 connection tests (no connectivity claim without a successful test)
  deliverable §24/§27F deliverables with verified locations
  final      §27 final engineering completion report with final status
  next · blockers · history · project      §25 command interface helpers
"""
import json, os, pathlib, re, subprocess, sys

import cf
from cf import Refused, load, save, emit, now, csv, semi, nid, base, git

ROOT = pathlib.Path(__file__).resolve().parent.parent
AUDIT_STEPS = ["Confirm the repository identity and official source", "Inspect README and documentation", "Inspect directory and file structure",
               "Examine source code and architecture", "Identify dependencies and external services", "Inspect installation and configuration procedures",
               "Inspect license and usage restrictions", "Review maintenance activity and compatibility", "Examine available tests and CI workflows",
               "Identify security concerns", "Evaluate integration effort", "Test relevant functionality in an isolated environment where feasible",
               "Document evidence and limitations"]                                                            # §11.3
DECISIONS = ["ADOPT", "ADAPT", "INTEGRATE", "ISOLATE", "REJECT", "MONITOR"]                                  # §11.4
REDTEAM_AREAS = ["Incorrect assumptions", "Weak authentication", "Authorization bypass", "Data corruption", "Race conditions", "Inconsistent states",
                 "Failed integrations", "Unhandled exceptions", "Resource exhaustion", "Injection vulnerabilities", "Privacy violations",
                 "Performance bottlenecks", "Deployment weaknesses"]                                           # §21.8
GATES = ["Requirements Integrity", "Architecture Integrity", "Implementation Integrity", "Functional Integrity", "Data Integrity",
         "Integration Integrity", "Security Integrity", "Testing Integrity", "Regression Integrity", "Release Integrity"]  # §21.6
GATE_STATES = ["PASSED", "FAILED", "BLOCKED", "N/A", "NEEDS APPROVAL"]
K_FLOW = ["DISCOVERED", "GENERATED", "TESTED", "VERIFIED", "REVIEWED", "APPROVED", "PUBLISHED"]               # §22.5
K_EXTRA = ["DEPRECATED", "REJECTED", "UNDER_REVIEW"]
K_TYPES = ["engineering pattern", "api specification", "database schema", "architecture decision", "prompt", "agent", "skill", "sop", "test",
           "security finding", "failure case", "recovery procedure", "benchmark", "performance result", "deployment procedure"]
FINAL_STATES = ["VERIFIED", "PARTIAL", "BLOCKED", "FAILED", "AWAITING APPROVAL"]                             # §27G
DONE = ("IMPLEMENTED", "TESTED", "VERIFIED", "APPROVED", "RELEASED")
VERIFIEDISH = ("VERIFIED", "APPROVED", "RELEASED")


def events(a):
    f = cf.cfdir(a) / "events.jsonl"
    out = []
    if f.exists():
        for line in f.read_text(encoding="utf-8", errors="ignore").splitlines():
            try:
                out.append(json.loads(line))
            except json.JSONDecodeError:
                pass
    return out


def table(rows, cols):
    print("| " + " | ".join(cols) + " |\n|" + "---|" * len(cols))
    for row in rows:
        print("| " + " | ".join(str(x).replace("|", "/").replace("\n", " ") for x in row) + " |")


# ------------------------------------------------------------------ §11 adoption registry
def cmd_adopt(a):
    r = load(a)
    R = r.setdefault("adoption", {})
    if a.action == "seed":
        tg = json.loads((ROOT / "data" / "repository-targets.json").read_text(encoding="utf-8"))["targets"]
        added = []
        for t in tg:
            if t["name"] not in R:
                R[t["name"]] = new_repo(t["name"], t["source"], t["evaluate"], mandatory=True); added.append(t["name"])
        save(a, r, "adopt.seed", ",".join(added) or "none")
        print(f"Mandatory research targets (§11.2) registered: {', '.join(added) or 'already present'} — status NOT AUDITED")
        return
    if a.action == "list":
        table([(k, v["source"], v["decision"] or "—", f"{sum(s['status'] != 'PENDING' for s in v['audit'])}/13", v["verification_status"], "yes" if v.get("mandatory") else "")
               for k, v in R.items()], ["Repository/component", "Official source", "Decision", "Audit steps", "Verification", "Mandatory §11.2"]); return
    if a.action == "add":
        if a.name in R:
            raise Refused(f"{a.name} already registered")
        if not a.source:
            raise Refused("--source (official source URL) required (§11.3 step 1)")
        R[a.name] = new_repo(a.name, a.source, semi(a.capabilities))
        save(a, r, "adopt.add", a.name); print(f"{a.name} registered — NOT AUDITED"); return
    x = R.get(a.name)
    if not x:
        raise Refused(f"Unknown repository/component {a.name} (use `adopt add` or `adopt seed`)")
    if a.action == "audit":
        if not a.step or not 1 <= a.step <= 13:
            raise Refused("--step 1..13 required (§11.3)")
        st = (a.status or "").upper()
        if st not in ("DONE", "SKIPPED", "FAILED"):
            raise Refused("--status DONE | SKIPPED | FAILED")
        if not a.evidence:
            raise Refused("--evidence required: what was actually inspected (do not assume a feature exists from a description)")
        x["audit"][a.step - 1].update({"status": st, "evidence": a.evidence, "ts": now(), "agent": a.agent or ""})
        save(a, r, "adopt.audit", f"{a.name} step {a.step} {st}")
        print(f"{a.name} step {a.step} ({AUDIT_STEPS[a.step - 1]}): {st}"); return
    if a.action == "decide":
        d = (a.decision or "").upper()
        if d not in DECISIONS:
            raise Refused(f"--decision must be one of {DECISIONS}")
        done = {i + 1 for i, s in enumerate(x["audit"]) if s["status"] == "DONE"}
        need = {1, 2, 7} if d in ("MONITOR", "REJECT") else set(range(1, 14))
        open_ = sorted(s for s in need if s not in done and not (x["audit"][s - 1]["status"] == "SKIPPED" and d not in ("MONITOR", "REJECT")))
        if d in ("ADOPT", "ADAPT", "INTEGRATE", "ISOLATE"):
            open_ = sorted(s for s in range(1, 14) if x["audit"][s - 1]["status"] not in ("DONE", "SKIPPED")) + ([10] if x["audit"][9]["status"] != "DONE" else [])
            open_ = sorted(set(open_ + ([7] if x["audit"][6]["status"] != "DONE" else [])))
            if d in ("ADOPT", "ADAPT", "INTEGRATE") and x["audit"][11]["status"] != "DONE":
                raise Refused(f"{d} requires step 12 DONE: relevant functionality must be tested in an isolated environment before use "
                              "(§11.3, §28.9). Without an executed test the only use decisions are ISOLATE, MONITOR or REJECT.")
        if open_:
            raise Refused(f"{d} requires audit steps {open_} (§11.3). Security (10) and license (7) must be DONE for any use; SKIPPED steps need evidence of why.")
        if d == "REJECT" and not a.reason:
            raise Refused("REJECT requires --reason (§11.4)")
        req = {"version": a.version, "license": a.license, "evidence": a.evidence, "agent": a.agent}
        miss = [k for k, v in req.items() if not v]
        if miss:
            raise Refused(f"Decision record needs {miss} (§11.4: version/commit, license, evidence, responsible agent)")
        x.update({"decision": d, "version": a.version, "license": a.license, "evidence": x["evidence"] + [a.evidence], "agent": a.agent,
                  "integration_requirements": a.integration or x["integration_requirements"], "security": a.security or x["security"],
                  "capabilities": semi(a.capabilities) or x["capabilities"], "reason": a.reason or "", "decided": now(),
                  "verification_status": "NOT VERIFIED" if d in ("ADOPT", "ADAPT", "INTEGRATE", "ISOLATE") else "N/A"})
        save(a, r, "adopt.decide", f"{a.name} {d}"); print(f"{a.name}: {d} (verification: {x['verification_status']}) — not 'integrated' until verified (§11.6)"); return
    if a.action == "verify":
        if x["decision"] not in ("ADOPT", "ADAPT", "INTEGRATE", "ISOLATE"):
            raise Refused("Only ADOPT / ADAPT / INTEGRATE / ISOLATE decisions can be verified")
        if not a.evidence:
            raise Refused("--evidence of the performed and tested integration is required (§11.6)")
        x["verification_status"] = "VERIFIED"; x["evidence"].append(a.evidence)
        save(a, r, "adopt.verify", a.name); print(f"{a.name}: integration VERIFIED"); return
    if a.action == "show":
        print(json.dumps({a.name: x}, indent=2, ensure_ascii=False))


def new_repo(name, source, caps, mandatory=False):
    return {"source": source, "mandatory": mandatory, "capabilities": caps, "audit": [{"step": i + 1, "name": s, "status": "PENDING", "evidence": ""} for i, s in enumerate(AUDIT_STEPS)],
            "decision": None, "version": "", "license": "", "evidence": [], "integration_requirements": "", "security": "", "agent": "",
            "verification_status": "NOT AUDITED", "created": now()}


# ------------------------------------------------------------------ §12 benchmarking
def cmd_benchmark(a):
    r = load(a)
    B = r.setdefault("benchmarks", [])
    if a.action == "list":
        table([(b["id"], b["product"], b["capability"], b["observation"], b["source"], b["action"]) for b in B],
              ["ID", "Product", "Observed capability", "Observed/inferred", "Evidence source", "Recommended action"]); return
    req = {"capability": a.capability, "source": a.source, "relevance": a.relevance, "benefit": a.benefit, "limitations": a.limitations,
           "complexity": a.complexity, "action": a.recommendation}
    miss = [k for k, v in req.items() if not v]
    if miss:
        raise Refused(f"benchmark record needs {miss} (§12.5); verify current capabilities through reliable sources (§12.4)")
    if a.observation not in ("observed", "inferred"):
        raise Refused("--observation observed|inferred (§12.4 distinguish observed functionality from inferred architecture)")
    b = {"id": nid({x["id"]: 1 for x in B}, "BM"), "product": a.product, **req, "observation": a.observation,
         "dimensions": csv(a.dimensions), "ts": now(), "reason": a.reason or ""}
    B.append(b); save(a, r, "benchmark.add", b["id"]); print(f"{b['id']} {a.product}: {a.capability} ({a.observation}) → {a.recommendation}")


# ------------------------------------------------------------------ §21.6 gates
def compute_gates(r, base_dir, evs):
    iss = cf.integrity(r, base_dir)
    kinds = {k for k, _ in iss}
    inscope = {k: q for k, q in r["requirements"].items() if not q["out_of_scope"]}
    G = []
    # 1 requirements
    if not inscope:
        G.append(("BLOCKED", "no requirements recorded"))
    else:
        noac = [k for k, q in inscope.items() if not q["acceptance"]]
        G.append(("FAILED", f"requirements without acceptance criteria {noac}") if noac else ("PASSED", f"{len(inscope)} requirements with IDs and acceptance criteria"))
    # 2 architecture
    arch = [k for k in ("BROKEN_RELATIONSHIP", "CIRCULAR_DEPENDENCY", "GRAPH_REPO_MISMATCH", "ORPHAN_COMPONENT") if k in kinds]
    G.append(("BLOCKED", "no components recorded") if not r["components"] else ("FAILED", f"graph issues {arch}") if arch else ("PASSED", "graph consistent"))
    # 3 implementation
    notimpl = [k for k in inscope if not any(k in c["requirements"] and c["status"] in DONE for c in r["components"].values())]
    G.append(("FAILED", f"requirements not implemented {notimpl}") if notimpl else ("PASSED", "every in-scope requirement has an implemented component"))
    # 4 functional
    runs = [e for e in evs if e.get("kind") == "audit_run"]
    if "UNDEFINED_BEHAVIOUR" in kinds:
        G.append(("FAILED", "interactive components without behaviour contract"))
    elif not runs:
        G.append(("BLOCKED", "functional flow audit not executed (flow_audit.py <repo> --emit)"))
    elif runs[-1].get("high", 0):
        G.append(("FAILED", f"latest flow audit: {runs[-1]['high']} HIGH findings"))
    else:
        G.append(("PASSED", f"contracts complete; latest flow audit {runs[-1]['ts']} without HIGH findings"))
    # 5 data / 6 integration
    def gate_for(pred, label):
        comps = [k for k, c in r["components"].items() if pred(c)]
        if not comps:
            return ("N/A", f"no {label} components")
        bad = [k for k in comps if not any(k in t["targets"] or set(t["targets"]) & set(r["components"][k]["requirements"]) for t in r["tests"].values() if t["status"] == "PASSED")
               or any(t["status"] != "PASSED" for t in r["tests"].values() if k in t["targets"])]
        return ("FAILED", f"{label} components without passing tests {bad}") if bad else ("PASSED", f"{len(comps)} {label} components tested")
    G.append(gate_for(lambda c: c["kind"] == "db" or c["contract"].get("data_op"), "data"))
    integ = gate_for(lambda c: c["kind"] in ("api", "integration") or c["contract"].get("api"), "integration")
    ext = [k for k, c in r["components"].items() if c["kind"] == "integration"] + [k for k, n in r["nodes"].items() if n["type"] == "integration"]
    conns = r.get("connections", {})
    if ext and integ[0] != "FAILED":
        nc = [k for k in ext if not any(v["status"] == "PASSED" and (v.get("target") == k or k in v.get("target", "")) for v in conns.values())]
        if nc:
            integ = ("FAILED", f"external integrations without a successful connection test {nc} (§28.4)")
    G.append(integ)
    # 7 security
    sec = [s["id"] for s in r["security"] if s["severity"] in ("CRITICAL", "HIGH") and s["status"] == "OPEN"]
    rt = [f["id"] for f in r.get("redteam", []) if f["severity"] == "CRITICAL" and f["status"] != "RESOLVED" and not f.get("exception")]
    scans = [e for e in evs if e.get("kind") == "secret_scan"]
    if sec or rt:
        G.append(("FAILED", f"open findings {sec + rt}"))
    elif not scans:
        G.append(("BLOCKED", "secret scan not executed (secret_scan.py <repo> --emit)"))
    elif scans[-1].get("found", 0):
        G.append(("FAILED", f"latest secret scan found {scans[-1]['found']} potential secrets"))
    else:
        G.append(("PASSED", "no open HIGH/CRITICAL findings; latest secret scan clean"))
    # 8 testing
    T = r["tests"]
    crit_untested = [k for k, q in inscope.items() if q["critical"] and not any((k in t["targets"] or set(t["targets"]) & {x for x, c in r["components"].items() if k in c["requirements"]}) and t["status"] in ("PASSED", "FAILED") for t in T.values())]
    if not T:
        G.append(("FAILED", "no tests"))
    elif any(t["status"] == "FAILED" for t in T.values()):
        G.append(("FAILED", f"failing tests {[k for k, t in T.items() if t['status'] == 'FAILED']}"))
    elif crit_untested:
        G.append(("BLOCKED", f"critical requirements without executed tests {crit_untested}"))
    else:
        notrun = [k for k, t in T.items() if t["status"] in cf.NOT_RUN]
        G.append(("FAILED", f"tests designed/written but not executed {notrun}") if notrun else ("PASSED", f"{len(T)} tests executed, none failing"))
    # 9 regression
    last_run = max((run["ts"] for t in T.values() for run in t["runs"]), default=None)
    if not last_run:
        G.append(("BLOCKED", "no test executions recorded"))
    else:
        changed = []
        st = subprocess.run(["git", "-C", str(base_dir), "status", "--porcelain"], capture_output=True, text=True)
        if st.returncode == 0:
            import datetime as dt
            lr = dt.datetime.fromisoformat(last_run).timestamp()
            for line in st.stdout.splitlines():
                pth = base_dir / line[3:].strip()
                if not line[3:].startswith(".codeforge") and pth.is_file() and pth.stat().st_mtime > lr + 1:
                    changed.append(line[3:].strip())
        G.append(("FAILED", f"files changed after the last test run {changed[:8]} — re-run regression tests") if changed else ("PASSED", f"no changes after last test run {last_run}"))
    # 10 release
    pend = [x["id"] for x in r["pending_approvals"] if x["status"] == "PENDING"]
    blockers = cf.release_blockers(r)
    prior = [GATES[i] for i, (s, _) in enumerate(G) if s in ("FAILED", "BLOCKED")]
    if pend:
        G.append(("NEEDS APPROVAL", f"pending approvals {pend}"))
    elif blockers or prior:
        G.append(("BLOCKED", "; ".join(blockers + ([f"gates not passed: {prior}"] if prior else []))))
    else:
        G.append(("PASSED", "release checks satisfied — release approval remains a separate human decision (§21.4)"))
    # overrides (only to N/A or NEEDS APPROVAL, with reason and approver — never silent)
    out = []
    for i, (s, why) in enumerate(G):
        ov = r.get("gate_overrides", {}).get(str(i + 1))
        if ov and s != "PASSED":
            out.append((GATES[i], ov["status"], f"override by {ov['by']}: {ov['reason']} (computed: {s} — {why})"))
        else:
            out.append((GATES[i], s, why))
    return out


def cmd_gates(a):
    r = load(a)
    if a.set:
        st = (a.status or "").upper()
        if st not in ("N/A", "NEEDS APPROVAL"):
            raise Refused("Overrides may only set N/A or NEEDS APPROVAL — a gate can never be marked PASSED by hand (§21.6).")
        if not a.reason or not a.by:
            raise Refused("--reason and --by <human> required: no mandatory gate may be silently bypassed (§21.6)")
        r.setdefault("gate_overrides", {})[str(a.set)] = {"status": st, "reason": a.reason, "by": a.by, "ts": now()}
        save(a, r, "gate.override", f"G{a.set} {st} by {a.by}"); print(f"Gate {a.set} ({GATES[a.set - 1]}) override recorded: {st}"); return
    G = compute_gates(r, base(a), events(a))
    table([(f"G{i + 1:02d}", n, s, why) for i, (n, s, why) in enumerate(G)], ["Gate", "Name", "Status", "Basis"])
    emit(a, "gates", statuses={n: s for n, s, _ in G})
    bad = [n for n, s, _ in G if s in ("FAILED", "BLOCKED", "NEEDS APPROVAL")]
    print("\nALL GATES PASSED / N/A" if not bad else f"\nNot passed: {', '.join(bad)}")
    return 0 if not bad else 1


# ------------------------------------------------------------------ §21.5 coverage
def cmd_coverage(a):
    r = load(a)
    rows = []
    for k, q in r["requirements"].items():
        comps = [x for x, c in r["components"].items() if k in c["requirements"]] or [None]
        for c in comps:
            cc = r["components"].get(c, {})
            ct = cc.get("contract", {})
            tests = [x for x, t in r["tests"].items() if k in t["targets"] or (c and c in t["targets"])]
            res = ", ".join(r["tests"][x]["status"] for x in tests) or "—"
            ev = "; ".join(r["tests"][x]["evidence"] for x in tests if r["tests"][x]["evidence"]) or "—"
            status = "OUT OF SCOPE" if q["out_of_scope"] else (cc.get("status") if c else "NOT IMPLEMENTED")
            rows.append((k, q["text"], f"{c} {cc.get('name', '')}" if c else "—", ct.get("trigger", "—"), ct.get("api", "—"), ct.get("data_op", "—"),
                         ct.get("permission", "—"), ", ".join(tests) or "—", res, ev, status))
    table(rows, ["Requirement", "Feature", "Page / component", "User interaction", "API", "Database operation", "Permission", "Test", "Result", "Evidence", "Verification status"])


# ------------------------------------------------------------------ §21.8 red team
def cmd_redteam(a):
    r = load(a)
    F = r.setdefault("redteam", [])
    if a.action == "checklist":
        table([(x, len([f for f in F if f["area"] == x]), ", ".join(f["id"] for f in F if f["area"] == x and f["status"] != "RESOLVED") or "—") for x in REDTEAM_AREAS],
              ["Challenge area (§21.8)", "Findings", "Open"]); return
    if a.action == "list":
        table([(f["id"], f["severity"], f["area"], f["component"], f["status"], f.get("retest", "—"), "yes" if f.get("exception") else "") for f in F],
              ["Finding", "Severity", "Area", "Affected component", "Status", "Retest", "Authorized exception"]); return
    if a.action == "add":
        if a.area not in REDTEAM_AREAS:
            raise Refused(f"--area must be one of: {REDTEAM_AREAS}")
        req = {"component": a.component, "reproduction": a.repro, "evidence": a.evidence, "impact": a.impact, "remediation": a.remediation}
        miss = [k for k, v in req.items() if not v]
        if miss:
            raise Refused(f"finding needs {miss} (§21.8: ID, severity, component, reproduction, evidence, impact, remediation, retest)")
        f = {"id": nid({x["id"]: 1 for x in F}, "RT"), "severity": a.severity, "area": a.area, **req, "status": "OPEN", "retest": "NOT RETESTED", "ts": now()}
        F.append(f); save(a, r, "redteam.add", f["id"]); emit(a, "error", source="redteam", rule=f["id"], severity=a.severity, message=f"{a.area}: {a.impact}")
        print(f"{f['id']} [{a.severity}] {a.area} — {a.component}"); return
    f = next((x for x in F if x["id"] == a.id), None)
    if not f:
        raise Refused(f"unknown finding {a.id}")
    if a.action == "retest":
        if a.result not in ("pass", "fail") or not a.evidence:
            raise Refused("--result pass|fail and --evidence of the retest required")
        f["retest"] = f"{a.result.upper()} {now()} — {a.evidence}"
        f["status"] = "RESOLVED" if a.result == "pass" else "OPEN"
        save(a, r, "redteam.retest", f"{a.id} {a.result}"); print(f"{a.id}: retest {a.result.upper()} → {f['status']}"); return
    if a.action == "exception":
        if not a.by or not a.reason:
            raise Refused("A formally authorized exception needs --by <human> and --reason (§21.8)")
        f["exception"] = {"by": a.by, "reason": a.reason, "ts": now()}
        r["approvals"].append({"target": a.id, "by": a.by, "scope": "Red Team exception", "ts": now()})
        save(a, r, "redteam.exception", f"{a.id} by {a.by}"); print(f"{a.id}: authorized exception recorded by {a.by}")


# ------------------------------------------------------------------ §21.9 git governance
def cmd_git(a):
    r = load(a)
    if not git(a, "rev-parse", "--is-inside-work-tree"):
        raise Refused("Not a git repository — git governance not applicable here; use backups and record the rollback plan (§21.9).")
    status = git(a, "status", "--porcelain") or ""
    branch = git(a, "rev-parse", "--abbrev-ref", "HEAD")
    changes = [l for l in status.splitlines() if not l[3:].startswith(".codeforge")]
    if a.action == "preflight":
        t = r["tasks"].get(a.task) if a.task else None
        if a.task and not t:
            raise Refused(f"unknown task {a.task}")
        files = sorted({f for c in (t["components"] if t else []) for f in r["components"][c]["files"]})
        user_changes = [l for l in changes if l[3:].strip() in files or not files]
        imp = {c: cf.impact_detail(r, c) for c in (t["components"] if t else [])}
        if not a.rollback:
            raise Refused("--rollback strategy required before modifying the repository (§21.9 step 7)")
        pf = {"ts": now(), "branch": branch, "head": git(a, "rev-parse", "--short", "HEAD"), "existing_changes": changes, "scope": files,
              "impact": imp, "rollback": a.rollback, "task": a.task or ""}
        r.setdefault("git_preflights", []).append(pf)
        if t:
            t["preflight"] = pf
        save(a, r, "git.preflight", f"{a.task or 'repo'} on {branch}")
        print(f"PREFLIGHT ({branch} @ {pf['head']})\n  Existing changes: {len(changes)}" + "".join(f"\n    {l}" for l in changes[:20]))
        if user_changes and files:
            print(f"  ⚠ Uncommitted changes inside the task scope: {[l[3:] for l in user_changes]} — preserve them (§21.9).")
        print(f"  Scope files: {files or 'not declared (link components to the task)'}\n  Rollback: {a.rollback}")
        for c, d in imp.items():
            print(f"  Impact {c}: tests {d['tests'] or 'NONE'} · interfaces {d['interfaces'] or '—'} · data {d['data'] or '—'}")
        return
    if a.action == "review":
        ref = a.base or r["project"].get("git_base") or "HEAD"
        diff = git(a, "diff", "--name-status", ref) or ""
        untracked = [l[3:] for l in changes if l.startswith("??")]
        rows = [l.split("\t") for l in diff.splitlines() if l.strip()]
        deleted = [x[-1] for x in rows if x[0].startswith("D")] + [l[3:] for l in changes if l[1] == "D" or l[0] == "D"]
        sys.path.insert(0, str(ROOT / "scripts"))
        import secret_scan
        secrets = []
        for x in [x[-1] for x in rows if not x[0].startswith("D")] + untracked:
            p = base(a) / x
            if p.is_file() and p.stat().st_size < 2_000_000:
                try:
                    secrets += secret_scan.scan_text(x, p.read_text(encoding="utf-8"))
                except UnicodeDecodeError:
                    pass
        gates = compute_gates(r, base(a), events(a))
        tests = {n: s for n, s, _ in gates if n in ("Testing Integrity", "Regression Integrity")}
        verified = [f"{k} {t['title']}" for k, t in r["tasks"].items() if t.get("status") == "VERIFIED"]
        print(f"DELIVERY REVIEW (against {ref})\n  Changed files: {len(rows)} tracked + {len(untracked)} untracked")
        for x in rows[:40]:
            print(f"    {x[0]}\t{x[-1]}")
        print(f"  Deletions: {deleted or 'none'}" + ("  ⚠ confirm each deletion was intended/approved" if deleted else ""))
        print(f"  Exposed secrets in changed files: {len(secrets)}" + "".join(f"\n    {s['file']}:{s['line']} {s['type']} {s['match']}" for s in secrets[:10]))
        print(f"  Tests: {tests}")
        print("  Suggested commit message:\n    " + (f"{r['project']['name']}: " + "; ".join(verified[:5]) if verified else "(no VERIFIED tasks — nothing ready to describe as done)"))
        emit(a, "git.review", changed=len(rows) + len(untracked), deleted=len(deleted), secrets=len(secrets))
        return 1 if secrets or any(v != "PASSED" for v in tests.values()) else 0


# ------------------------------------------------------------------ §22.5 engineering memory (/CODEFORGE LEARN)
def cmd_learn(a):
    r = load(a)
    K = r.setdefault("knowledge", {})
    if a.action == "list":
        table([(k, v["type"], v["title"], v["version"], v["status"], v["source"]) for k, v in K.items()], ["ID", "Type", "Title", "Version", "Status", "Source"]); return
    if a.action == "add":
        if (a.type or "").lower() not in K_TYPES:
            raise Refused(f"--type must be one of {K_TYPES} (§22.5)")
        req = {"context": a.context, "source": a.source, "limitations": a.limitations, "reproducibility": a.reproducibility}
        miss = [k for k, v in req.items() if not v]
        if miss:
            raise Refused(f"knowledge record must preserve {miss} (§22.5: version, context, source, evidence, limitations, reproducibility)")
        kid = nid(K, "KN")
        K[kid] = {"type": a.type.lower(), "title": a.title, "version": a.version or "1.0.0", **req, "evidence": csv(a.evidence), "status": "DISCOVERED",
                  "history": [{"ts": now(), "status": "DISCOVERED"}]}
        save(a, r, "learn.add", kid); print(f"{kid} DISCOVERED — {a.title}"); return
    k = K.get(a.title)
    if not k:
        raise Refused(f"unknown knowledge record {a.title}")
    if a.action == "promote":
        to = (a.to or "").upper(); cur = k["status"]
        if to in ("DEPRECATED", "REJECTED"):
            if not a.reason:
                raise Refused(f"{to} requires --reason")
        elif to == "UNDER_REVIEW":
            if cur != "VERIFIED":
                raise Refused("UNDER_REVIEW follows VERIFIED")
        elif to == "REVIEWED":
            if cur not in ("VERIFIED", "UNDER_REVIEW"):
                raise Refused(f"{cur} → REVIEWED not allowed")
        else:
            if cur not in K_FLOW or to not in K_FLOW or K_FLOW.index(to) != K_FLOW.index(cur) + 1:
                raise Refused(f"{cur} → {to} skips the lifecycle {' → '.join(K_FLOW)} (§22.5)")
        if to in ("TESTED", "VERIFIED") and not a.evidence:
            raise Refused(f"{to} requires --evidence")
        if to == "APPROVED" and not a.by:
            raise Refused("APPROVED requires --by <human>")
        k["evidence"] += csv(a.evidence); k["status"] = to; k["history"].append({"ts": now(), "status": to, "by": a.by or "", "reason": a.reason or ""})
        save(a, r, "learn.promote", f"{a.title} {cur}→{to}"); print(f"{a.title}: {cur} → {to}")


# ------------------------------------------------------------------ §15.6 handoff, §17.7 review, §28.4 connect, deliverables
def cmd_handoff(a):
    r = load(a)
    t = r["tasks"].get(a.task)
    if not t:
        raise Refused(f"unknown task {a.task}")
    req = {"context": a.context, "inputs": a.inputs, "expected": a.expected or t.get("expected"), "evidence_requirements": a.evidence_req, "next_agent": a.to}
    miss = [k for k, v in req.items() if not v]
    if miss:
        raise Refused(f"handoff contract needs {miss} (§15.6)")
    h = {"ts": now(), "task": a.task, "from": t.get("agent", ""), "to": a.to, "context": a.context, "inputs": semi(a.inputs), "expected_output": req["expected"],
         "dependencies": t["deps"], "acceptance": t["acceptance"], "evidence_requirements": a.evidence_req, "status": t.get("status")}
    t.setdefault("handoffs", []).append(h); t["agent"] = a.to
    save(a, r, "handoff", f"{a.task} {h['from']} → {a.to}", agent=a.to, task=a.task)
    print(f"HANDOFF {a.task}: {h['from'] or '—'} → {a.to}\n" + json.dumps(h, indent=2, ensure_ascii=False))


def cmd_review(a):
    r = load(a)
    t = r["tasks"].get(a.task)
    if not t:
        raise Refused(f"unknown task {a.task}")
    if a.reviewer in (t.get("agent"), t.get("model")):
        raise Refused("The reviewer must be independent of the agent/model that produced the work (§17.7).")
    if a.verdict not in ("pass", "fail") or not a.evidence:
        raise Refused("--verdict pass|fail and --evidence (what was actually examined) required — not the original model's conclusions (§17.7)")
    rv = {"ts": now(), "reviewer": a.reviewer, "verdict": a.verdict, "evidence": a.evidence, "notes": a.notes or ""}
    t.setdefault("reviews", []).append(rv)
    save(a, r, "review", f"{a.task} {a.verdict} by {a.reviewer}", task=a.task); print(f"{a.task}: independent review {a.verdict.upper()} by {a.reviewer}")


def cmd_connect(a):
    if a.action == "list":
        r = load(a)
        table([(k, v["kind"], v.get("target", ""), v["status"], v["ts"], v["log"]) for k, v in r.get("connections", {}).items()],
              ["Connection", "Kind", "Graph node", "Status", "Tested", "Log"]); return
    if not a.command:
        raise Refused("--command that performs a real connection test is required (§28.4)")
    res = cf.run_capture(a, a.command, f"connection test {a.name}")
    r = load(a)
    st = "PASSED" if res["exit"] == 0 else "FAILED"
    r.setdefault("connections", {})[a.name] = {"kind": a.kind, "target": a.target or "", "status": st, "ts": now(), "log": res["log"], "command": a.command}
    save(a, r, "connect", f"{a.name} {st}"); print(f"Connection {a.name} ({a.kind}): {st} — log {res['log']}")
    return 0 if st == "PASSED" else 1


def cmd_deliverable(a):
    r = load(a)
    D = r.setdefault("deliverables", [])
    if a.action == "list":
        table([(d["id"], d["name"], d["path"], "exists" if (base(a) / d["path"]).exists() else "MISSING") for d in D], ["ID", "Deliverable", "Location", "Verified location"]); return
    if not a.path or not (base(a) / a.path).exists():
        raise Refused(f"deliverable location {a.path!r} does not exist — list only actual deliverables (§27F)")
    d = {"id": nid({x["id"]: 1 for x in D}, "DL"), "name": a.name, "path": a.path, "ts": now()}
    D.append(d); save(a, r, "deliverable.add", d["id"]); print(f"{d['id']} {a.name} → {a.path}")


# ------------------------------------------------------------------ §27 final report
DEP_RX = re.compile(r"(^|/)(package(-lock)?\.json|pnpm-lock\.yaml|yarn\.lock|requirements[^/]*\.txt|pyproject\.toml|poetry\.lock|Pipfile(\.lock)?|go\.(mod|sum)|Cargo\.(toml|lock)|pom\.xml|build\.gradle(\.kts)?|Gemfile(\.lock)?|composer\.(json|lock)|pubspec\.(yaml|lock)|Podfile(\.lock)?)$")
CFG_RX = re.compile(r"(^|/)(\.env[^/]*|Dockerfile|docker-compose\.ya?ml|[^/]*\.config\.[a-z]+|[^/]*\.(ya?ml|toml|ini|conf))$|^\.github/workflows/")
DB_RX = re.compile(r"(migrations?/|\.sql$|\.prisma$|(^|/)schema\.[a-z]+$)")


def final_status(r, gates):
    if r["project"].get("failed"):
        return "FAILED"
    if any(x["status"] == "PENDING" for x in r["pending_approvals"]) or any(t.get("status") == "NEEDS_APPROVAL" for t in r["tasks"].values()):
        return "AWAITING APPROVAL"
    inscope = [k for k, q in r["requirements"].items() if not q["out_of_scope"]]
    crit_blocked = [k for k, t in r["tasks"].items() if t.get("status") == "BLOCKED" and any(r["requirements"].get(q, {}).get("critical") for q in t["requirements"])]
    if crit_blocked:
        return "BLOCKED"
    if inscope and all(cf.req_status(r, k) in VERIFIEDISH for k in inscope) and all(s in ("PASSED", "N/A") for n, s, _ in gates[:9]):
        return "VERIFIED"
    return "PARTIAL"


def cmd_final(a):
    r = load(a)
    p = r["project"]
    gates = compute_gates(r, base(a), events(a))
    R = r["requirements"]; inscope = {k: q for k, q in R.items() if not q["out_of_scope"]}
    st = {k: cf.req_status(r, k) for k in inscope}
    ref = p.get("git_base")
    rows = [l.split("\t") for l in (git(a, "diff", "--name-status", ref) or "").splitlines()] if ref and git(a, "rev-parse", "--is-inside-work-tree") else []
    untracked = [l[3:] for l in (git(a, "status", "--porcelain") or "").splitlines() if l.startswith("??") and not l[3:].startswith(".codeforge")]
    created = [x[-1] for x in rows if x[0].startswith("A")] + untracked
    modified = [x[-1] for x in rows if x[0].startswith(("M", "R"))]
    deleted = [x[-1] for x in rows if x[0].startswith("D")]
    allf = created + modified + deleted
    T = r["tests"]
    count = lambda pred: sum(1 for t in T.values() if pred(t))
    fs = final_status(r, gates)
    conn_txt = ", ".join("%s=%s" % (k, v["status"]) for k, v in r.get("connections", {}).items()) or "none"
    reliab = ["%s: %s" % (k, t.get("blocker", "")) for k, t in r["tasks"].items() if t.get("status") == "BLOCKED"]
    L = [f"# FINAL ENGINEERING COMPLETION REPORT — {p['name']}", "",
         "## A. Project Identity", f"- Project name: {p['name']}", f"- Project ID: {p['id']}", f"- Version: record v{r['version']}",
         f"- Objective: {p['objective']}", f"- Target platform: {a.platform or p.get('type', '—')}", f"- Execution environment: {a.environment or 'see env_probe.py report'}", "",
         "## B. Requirements Status", f"- Total requirements: {len(R)} ({len(R) - len(inscope)} out of scope)",
         f"- Implemented requirements: {sum(v in ('IMPLEMENTED', 'TESTED') + VERIFIEDISH for v in st.values())}",
         f"- Verified requirements: {sum(v in VERIFIEDISH for v in st.values())}",
         f"- Untested requirements: {sum(1 for k in inscope if not any((k in t['targets'] or set(t['targets']) & {x for x, c in r['components'].items() if k in c['requirements']}) and t['status'] in ('PASSED', 'FAILED') for t in T.values()))}",
         f"- Blocked requirements: {sorted({q for t in r['tasks'].values() if t.get('status') == 'BLOCKED' for q in t['requirements']}) or 0}",
         f"- Not implemented requirements: {[k for k, v in st.items() if v == 'NOT IMPLEMENTED'] or 0}",
         f"- Approved exceptions: {[f['id'] for f in r.get('redteam', []) if f.get('exception')] + [f'G{k}' for k in r.get('gate_overrides', {})] or 'none'}", "",
         "## C. Technical Changes" + (f" (against {ref})" if ref else " (no git baseline recorded — changes not observable)"),
         f"- Files created: {created or 'none'}", f"- Files modified: {modified or 'none'}", f"- Files deleted: {deleted or 'none'}",
         f"- Dependencies added or changed: {[f for f in allf if DEP_RX.search(f)] or 'none'}",
         f"- Configuration changes: {[f for f in allf if CFG_RX.search(f) and not DEP_RX.search(f)] or 'none'}",
         f"- Database changes: {[f for f in allf if DB_RX.search(f)] or 'none'}",
         f"- Integrations implemented: {[k for k, c in r['components'].items() if c['kind'] in ('api', 'integration') and c['status'] in DONE] or 'none'}"
         f" · connection tests: {conn_txt}", "",
         "## D. Testing Results", f"- Tests identified: {len(T)}", f"- Tests written: {count(lambda t: t['status'] != 'DESIGNED')}",
         f"- Tests executed: {count(lambda t: t['status'] in ('PASSED', 'FAILED', 'SKIPPED'))}", f"- Tests passed: {count(lambda t: t['status'] == 'PASSED')}",
         f"- Tests failed: {count(lambda t: t['status'] == 'FAILED')}", f"- Tests skipped: {count(lambda t: t['status'] == 'SKIPPED')}",
         f"- Coverage information: {a.coverage or 'not available (no coverage report supplied)'}",
         f"- Known test limitations: {[k for k, t in T.items() if t['status'] in cf.NOT_RUN or t['status'] == 'BLOCKED'] or 'none recorded'}", "",
         "## E. Security and Reliability",
         f"- Security findings: {[(s['id'], s['severity'], s['status']) for s in r['security']] or 'none'}",
         f"- Critical unresolved risks: {[f['id'] for f in r.get('redteam', []) if f['severity'] == 'CRITICAL' and f['status'] != 'RESOLVED'] + [s['id'] for s in r['security'] if s['severity'] == 'CRITICAL' and s['status'] == 'OPEN'] or 'none'}",
         f"- Performance findings: {[f['id'] for f in r.get('redteam', []) if f['area'] == 'Performance bottlenecks'] or 'none recorded'}",
         f"- Reliability limitations: {reliab or 'none recorded'}",
         f"- Recovery considerations: last verified checkpoint {next((c['id'] for c in reversed(r['checkpoints']) if c.get('verified')), 'none')}", "",
         "## F. Deliverables"] + ([f"- {d['id']} {d['name']} — `{d['path']}` ({'verified location' if (base(a) / d['path']).exists() else 'MISSING'})" for d in r.get("deliverables", [])] or ["- none registered"]) + [
         "", "## Quality gates (§21.6)"] + [f"- {n}: **{s}** — {why}" for n, s, why in gates] + [
         "", "## G. Final Status", f"**{fs}**", "", "## H. Next Action", cf.next_action(r)]
    if fs != "VERIFIED":
        L += ["", "_Mandatory work remains unverified — the project is not reported as fully complete (§27, §28.20)._"]
    md = "\n".join(L)
    if a.out:
        pathlib.Path(a.out).write_text(md, encoding="utf-8"); print(f"Final report written to {a.out} — final status {fs}")
    else:
        print(md)
    emit(a, "final_report", status=fs)
    return 0 if fs == "VERIFIED" else 3


# ------------------------------------------------------------------ §25 helpers
def cmd_next(a):
    print(cf.next_action(load(a)))


def cmd_blockers(a):
    r = load(a)
    rows = [(k, "task", t.get("blocker", ""), t.get("next_action", "")) for k, t in r["tasks"].items() if t.get("status") == "BLOCKED"]
    rows += [(x["id"], "approval", f"[{x.get('category', '')}] {x['action']}", "human approval") for x in r["pending_approvals"] if x["status"] == "PENDING"]
    rows += [(s["id"], "security", s["title"], "resolve with evidence") for s in r["security"] if s["status"] == "OPEN" and s["severity"] in ("CRITICAL", "HIGH")]
    rows += [(f["id"], "red team", f["impact"], "remediate + retest") for f in r.get("redteam", []) if f["severity"] == "CRITICAL" and f["status"] != "RESOLVED" and not f.get("exception")]
    if rows:
        table(rows, ["ID", "Type", "Blocker", "Next action"])
    else:
        print("No blockers.")


def cmd_history(a):
    r = load(a)
    for h in r["history"][-(a.n or 40):]:
        print(f"{h['ts']}  v{h['v']:<4} {h['action']:<22} {h['detail']}")


def cmd_project(a):
    r = load(a)
    if a.action == "fail":
        if not a.reason:
            raise Refused("--reason required")
        r["project"]["failed"] = {"reason": a.reason, "ts": now()}
        save(a, r, "project.fail", a.reason); print("Project marked FAILED: intended outcome not achieved (§27G).")
    elif a.action == "baseline":
        head = git(a, "rev-parse", "HEAD")
        if not head:
            raise Refused("no git HEAD to use as baseline")
        r["project"]["git_base"] = head; save(a, r, "project.baseline", head); print(f"git baseline set to {head[:10]}")


def register(sp):
    p = sp.add_parser("adopt", help="§11 repository adoption registry"); p.add_argument("action", choices=["seed", "add", "audit", "decide", "verify", "list", "show"])
    p.add_argument("name", nargs="?"); p.add_argument("--source"); p.add_argument("--capabilities"); p.add_argument("--step", type=int); p.add_argument("--status")
    p.add_argument("--evidence"); p.add_argument("--agent"); p.add_argument("--decision"); p.add_argument("--version"); p.add_argument("--license")
    p.add_argument("--integration"); p.add_argument("--security"); p.add_argument("--reason"); p.set_defaults(f=cmd_adopt)
    p = sp.add_parser("benchmark", help="§12 product benchmarking"); p.add_argument("action", choices=["add", "list"]); p.add_argument("product", nargs="?")
    for k in ("capability", "source", "relevance", "benefit", "limitations", "complexity", "recommendation", "observation", "dimensions", "reason"):
        p.add_argument(f"--{k}")
    p.set_defaults(f=cmd_benchmark)
    p = sp.add_parser("gates", help="§21.6 quality gates"); p.add_argument("--set", type=int, choices=range(1, 11)); p.add_argument("--status")
    p.add_argument("--reason"); p.add_argument("--by"); p.set_defaults(f=cmd_gates)
    sp.add_parser("coverage", help="§21.5 functional coverage matrix").set_defaults(f=cmd_coverage)
    p = sp.add_parser("redteam", help="§21.8 Red Team findings"); p.add_argument("action", choices=["add", "retest", "exception", "list", "checklist"])
    p.add_argument("id", nargs="?"); p.add_argument("--area"); p.add_argument("--severity", default="MEDIUM", choices=["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"])
    for k in ("component", "repro", "evidence", "impact", "remediation", "result", "by", "reason"):
        p.add_argument(f"--{k}")
    p.set_defaults(f=cmd_redteam)
    p = sp.add_parser("git", help="§21.9 git governance"); p.add_argument("action", choices=["preflight", "review"]); p.add_argument("--task")
    p.add_argument("--rollback"); p.add_argument("--base"); p.set_defaults(f=cmd_git)
    p = sp.add_parser("learn", help="§22.5 engineering memory (/CODEFORGE LEARN)"); p.add_argument("action", choices=["add", "promote", "list"]); p.add_argument("title", nargs="?")
    for k in ("type", "version", "context", "source", "evidence", "limitations", "reproducibility", "to", "by", "reason"):
        p.add_argument(f"--{k}")
    p.set_defaults(f=cmd_learn)
    p = sp.add_parser("handoff", help="§15.6 agent handoff contract"); p.add_argument("task"); p.add_argument("--to"); p.add_argument("--context")
    p.add_argument("--inputs"); p.add_argument("--expected"); p.add_argument("--evidence-req", dest="evidence_req"); p.set_defaults(f=cmd_handoff)
    p = sp.add_parser("review", help="§17.7 independent review"); p.add_argument("task"); p.add_argument("--reviewer", required=True)
    p.add_argument("--verdict"); p.add_argument("--evidence"); p.add_argument("--notes"); p.set_defaults(f=cmd_review)
    p = sp.add_parser("connect", help="§28.4 connection tests"); p.add_argument("action", choices=["test", "list"]); p.add_argument("name", nargs="?")
    p.add_argument("--command"); p.add_argument("--kind", default="api", choices=["api", "db", "mcp", "service", "integration"]); p.add_argument("--target")
    p.set_defaults(f=cmd_connect)
    p = sp.add_parser("deliverable", help="§24/§27 deliverables"); p.add_argument("action", choices=["add", "list"]); p.add_argument("name", nargs="?")
    p.add_argument("--path"); p.set_defaults(f=cmd_deliverable)
    p = sp.add_parser("final", help="§27 final engineering completion report"); p.add_argument("--out"); p.add_argument("--platform"); p.add_argument("--environment")
    p.add_argument("--coverage"); p.set_defaults(f=cmd_final)
    sp.add_parser("next", help="§25 NEXT").set_defaults(f=cmd_next)
    sp.add_parser("blockers", help="§25 BLOCKERS").set_defaults(f=cmd_blockers)
    p = sp.add_parser("history", help="§25 HISTORY"); p.add_argument("-n", type=int); p.set_defaults(f=cmd_history)
    p = sp.add_parser("project", help="project-level status"); p.add_argument("action", choices=["fail", "baseline"]); p.add_argument("--reason"); p.set_defaults(f=cmd_project)
