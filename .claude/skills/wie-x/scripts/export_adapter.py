#!/usr/bin/env python3
"""Export WIE-X to another AI environment (Module 01.3 Platform Adapter, Module 28 self-contained prompts).

Writes the file each platform reads as persistent project instructions. The adapter changes delivery
mechanics only; it never drops requirements, safety rules or quality standards (Module 01.3).

  python3 scripts/export_adapter.py --platform cursor   --out /path/to/project
  python3 scripts/export_adapter.py --platform generic  --out ./export  [--mode core|full]

Platforms and target files (verify against the platform's current docs before relying on them — Module 05):
  claude-code  .claude/skills/wie-x/        (full skill folder copy)
  cursor       .cursor/rules/wie-x.mdc
  copilot      .github/copilot-instructions.md
  codex        AGENTS.md
  windsurf     .windsurf/rules/wie-x.md
  generic      WIE-X-SYSTEM-PROMPT.md        (paste into Lovable / Bolt / v0 / Base44 / Replit / AI Studio /
                                              Antigravity / ChatGPT project instructions or knowledge)
Mode: core = SKILL.md operating core (compact, recommended where size is limited);
      full = core + the complete unabridged master text (default).
Existing target files are not overwritten unless --force is given.
"""
import argparse, pathlib, re, shutil, sys
from _common import ROOT

TARGETS = {"cursor": ".cursor/rules/wie-x.mdc", "copilot": ".github/copilot-instructions.md", "codex": "AGENTS.md",
           "windsurf": ".windsurf/rules/wie-x.md", "generic": "WIE-X-SYSTEM-PROMPT.md"}

def core_text():
    s = (ROOT / "SKILL.md").read_text(encoding="utf-8")
    s = re.sub(r"^---\n.*?\n---\n", "", s, flags=re.S)
    note = ("\n> Adapter note: this environment may not have the WIE-X scripts. Where a step says `scripts/…`, perform the\n"
            "> same check manually and report it honestly (Module 26.2: NOT EXECUTED — TOOL UNAVAILABLE).\n")
    return s + note

def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--platform", required=True, choices=["claude-code", *TARGETS])
    ap.add_argument("--out", default=".")
    ap.add_argument("--mode", choices=["core", "full"], default="full")
    ap.add_argument("--force", action="store_true")
    a = ap.parse_args()
    out = pathlib.Path(a.out).resolve()
    if a.platform == "claude-code":
        dst = out / ".claude" / "skills" / "wie-x"
        if dst.exists() and not a.force:
            print(f"{dst} exists — use --force to replace"); return 1
        shutil.copytree(ROOT, dst, dirs_exist_ok=True, ignore=shutil.ignore_patterns("__pycache__", "library"))
        print(f"Skill copied to {dst}"); return 0
    dst = out / TARGETS[a.platform]
    if dst.exists() and not a.force:
        print(f"{dst} exists — use --force to overwrite (Module 17.4: protect existing work)"); return 1
    dst.parent.mkdir(parents=True, exist_ok=True)
    body = core_text()
    if a.mode == "full":
        body += "\n\n---\n\n# APPENDIX — WIE-X v4.0 complete source\n\n" + (ROOT / "WIE-X-v4.0-MASTER.md").read_text(encoding="utf-8")
    if a.platform == "cursor":
        body = "---\ndescription: WIE-X v4.0 universal engineering system\nalwaysApply: true\n---\n" + body
    dst.write_text(body, encoding="utf-8")
    print(f"Wrote {dst} ({len(body):,} chars, mode={a.mode})")
    if len(body) > 60000:
        print("Note: large file — if the platform truncates instructions, re-export with --mode core.")
    return 0

if __name__ == "__main__":
    sys.exit(main())
