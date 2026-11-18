#!/usr/bin/env python3
"""/CODEFORGE command interface (Master Prompt §25) — every command maps to actual available operations.

  python3 codeforge.py [--dir PROJECT] <COMMAND> [args…]        e.g.  codeforge.py STATUS · codeforge.py "/CODEFORGE TEST"

Commands: INIT DIAGNOSE RESEARCH ARCHITECT DEPARTMENTS AGENTS SKILLS ENVIRONMENT BUILD MAP TEST REDTEAM VERIFY LIVE STATUS
          HISTORY BLOCKERS NEXT RESUME REPORT RELEASE LEARN
Each run prints the underlying operations it executed. When a command cannot be executed in this environment it says so and
names the required integration — it never simulates success (§25).
"""
import json, pathlib, shlex, subprocess, sys

S = pathlib.Path(__file__).resolve().parent
PY = sys.executable


def run(argv, label):
    print(f"\n▶ {label}: {' '.join(shlex.quote(x) for x in argv)}", flush=True)
    return subprocess.call(argv)


def main():
    args = sys.argv[1:]
    proj = "."
    if args[:1] == ["--dir"]:
        proj, args = args[1], args[2:]
    if not args:
        print(__doc__); return 2
    cmd = args[0].replace("/CODEFORGE", "").strip().upper() or (args[1].upper() if len(args) > 1 else "")
    rest = args[1:] if args[0].upper() != "/CODEFORGE" else args[2:]
    if " " in args[0].strip() and args[0].upper().startswith("/CODEFORGE"):
        cmd = args[0].split()[1].upper()
    cf = [PY, str(S / "cf.py"), "--dir", proj]
    fac = [PY, str(S / "factory.py"), "--dir", proj]
    rc = 0
    if cmd == "INIT":
        rc = run(cf + ["init"] + rest, "initialize project (cf.py init)")
    elif cmd == "DIAGNOSE":
        for argv, label in [([PY, str(S / "repo_scan.py"), proj], "repository intelligence (M05)"),
                            ([PY, str(S / "flow_audit.py"), proj, "--emit"], "functional flow audit (M15)"),
                            ([PY, str(S / "secret_scan.py"), proj, "--emit"], "secret scan (M17)"),
                            (cf + ["graph", "check"], "graph integrity (§19.5)"), (cf + ["gates"], "quality gates (§21.6)")]:
            rc = max(rc, run(argv, label))
    elif cmd == "RESEARCH":
        srcs = json.loads((S.parent / "data" / "sources.json").read_text(encoding="utf-8"))
        print("RESEARCH is NOT EXECUTED by this script: it requires the agent's web/documentation research tools (§11.5, §28.1).")
        print("Use official documentation first:\n" + "\n".join(f"- {x['name']}: {x['url']}" for x in srcs["ecosystem"] + srcs["environments"]))
        print("Record findings with `cf.py benchmark add …` or `cf.py adopt audit …` and cite the sources.")
        return 3
    elif cmd == "ARCHITECT":
        rc = max(run(cf + ["graph", "check"], "architecture integrity"), run(cf + ["graph", "export"], "architecture graph (export)"))
        print("\nDesign itself is an engineering decision: model components/APIs/data with `cf.py comp/node/link` and record ADRs with `cf.py decision`.")
    elif cmd == "DEPARTMENTS":
        rc = run(fac + (rest or ["list"]), "organization factory (§15)")
    elif cmd == "AGENTS":
        rc = run(fac + (rest or ["list"]), "agent registry (§15.4–15.5)")
    elif cmd == "SKILLS":
        rc = run(fac + (rest or ["list"]), "skill factory (§16)")
    elif cmd == "ENVIRONMENT":
        rc = run([PY, str(S / "env_probe.py"), "--project", proj] + rest, "environment readiness (§13)")
    elif cmd == "BUILD":
        rc = run(cf + (["task"] + rest if rest else ["next"]), "approved implementation task (zero-skip loop)")
        if not rest:
            print("\nBUILD needs a task: `codeforge.py BUILD advance T-001` (only READY/IN_PROGRESS tasks advance; destructive commands need approval).")
    elif cmd == "MAP":
        for argv, label in [(cf + ["coverage"], "functional coverage matrix (§21.5)"), (cf + ["graph", "trace"], "traceability (§19.4)"),
                            ([PY, str(S / "flow_audit.py"), proj, "--emit"], "functional flow audit (M15)")]:
            rc = max(rc, run(argv, label))
    elif cmd == "TEST":
        rec = json.loads((pathlib.Path(proj) / ".codeforge" / "record.json").read_text(encoding="utf-8"))
        runnable = [k for k, t in rec["tests"].items() if t.get("command")]
        if not runnable:
            print("No test has a --command: nothing can be executed. Import runner results with `cf.py test import results.xml`."); return 3
        for k in runnable:
            rc = max(rc, run(cf + ["test", "run", k], f"execute {k}"))
        notrun = [k for k, t in rec["tests"].items() if not t.get("command")]
        if notrun:
            print(f"\nNot executable here (no command): {notrun} — reported as NOT EXECUTED, never as passed (§21.7).")
    elif cmd == "REDTEAM":
        for argv, label in [(cf + ["redteam", "checklist"], "red team coverage (§21.8)"), ([PY, str(S / "secret_scan.py"), proj, "--emit"], "secret scan"),
                            ([PY, str(S / "flow_audit.py"), proj, "--emit"], "functional weaknesses")]:
            rc = max(rc, run(argv, label))
        print("\nRecord each finding with `cf.py redteam add --area … --component … --repro … --evidence … --impact … --remediation …`.")
    elif cmd == "VERIFY":
        rc = max(run(cf + ["graph", "check"], "graph integrity"), run(cf + ["gates"], "quality gates"))
    elif cmd == "LIVE":
        return run([PY, str(S.parent / "dashboard" / "server.py"), "--dir", proj] + rest, "live observability center (§22)")
    elif cmd in ("STATUS", "HISTORY", "BLOCKERS", "NEXT", "REPORT"):
        rc = run(cf + [cmd.lower()] + rest, cmd.lower())
    elif cmd == "RESUME":
        rc = run(cf + ["resume"] + (rest or ["--last-verified"]), "resume from the last verified checkpoint (§20.7)")
    elif cmd == "RELEASE":
        rc = run(cf + ["gates"], "release gates (§21.6)")
        if rest:
            rc = max(rc, run(cf + ["comp", "status"] + rest, "release component (requires gates + human approval history)"))
        else:
            rc = max(rc, run(cf + ["final"], "final completion report (§27)"))
            print("\nPreparation only. Executing a release: `codeforge.py RELEASE CMP-x RELEASED` after APPROVED by a human; deployment commands go through the approval center.")
    elif cmd == "LEARN":
        rc = run(cf + ["learn"] + (rest or ["list"]), "engineering memory (§22.5)")
    else:
        print(f"Unknown command {cmd!r}. Valid: INIT DIAGNOSE RESEARCH ARCHITECT DEPARTMENTS AGENTS SKILLS ENVIRONMENT BUILD MAP TEST REDTEAM VERIFY LIVE "
              "STATUS HISTORY BLOCKERS NEXT RESUME REPORT RELEASE LEARN"); return 2
    return rc


if __name__ == "__main__":
    sys.exit(main())
