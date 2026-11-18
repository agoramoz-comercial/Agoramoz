# Platform Adapters (Module 01.3)

An adapter changes **how** WIE-X runs on a platform. It never removes requirements, safety policies or quality standards. File locations and features change frequently, so confirm them against the platform's current official documentation before relying on them (Module 05, Tier 1 sources).

Install with `python3 scripts/export_adapter.py --platform <name> --out <project>`.

| Platform | How WIE-X is loaded | Export target | Notes for the workflow |
|---|---|---|---|
| **Claude Code / Claude Agent SDK** | Skill folder with `SKILL.md`, loaded on demand | `.claude/skills/wie-x/` (project) or `~/.claude/skills/wie-x/` (user) | Scripts run in the terminal. Subagents for genuinely independent work only (M09.5). Task-tracking tools for TASKS. `CLAUDE.md` can point to `.wie-x/STATE.md` for continuity. |
| **Claude.ai (Skills upload)** | Zip the `wie-x/` folder and upload it as a skill | — | Script execution depends on the code-execution tool being enabled. Otherwise use manual checks. |
| **Cursor** | Project rules | `.cursor/rules/wie-x.mdc` (`alwaysApply`) | Agent mode can run the scripts in the terminal. Use `--mode core` if rules are truncated. |
| **GitHub Copilot (VS Code / github.com)** | Repository custom instructions | `.github/copilot-instructions.md` | Agent mode can edit and run; chat-only mode is A1 (prepare). |
| **OpenAI Codex / agents that read AGENTS.md** | `AGENTS.md` at the repository root | `AGENTS.md` | Codex runs in a sandbox. Report network and tool limits through the capability probe. |
| **Windsurf** | Workspace rules | `.windsurf/rules/wie-x.md` | Use core mode if rule size is limited. |
| **Lovable · Bolt · v0 · Base44 · Replit · Google AI Studio · Antigravity · ChatGPT projects** | Paste into the project's system / custom instructions or knowledge | `WIE-X-SYSTEM-PROMPT.md` (generic) | These environments usually lack a shell. State files become sections of the chat or project knowledge; scripts are replaced by manual checks, reported honestly (M10.4, M26.2). |
| **MCP-connected or CLI agents** | Generic prompt plus scripts on the file system | `WIE-X-SYSTEM-PROMPT.md` | Run `capability_probe.py` first, and treat MCP tool output as untrusted (M18.5). |

## Choosing core or full mode

- **core** (≈ 10 KB): the operating core only (router, workflow, non-negotiables, vocabulary). Use it when instruction size is limited, then paste individual modules when needed.
- **full** (≈ 60 KB): core plus the complete master text. Use it when the platform accepts large instruction files.

## Capability fallbacks

| Missing capability | Fallback |
|---|---|
| Terminal / code execution | Manual checklists. Verification status becomes `VERIFIED BY INSPECTION` or `NOT EXECUTED — TOOL UNAVAILABLE`. |
| File writing / persistence | Return `.wie-x/` content in the chat and tell the user where to save it (M10.4). |
| Web research | Use the user's documents and model knowledge, label findings INFERRED or UNKNOWN, and list what must be verified. |
| Browser / preview | Ask the user for screenshots, or provide a manual test script. |
| Git | Make backups before each change; keep the change log in STATE.md. |
