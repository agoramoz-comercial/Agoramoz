#!/usr/bin/env python3
"""Model adapters (Master Prompt v2.0 §52) — export ZABATAINA 3000 to other AI environments.

  python3 export.py --platform chatgpt|gemini|claude|generic [--mode core|full] [--out DIR] [--force]

  claude   → copies the whole skill folder to <out>/.claude/skills/zabataina-3000/ (scripts run there)
  chatgpt  → ZABATAINA-3000-chatgpt.md  (paste into a Custom GPT / Project instructions; attach data/*.json as knowledge)
  gemini   → ZABATAINA-3000-gemini.md   (paste into a Gem / system instructions)
  generic  → ZABATAINA-3000-system-prompt.md

core = SKILL.md operating core + capability notice (compact); full = core + complete master text (default).
A prompt alone cannot create persistent memory, run scripts or instantiate real agents (§52): the exported
prompt instructs the model to keep the process record as a visible document and to report tool gaps honestly.
"""
import argparse, pathlib, re, shutil, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
NOTICE = """
---
## Platform adapter notice (§52)
This environment may lack code execution, file persistence or real sub-agents. Then:
- Keep the PROCESS RECORD as a visible, versioned Markdown block (tasks with ID, status, deps, acceptance, evidence) and
  re-print it at every checkpoint; ask the user to save it. Never claim it was stored elsewhere.
- Where this core says `z3k.py`, `finance.py`, `qa.py` or `doc_builder.py`, apply the same rules and formulas manually,
  show the calculation, and mark checks as "NOT EXECUTED — TOOL UNAVAILABLE" or "VERIFIED BY INSPECTION".
- The 24 agents are logical roles answered in sequence by this model unless the platform provides real agents.
- Documents: follow the editorial design rules (blue #1D2BE6, periwinkle #7A80DA, lavender #A9ACE3, ink #0C0C10, paper #F4F4F6).
"""


def core():
    s = (ROOT / "SKILL.md").read_text(encoding="utf-8")
    return re.sub(r"^---\n.*?\n---\n", "", s, flags=re.S) + NOTICE


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--platform", required=True, choices=["chatgpt", "gemini", "claude", "generic"])
    ap.add_argument("--mode", choices=["core", "full"], default="full")
    ap.add_argument("--out", default=".")
    ap.add_argument("--force", action="store_true")
    a = ap.parse_args()
    out = pathlib.Path(a.out).resolve()
    if a.platform == "claude":
        dst = out / ".claude" / "skills" / "zabataina-3000"
        if dst.exists() and not a.force:
            print(f"{dst} exists — use --force"); return 1
        shutil.copytree(ROOT, dst, dirs_exist_ok=True, ignore=shutil.ignore_patterns("__pycache__", ".z3000", "library"))
        print(f"Skill copied to {dst}"); return 0
    name = {"chatgpt": "ZABATAINA-3000-chatgpt.md", "gemini": "ZABATAINA-3000-gemini.md", "generic": "ZABATAINA-3000-system-prompt.md"}[a.platform]
    dst = out / name
    if dst.exists() and not a.force:
        print(f"{dst} exists — use --force (protect existing work)"); return 1
    body = core()
    if a.mode == "full":
        body += "\n\n---\n\n# APPENDIX — ZABATAINA 3000 Master Prompt v2.0 (complete)\n\n" + (ROOT / "Z3000-MASTER-v2.0.md").read_text(encoding="utf-8")
    out.mkdir(parents=True, exist_ok=True)
    dst.write_text(body, encoding="utf-8")
    print(f"Wrote {dst} ({len(body):,} chars, mode={a.mode})")
    if a.platform == "chatgpt" and len(body) > 8000:
        print("Note: Custom GPT instruction fields are size-limited — use --mode core for the instructions and upload the full file as knowledge.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
