#!/usr/bin/env python3
"""ZABATAINA 3000 — Process & Task Execution Engine (Master Prompt v2.0, Parts XIII–XV, XIX).

Persistent PROCESS RECORD (§40) in <project>/.z3000/process.json with an integrity hash (§48 #14),
audit history, and the ZERO-SKIP task state machine (§34):

  CREATED → VALIDATED → READY → IN_PROGRESS → UNDER_VERIFICATION → VERIFIED
  exceptional: BLOCKED · FAILED · NEEDS_APPROVAL · DEFERRED · CANCELLED      (only VERIFIED counts as done)

Every refusal prints the rule that was enforced. Stdlib only. Run `z3k.py <command> -h` for options.

Project:      init · track · req · task · decision · risk · evidence · deliverable · lesson · approve
Continuity:   status · history · pending · blockers · decisions · next · completed · deliverables
              resume · check · report · final · handoff        (Part XIV §42 commands)
Library:      lib add|promote|reuse|list                         (Part XV §43 TLC)
"""
import argparse, datetime as dt, hashlib, json, os, pathlib, re, sys, tempfile

TASK_FLOW = ["CREATED", "VALIDATED", "READY", "IN_PROGRESS", "UNDER_VERIFICATION", "VERIFIED"]
TASK_EXC = ["BLOCKED", "FAILED", "NEEDS_APPROVAL", "DEFERRED", "CANCELLED"]
PRIORITIES = ["P0", "P1", "P2", "P3"]
REQ_STATUS = ["NOT STARTED", "PARTIALLY VERIFIED", "VERIFIED", "BLOCKED", "NOT APPLICABLE"]
EVID_TIERS = ["E1", "E2", "E3", "E4"]
CLAIM_TYPES = ["fact", "estimate", "forecast", "opinion", "assumption", "hypothesis", "unknown"]
LIB_FLOW = ["DRAFT", "TESTED", "VERIFIED", "REVIEWED", "APPROVED", "LIBRARY"]
LIB_EXC = ["DEPRECATED", "REJECTED", "EXPERIMENTAL"]
MAX_ATTEMPTS = 3          # §34 "No infinite retry loops"
SKILL_ROOT = pathlib.Path(__file__).resolve().parent.parent


class Refused(Exception):
    """A governance rule blocked the action."""


def now():
    return dt.datetime.now().isoformat(timespec="seconds")


# ------------------------------------------------------------------ storage
def pdir(a):
    return pathlib.Path(getattr(a, "dir", None) or os.environ.get("Z3000_DIR") or ".").resolve() / ".z3000"


def digest(rec):
    body = {k: v for k, v in rec.items() if k != "integrity"}
    return hashlib.sha256(json.dumps(body, sort_keys=True, ensure_ascii=False).encode()).hexdigest()


def load(a, verify=True):
    f = pdir(a) / "process.json"
    if not f.exists():
        raise Refused(f"No process record at {f}. Run `z3k.py init` first (Part XIV §40). "
                      "Never invent a recovered checkpoint (§42).")
    try:
        rec = json.loads(f.read_text(encoding="utf-8"))
    except json.JSONDecodeError as e:
        raise Refused(f"Process record is corrupted (invalid JSON: {e}). Restore it from Git/backup (§48 #14).")
    if verify and rec.get("integrity") != digest(rec):
        raise Refused("Process record integrity check FAILED — the file was changed outside the engine or is corrupted "
                      "(§48 #14). Inspect it, restore from Git, or run `z3k.py check --accept-manual-edit` to re-seal "
                      "after a deliberate manual edit (the event is logged).")
    return rec


def save(a, rec, action, detail=""):
    rec["version"] = rec.get("version", 0) + 1
    rec["updated"] = now()
    rec["history"].append({"ts": now(), "v": rec["version"], "action": action, "detail": detail})
    rec["integrity"] = digest(rec)
    d = pdir(a); d.mkdir(parents=True, exist_ok=True)
    fd, tmp = tempfile.mkstemp(dir=d, suffix=".tmp")           # atomic write (tool-failure safety)
    with os.fdopen(fd, "w", encoding="utf-8") as fh:
        json.dump(rec, fh, indent=2, ensure_ascii=False)
    os.replace(tmp, d / "process.json")


def next_id(items, prefix):
    n = [int(k.split("-")[1]) for k in items if re.match(rf"^{prefix}-\d+$", k)]
    return f"{prefix}-{(max(n) + 1 if n else 1):03d}"


def splitlist(s):
    return [x.strip() for x in re.split(r"[;\n]", s or "") if x.strip()]


def csv(s):
    return [x.strip() for x in (s or "").split(",") if x.strip()]


# ------------------------------------------------------------------ project
def cmd_init(a):
    d = pdir(a)
    if (d / "process.json").exists():
        raise Refused(f"A process record already exists at {d}. Use `resume` (never overwrite a process record).")
    pid = a.id or "PRJ-" + re.sub(r"[^A-Z0-9]+", "-", a.name.upper()).strip("-")[:20]
    rec = {
        "process_id": "PROC-" + dt.datetime.now().strftime("%Y%m%d%H%M%S"), "project_id": pid, "name": a.name,
        "version": 0, "created": now(), "updated": now(), "responsible": a.responsible or "",
        "original_input": a.input or "", "objective": a.objective, "expected_results": splitlist(a.results),
        "constraints": splitlist(a.constraints), "phase": "M03 Diagnosis", "status": "ACTIVE",
        "execution_mode": a.mode, "tracks": {}, "requirements": {}, "tasks": {}, "decisions": [], "risks": [],
        "evidence": [], "deliverables": [], "approvals": [], "lessons": [], "agents": [], "reuse_potential": "",
        "next_action": "Complete M03 intake: baseline, tracks and mandatory requirements.", "history": [],
    }
    save(a, rec, "init", f"process created for '{a.name}'")
    print(f"Process record created: {d / 'process.json'}\n  {rec['process_id']} · {pid} · mode={a.mode}")


def cmd_track(a):
    rec = load(a)
    t = rec["tracks"].setdefault(a.track, {})
    for k in ("target", "baseline", "currency", "period", "verdict", "note"):
        v = getattr(a, k)
        if v is not None:
            t[k] = v
    if a.verdict and a.verdict not in VERDICTS:
        raise Refused(f"verdict must be one of: {', '.join(VERDICTS)} (v1 M01 §003.3)")
    save(a, rec, "track", f"Track {a.track} updated")
    print(f"Track {a.track} ({TRACKS[a.track]}): {json.dumps(t, ensure_ascii=False)}")


TRACKS = {"A": "Revenue", "B": "Net Profit", "C": "Annual Recurring Revenue", "D": "Company Value"}
VERDICTS = ["ACHIEVABLE", "ACHIEVABLE WITH CHANGES", "HIGH RISK", "NOT CURRENTLY FEASIBLE", "INSUFFICIENT EVIDENCE"]


def cmd_req(a):
    rec = load(a)
    if a.action == "add":
        rid = next_id(rec["requirements"], "REQ")
        rec["requirements"][rid] = {"text": a.text, "mandatory": not a.optional, "deliverable": a.deliverable or "",
                                    "acceptance": splitlist(a.acceptance), "evidence": [], "status": "NOT STARTED",
                                    "justification": ""}
        save(a, rec, "req.add", rid)
        print(f"{rid} added ({'mandatory' if not a.optional else 'optional'})")
        return
    r = rec["requirements"].get(a.id)
    if not r:
        raise Refused(f"Unknown requirement {a.id}")
    if a.action == "status":
        st = a.status.upper()
        if st not in REQ_STATUS:
            raise Refused(f"status must be one of {REQ_STATUS} (§54)")
        if st == "VERIFIED":
            ev = r["evidence"] + csv(a.evidence)
            linked = [t for t in rec["tasks"].values() if a.id in t["requirements"]]
            if not ev and not any(t["status"] == "VERIFIED" for t in linked):
                raise Refused("A requirement cannot be VERIFIED without evidence or a VERIFIED linked task (§34, §54).")
            if linked and not all(t["status"] in ("VERIFIED", "CANCELLED") for t in linked):
                open_ = [k for k, t in rec["tasks"].items() if a.id in t["requirements"] and t["status"] not in ("VERIFIED", "CANCELLED")]
                raise Refused(f"Linked tasks still open: {', '.join(open_)} — use PARTIALLY VERIFIED (§54).")
        if st == "NOT APPLICABLE" and not a.justification:
            raise Refused("NOT APPLICABLE requires --justification (§54 'NOT APPLICABLE WITH JUSTIFICATION').")
        r["status"] = st
        r["evidence"] += csv(a.evidence)
        if a.justification:
            r["justification"] = a.justification
        save(a, rec, "req.status", f"{a.id} → {st}")
        print(f"{a.id} → {st}")


# ------------------------------------------------------------------ tasks
def norm(s):
    return re.sub(r"[^a-z0-9]+", " ", s.lower()).strip()


def deps_verified(rec, t):
    return [d for d in t["deps"] if rec["tasks"][d]["status"] != "VERIFIED"]


def has_cycle(rec, start, deps):
    stack, seen = list(deps), set()
    while stack:
        d = stack.pop()
        if d == start:
            return True
        if d in seen or d not in rec["tasks"]:
            continue
        seen.add(d); stack += rec["tasks"][d]["deps"]
    return False


def set_status(rec, tid, new, note=""):
    t = rec["tasks"][tid]
    t["log"].append({"ts": now(), "from": t["status"], "to": new, "note": note})
    t["status"] = new


def cmd_task(a):
    rec = load(a)
    act = a.action
    if act == "add":
        if not a.allow_duplicate:
            dup = [k for k, t in rec["tasks"].items() if norm(t["title"]) == norm(a.title) and t["status"] != "CANCELLED"]
            if dup:
                raise Refused(f"Duplicate task: '{a.title}' already exists as {dup[0]} (§48 #13). Use --allow-duplicate only if intentional.")
        deps = csv(a.deps)
        missing = [d for d in deps if d not in rec["tasks"]]
        if missing:
            raise Refused(f"Unknown dependencies: {', '.join(missing)}")
        reqs = csv(a.req)
        badr = [r for r in reqs if r not in rec["requirements"]]
        if badr:
            raise Refused(f"Unknown requirements: {', '.join(badr)}")
        if a.priority not in PRIORITIES:
            raise Refused(f"priority must be one of {PRIORITIES} (§35)")
        tid = next_id(rec["tasks"], "T")
        rec["tasks"][tid] = {
            "title": a.title, "description": a.description or "", "objective": a.objective or "", "priority": a.priority,
            "owner": a.owner or "", "agent": a.agent or "", "deps": deps, "resources": a.resources or "", "due": a.due or "",
            "acceptance": splitlist(a.acceptance), "evidence_required": a.evidence_required or "", "evidence": [],
            "requirements": reqs, "requires_approval": a.approval_required, "approval": None, "status": "CREATED",
            "next_action": "Validate: confirm acceptance criteria, owner and priority.", "attempts": 0, "failures": [],
            "blocker": None, "log": [{"ts": now(), "from": None, "to": "CREATED", "note": ""}],
        }
        save(a, rec, "task.add", f"{tid} {a.title}")
        print(f"{tid} CREATED — {a.title} [{a.priority}]")
        return

    tid = a.id
    if tid not in rec["tasks"]:
        raise Refused(f"Unknown task {tid}")
    t = rec["tasks"][tid]
    s = t["status"]

    def need(*states):
        if s not in states:
            raise Refused(f"{tid} is {s}; '{act}' requires {' or '.join(states)} (§34 state machine — no skipping).")

    if act == "update":
        for k in ("description", "objective", "owner", "agent", "resources", "due", "evidence_required"):
            v = getattr(a, k, None)
            if v:
                t[k] = v
        if a.acceptance:
            if s in ("UNDER_VERIFICATION", "VERIFIED"):
                raise Refused("Acceptance criteria cannot change after submission without reopening the task (§33).")
            t["acceptance"] = splitlist(a.acceptance)
        if a.priority:
            t["priority"] = a.priority
        save(a, rec, "task.update", tid); print(f"{tid} updated"); return
    if act == "validate":
        need("CREATED")
        miss = [n for n, ok in (("acceptance criteria", t["acceptance"]), ("owner", t["owner"]),
                                ("objective", t["objective"] or t["description"])) if not ok]
        if miss:
            raise Refused(f"{tid} cannot be VALIDATED — missing {', '.join(miss)} (§34 'No task completion without acceptance criteria').")
        set_status(rec, tid, "VALIDATED"); t["next_action"] = "Release to READY when dependencies are VERIFIED."
    elif act == "ready":
        need("VALIDATED")
        open_ = deps_verified(rec, t)
        if open_:
            raise Refused(f"{tid} cannot be released: dependencies not VERIFIED → {', '.join(open_)} (§34 'DO NOT RELEASE THE DEPENDENT TASK').")
        if t["requires_approval"] and not t["approval"]:
            set_status(rec, tid, "NEEDS_APPROVAL", "external/high-impact action")
            t["next_action"] = "Request human approval (§10) — APPROVAL REQUEST."
            save(a, rec, "task.needs_approval", tid)
            print(f"{tid} → NEEDS_APPROVAL (human approval required before execution, §10)"); return
        set_status(rec, tid, "READY"); t["next_action"] = "Produce the Task Implementation Document and start."
    elif act == "start":
        need("READY")
        open_ = deps_verified(rec, t)
        if open_:
            raise Refused(f"Dependencies regressed: {', '.join(open_)} not VERIFIED.")
        if t["requires_approval"] and not t["approval"]:
            raise Refused(f"{tid} requires recorded human approval before execution (§10). Use `approve`.")
        set_status(rec, tid, "IN_PROGRESS"); t["attempts"] += 1
        t["next_action"] = "Execute the implementation steps; collect evidence."
    elif act == "submit":
        need("IN_PROGRESS")
        ev = csv(a.evidence)
        if not ev and not t["evidence"]:
            raise Refused(f"{tid} cannot go to verification without evidence (§34 'IF evidence is missing: DO NOT claim verification').")
        t["evidence"] += ev
        set_status(rec, tid, "UNDER_VERIFICATION"); t["next_action"] = "QA verifies each acceptance criterion."
    elif act == "verify":
        need("UNDER_VERIFICATION")
        n = len(t["acceptance"])
        met = list(range(1, n + 1)) if a.met == "all" else [int(x) for x in csv(a.met)]
        unmet = [i for i in range(1, n + 1) if i not in met]
        if not t["evidence"]:
            raise Refused("No evidence recorded — cannot verify.")
        if unmet:
            set_status(rec, tid, "IN_PROGRESS", f"criteria not met: {unmet}")
            t["next_action"] = f"Address unmet acceptance criteria {unmet}, then resubmit."
            save(a, rec, "task.verify_rejected", f"{tid} unmet {unmet}")
            print(f"{tid} NOT verified — criteria {unmet} unmet; task kept OPEN (IN_PROGRESS) (§34).")
            return 1
        set_status(rec, tid, "VERIFIED", f"verified by {a.verifier or 'QA'}")
        t["verified_by"] = a.verifier or "QA"
        released = []
        for k, o in rec["tasks"].items():
            if tid in o["deps"] and o["status"] == "VALIDATED" and not deps_verified(rec, o):
                released.append(k)
        t["next_action"] = "Done."
        rec["next_action"] = f"Release eligible tasks: {', '.join(released)}" if released else "Run `next`."
        save(a, rec, "task.verify", tid)
        print(f"{tid} VERIFIED." + (f" Now eligible for release: {', '.join(released)} (run `task ready`)." if released else ""))
        return
    elif act == "fail":
        need("IN_PROGRESS", "UNDER_VERIFICATION")
        t["failures"].append({"ts": now(), "attempt": t["attempts"], "reason": a.reason or "unspecified"})
        set_status(rec, tid, "FAILED", a.reason or "")
        t["next_action"] = "Diagnose, document, correct, retest (§39)." if t["attempts"] < MAX_ATTEMPTS else \
            "Retry budget exhausted — BLOCK with alternatives and escalate (§39)."
    elif act == "retry":
        need("FAILED")
        if t["attempts"] >= MAX_ATTEMPTS:
            raise Refused(f"{tid} failed {t['attempts']} times (max {MAX_ATTEMPTS}). No infinite retry loops (§34): "
                          "mark BLOCKED, present alternatives and define the next decision (§39).")
        set_status(rec, tid, "IN_PROGRESS", "retry after correction"); t["attempts"] += 1
    elif act == "block":
        if s in ("VERIFIED", "CANCELLED"):
            raise Refused(f"{tid} is {s}.")
        if not a.reason or not a.next:
            raise Refused("BLOCKED requires --reason and --next (§34 'RECORD THE BLOCKER AND NEXT ACTION').")
        t["blocker"] = {"reason": a.reason, "next": a.next, "since": now(), "from": s}
        set_status(rec, tid, "BLOCKED", a.reason); t["next_action"] = a.next
    elif act == "unblock":
        need("BLOCKED")
        back = "READY" if (not deps_verified(rec, t) and t["blocker"]["from"] in ("READY", "IN_PROGRESS", "FAILED")) else "VALIDATED"
        if t["blocker"]["from"] == "CREATED":
            back = "CREATED"
        if back == "READY" and t["requires_approval"] and not t["approval"]:
            back = "NEEDS_APPROVAL"
        t["blocker"]["resolved"] = now()
        set_status(rec, tid, back, "unblocked"); t["attempts"] = min(t["attempts"], MAX_ATTEMPTS - 1)
    elif act in ("defer", "cancel"):
        if s == "VERIFIED":
            raise Refused(f"{tid} is VERIFIED.")
        if not a.reason:
            raise Refused(f"{act} requires --reason (§5 'No silent task omissions').")
        mand = [r for r in t["requirements"] if rec["requirements"][r]["mandatory"]]
        if act == "cancel" and mand and not a.force:
            raise Refused(f"{tid} serves mandatory requirement(s) {', '.join(mand)}. Cancelling needs --force and a "
                          "change decision recorded (§33 change management, no silent omission).")
        set_status(rec, tid, "DEFERRED" if act == "defer" else "CANCELLED", a.reason)
    elif act == "reopen":
        need("DEFERRED", "VERIFIED")
        if s == "VERIFIED" and not a.reason:
            raise Refused("Reopening a VERIFIED task requires --reason.")
        set_status(rec, tid, "VALIDATED", a.reason or "reopened")
    elif act == "doc":
        print(task_document(rec, tid)); return
    else:
        raise Refused(f"unknown task action {act}")
    save(a, rec, f"task.{act}", tid)
    print(f"{tid} → {rec['tasks'][tid]['status']}")


def cmd_approve(a):
    rec = load(a)
    if not a.by:
        raise Refused("Approval requires --by <human name> (§10: never imply approval).")
    t = rec["tasks"].get(a.id)
    if not t:
        raise Refused(f"Unknown task {a.id}")
    ap = {"id": next_id({x["id"]: 1 for x in rec["approvals"]}, "AP"), "task": a.id, "by": a.by,
          "scope": a.scope or t["title"], "ts": now()}
    rec["approvals"].append(ap); t["approval"] = ap["id"]
    if t["status"] == "NEEDS_APPROVAL":
        open_ = deps_verified(rec, t)
        set_status(rec, a.id, "READY" if not open_ else "VALIDATED", f"approved by {a.by}")
    save(a, rec, "approve", f"{a.id} by {a.by}")
    print(f"{ap['id']} recorded: {a.id} approved by {a.by} — scope: {ap['scope']} (approval does not extend to other actions)")


# ------------------------------------------------------------------ registers
def cmd_simple(kind):
    def run(a):
        rec = load(a)
        if kind == "decision":
            item = {"id": next_id({x["id"]: 1 for x in rec["decisions"]}, "D"), "ts": now(), "decision": a.text,
                    "rationale": a.rationale, "alternatives": a.alternatives or "", "decided_by": a.by or "",
                    "evidence": a.evidence or ""}
            if not a.rationale:
                raise Refused("Every important decision must have a rationale (§59).")
            rec["decisions"].append(item)
        elif kind == "risk":
            sc = a.p * a.i
            item = {"id": next_id({x["id"]: 1 for x in rec["risks"]}, "R"), "risk": a.text, "p": a.p, "i": a.i,
                    "score": sc, "level": "CRITICAL" if sc >= 15 else "HIGH" if sc >= 8 else "MODERATE" if sc >= 4 else "LOW",
                    "mitigation": a.mitigation or "", "owner": a.owner or "", "status": "OPEN"}
            rec["risks"].append(item)
        elif kind == "evidence":
            if a.tier not in EVID_TIERS:
                raise Refused(f"tier must be one of {EVID_TIERS} (§9)")
            if a.type not in CLAIM_TYPES:
                raise Refused(f"type must be one of {CLAIM_TYPES} (§15)")
            if not a.source:
                raise Refused("An evidence entry needs a source actually consulted (§5 'No fabricated research').")
            item = {"id": next_id({x["id"]: 1 for x in rec["evidence"]}, "EV"), "claim": a.text, "source": a.source,
                    "published": a.published or "unknown", "retrieved": a.retrieved or dt.date.today().isoformat(),
                    "geography": a.geography or "", "tier": a.tier, "type": a.type, "reliability": a.reliability or "",
                    "limitations": a.limitations or "", "confidence": a.confidence}
            rec["evidence"].append(item)
        elif kind == "deliverable":
            item = {"id": next_id({x["id"]: 1 for x in rec["deliverables"]}, "DL"), "name": a.text, "path": a.path or "",
                    "task": a.task or "", "ts": now()}
            rec["deliverables"].append(item)
        elif kind == "lesson":
            item = {"ts": now(), "lesson": a.text, "type": a.type, "evidence": a.evidence or ""}
            rec["lessons"].append(item)
        save(a, rec, f"{kind}.add", item.get("id", "") if isinstance(item, dict) else "")
        print(f"{kind} recorded: {item.get('id', '')} {a.text}")
    return run


# ------------------------------------------------------------------ continuity
def eligible(rec):
    out = []
    for k, t in rec["tasks"].items():
        if t["status"] == "READY":
            out.append((0, PRIORITIES.index(t["priority"]), k, "start"))
        elif t["status"] == "VALIDATED" and not deps_verified(rec, t):
            out.append((1, PRIORITIES.index(t["priority"]), k, "release (task ready)"))
        elif t["status"] == "CREATED":
            out.append((2, PRIORITIES.index(t["priority"]), k, "validate"))
        elif t["status"] == "IN_PROGRESS":
            out.append((-1, PRIORITIES.index(t["priority"]), k, "continue / submit evidence"))
        elif t["status"] == "UNDER_VERIFICATION":
            out.append((-2, PRIORITIES.index(t["priority"]), k, "verify"))
        elif t["status"] == "FAILED":
            out.append((-1, PRIORITIES.index(t["priority"]), k, "diagnose & retry or block"))
    return sorted(out)


def counts(rec):
    c = {}
    for t in rec["tasks"].values():
        c[t["status"]] = c.get(t["status"], 0) + 1
    return c


def cmd_status(a):
    rec = load(a)
    c = counts(rec); total = len(rec["tasks"]); done = c.get("VERIFIED", 0)
    print(f"# STATUS — {rec['name']} ({rec['project_id']})  v{rec['version']} · {rec['updated']}")
    print(f"Objective: {rec['objective']}\nPhase: {rec['phase']} · Mode: {rec['execution_mode']} · Process: {rec['status']}")
    print(f"Tasks: {done}/{total} VERIFIED · " + " · ".join(f"{k} {v}" for k, v in sorted(c.items())))
    for tr, v in sorted(rec["tracks"].items()):
        print(f"Track {tr} ({TRACKS[tr]}): target {v.get('target', '?')} {v.get('currency', '')} · baseline {v.get('baseline', '?')} · verdict {v.get('verdict', 'not assessed')}")
    mand = [r for r in rec["requirements"].values() if r["mandatory"]]
    print(f"Mandatory requirements verified: {sum(r['status'] == 'VERIFIED' for r in mand)}/{len(mand)}")
    bl = [k for k, t in rec["tasks"].items() if t["status"] == "BLOCKED"]
    if bl:
        print("Blockers: " + ", ".join(bl))
    nx = eligible(rec)
    print("Next: " + (f"{nx[0][2]} — {nx[0][3]} ({rec['tasks'][nx[0][2]]['title']})" if nx else rec["next_action"]))


def table(rows, cols):
    print("| " + " | ".join(cols) + " |\n|" + "---|" * len(cols))
    for r in rows:
        print("| " + " | ".join(str(x).replace("|", "/") for x in r) + " |")


def cmd_list(kind):
    def run(a):
        rec = load(a)
        T = rec["tasks"]
        if kind == "pending":
            rows = [(k, t["priority"], t["status"], t["title"], ",".join(t["deps"]) or "—", t["next_action"])
                    for k, t in sorted(T.items(), key=lambda kv: PRIORITIES.index(kv[1]["priority"]))
                    if t["status"] not in ("VERIFIED", "CANCELLED")]
            table(rows, ["Task", "Prio", "Status", "Title", "Deps", "Next action"])
        elif kind == "completed":
            table([(k, t["title"], t.get("verified_by", ""), "; ".join(t["evidence"])) for k, t in T.items()
                   if t["status"] == "VERIFIED"], ["Task", "Title", "Verified by", "Evidence"])
        elif kind == "blockers":
            table([(k, t["title"], t["blocker"]["reason"], t["blocker"]["next"], t["blocker"]["since"]) for k, t in T.items()
                   if t["status"] == "BLOCKED"], ["Task", "Title", "Blocker", "Next action", "Since"])
        elif kind == "decisions":
            table([(d["id"], d["ts"][:10], d["decision"], d["rationale"], d["decided_by"]) for d in rec["decisions"]],
                  ["ID", "Date", "Decision", "Rationale", "By"])
        elif kind == "deliverables":
            table([(d["id"], d["name"], d["path"], d["task"]) for d in rec["deliverables"]], ["ID", "Deliverable", "Path", "Task"])
        elif kind == "history":
            for h in rec["history"][-(a.n or 30):]:
                print(f"{h['ts']}  v{h['v']:<4} {h['action']:<20} {h['detail']}")
        elif kind == "next":
            nx = eligible(rec)
            if not nx:
                print("No eligible task. " + ("All tasks VERIFIED — run `final`." if T and all(t["status"] in ("VERIFIED", "CANCELLED") for t in T.values())
                                              else "Check `blockers` / `pending` or add tasks.")); return
            pri, _, k, what = nx[0]
            t = T[k]
            print(f"NEXT: {k} [{t['priority']}] {t['title']} → {what}")
            print(f"  Status {t['status']} · owner {t['owner'] or '—'} · agent {t['agent'] or '—'}")
            print(f"  Acceptance: {'; '.join(t['acceptance']) or 'MISSING'}")
            print(f"  Generate its implementation document: z3k.py task doc {k}")
    return run


def cmd_check(a):
    rec = load(a, verify=not a.accept_manual_edit)
    issues = []
    for k, t in rec["tasks"].items():
        if t["status"] not in TASK_FLOW + TASK_EXC:
            issues.append(f"{k}: invalid status {t['status']}")
        for d in t["deps"]:
            if d not in rec["tasks"]:
                issues.append(f"{k}: dependency {d} does not exist")
        if has_cycle(rec, k, t["deps"]):
            issues.append(f"{k}: circular dependency")
        if t["status"] == "VERIFIED" and not t["evidence"]:
            issues.append(f"{k}: VERIFIED without evidence")
        if t["status"] in ("READY", "IN_PROGRESS", "UNDER_VERIFICATION", "VERIFIED") and deps_verified(rec, t):
            issues.append(f"{k}: released while dependencies open {deps_verified(rec, t)}")
        if t["status"] in ("IN_PROGRESS", "UNDER_VERIFICATION", "VERIFIED") and t["requires_approval"] and not t["approval"]:
            issues.append(f"{k}: executed without recorded approval")
        if not t["acceptance"] and t["status"] != "CREATED":
            issues.append(f"{k}: no acceptance criteria")
    for rid, r in rec["requirements"].items():
        if r["mandatory"] and r["status"] != "NOT APPLICABLE" and not any(rid in t["requirements"] for t in rec["tasks"].values()):
            issues.append(f"{rid}: mandatory requirement has no task (task omission §48 #1)")
    if a.accept_manual_edit:
        save(a, rec, "check.reseal", "manual edit accepted and re-sealed")
        print("Record re-sealed after manual edit (logged).")
    print("INTEGRITY OK" if not issues else "ISSUES:\n  " + "\n  ".join(issues))
    return 0 if not issues else 1


def cmd_resume(a):
    rec = load(a)
    print(f"RESUME — {rec['name']} · process {rec['process_id']} · record v{rec['version']} ({rec['updated']}) · integrity OK")
    cmd_check(argparse.Namespace(dir=a.dir, accept_manual_edit=False))
    cmd_status(a)
    print("\nResume only within the authorized scope; approvals do not carry over to new actions (§42).")


# ------------------------------------------------------------------ documents
def task_document(rec, tid):
    t = rec["tasks"][tid]
    L = [f"# TASK IMPLEMENTATION DOCUMENT — {tid}", "",
         "## A. Identification", f"- Task ID: {tid}", f"- Project ID: {rec['project_id']}", f"- Name: {t['title']}",
         f"- Version: record v{rec['version']}", f"- Priority: {t['priority']}", f"- Status: {t['status']}", "",
         "## B. Objective", f"- Purpose: {t['objective'] or '[to define]'}", "- Business rationale: [why this matters to the target track]",
         "- Expected result: [observable outcome]", "- Success definition: all acceptance criteria in §I met with evidence", "",
         "## C. Current State", "- Existing conditions: ", "- Baseline: ", "- Gaps: ", "- Assumptions (label them): ", "- Constraints: ", "",
         "## D. Research", "- Documentation / official sources (E1–E4, with dates): ", "- Examples: ", "- Technical requirements: ", "- Limitations: ", "",
         "## E. Prerequisites", f"- Dependencies: {', '.join(t['deps']) or 'none'} — status: " +
         (", ".join(f"{d} {rec['tasks'][d]['status']}" for d in t['deps']) or "n/a"),
         f"- Resources: {t['resources'] or '[accounts, permissions, software, data, people, budget]'}",
         f"- Human approval required: {'YES — ' + (t['approval'] or 'NOT YET GRANTED') if t['requires_approval'] else 'no'}", "",
         "## F. Implementation", "| # | Exact action | Location / platform | Input | Configuration | Expected output | Validation | Error recovery |",
         "|---|---|---|---|---|---|---|---|", "| 1 | | | | | | | |", "",
         "## G. Technical Deliverables", "- Code / files / configuration / documents / integrations / data structures: ", "",
         "## H. Testing", "- Functional · integration · security · performance · acceptance tests: ", "",
         "## I. Acceptance Criteria"] + [f"{i}. {c}" for i, c in enumerate(t["acceptance"], 1)] + \
        [f"- Required evidence: {t['evidence_required'] or '[define]'}", "", "## J. Risk and Recovery",
         "| Potential failure | Cause | Impact | Corrective action | Escalation |", "|---|---|---|---|---|", "| | | | | |", "",
         "## K. Completion Record", f"- Actual result: ", f"- Evidence: {'; '.join(t['evidence']) or '—'}", "- Deviations: ",
         f"- Approval: {t['approval'] or '—'}", f"- Final status: {t['status']}", "- Next task: "]
    return "\n".join(L)


def report_data(rec, final=False):
    T = rec["tasks"]; c = counts(rec)
    mand = {k: r for k, r in rec["requirements"].items() if r["mandatory"]}
    all_ok = bool(mand) and all(r["status"] in ("VERIFIED", "NOT APPLICABLE") for r in mand.values())
    open_tasks = [k for k, t in T.items() if t["status"] not in ("VERIFIED", "CANCELLED")]
    outcome = "COMPLETE — all mandatory requirements verified" if all_ok and not open_tasks else \
        "PARTIAL — not all mandatory requirements are verified" if final else "IN PROGRESS"
    return {"process": {k: rec[k] for k in ("process_id", "project_id", "name", "objective", "original_input", "phase",
                                            "execution_mode", "version", "updated", "created", "responsible")},
            "counts": c, "total": len(T), "verified": c.get("VERIFIED", 0), "outcome": outcome,
            "tracks": rec["tracks"], "tasks": T, "requirements": rec["requirements"], "decisions": rec["decisions"],
            "risks": rec["risks"], "evidence": rec["evidence"], "deliverables": rec["deliverables"],
            "approvals": rec["approvals"], "lessons": rec["lessons"], "next": eligible(rec)[:1],
            "failures": [(k, f) for k, t in T.items() for f in t["failures"]],
            "deviations": [(k, t["status"], (t.get("blocker") or {}).get("reason", "")) for k, t in T.items()
                           if t["status"] in ("BLOCKED", "DEFERRED", "CANCELLED", "FAILED")],
            "final": final}


def md_report(d):
    p = d["process"]; T = d["tasks"]
    L = [f"# {'FINAL COMPLETION' if d['final'] else 'EXECUTION'} REPORT — {p['name']}",
         f"Project {p['project_id']} · process {p['process_id']} · record v{p['version']} · {p['updated']}", "",
         f"**Outcome:** {d['outcome']}", f"**Objective:** {p['objective']}",
         f"**Progress:** {d['verified']}/{d['total']} tasks VERIFIED", ""]
    if d["final"]:
        L += ["## Requirements Matrix (§54)", "| ID | Requirement | Deliverable | Acceptance | Evidence | Status |", "|---|---|---|---|---|---|"]
        for k, r in d["requirements"].items():
            st = r["status"] + (f" — {r['justification']}" if r["status"] == "NOT APPLICABLE" else "")
            L.append(f"| {k} | {r['text']} | {r['deliverable']} | {'; '.join(r['acceptance'])} | {'; '.join(r['evidence'])} | {st} |")
        L.append("")
    for title, rows, cols in [
        ("Completed (VERIFIED)", [(k, t["title"], "; ".join(t["evidence"])) for k, t in T.items() if t["status"] == "VERIFIED"], ["Task", "Title", "Evidence"]),
        ("In progress", [(k, t["status"], t["title"], t["next_action"]) for k, t in T.items() if t["status"] in ("IN_PROGRESS", "UNDER_VERIFICATION")], ["Task", "Status", "Title", "Next"]),
        ("Pending", [(k, t["priority"], t["status"], t["title"]) for k, t in T.items() if t["status"] in ("CREATED", "VALIDATED", "READY", "NEEDS_APPROVAL", "DEFERRED")], ["Task", "Prio", "Status", "Title"]),
        ("Blockers", [(k, t["title"], t["blocker"]["reason"], t["blocker"]["next"]) for k, t in T.items() if t["status"] == "BLOCKED"], ["Task", "Title", "Blocker", "Next"]),
        ("Failed attempts", [(k, f["attempt"], f["reason"]) for k, f in d["failures"]], ["Task", "Attempt", "Reason"]),
        ("Risks", [(r["id"], r["risk"], r["level"], r["mitigation"]) for r in d["risks"]], ["ID", "Risk", "Level", "Mitigation"]),
        ("Decisions", [(x["id"], x["decision"], x["rationale"]) for x in d["decisions"]], ["ID", "Decision", "Rationale"]),
        ("Evidence register", [(e["id"], e["claim"], e["source"], e["tier"], e["type"], e["confidence"]) for e in d["evidence"]], ["ID", "Claim", "Source", "Tier", "Type", "Confidence"]),
        ("Deliverables", [(x["id"], x["name"], x["path"]) for x in d["deliverables"]], ["ID", "Deliverable", "Path"]),
    ]:
        L += [f"## {title}"]
        if rows:
            L += ["| " + " | ".join(cols) + " |", "|" + "---|" * len(cols)]
            L += ["| " + " | ".join(str(x).replace("|", "/") for x in r) + " |" for r in rows]
        else:
            L += ["—"]
        L.append("")
    if d["final"]:
        L += ["## Lessons learned"] + [f"- {x['lesson']} ({x['type']})" for x in d["lessons"]] + ["",
              "## Sections to complete by the Orchestrator (§54)",
              "Executive Summary · Original Request · Research and Evidence · Implementation Architecture · Execution Plan · "
              "Deviations · Final Outcome · Reusable Processes · Recommendations · Next Actions", ""]
    nx = d["next"]
    L.append(f"**Next action:** {nx[0][2]} — {nx[0][3]}" if nx else "**Next action:** —")
    return "\n".join(L)


def cmd_report(final):
    def run(a):
        rec = load(a)
        d = report_data(rec, final)
        if a.json:
            print(json.dumps(d, indent=2, ensure_ascii=False, default=str)); return
        md = md_report(d)
        if a.pdf:
            sys.path.insert(0, str(SKILL_ROOT / "reports" / "scripts"))
            import doc_builder
            spec = doc_builder.spec_from_process(d)
            html = pathlib.Path(a.pdf).with_suffix(".html")
            doc_builder.build(spec, html)
            rc = os.system(f'node "{SKILL_ROOT / "reports" / "scripts" / "render_pdf.js"}" "{html}" "{a.pdf}"')
            print(f"PDF {'written to ' + a.pdf if rc == 0 else 'render FAILED (rc=%s) — HTML kept at %s' % (rc, html)}")
        if a.out:
            pathlib.Path(a.out).write_text(md, encoding="utf-8"); print(f"Markdown written to {a.out}")
        if not a.pdf and not a.out:
            print(md)
        if final and not d["outcome"].startswith("COMPLETE"):
            return 3
    return run


def cmd_handoff(a):
    """Portable resume prompt for another model/session (§48 #6–7 session recovery / model switching)."""
    rec = load(a)
    d = report_data(rec)
    nx = d["next"]
    print(f"""You are ZABATAINA 3000 (Master Prompt v2.0). Resume this project strictly from the verified process record below.
Rules: only VERIFIED tasks count as done; never invent progress; respect approvals (they do not carry over);
release a task only when its dependencies are VERIFIED; keep blockers visible.

PROJECT: {rec['name']} ({rec['project_id']}) · process {rec['process_id']} · record v{rec['version']} at {rec['updated']}
OBJECTIVE: {rec['objective']}
TRACKS: {json.dumps(rec['tracks'], ensure_ascii=False)}
PROGRESS: {d['verified']}/{d['total']} tasks VERIFIED · {json.dumps(d['counts'])}

{md_report(d)}

NEXT ELIGIBLE TASK: {(nx[0][2] + ' — ' + nx[0][3]) if nx else 'none'}
{task_document(rec, nx[0][2]) if nx else ''}""")


# ------------------------------------------------------------------ library (TLC §43)
def libfile():
    p = pathlib.Path(os.environ.get("Z3000_LIBRARY") or SKILL_ROOT / "library")
    p.mkdir(parents=True, exist_ok=True)
    return p / "index.json"


def cmd_lib(a):
    f = libfile()
    idx = json.loads(f.read_text(encoding="utf-8")) if f.exists() else {"items": {}}
    I = idx["items"]
    if a.action == "list":
        table([(k, v["name"], v["type"], v["status"], v["version"]) for k, v in sorted(I.items())], ["ID", "Name", "Type", "Status", "Version"]); return
    if a.action == "add":
        lid = next_id(I, "LIB")
        I[lid] = {"name": a.name, "type": a.type, "path": a.path or "", "version": "1.0.0", "status": "DRAFT",
                  "history": [{"ts": now(), "status": "DRAFT", "note": "created"}], "evidence": [], "approved_by": None}
        msg = f"{lid} DRAFT — {a.name}"
    else:
        it = I.get(a.id)
        if not it:
            raise Refused(f"Unknown library item {a.id}")
        if a.action == "promote":
            to = a.to.upper(); cur = it["status"]
            if to in LIB_EXC:
                if not a.note:
                    raise Refused(f"{to} requires --note")
            else:
                if cur not in LIB_FLOW or LIB_FLOW.index(to) != LIB_FLOW.index(cur) + 1:
                    raise Refused(f"{a.id} is {cur}; next allowed status is "
                                  f"{LIB_FLOW[LIB_FLOW.index(cur) + 1] if cur in LIB_FLOW and cur != 'LIBRARY' else 'none'} (§43 — no skipping).")
                if to in ("TESTED", "VERIFIED") and not a.evidence:
                    raise Refused(f"{to} requires --evidence (a test or verification actually run, §48).")
                if to == "APPROVED" and not a.approved_by:
                    raise Refused("APPROVED requires --approved-by <human> (§44 HUMAN APPROVAL).")
            it["status"] = to
            it["evidence"] += csv(a.evidence)
            if a.approved_by:
                it["approved_by"] = a.approved_by
            it["history"].append({"ts": now(), "status": to, "note": a.note or ""})
            msg = f"{a.id}: {cur} → {to}"
        elif a.action == "reuse":
            if it["status"] not in ("APPROVED", "LIBRARY"):
                if not a.allow_unverified:
                    raise Refused(f"{a.id} is {it['status']} — only APPROVED/LIBRARY items may be reused (§48 #15). "
                                  "Use --allow-unverified to reuse as EXPERIMENTAL (logged).")
                it["history"].append({"ts": now(), "status": it["status"], "note": "reused as unverified (explicit)"})
                msg = f"{a.id} reused WITH WARNING: status {it['status']} — treat as EXPERIMENTAL and revalidate"
            else:
                msg = f"{a.id} cleared for reuse ({it['status']}) — still adapt to the new context (§44)"
        else:
            raise Refused("unknown lib action")
    f.write_text(json.dumps(idx, indent=2, ensure_ascii=False), encoding="utf-8")
    print(msg)


# ------------------------------------------------------------------ CLI
def main(argv=None):
    ap = argparse.ArgumentParser(prog="z3k.py", description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--dir", help="project directory (default: cwd or $Z3000_DIR)")
    sp = ap.add_subparsers(dest="cmd", required=True)

    p = sp.add_parser("init", help="START PROJECT — create the process record")
    p.add_argument("--name", required=True); p.add_argument("--objective", required=True); p.add_argument("--input")
    p.add_argument("--responsible"); p.add_argument("--results", help="';'-separated expected results")
    p.add_argument("--constraints"); p.add_argument("--id")
    p.add_argument("--mode", default="GUIDED", choices=["GUIDED", "ASSISTED", "AUTONOMOUS"]); p.set_defaults(f=cmd_init)

    p = sp.add_parser("track", help="set a financial track (A Revenue · B Net Profit · C ARR · D Company Value)")
    p.add_argument("track", choices=list(TRACKS)); [p.add_argument(f"--{k}") for k in ("target", "baseline", "currency", "period", "verdict", "note")]
    p.set_defaults(f=cmd_track)

    p = sp.add_parser("req", help="requirements: add | status")
    p.add_argument("action", choices=["add", "status"]); p.add_argument("text_or_id")
    p.add_argument("status", nargs="?"); p.add_argument("--optional", action="store_true"); p.add_argument("--deliverable")
    p.add_argument("--acceptance"); p.add_argument("--evidence"); p.add_argument("--justification")
    p.set_defaults(f=lambda a: cmd_req(argparse.Namespace(**{**vars(a), "text": a.text_or_id, "id": a.text_or_id})))

    p = sp.add_parser("task", help="task lifecycle: add|update|validate|ready|start|submit|verify|fail|retry|block|unblock|defer|cancel|reopen|doc")
    p.add_argument("action"); p.add_argument("title_or_id")
    for k in ("description", "objective", "owner", "agent", "deps", "resources", "due", "acceptance", "evidence_required",
              "req", "evidence", "reason", "next", "verifier"):
        p.add_argument(f"--{k.replace('_', '-')}", dest=k)
    p.add_argument("--priority", default=None); p.add_argument("--met", default="all")
    p.add_argument("--approval-required", action="store_true"); p.add_argument("--allow-duplicate", action="store_true")
    p.add_argument("--force", action="store_true")
    def _task(a):
        a.title = a.id = a.title_or_id
        if a.action == "add" and not a.priority:
            a.priority = "P2"
        return cmd_task(a)
    p.set_defaults(f=_task)

    p = sp.add_parser("approve", help="APPROVAL — record a human approval for a task"); p.add_argument("id")
    p.add_argument("--by"); p.add_argument("--scope"); p.set_defaults(f=cmd_approve)

    for kind, extra in [("decision", ["rationale", "alternatives", "by", "evidence"]), ("deliverable", ["path", "task"])]:
        p = sp.add_parser(kind); p.add_argument("text"); [p.add_argument(f"--{x}") for x in extra]; p.set_defaults(f=cmd_simple(kind))
    p = sp.add_parser("risk"); p.add_argument("text"); p.add_argument("--p", type=int, required=True); p.add_argument("--i", type=int, required=True)
    p.add_argument("--mitigation"); p.add_argument("--owner"); p.set_defaults(f=cmd_simple("risk"))
    p = sp.add_parser("evidence", help="evidence register (§9: E1–E4, §15 claim types)"); p.add_argument("text")
    for x in ("source", "published", "retrieved", "geography", "reliability", "limitations"):
        p.add_argument(f"--{x}")
    p.add_argument("--tier", required=True); p.add_argument("--type", default="fact")
    p.add_argument("--confidence", default="MEDIUM", choices=["HIGH", "MEDIUM", "LOW", "NONE"]); p.set_defaults(f=cmd_simple("evidence"))
    p = sp.add_parser("lesson"); p.add_argument("text"); p.add_argument("--type", default="success", choices=["success", "failure", "limitation"])
    p.add_argument("--evidence"); p.set_defaults(f=cmd_simple("lesson"))

    for name, kind in [("pending", "pending"), ("completed", "completed"), ("blockers", "blockers"), ("decisions", "decisions"),
                       ("deliverables", "deliverables"), ("next", "next")]:
        p = sp.add_parser(name); p.set_defaults(f=cmd_list(kind))
    p = sp.add_parser("history"); p.add_argument("-n", type=int); p.set_defaults(f=cmd_list("history"))
    sp.add_parser("status").set_defaults(f=cmd_status)
    sp.add_parser("resume").set_defaults(f=cmd_resume)
    sp.add_parser("handoff", help="portable resume prompt for another model/session").set_defaults(f=cmd_handoff)
    p = sp.add_parser("check"); p.add_argument("--accept-manual-edit", action="store_true"); p.set_defaults(f=cmd_check)
    for name, final in [("report", False), ("final", True)]:
        p = sp.add_parser(name, help=("GENERATE FINAL REPORT" if final else "GENERATE EXECUTION REPORT"))
        p.add_argument("--json", action="store_true"); p.add_argument("--out"); p.add_argument("--pdf")
        p.set_defaults(f=cmd_report(final))

    p = sp.add_parser("lib", help="Template Library Custodian: add | promote | reuse | list")
    p.add_argument("action", choices=["add", "promote", "reuse", "list"]); p.add_argument("name_or_id", nargs="?")
    p.add_argument("--type", default="template"); p.add_argument("--path"); p.add_argument("--to"); p.add_argument("--evidence")
    p.add_argument("--approved-by"); p.add_argument("--note"); p.add_argument("--allow-unverified", action="store_true")
    p.set_defaults(f=lambda a: cmd_lib(argparse.Namespace(**{**vars(a), "name": a.name_or_id, "id": a.name_or_id})))

    a = ap.parse_args(argv)
    try:
        rc = a.f(a)
        return rc or 0
    except Refused as e:
        print(f"REFUSED: {e}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    sys.exit(main())
