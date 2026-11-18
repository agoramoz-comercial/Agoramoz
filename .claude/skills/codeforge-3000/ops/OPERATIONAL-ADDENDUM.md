# CODEFORGE 3000 — Operational Addendum

The Master System Prompt v1.0 is preserved verbatim in `CODEFORGE-MASTER-v1.0.md`. This layer makes it executable and adds nothing that relaxes a rule.

## 1. Integration record of the received text

| Delivery | Received | Content | Ends at |
|---|---|---|---|
| Part 1 | 2026-11-17 | Header, Parts I–IX (§1–§10.3, Modules 01–20) | Mid-sentence in §10.3: "Do not claim access to private LLM reasoning. Show" |
| Continuation 1 | 2026-11-18 | Completes the §10.3 sentence; Parts X–XVII (§11–§18.2) and the heading of §18.3 | Heading "18.3 Context Assembly", with no body |
| Continuation 2 | 2026-11-18 | Body of §18.3, §18.4–18.5, §19 UEG (inside Part XVII), Parts XVIII–XX (§20–§22), §23–§29 (inside Part XX), final declaration and closing line | "END OF ZABATAINA CODEFORGE 3000 — MASTER SYSTEM PROMPT VERSION 1.0 — CONTINUATION", followed by the author's "FIM DO DOCUMENTO" signal |

The text was never completed on the author's behalf. With continuation 2 the document is **complete as received**: it ends with the author's closing line and carries no truncation marker. Two message signals were not added to the document: the stray "." that opened continuation 2 and the "FIM DO DOCUMENTO" end signal. `tests/verify_master.py` proves:
- the earlier content is unchanged;
- the junction sentence is completed once, without duplication;
- Parts, Modules, sections and subsections are numbered consecutively;
- every received subsection has the expected number of items;
- ECC, CLI-Anything and REA are present with their URLs.

`tests/verify_master.py` also checks that the previous integration is unchanged, LEVEL 0–4 of §21.4, and the five-line final declaration. It was mutation-tested on both continuations.

Note on the content: several later sections restate and extend earlier ones: §17 ULOE ↔ §6, §18 ZCE ↔ §7, §19 UEG ↔ §8, §20 CEL ↔ §9, §22 LEOC ↔ §10, §15 ↔ §4. Both versions are preserved as received. Where they differ, the later and more specific version is applied (e.g. §17.3 adds "Error handling" and "Compatibility status"; §18.2 defines C1 as "project identity, architecture and environment").

## 2. Master requirement → mechanism

| Requirement | Mechanism |
|---|---|
| §3.1 Evidence over claims · §3.9 No fabricated execution | `cf.py run` captures real output, exit code and log; test results require evidence; the dashboard displays only recorded events and labels unconnected sources "not observable" |
| §3.5 Requirements preservation | IDs (`REQ-AREA-NNN`); out of scope only with a reason; `context_pack.py` never cuts C2/C3 and checks every acceptance criterion is present |
| §3.8 Human authority | Destructive/production command patterns are held in the Approval Center; APPROVED needs a named human; dashboard approvals need a name and a session token |
| M02 Requirements, traceability matrix | `cf.py req`, `cf.py graph trace` |
| M03 Environment Readiness Report | `scripts/env_probe.py` (observed only; IDE extensions, MCP servers and credentials reported as not observable from a shell) |
| M05 Repository intelligence | `scripts/repo_scan.py`: languages, frameworks, dependencies, entry points, routes, tests, CI, IaC, env files, incomplete code, problems register |
| M15 Functional flow mapping | Behaviour contracts with 13 fields per interactive component (gate for IMPLEMENTED) + `flow_audit.py` (dead buttons, empty or stub handlers, forms without submit, dead links, missing API routes, broken navigation) |
| M16 Tests linked and executed | `cf.py test add --targets` (required), `test run`, `test import` (JUnit XML from Playwright, Jest, Vitest, Pytest, JUnit…) |
| M17 Security | `secret_scan.py` (working tree or `--staged` pre-commit), log redaction, security findings that block release |
| M18 Release checks | `release_blockers`: failing tests, open HIGH/CRITICAL findings, unverified critical requirements |
| M20 Generated ≠ implemented ≠ tested ≠ verified ≠ approved ≠ released | Strict lifecycle per component, no skipping |
| Part III Factory and qualification | `factory.py` (assess REUSE/EXTEND/CREATE/COMPOSE; mandatory fields; tests with evidence; 0–100 score, critical overrides; lifecycle to OPERATIONAL) |
| §5.4 Prompt test suite and registry | Prompts in the factory registry must pass all 10 scenarios before VERIFIED |
| Part V Model adapters, routing, benchmarks, switching | `data/models.json`, `model_router.py route` / `bench`; tasks record the model used; `context_pack.py` transfers only the necessary context |
| §7 Context engineering and checkpointing | `context_pack.py` (C0–C6, token budget, constraint check); `cf.py checkpoint` / `resume --from` |
| §7.4 Token budget | Provider-reported `usage` events only (provider and model required); cost per verified task in `bench` |
| Part VII Engineering graph | Nodes, 11 relation types, `graph check` (orphans, broken links, undefined behaviour, unverified critical nodes, cycles, graph/repo mismatch, untracked git changes), `graph impact`, `graph export` |
| Part VIII Loops | `cf.py task` (stages, attempt budget, classified failures, stop condition, repeated-strategy warning, BLOCKED → re-plan) |
| Part IX LEOC | `dashboard/server.py` + `index.html`: panels A–J, SSE live updates, diff and log viewers, approval center, observability sources; `hooks/claude_code_hook.py` streams real IDE tool activity |
| M03 Multi-IDE | `export.py` (Claude Code + hook, Cursor, Copilot, Codex, Windsurf, Antigravity/generic) |

## 3. Coverage of Parts X–XX by the execution layer

The follow-up PR implemented the gaps that continuations 1 and 2 had listed. Every row is exercised by `tests/run_tests.sh` (see `ops/VERIFICATION.md`). **Remaining** lists only what is still outside the layer.

| Section | Requirement | Implementation | Remaining |
|---|---|---|---|
| §10.3 | Show tool calls, code changes, decisions, test results, evidence | Dashboard A, B, C, E, G, J; `cf.py decision` (ADR record); decisions shown in J | — |
| §11.2–11.4, §11.6 | Audit ECC, CLI-Anything, REA; 13-step audit; ADOPT/ADAPT/INTEGRATE/ISOLATE/REJECT/MONITOR with version, licence, evidence, agent | `cf.py adopt seed/add/audit/decide/verify/list/show`. Targets in `data/repository-targets.json`. Any use decision requires all 13 steps, with licence (7) and security (10) DONE. A decision is never reported as integrated until `verify` | 13-step audit done on 2026-11-18 (`audits/`), including step 12 (their own test suites): ECC 10 415/10 423 tests pass; CLI-Anything 53/66 harnesses green; REA partial, 2 151 tests with 1 failure. Decisions: ECC ADAPT, CLI-Anything ISOLATE, REA ISOLATE, all NOT VERIFIED and not integrated. ADOPT/ADAPT/INTEGRATE require step 12 DONE. |
| §11.5 | Research ecosystem incl. MCP Registry and docs | `data/sources.json`; `codeforge.py RESEARCH` lists the official sources | Research itself needs the agent's web tools. The script says so and exits 3. |
| §12 | Product benchmarking | `cf.py benchmark add/list` (§12.5 fields, observed vs. inferred) | — |
| §13.3 | Environment audit | `env_probe.py --project --network-url` adds env-var **names**, git config, network reachability | IDE extensions and MCP servers are NOT OBSERVABLE from a shell |
| §13.4 | 7 readiness classes | `env_probe.py --require "x>=a,y<b" --approval … --na …` | — |
| §13.5, §21.10 | Installation and sensitive-action approval | `cf.py run` classifies DESTRUCTIVE, PRODUCTION_DB, DEPLOY_PUBLISH, SECRETS, PERMISSIONS, GLOBAL_CONFIG, INSTALL. Each is held with category, risk and scope | Purchases and sensitive-data access are not command-detectable; they are procedural |
| §14 | Platform selection | Requirements of type `platform`, plus `decision` records | No dedicated platform matrix |
| §15.3 · §15.4 · §16.2 | Charter 18 · agent 16 · skill 18 fields | `factory.py` FIELDS | — |
| §15.5 | Reference organization CF01–CF20 | `data/agents.json`; `factory.py seed-cf` registers them as DRAFT | Titles do not prove competence; each agent needs practical tests |
| §15.6 | Handoff contract | `cf.py handoff T --to --context --inputs --expected --evidence-req` | — |
| §15.7 | 10 agent measures | `factory.py qualify` with §15.7 measures for agents and a zero override below 50 | — |
| §16.3–16.5 | UNDER_REVIEW; 11 scenarios; search first | `promote --to UNDER_REVIEW`; skill tests restricted to the 11 scenarios (all required); `factory.py search`; ≥50% similarity refused unless `--force` | — |
| §17.3–17.7 | Adapter fields; modes A–F; switching state; independent review | `models.json` `error_handling`/`compatibility_status`; router `--specialist` (B, never assumes an unmeasured specialty) and `--collaborate` (D); `context_pack --switch`; `cf.py review` (reviewer must differ from producer; CRITICAL tasks need a review before RECORD) | Specialties are empty until measured |
| §18.3–18.4 | Assembly with version conflicts, missing info, versioned package with sources; budget metrics | `context_pack.py` header `CTX-<task>-v<rec>-<hash>`, `file@sha256:…`, conflicts, missing information; `model_router bench` (calls, cached, latency, retries, context duplication) | — |
| §19.2–19.6 | Node/relation types, traceability, integrity, 7-item impact | Upper-case relations accepted; `graph trace` with API, data and security columns; `graph impact` separates dependents, interfaces, data, security, deployment, tests, risk | — |
| §20.3–20.7 | Loop fields; 12 failure classes; anti-loop; checkpoint and last-verified resume | `task add --initial --inputs --risk --exec-budget`; `--cause` restricted to 12 classes (aliases accepted); `--detail` required; BLOCKED when the budget is spent or a strategy repeats 3×; `unblock --strategy`; checkpoints record files, tests, approvals and a verified flag; `resume --last-verified` | — |
| §21.1–21.3 | Zero-skip registry and lifecycle, dependency rules | `cf.py task` CREATED→VALIDATED→READY→IN_PROGRESS→UNDER_VERIFICATION→VERIFIED, plus BLOCKED/FAILED/NEEDS_APPROVAL/DEFERRED/CANCELLED. Validate requires requirement, agent, expected result and acceptance; READY requires dependencies VERIFIED; cancelling a critical task needs `--force` | — |
| §21.5 | 11-column coverage matrix | `cf.py coverage` | — |
| §21.6 | 10 quality gates | `cf.py gates` computes G1–G10. Overrides can only be N/A or NEEDS APPROVAL, with reason and human. RELEASED checks G1–G9 | — |
| §21.7 | Designed / written / executed | Test states DESIGNED, WRITTEN (`test write`), PASSED, FAILED, SKIPPED, BLOCKED; DESIGNED/WRITTEN never count as passed | — |
| §21.8 | Red Team | `cf.py redteam add/retest/exception/list/checklist` (8-field findings; critical/high block release unless a human exception is recorded) | — |
| §21.9 | Git governance | `cf.py git preflight --rollback` (existing changes, scope, impact) and `git review` (changed and deleted files, secrets in changes, tests, commit message); `project baseline` | — |
| §22.2 | LEOC panel fields | E: discovered, running, duration, failure detail; G: resolution status and red team; H: category, risk, scope; J: decisions; gates bar | — |
| §22.5 | Engineering memory | `cf.py learn add/promote/list` DISCOVERED→GENERATED→TESTED→VERIFIED→REVIEWED→APPROVED→PUBLISHED (+UNDER_REVIEW/DEPRECATED/REJECTED) | — |
| §24 · §27 | Deliverables; final report A–H and final status | `cf.py deliverable add` (path must exist); `cf.py final [--out]` classifies VERIFIED / PARTIAL / BLOCKED / FAILED / AWAITING APPROVAL and exits 0 only for VERIFIED | — |
| §25 | Every /CODEFORGE command maps to a real operation | `scripts/codeforge.py <COMMAND>` dispatches all 22 commands of §25 and prints the operations it executed; NEXT/BLOCKERS/HISTORY/LEARN are dedicated `cf.py` commands | RESEARCH needs agent web tools (exit 3); BUILD needs a task id |
| §28 | 20 non-negotiable rules | Rules 4 (`cf.py connect test --command`) and 9 (adoption registry) now have records | — |

## 4. Honest limits

- The engine and dashboard are local (files plus a 127.0.0.1 server). A multi-user, PostgreSQL/WebSocket/OpenTelemetry deployment (§10.2 options) is an extension that has not been built.
- `flow_audit.py` and `repo_scan.py` are static heuristics. Findings are confirmed by running flows and tests.
- The adapter fields in `data/models.json` (context windows, pricing, limits) are deliberately empty. Fill them from official provider documentation. Other providers' model IDs are placeholders.
- IDE integration paths and the Claude Code hook schema follow current public conventions. Verify them in each product's documentation. Only Claude Code has an activity hook; other IDEs record activity through `cf.py event`.
