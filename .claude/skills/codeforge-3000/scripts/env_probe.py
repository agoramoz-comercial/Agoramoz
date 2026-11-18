#!/usr/bin/env python3
"""Environment Readiness Report (CODEFORGE Module 03, §13.3–§13.4). Reports ONLY what is observed on this machine.

  python3 env_probe.py [--json] [--project DIR] [--network-url URL]
         [--require "node>=18,python3>=3.10,docker,terraform<2"] [--approval docker] [--na xcodebuild]

Each required item is classified (§13.4): AVAILABLE · MISSING · INCOMPATIBLE · OUTDATED · UNVERIFIED · NEEDS APPROVAL · NOT APPLICABLE.
  OUTDATED = below the minimum version · INCOMPATIBLE = at/above an exclusive maximum · UNVERIFIED = present but version unreadable
  NEEDS APPROVAL = missing and listed in --approval (installation requires human approval, §13.5)
Exit 1 unless every required item is AVAILABLE or NOT APPLICABLE.

IDE extensions, MCP servers and cloud logins live inside each IDE/agent and are reported as NOT OBSERVABLE
from a shell unless their CLI is present (§3.9: never pretend access).
"""
import argparse, json, os, pathlib, platform, re, shutil, subprocess, sys, urllib.request

GROUPS = {
    "Runtimes & languages": ["node", "deno", "bun", "python3", "java", "kotlinc", "dotnet", "go", "rustc", "cargo", "php", "ruby", "swift", "dart", "flutter"],
    "Package managers": ["npm", "pnpm", "yarn", "pip", "pipx", "uv", "poetry", "mvn", "gradle", "composer", "gem", "pod", "brew", "apt-get"],
    "Compilers & build": ["gcc", "clang", "make", "cmake", "tsc", "vite", "esbuild"],
    "IDEs / agent CLIs": ["code", "cursor", "claude", "codex", "gemini", "idea", "pycharm", "webstorm", "studio", "xcodebuild", "windsurf"],
    "Mobile & emulators": ["adb", "emulator", "sdkmanager", "xcrun", "simctl"],
    "Containers & infra": ["docker", "podman", "kubectl", "helm", "terraform", "pulumi"],
    "Cloud CLIs": ["gcloud", "aws", "az", "vercel", "netlify", "firebase", "supabase", "wrangler", "flyctl"],
    "Databases": ["psql", "mysql", "sqlite3", "mongosh", "redis-cli"],
    "VCS & collaboration": ["git", "gh", "glab"],
    "Testing & QA": ["pytest", "jest", "vitest", "playwright", "cypress", "k6", "locust", "newman"],
}
VERSION_ARGS = {"go": ["version"], "java": ["-version"], "kotlinc": ["-version"], "xcrun": ["--version"], "adb": ["version"],
                "kubectl": ["version", "--client"], "helm": ["version", "--short"], "terraform": ["version"], "docker": ["--version"]}


def ver(tool, path):
    args = VERSION_ARGS.get(tool, ["--version"])
    try:
        p = subprocess.run([path, *args], capture_output=True, text=True, timeout=6)
        out = (p.stdout or p.stderr).strip().splitlines()
        return out[0][:80] if out else "present"
    except Exception:  # noqa: BLE001
        return "present (version not readable)"


VER_RX = re.compile(r"(\d+)(?:\.(\d+))?(?:\.(\d+))?")


def parse_ver(text):
    m = VER_RX.search(text or "")
    return tuple(int(x or 0) for x in m.groups()) if m else None


def classify(spec, na, approval):
    m = re.match(r"^\s*([A-Za-z0-9_.+\-]+)\s*(?:(>=|<)\s*([0-9.]+))?\s*(?:,?\s*(<)\s*([0-9.]+))?\s*$", spec)
    if not m:
        return spec, "UNVERIFIED", "unparseable requirement"
    tool, op1, v1, op2, v2 = m.groups()
    lo = parse_ver(v1) if op1 == ">=" else None
    hi = parse_ver(v1) if op1 == "<" else parse_ver(v2) if op2 == "<" else None
    if tool in na:
        return tool, "NOT APPLICABLE", "declared not applicable"
    path = shutil.which(tool)
    if not path:
        return tool, "NEEDS APPROVAL" if tool in approval else "MISSING", "not found on PATH" + (" — installation requires approval (§13.5)" if tool in approval else "")
    v = ver(tool, path)
    pv = parse_ver(v)
    if (lo or hi) and not pv:
        return tool, "UNVERIFIED", f"present ({v}) but version not readable"
    if lo and pv < lo:
        return tool, "OUTDATED", f"{v} < required {v1}"
    if hi and pv >= hi:
        return tool, "INCOMPATIBLE", f"{v} ≥ maximum {v2 or v1}"
    return tool, "AVAILABLE", v


def audit_extra(project, network_url):
    out = {}
    out["environment_variables"] = sorted(k for k in os.environ if not k.startswith(("_", "LS_COLORS")))   # names only, never values
    g = shutil.which("git")
    def gitc(*args):
        try:
            p = subprocess.run(["git", *args], capture_output=True, text=True, timeout=5, cwd=project)
            return p.stdout.strip() if p.returncode == 0 else ""
        except Exception:  # noqa: BLE001
            return ""
    out["git_config"] = {"user.name set": bool(gitc("config", "user.name")), "user.email set": bool(gitc("config", "user.email")),
                         "init.defaultBranch": gitc("config", "init.defaultBranch") or "unset", "inside repository": bool(gitc("rev-parse", "--is-inside-work-tree")),
                         "remotes": gitc("remote").split()} if g else "git not installed"
    ext = {}
    for ide in ("code", "cursor", "windsurf"):
        if shutil.which(ide):
            try:
                p = subprocess.run([ide, "--list-extensions"], capture_output=True, text=True, timeout=15)
                ext[ide] = len(p.stdout.split()) if p.returncode == 0 else "not readable"
            except Exception:  # noqa: BLE001
                ext[ide] = "not readable"
    out["ide_extensions"] = ext or "no IDE CLI on PATH — extensions not observable"
    home = pathlib.Path.home()
    mcp = {str(pth): pth.exists() for pth in (pathlib.Path(project) / ".mcp.json", home / ".cursor" / "mcp.json", home / ".claude.json",
                                               home / ".config" / "Claude" / "claude_desktop_config.json")}
    out["mcp_config_files"] = {k: ("present (contents not read)" if v else "absent") for k, v in mcp.items()}
    if network_url:
        try:
            urllib.request.urlopen(urllib.request.Request(network_url, method="HEAD"), timeout=8)
            out["network"] = f"HEAD {network_url}: reachable"
        except Exception as e:  # noqa: BLE001
            out["network"] = f"HEAD {network_url}: NOT reachable ({str(e)[:60]})"
    else:
        out["network"] = "not tested (pass --network-url)"
    man = [n for n in ("package.json", "requirements.txt", "pyproject.toml", "go.mod", "Cargo.toml", "pom.xml", "build.gradle", "pubspec.yaml", "Gemfile", "composer.json")
           if (pathlib.Path(project) / n).exists()]
    out["project_dependency_manifests"] = man or "none in project root"
    out["existing_configuration"] = [n for n in (".editorconfig", ".nvmrc", ".tool-versions", ".python-version", "Dockerfile", "docker-compose.yml", ".github/workflows", ".devcontainer")
                                     if (pathlib.Path(project) / n).exists()]
    return out


def mem():
    try:
        with open("/proc/meminfo") as f:
            kv = dict(l.split(":", 1) for l in f)
        return f"{int(kv['MemTotal'].split()[0]) // 1024} MB total, {int(kv['MemAvailable'].split()[0]) // 1024} MB available"
    except Exception:  # noqa: BLE001
        return "not observable"


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--json", action="store_true"); ap.add_argument("--require", default="")
    ap.add_argument("--approval", default=""); ap.add_argument("--na", default=""); ap.add_argument("--project", default=".")
    ap.add_argument("--network-url")
    a = ap.parse_args()
    du = shutil.disk_usage(os.getcwd())
    sysinfo = {"os": f"{platform.system()} {platform.release()}", "arch": platform.machine(), "python": sys.version.split()[0],
               "cpus": os.cpu_count(), "memory": mem(), "disk_free_gb": round(du.free / 1e9, 1)}
    groups = {}
    for g, tools in GROUPS.items():
        groups[g] = {t: (ver(t, shutil.which(t)) if shutil.which(t) else None) for t in tools}
    node_pw = False
    if shutil.which("node"):
        node_pw = subprocess.run(["node", "-e", "require('playwright')"], capture_output=True).returncode == 0
    browsers = {"playwright (node module)": node_pw, "chromium": bool(shutil.which("chromium") or shutil.which("chromium-browser") or os.path.exists("/opt/pw-browsers")),
                "google-chrome": bool(shutil.which("google-chrome")), "firefox": bool(shutil.which("firefox"))}
    not_obs = ["IDE extensions (inspect inside each IDE)", "MCP servers (inspect the agent/IDE MCP configuration)",
               "Cloud credentials & signing certificates (do not read secrets; confirm with the user)"]
    req = []
    for part in (a.require.split(",") if a.require else []):
        if part.strip().startswith("<") and req:
            req[-1] += "," + part.strip()           # "node>=18,<23" keeps its upper bound
        elif part.strip():
            req.append(part.strip())
    na = {x.strip() for x in a.na.split(",") if x.strip()}; appr = {x.strip() for x in a.approval.split(",") if x.strip()}
    readiness = [classify(x, na, appr) for x in req]
    extra = audit_extra(a.project, a.network_url)
    ok = all(st in ("AVAILABLE", "NOT APPLICABLE") for _, st, _ in readiness)
    missing = [t for t, st, _ in readiness if st not in ("AVAILABLE", "NOT APPLICABLE")]
    rep = {"system": sysinfo, "tools": groups, "browsers": browsers, "audit": extra, "readiness": [{"item": t, "status": st, "evidence": e} for t, st, e in readiness],
           "not_observable_from_shell": not_obs, "missing_required": missing, "ready": ok}
    if a.json:
        print(json.dumps(rep, indent=2)); return 0 if ok else 1
    print("# Environment Readiness Report (M03)\n")
    print("| System | Value |\n|---|---|")
    for k, v in sysinfo.items():
        print(f"| {k} | {v} |")
    for g, tools in groups.items():
        found = {t: v for t, v in tools.items() if v}
        print(f"\n## {g}\n" + ("\n".join(f"- ✓ **{t}** — {v}" for t, v in found.items()) or "- none found"))
    print("\n## Browsers / automation\n" + "\n".join(f"- {'✓' if v else '✗'} {k}" for k, v in browsers.items()))
    print("\n## Not observable from a shell\n" + "\n".join(f"- {x}" for x in not_obs))
    print("\n## Environment audit (§13.3)")
    for k, v in extra.items():
        if k == "environment_variables":
            print(f"- environment variables: {len(v)} defined (names only, values never read): {', '.join(v[:25])}{' …' if len(v) > 25 else ''}")
        else:
            print(f"- {k.replace('_', ' ')}: {v}")
    if req:
        print("\n## Readiness assessment (§13.4)\n| Requirement | Status | Evidence |\n|---|---|---|")
        for t, st, e in readiness:
            print(f"| {t} | {st} | {e} |")
        print("\nREADY" if ok else f"\nNOT READY: {', '.join(missing)}")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
