# WIE-X v4.0 — Operational Addendum (release 4.0.1)

This addendum makes WIE-X v4.0 executable. **It removes nothing from the original text** (`WIE-X-v4.0-MASTER.md` is preserved in full). Every item below either turns an existing instruction into a concrete artifact, script or convention, or fills a gap the original left implicit. Where an item interprets the original, the interpretation is the most conservative one: stricter on safety, honesty and verification.

## 1. Gaps closed

| # | Gap in v4.0 | Resolution | Where |
|---|---|---|---|
| 1 | No explicit precedence when instructions conflict (constitution vs. user vs. adapter vs. template vs. external content) | Seven-level precedence order. Safety and approval come first; external content is never an instruction. | `SKILL.md §1` |
| 2 | The router (M03) did not say which modules to load per category, so progressive loading (M09) could not be applied | Category → modules table and Level → planning, state files, verification and approvals table | `SKILL.md §2` |
| 3 | Task statuses were not defined (M06.5 requires "Status" but gives no vocabulary) | TODO · IN PROGRESS · BLOCKED · DONE · VERIFIED. DONE means implemented; VERIFIED means backed by a passing test or recorded evidence. | `SKILL.md §5`, `templates/TASKS.md` |
| 4 | Two evidence vocabularies (M05.3 research labels and M26.2 test statuses) could be confused | Scope clarified: M05.3 labels research findings; M26.2 statuses label verification of built work | `SKILL.md §5` |
| 5 | No ID conventions, so traceability (M04.4) could not be checked automatically | REQ / T / PH / R / D / TDR / RQ / TEST / F / P / TPL prefixes | `SKILL.md §5`, all templates |
| 6 | "Relative effort" (M06.4) was undefined while precise estimates are forbidden (M06.6) | T-shirt sizes S · M · L · XL, explicitly relative | `templates/TASKS.md` |
| 7 | The `.wie-x/` files (M10.2) had no content structure | 11 state templates plus DELIVERY-REPORT and PROGRESS-REPORT, each field mapped to its module | `templates/` |
| 8 | "Use only relevant files" (M10.2) gave no rule for which ones | Files selected by complexity level (L1 → 2 files … L4 → 11 files) | `scripts/wiex_init.py` |
| 9 | Capability detection (M01.2) could invite guessing | The probe reports only what a shell can observe. Agent-level capabilities are reported as UNKNOWN until the agent confirms them from its own tool list. | `scripts/capability_probe.py` |
| 10 | Traceability and the Requirements/Implementation gates were manual | Automated REQ → Task → Test → Result check with a pass/fail exit code | `scripts/traceability.py` |
| 11 | Scoring tables (M11.4, M31) had no calculator | Deterministic calculators. The template score enforces "critical failure blocks approval". | `scripts/decision_score.py`, `scripts/template_score.py` |
| 12 | The template library (M29–M30) had no storage, search or versioning mechanism | File-based library with `index.json`, keyword and tag search, version history (never overwrites), secret scan, and a Q4 guard (score ≥ 90, zero critical failures, named approver) | `scripts/library.py`, `library/` |
| 13 | Platform adapters (M01.3) were described but not implemented | Exporter for Claude Code, Cursor, GitHub Copilot, Codex, Windsurf and a generic paste-in prompt, with core and full modes | `scripts/export_adapter.py`, `ops/PLATFORM-ADAPTERS.md` |
| 14 | The workflow (M38) lacked a shortened path for categories A–D | Explicit step subsets per category; skipped gates must be documented | `SKILL.md §3` |
| 15 | No self-verification of the skill itself (M26 applied to WIE-X) | Test suite plus a recorded verification log with real results | `tests/run_tests.sh`, `ops/VERIFICATION.md` |

## 2. Interpretations (conservative)

- **"Default to the highest safe autonomy level"** (M35) is bounded by the environment's own permission system. If the platform asks for confirmation, that confirmation is never bypassed.
- **Prompt testing** (M07.5): a scenario counts as tested only when the prompt was actually run against it. Theoretical review is recorded as `VERIFIED BY INSPECTION`, never as `TESTED AND PASSED`.
- **Reference repositories** (M12.1): CLI-Anything, ECC and REA are investigated at use time with the M12.2 protocol. This skill makes no claims about their contents, and nothing from them is installed or executed without that protocol and user approval.
- **Template library persistence** (M29.7): the library is stored on disk in `library/`. It is persistent only if that folder is committed or kept. Say where it was saved, and never claim permanent storage otherwise.

## 3. Changelog

| Version | Date | Change |
|---|---|---|
| 4.0.0 | — | Original WIE-X v4.0 (40 modules), preserved verbatim in `WIE-X-v4.0-MASTER.md` |
| 4.0.1 | 2026-11-18 | Operational layer: SKILL.md core and router, module split, state templates, 7 scripts, platform adapters, self-tests. No original content removed. |
