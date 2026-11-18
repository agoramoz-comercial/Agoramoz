# ZABATAINA 3000 v2.0 — Operational Addendum

The Master Prompt v2.0 (`Z3000-MASTER-v2.0.md`) is preserved **in full**. This addendum lists what the execution layer adds so that each instruction can actually be run and checked. Nothing in it relaxes a rule of the master text.

## 1. How the versions fit together

| Layer | File(s) | Role |
|---|---|---|
| Constitution v2.0 | `Z3000-MASTER-v2.0.md` | Authoritative. Wins on any conflict. |
| Module manuals v1 | `modules/M01…M20` | Detailed methods, formulas and templates for each foundational module. M01 v1 is the owner's original constitution; M02–M20 v1 are its detailed extension. |
| Operating core | `SKILL.md` | Precedence, routing, commands → actions, and the rules the scripts enforce |
| Execution layer | `scripts/`, `reports/`, `data/`, `tests/` | Executable mechanisms |

### v1 ↔ v2 vocabulary mapping

| Topic | v1 (modules) | v2.0 (master) | Rule applied |
|---|---|---|---|
| Task / action status | NOT STARTED … EXECUTED · VERIFIED (M01 §009.4) | CREATED → … → VERIFIED + exceptional states (§34) | **v2 states for tasks** (enforced by `z3k.py`). v1 vocabulary may still describe engagement-level actions. |
| Evidence | Claim labels [VERIFIED] [CLIENT] [SOURCE] [CALCULATED] [ESTIMATE] [ASSUMPTION] [HYPOTHESIS] [UNKNOWN] (M02 §005) | Source tiers E1–E4 (§9) + claim types (§15) | Complementary: **E1–E4 rate the source**, claim types/labels classify the statement. Both are recorded in `z3k.py evidence`. |
| Quality gate | 10 dimensions, ≥ 32/40, no zero in 4 key dimensions (M01 §011) | 12 dimensions 0–4 (§46) | `qa.py`: 12 dimensions, **≥ 39/48 (same ≈80 % bar)**, no zero in accuracy, evidence, feasibility or security; `--critical` forbids any zero |
| Modes | M1–M7 (M02 §002) | 15 working modes (§6) | v2 modes are used; v1 modes map onto them (Diagnostic → DIAGNOSIS, Red Team → RED TEAM, …) |
| Template library | — | DRAFT → TESTED → VERIFIED → REVIEWED → APPROVED → LIBRARY (§43) | Enforced by `z3k.py lib` |

## 2. Instructions made executable

| Master Prompt requirement | Mechanism |
|---|---|
| §40 Process record and §41 process memory | `.z3000/process.json` (versioned, audit history, atomic writes, SHA-256 seal) |
| §34 Zero-skip state machine, mandatory IF-rules | `z3k.py task …` refuses every illegal transition and names the rule it enforced |
| §35 Priority ≠ sequence | `next` orders work by state first, then by priority; dependencies always gate release |
| §36 Task Implementation Document A–K | `z3k.py task doc T-xxx` (pre-filled from the record) |
| §37 Task-by-task mode | `next` → `task doc` → `start` → `submit --evidence` → `verify` → release |
| §38 Execution modes | `init --mode GUIDED / ASSISTED / AUTONOMOUS` (recorded; GUIDED is the default) |
| §39 Recovery and no infinite loops | `fail` / `retry` with a 3-attempt budget, after which the task must be BLOCKED with a reason and next action |
| §10 Human approval | `--approval-required` → NEEDS_APPROVAL; `approve --by <human>` is mandatory and logged; approval does not extend to other tasks |
| §42 Continuity commands | `status`, `history`, `pending`, `blockers`, `decisions`, `next`, `completed`, `deliverables`, `resume`, `report`, `final` |
| §48 Stress tests | `tests/run_tests.sh` (15/15 executed, see VERIFICATION.md) |
| §52 Multi-model | `z3k.py handoff` (self-contained resume prompt); `scripts/export.py` (ChatGPT, Gemini, Claude, generic) |
| §53–54 Reports and Requirements Matrix | `z3k.py report` / `final` (Markdown or editorial PDF). `final` exits 3 and reports PARTIAL while any mandatory requirement is unverified. |
| §9 and §15 Evidence | `z3k.py evidence` (tier, type, dates and source are mandatory) |
| §8 and §28 Decisions and forecasts | `finance.py scenarios` (3 scenarios, sensitivity, invalidation condition); `z3k.py decision` requires a rationale |
| Track A–D separation (§3) | `finance.py reverse / netprofit / arr / valuation`, with verdict classes |
| §12–14 Agent contracts | `data/agents.json`: 24 contracts × 12 fields |
| §23 Functional atlas | `data/functional-atlas.json` (100 domains) and `scripts/atlas.py` (show, search, fill, add). Fields are filled per organization from evidence, never invented. |
| §24 Frameworks · §26 Business models | `data/frameworks.json` (use when / avoid when) · `data/business-models.json` (21 qualitative profiles, no fabricated benchmarks) |
| Part V and XVII sources and repositories | `data/sources.json` (29 entries with tier and usage rules; marked as not re-verified) |
| §46–47 QA and Red Team | `scripts/qa.py`, `qa.py --redteam` |
| Part IX documents and report design | `reports/` editorial engine (JSON spec → A4 PDF), 4 ready specs, a document library covering 27 types, and auto-generated execution and final reports |

## 3. Honest limits

- The process record is a local file. It persists only while the folder is kept or committed (§41: a chat is not a database). For multi-user production, implement §41 with real infrastructure (PostgreSQL/Supabase, object storage, audit log). That requires authorization and has not been done here.
- The 24 agents are logical roles. Real parallel agents depend on the platform (§52).
- The external sources in `data/sources.json` were not re-checked when the file was created. Verify edition, availability and terms at use time.
- The reference repositories (ECC, REA, CLI-Anything) have not been audited. Apply §50 before any adoption.
- The functional atlas and business-model profiles are structural. Organization-specific content must come from real data.
