#!/usr/bin/env python3
"""Observe the capabilities of the current execution environment (Module 01.2).

Reports ONLY what this script can observe from a shell. Capabilities that belong to the
agent itself (web research tool, image understanding/generation, MCP, browser tool, persistent
memory) cannot be observed from here and are reported as UNKNOWN — the agent must confirm them
from its own tool list. Never upgrade an UNKNOWN to Available without observing it.

Usage: python3 scripts/capability_probe.py [--network-url https://example.com] [--json]
"""
import argparse, json, os, shutil, subprocess, sys, urllib.request

def run(cmd, timeout=8):
    try:
        p = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
        return p.returncode == 0, (p.stdout or p.stderr).strip().splitlines()[0] if (p.stdout or p.stderr).strip() else ""
    except Exception as e:  # noqa: BLE001
        return False, str(e)

def tool(name, args=("--version",)):
    path = shutil.which(name)
    if not path:
        return None
    ok, out = run([path, *args])
    return out if ok else path

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--network-url", default="https://pypi.org/simple/pip/")
    ap.add_argument("--json", action="store_true")
    a = ap.parse_args()
    rows = []
    def add(cap, status, evidence):
        rows.append({"capability": cap, "status": status, "evidence": evidence})

    add("Terminal", "Available", "this script is running in a shell")
    add("CLI execution", "Available", f"python {sys.version.split()[0]}")
    langs = {n: tool(n) for n in ("python3", "node", "bun", "deno", "go", "java", "ruby")}
    found = [f"{k}: {v}" for k, v in langs.items() if v]
    add("Code execution", "Available" if found else "Limited", "; ".join(found) or "no interpreters found")
    cwd_w = os.access(os.getcwd(), os.W_OK)
    add("File reading", "Available", "cwd readable")
    add("File writing", "Available" if cwd_w else "Limited", f"cwd writable={cwd_w}")
    g = tool("git")
    inside = run(["git", "rev-parse", "--is-inside-work-tree"])[0] if g else False
    add("Git", "Available" if g else "Unavailable", f"{g or 'not installed'}; inside repo={inside}")
    gh = tool("gh")
    add("GitHub", "Limited" if gh else "UNKNOWN", f"gh CLI: {gh}" if gh else "no gh CLI — the agent may still have a GitHub tool/MCP; confirm")
    dk = tool("docker")
    add("Deployment", "UNKNOWN", f"docker: {dk or 'absent'}; vercel: {tool('vercel') or 'absent'} — deployment rights must be confirmed")
    try:
        import importlib.util
        pw = importlib.util.find_spec("playwright") is not None
    except Exception:  # noqa: BLE001
        pw = False
    node_pw = run(["node", "-e", "require('playwright')"])[0] if langs.get("node") else False
    add("Automated testing", "Available" if (pw or node_pw) else "Limited",
        f"playwright(py)={pw} playwright(node)={node_pw}; pytest={bool(tool('pytest'))}")
    add("Application preview", "Limited" if (pw or node_pw) else "UNKNOWN",
        "headless browser can render pages" if (pw or node_pw) else "no headless browser observed")
    dbs = [n for n in ("psql", "sqlite3", "mysql", "mongosh", "redis-cli") if shutil.which(n)]
    add("Database access", "Limited" if dbs else "UNKNOWN", "clients: " + (", ".join(dbs) or "none"))
    try:
        urllib.request.urlopen(urllib.request.Request(a.network_url, method="HEAD"), timeout=8)
        net = ("Available", f"HEAD {a.network_url} ok")
    except Exception as e:  # noqa: BLE001
        net = ("Limited", f"HEAD {a.network_url} failed: {str(e)[:80]}")
    add("Network (outbound HTTP)", *net)
    for cap in ("Web research", "Browser", "Image understanding", "Image generation", "MCP", "Persistent project memory"):
        add(cap, "UNKNOWN", "agent-level capability — confirm from the agent's tool list")

    if a.json:
        print(json.dumps(rows, indent=2)); return 0
    print("| Capability | Status | Evidence |\n|---|---|---|")
    for r in rows:
        print(f"| {r['capability']} | {r['status']} | {r['evidence']} |")
    return 0

if __name__ == "__main__":
    sys.exit(main())
