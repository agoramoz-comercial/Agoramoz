#!/usr/bin/env python3
"""LEOC — Live Engineering Observability Center (CODEFORGE Part IX). Stdlib only.

  python3 dashboard/server.py --dir /path/to/project [--port 8765]

Serves a local dashboard (127.0.0.1 only) that shows REAL activity from:
  .codeforge/record.json (tasks, requirements, components, tests, graph, approvals, history, checkpoints, usage)
  .codeforge/events.jsonl (agent/tool events, terminal start/end, test results, audits, errors, context packages)
  git (status, diffs, commits) when the project is a repository.
Live updates via Server-Sent Events. Nothing is simulated: sources that are not connected are reported as
"not observable through the available integration" (§10.3). Approvals in the Approval Center are human actions
and require a name; POSTs need a per-session token (blocks cross-site requests).
"""
import argparse, hashlib, http.server, json, os, pathlib, secrets, subprocess, sys, threading, time, urllib.parse

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / "scripts"))
import cf  # noqa: E402
try:
    import cf_gov  # noqa: E402
except ImportError:
    cf_gov = None

TOKEN = secrets.token_urlsafe(24)
PROJECT = pathlib.Path(".")


def git(*args, timeout=8):
    try:
        p = subprocess.run(["git", "-C", str(PROJECT), *args], capture_output=True, text=True, timeout=timeout)
        return p.stdout if p.returncode == 0 else None
    except Exception:  # noqa: BLE001
        return None


def events(limit=400):
    f = PROJECT / ".codeforge" / "events.jsonl"
    if not f.exists():
        return []
    out = []
    for line in f.read_text(encoding="utf-8", errors="ignore").splitlines()[-limit:]:
        try:
            out.append(json.loads(line))
        except json.JSONDecodeError:
            out.append({"ts": "", "kind": "error", "message": "unreadable event line (corrupted)"})
    return out


def state():
    A = type("A", (), {"dir": str(PROJECT)})()
    st = {"generated": time.strftime("%Y-%m-%dT%H:%M:%S"), "sources": {}}
    try:
        r = cf.load(A)
        st["sources"]["record"] = "connected"
    except cf.Refused as e:
        r = None
        st["sources"]["record"] = f"unavailable: {e}"
    is_git = git("rev-parse", "--is-inside-work-tree")
    st["sources"]["git"] = "connected" if is_git else "not a git repository — file changes not observable"
    st["sources"]["events"] = "connected" if (PROJECT / ".codeforge" / "events.jsonl").exists() else "no events yet"
    st["sources"]["ide"] = "not observable through this integration (record IDE/agent actions with `cf.py event` or an IDE hook)"
    st["sources"]["llm_reasoning"] = "not shown — private model reasoning is not accessible; only recorded outputs, tool calls and results"
    ev = events(4000)
    st["events"] = ev[-200:]
    if r:
        p = r["project"]
        st["project"] = {**p, "version": r["version"], "updated": r["updated"]}
        st["tasks"] = [{"id": k, **{x: t.get(x) for x in ("title", "status", "stage", "attempts", "budget", "agent", "model", "risk", "next_action")},
                        "blocker": t.get("blocker")} for k, t in r["tasks"].items()]
        st["requirements"] = [{"id": k, "text": q["text"], "critical": q["critical"], "status": "OUT OF SCOPE" if q["out_of_scope"] else cf.req_status(r, k)} for k, q in r["requirements"].items()]
        st["components"] = [{"id": k, "name": c["name"], "kind": c["kind"], "status": c["status"], "gaps": cf.contract_gaps(c)} for k, c in r["components"].items()]
        st["tests"] = [{"id": k, "name": t["name"], "layer": t["layer"], "status": t["status"], "evidence": t["evidence"], "targets": t["targets"],
                        "seconds": (t["runs"][-1].get("seconds") if t["runs"] else None), "detail": (t["runs"][-1].get("detail", "") if t["runs"] else ""),
                        "runs": len(t["runs"])} for k, t in r["tests"].items()]
        started = {e.get("test") for e in ev if e.get("kind") == "test.start"}
        finished_after = {}
        for e in ev:
            if e.get("kind") == "test.start":
                finished_after[e.get("test")] = False
            elif e.get("kind") == "test":
                finished_after[e.get("test")] = True
        st["tests_running"] = sorted(k for k in started if finished_after.get(k) is False)
        st["decisions"] = [d for d in r.get("decisions", []) if isinstance(d, dict)][-30:]
        st["redteam"] = r.get("redteam", [])
        st["knowledge"] = [{"id": k, "title": v["title"], "type": v["type"], "status": v["status"]} for k, v in r.get("knowledge", {}).items()]
        st["adoption"] = [{"name": k, "decision": v["decision"], "verification": v["verification_status"], "audited": sum(x["status"] != "PENDING" for x in v["audit"])}
                          for k, v in r.get("adoption", {}).items()]
        st["gates"] = [{"name": n, "status": g, "basis": why} for n, g, why in cf_gov.compute_gates(r, PROJECT, ev)] if cf_gov else []
        nodes = [{"id": k, "type": "requirement", "label": q["text"][:38], "status": cf.req_status(r, k)} for k, q in r["requirements"].items()]
        nodes += [{"id": k, "type": c["kind"], "label": c["name"], "status": c["status"]} for k, c in r["components"].items()]
        nodes += [{"id": k, "type": "test", "label": t["name"], "status": t["status"]} for k, t in r["tests"].items()]
        nodes += [{"id": k, "type": n["type"], "label": n["name"], "status": ""} for k, n in r["nodes"].items()]
        st["graph"] = {"nodes": nodes, "edges": r["edges"]}
        st["integrity"] = [{"rule": k, "message": m} for k, m in cf.integrity(r, PROJECT)]
        st["pending_approvals"] = [x for x in r["pending_approvals"] if x["status"] == "PENDING"]
        st["approvals"] = r["approvals"][-20:]
        st["security"] = r["security"]
        st["checkpoints"] = r["checkpoints"][-20:]
        st["history"] = r["history"][-60:]
        use = {}
        for u in r.get("usage", []):
            k = f"{u.get('provider')}/{u.get('model')}"
            b = use.setdefault(k, {"calls": 0, "input_tokens": 0, "output_tokens": 0, "cached_tokens": 0, "cost": 0.0, "cost_reported": False})
            b["calls"] += 1
            for f in ("input_tokens", "output_tokens", "cached_tokens"):
                b[f] += int(u.get(f, 0) or 0)
            if u.get("cost") is not None:
                b["cost"] += float(u["cost"]); b["cost_reported"] = True
        st["usage"] = use
        st["release_blockers"] = cf.release_blockers(r)
    if is_git:
        st["git_status"] = [{"code": l[:2], "path": l[3:]} for l in (git("status", "--porcelain") or "").splitlines() if not l[3:].startswith(".codeforge")]
        st["commits"] = [dict(zip(["hash", "date", "author", "subject"], l.split("\x1f"))) for l in (git("log", "-n", "15", "--pretty=format:%h\x1f%ad\x1f%an\x1f%s", "--date=iso") or "").splitlines() if l]
    return st


def fingerprint():
    f = PROJECT / ".codeforge"
    parts = []
    for n in ("record.json", "events.jsonl"):
        p = f / n
        parts.append(f"{p.stat().st_mtime_ns}:{p.stat().st_size}" if p.exists() else "-")
    parts.append(git("status", "--porcelain") or "")
    return hashlib.sha1("|".join(parts).encode()).hexdigest()


class H(http.server.BaseHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def send(self, code, body, ctype="application/json; charset=utf-8"):
        b = body if isinstance(body, bytes) else body.encode("utf-8")
        self.send_response(code); self.send_header("Content-Type", ctype); self.send_header("Content-Length", str(len(b)))
        self.send_header("Cache-Control", "no-store"); self.send_header("X-Content-Type-Options", "nosniff"); self.end_headers(); self.wfile.write(b)

    def do_GET(self):
        u = urllib.parse.urlparse(self.path); q = urllib.parse.parse_qs(u.query)
        if u.path == "/":
            html = (HERE / "index.html").read_text(encoding="utf-8").replace("__CF_TOKEN__", TOKEN)
            return self.send(200, html, "text/html; charset=utf-8")
        if u.path == "/vendor/echarts.min.js":
            return self.send(200, (HERE / "vendor" / "echarts.min.js").read_bytes(), "application/javascript")
        if u.path == "/api/state":
            return self.send(200, json.dumps(state(), ensure_ascii=False, default=str))
        if u.path == "/api/diff":
            path = (q.get("path") or [""])[0]
            target = (PROJECT / path).resolve()
            if not str(target).startswith(str(PROJECT)) or ".." in path:
                return self.send(400, json.dumps({"error": "path outside project"}))
            d = git("diff", "--", path) or git("diff", "--no-index", "/dev/null", path) or ""
            if not d and target.is_file():
                d = "(new untracked file)\n" + target.read_text(encoding="utf-8", errors="ignore")[:20000]
            return self.send(200, json.dumps({"path": path, "diff": cf.redact(d[:60000])}))
        if u.path == "/api/log":
            path = (q.get("path") or [""])[0]
            target = (PROJECT / path).resolve()
            if not str(target).startswith(str(PROJECT / ".codeforge" / "runs")) or not target.is_file():
                return self.send(400, json.dumps({"error": "only .codeforge/runs logs are served"}))
            return self.send(200, json.dumps({"path": path, "log": target.read_text(encoding="utf-8", errors="ignore")[-60000:]}))
        if u.path == "/events":
            self.send_response(200); self.send_header("Content-Type", "text/event-stream"); self.send_header("Cache-Control", "no-cache")
            self.send_header("Connection", "keep-alive"); self.end_headers()
            last, ticks = None, 0
            try:
                while True:
                    fp = fingerprint()
                    if fp != last:
                        self.wfile.write(f"event: state\ndata: {json.dumps(state(), ensure_ascii=False, default=str)}\n\n".encode()); last = fp
                    elif ticks % 10 == 0:
                        self.wfile.write(b": keepalive\n\n")
                    self.wfile.flush(); ticks += 1; time.sleep(1.5)
            except (BrokenPipeError, ConnectionResetError):
                return
        return self.send(404, json.dumps({"error": "not found"}))

    def do_POST(self):
        if self.headers.get("X-CodeForge-Token") != TOKEN:
            return self.send(403, json.dumps({"error": "missing or invalid session token"}))
        u = urllib.parse.urlparse(self.path)
        n = int(self.headers.get("Content-Length") or 0)
        try:
            body = json.loads(self.rfile.read(n) if n else b"{}")
        except json.JSONDecodeError:
            return self.send(400, json.dumps({"error": "invalid JSON"}))
        if u.path == "/api/approve":
            by = (body.get("by") or "").strip()
            if not by:
                return self.send(400, json.dumps({"error": "a human name is required to approve (§3.8)"}))
            A = type("A", (), {"dir": str(PROJECT), "id": body.get("id"), "by": by, "reject": bool(body.get("reject"))})()
            try:
                cf.cmd_approve(A)
            except cf.Refused as e:
                return self.send(400, json.dumps({"error": str(e)}))
            return self.send(200, json.dumps({"ok": True}))
        return self.send(404, json.dumps({"error": "not found"}))


def main():
    global PROJECT
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--dir", default="."); ap.add_argument("--port", type=int, default=8765)
    a = ap.parse_args()
    PROJECT = pathlib.Path(a.dir).resolve()
    srv = http.server.ThreadingHTTPServer(("127.0.0.1", a.port), H)
    srv.daemon_threads = True
    print(f"CODEFORGE LEOC dashboard → http://127.0.0.1:{a.port}  (project {PROJECT})  · Ctrl+C to stop")
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
