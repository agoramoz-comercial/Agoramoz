#!/usr/bin/env python3
"""Multi-IDE / multi-LLM adapters for CODEFORGE 3000 (Module 03, Part V).

  python3 export.py --platform claude-code|cursor|copilot|codex|windsurf|antigravity|generic --out <project> [--mode core|full]
        [--with-hooks]   (claude-code only: register the activity hook in <project>/.claude/settings.json — merged, never overwritten)
        [--force]

Targets (verify against each product's current docs before relying on them):
  claude-code  .claude/skills/codeforge-3000/ (+ optional hooks in .claude/settings.json)
  cursor       .cursor/rules/codeforge.mdc        copilot   .github/copilot-instructions.md
  codex        AGENTS.md                           windsurf  .windsurf/rules/codeforge.md
  antigravity / generic   CODEFORGE-SYSTEM-PROMPT.md  (paste into the agent's rules / system instructions)
"""
import argparse, json, pathlib, re, shutil, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
T = {"cursor": ".cursor/rules/codeforge.mdc", "copilot": ".github/copilot-instructions.md", "codex": "AGENTS.md",
     "windsurf": ".windsurf/rules/codeforge.md", "antigravity": "CODEFORGE-SYSTEM-PROMPT.md", "generic": "CODEFORGE-SYSTEM-PROMPT.md"}
NOTE = ("\n\n> Adapter note: if this environment cannot run `scripts/*.py`, apply the same rules manually and report checks as "
        "NOT EXECUTED — TOOL UNAVAILABLE. Never claim IDE, terminal, browser or repository access you do not have (§3.9).\n")


def core():
    return re.sub(r"^---\n.*?\n---\n", "", (ROOT / "SKILL.md").read_text(encoding="utf-8"), flags=re.S) + NOTE


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--platform", required=True, choices=["claude-code", *T]); ap.add_argument("--out", default=".")
    ap.add_argument("--mode", choices=["core", "full"], default="full"); ap.add_argument("--with-hooks", action="store_true"); ap.add_argument("--force", action="store_true")
    a = ap.parse_args()
    out = pathlib.Path(a.out).resolve()
    if a.platform == "claude-code":
        dst = out / ".claude" / "skills" / "codeforge-3000"
        if dst.exists() and not a.force:
            print(f"{dst} exists — use --force"); return 1
        shutil.copytree(ROOT, dst, dirs_exist_ok=True, ignore=shutil.ignore_patterns("__pycache__", ".codeforge"))
        print(f"Skill copied to {dst}")
        if a.with_hooks:
            sf = out / ".claude" / "settings.json"
            s = json.loads(sf.read_text(encoding="utf-8")) if sf.exists() else {}
            cmd = f"python3 \"{dst / 'scripts' / 'hooks' / 'claude_code_hook.py'}\""
            hooks = s.setdefault("hooks", {}).setdefault("PostToolUse", [])
            if not any(cmd in json.dumps(h) for h in hooks):
                hooks.append({"matcher": "*", "hooks": [{"type": "command", "command": cmd}]})
            sf.parent.mkdir(parents=True, exist_ok=True)
            sf.write_text(json.dumps(s, indent=2), encoding="utf-8")
            print(f"PostToolUse activity hook registered in {sf} (existing settings preserved). Verify the schema in the Claude Code hooks docs.")
        return 0
    dst = out / T[a.platform]
    if dst.exists() and not a.force:
        print(f"{dst} exists — use --force (protect existing work)"); return 1
    body = core()
    if a.mode == "full":
        body += "\n\n---\n\n# APPENDIX — CODEFORGE 3000 Master System Prompt v1.0\n\n" + (ROOT / "CODEFORGE-MASTER-v1.0.md").read_text(encoding="utf-8")
    if a.platform == "cursor":
        body = "---\ndescription: ZABATAINA CODEFORGE 3000 engineering operating system\nalwaysApply: true\n---\n" + body
    dst.parent.mkdir(parents=True, exist_ok=True); dst.write_text(body, encoding="utf-8")
    print(f"Wrote {dst} ({len(body):,} chars, mode={a.mode})"); return 0


if __name__ == "__main__":
    sys.exit(main())
