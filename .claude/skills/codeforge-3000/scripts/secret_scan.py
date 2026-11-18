#!/usr/bin/env python3
"""Secret scanner (CODEFORGE Module 17) — never expose secrets in code, logs, prompts or repositories.

  python3 secret_scan.py <path> [--json]          scan working tree
  python3 secret_scan.py <path> --staged          scan staged changes only (use as a git pre-commit hook)

Values are never printed in full (masked). Exit 1 when secrets are found.
Pre-commit hook:  printf '#!/bin/sh\\npython3 %s . --staged\\n' > .git/hooks/pre-commit && chmod +x .git/hooks/pre-commit
"""
import argparse, json, os, pathlib, re, subprocess, sys

SKIP = {".git", "node_modules", ".next", "dist", "build", ".venv", "venv", "__pycache__", "coverage", ".codeforge"}
PATTERNS = [
    ("AWS access key", r"AKIA[0-9A-Z]{16}"), ("Private key", r"-----BEGIN [A-Z ]*PRIVATE KEY-----"),
    ("OpenAI/Anthropic-style key", r"\bsk-(ant-)?[A-Za-z0-9_\-]{20,}"), ("GitHub token", r"\bgh[pousr]_[A-Za-z0-9]{30,}"),
    ("Slack token", r"\bxox[abpr]-[A-Za-z0-9\-]{10,}"), ("Google API key", r"AIza[0-9A-Za-z_\-]{35}"),
    ("Stripe live key", r"\b(sk|rk)_live_[0-9a-zA-Z]{20,}"), ("JWT", r"\beyJ[A-Za-z0-9_\-]{10,}\.[A-Za-z0-9_\-]{10,}\.[A-Za-z0-9_\-]{10,}"),
    ("DB URL with password", r"(postgres(ql)?|mysql|mongodb(\+srv)?|redis)://[^\s:/]+:[^\s@/]{3,}@"),
    ("Credential assignment", r"(?i)\b(password|passwd|secret|api[_-]?key|access[_-]?token|client[_-]?secret)\b\s*[:=]\s*['\"][^'\"\s]{8,}['\"]"),
]
RX = [(n, re.compile(p)) for n, p in PATTERNS]
PLACEHOLDER = re.compile(r"(?i)(example|placeholder|changeme|your[_-]|xxx|<.*>|\$\{|process\.env|os\.environ|dummy|test123)")


def mask(s):
    s = s.strip()
    return s[:4] + "…" + s[-2:] if len(s) > 8 else "****"


def scan_text(name, text):
    out = []
    for i, line in enumerate(text.splitlines(), 1):
        for label, rx in RX:
            for m in rx.finditer(line):
                if label == "Credential assignment" and PLACEHOLDER.search(line):
                    continue
                out.append({"file": name, "line": i, "type": label, "match": mask(m.group(0))})
    return out


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("path"); ap.add_argument("--staged", action="store_true"); ap.add_argument("--json", action="store_true")
    ap.add_argument("--emit", action="store_true", help="record a summary event for the quality gates (no secret values)")
    a = ap.parse_args()
    root = pathlib.Path(a.path).resolve(); hits = []
    if a.staged:
        diff = subprocess.run(["git", "-C", str(root), "diff", "--cached", "-U0"], capture_output=True, text=True).stdout
        cur = "?"
        for line in diff.splitlines():
            if line.startswith("+++ b/"):
                cur = line[6:]
            elif line.startswith("+") and not line.startswith("+++"):
                hits += scan_text(cur, line[1:])
    else:
        for dp, dns, fns in os.walk(root):
            dns[:] = [d for d in dns if d not in SKIP]
            for f in fns:
                p = pathlib.Path(dp) / f
                try:
                    if p.stat().st_size > 2_000_000:
                        continue
                    t = p.read_text(encoding="utf-8")
                except Exception:  # noqa: BLE001
                    continue
                hits += scan_text(p.relative_to(root).as_posix(), t)
    tracked_env = []
    ls = subprocess.run(["git", "-C", str(root), "ls-files"], capture_output=True, text=True)
    if ls.returncode == 0:
        tracked_env = [x for x in ls.stdout.splitlines() if re.search(r"(^|/)\.env(\.[^/]+)?$", x) and not x.endswith((".example", ".sample", ".template"))]
    if a.emit:
        import datetime as dt
        d = root / ".codeforge"; d.mkdir(exist_ok=True)
        with open(d / "events.jsonl", "a", encoding="utf-8") as fh:
            fh.write(json.dumps({"ts": dt.datetime.now().isoformat(timespec="seconds"), "kind": "secret_scan", "found": len(hits) + len(tracked_env),
                                 "files": sorted({h["file"] for h in hits}) + tracked_env}) + "\n")
    if a.json:
        print(json.dumps({"secrets": hits, "tracked_env_files": tracked_env}, indent=2, ensure_ascii=False)); return 1 if hits or tracked_env else 0
    if hits:
        print("| File | Line | Type | Match (masked) |\n|---|---|---|---|")
        for h in hits:
            print(f"| `{h['file']}` | {h['line']} | {h['type']} | `{h['match']}` |")
    if tracked_env:
        print("\nTracked .env files (should be git-ignored): " + ", ".join(tracked_env))
    print(f"\n{len(hits)} potential secret(s){', ' + str(len(tracked_env)) + ' tracked env file(s)' if tracked_env else ''}. "
          + ("Rotate any real secret that was committed — removing it from the latest commit is not enough." if hits else "Clean."))
    return 1 if hits or tracked_env else 0


if __name__ == "__main__":
    sys.exit(main())
