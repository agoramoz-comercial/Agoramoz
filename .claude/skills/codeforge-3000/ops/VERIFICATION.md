# Verification record — CODEFORGE 3000 execution layer

Executed 2026-11-18 · Linux · Python 3.13 · Node 22 + Playwright · `bash tests/run_tests.sh` against a generated fixture app with planted defects (`tests/make_fixture.py`). Every line is an actual result.

```
== Source
  PASS  master text present (Parts I–IX, 20 modules)
  PASS  truncation is flagged, not invented
== M03 environment / M05 repository / M15 flow audit / M17 secrets
  PASS  env_probe produces readiness report
  PASS  env_probe flags a missing required tool
  PASS  repo_scan detects Next.js, React, Vitest
  PASS  repo_scan flags env file + TODO
  PASS  flow_audit exits 1 on HIGH findings
  PASS  flow_audit detects DEAD_BUTTON
  PASS  flow_audit detects EMPTY_HANDLER
  PASS  flow_audit detects STUB_HANDLER
  PASS  flow_audit detects FORM_NO_SUBMIT
  PASS  flow_audit detects DEAD_LINK
  PASS  flow_audit detects MISSING_API
  PASS  flow_audit detects BROKEN_NAV
  PASS  no false positive on working button/form
  PASS  MISSING_API names /api/session, not /api/users
  PASS  BROKEN_NAV names /settings only
  PASS  secret_scan finds the planted key (masked)
== Engine: requirements, contracts, tests, lifecycle
  PASS  init
  PASS  init twice refused
  PASS  requirements with area IDs
  PASS  second requirement
  PASS  component (interactive)
  PASS  IMPLEMENTED refused without behaviour contract (M15 golden rule)
  PASS  behaviour contract filled
  PASS  IMPLEMENTED with real file
  PASS  TESTED refused when no test executed
  PASS  test must target something
  PASS  test linked to component
  PASS  PASSED without evidence refused
  PASS  test run captures real exit code
  PASS  TESTED → VERIFIED
  PASS  skip VERIFIED → RELEASED refused
  PASS  APPROVED without human refused
  PASS  APPROVED by human
  PASS  RELEASED blocked: critical REQ-AUTH-001 not verified
== Graph (Part VII)
  PASS  graph check reports orphan requirement & no verification path
  PASS  nodes and links
  PASS  broken relationship refused
  PASS  impact analysis lists regression tests
  PASS  traceability matrix
  PASS  graph export JSON
== Loops (Part VIII)
  PASS  loop task
  PASS  loop without acceptance refused
  PASS  advance PLAN→BUILD→INSPECT→TEST
  PASS  failure must be classified
  PASS  fail → REPAIR
  PASS  repair → TEST (attempt 2)
  PASS  2nd failure exhausts budget → BLOCKED
  PASS  blocked task cannot advance
== Terminal, approvals, security, events
  PASS  run captures output + log
  PASS  destructive command held for approval
  PASS  approval request visible
  PASS  approve without name refused
  PASS  secret redacted in terminal log
  PASS  usage event must name provider/model
  PASS  provider-reported usage recorded
  PASS  security finding blocks release
== Checkpoints & recovery (§7.5)
  PASS  checkpoint
  PASS  tampered record detected
  PASS  restore from checkpoint
== Context (§7) & model routing (§6)
  PASS  context package keeps acceptance criteria
  PASS  context includes C0–C6 layers
  PASS  router picks an enabled model + fallback
  PASS  router escalates when local-only impossible
  PASS  internal benchmark from real records
== Factory (Part III) & prompt registry (§5.4)
  PASS  create department
  PASS  assess reuses it
  PASS  duplicate department refused
  PASS  create agent + skill + prompt
  PASS  GENERATED refused while fields empty
  PASS  GENERATED when fields filled
  PASS  TESTING refused without tests
  PASS  test without evidence refused
  PASS  record 3 competency tests
  PASS  TESTING → VERIFIED
  PASS  critical-failure override rejects
  PASS  qualified ≥ 80
  PASS  APPROVED without human refused
  PASS  APPROVED by human → OPERATIONAL
  PASS  untested skill listed EXPERIMENTAL
  PASS  prompt test must use a §5.4 scenario
== Live dashboard (Part IX)
  PASS  dashboard serves page
  PASS  state API exposes real record + git sources
  PASS  SSE stream emits state
  PASS  POST without session token refused
  PASS  diff path traversal refused
  PASS  approval through dashboard requires name
  PASS  approval through dashboard recorded
== IDE adapters & hook
  PASS  export cursor/copilot/codex/windsurf/generic
  PASS  export claude-code with hook merges settings
  PASS  hook appends a real tool event
  PASS  hook never blocks on bad input

RESULT: 93 passed, 0 failed
```

Dashboard screenshot of the demo project (`scripts/demo.sh`): `ops/dashboard-demo.png`.

Not verified: exports were not loaded inside Cursor, Copilot, Codex, Windsurf or Antigravity; the Claude Code hook was tested with a simulated hook payload, not inside a live Claude Code session.

## Documentary verification — continuation 1 (2026-11-18)

Command: `python3 tests/verify_master.py --base origin/main`

```
  ✓ prior content: 1475 lines identical to origin/main (only the header integration note updated)
  ✓ junction: '…Show' completed once, no duplication
  ✓ numbering: Parts I–XVII (17), MODULE 01–20, sections 1–18, 71 subsections
  ✓ requirement counts checked in 35 subsections
  ✓ repositories ECC, CLI-Anything, REA present with official URLs (§11.2)
  ✓ truncation marker after last received heading: '#### 18.3 Context Assembly'
DOCUMENT CONTINUITY OK
STATUS: INCOMPLETE — source text not yet received beyond the marked point.
```

Mutation check: the verifier was run against deliberately broken copies (agent row CF17 removed, §13.4 renumbered, junction sentence duplicated, REA URL removed). Each mutation was detected (§15.5 count 19/20; §13 subsections [1,2,3,5,5]; junction moved/duplicated; repository missing).

Full suite after integration: RESULT: 94 passed, 0 failed

## Documentary verification — continuation 2 (2026-11-18) — full document

Command: `python3 tests/verify_master.py --prev 9961da6 --base origin/main`

```
  ✓ prior content: 1475 lines identical to origin/main (only the header integration note updated)
  ✓ junction: '…Show' completed once, no duplication
  ✓ previous integration (9961da6): 2220 lines identical up to its truncation marker
  ✓ numbering: Parts I–XX (20), MODULE 01–20, sections 1–29, 102 subsections
  ✓ requirement counts checked in 67 subsections
  ✓ repositories ECC, CLI-Anything, REA present with official URLs (§11.2)
  ✓ closing line present as the last line; no truncation markers remain
DOCUMENT CONTINUITY OK
STATUS: COMPLETE AS RECEIVED — closing line present, no gaps detected.
```

Mutation check on continuation 2: removing one failure class (§20.4 → 11/12), removing the /CODEFORGE LEARN command (§25 → 21/22), renumbering §21.10, deleting a line of the final declaration, inserting a truncation marker, and deleting LEVEL 2 of §21.4 were each detected.

Full suite: RESULT: 94 passed, 0 failed

## Engine rules for Parts X–XX (follow-up PR, 2026-11-18)

Command: `bash tests/run_tests.sh`. The master document is unchanged (`verify_master.py` reports "document identical to origin/main").

```
== Source
  PASS  master text present (Parts I–XX, 20 modules)
  PASS  document complete: closing line, no truncation marker
  PASS  documentary continuity & numbering
== M03 environment / M05 repository / M15 flow audit / M17 secrets
  PASS  env_probe produces readiness report
  PASS  env_probe flags a missing required tool
  PASS  repo_scan detects Next.js, React, Vitest
  PASS  repo_scan flags env file + TODO
  PASS  flow_audit exits 1 on HIGH findings
  PASS  flow_audit detects DEAD_BUTTON
  PASS  flow_audit detects EMPTY_HANDLER
  PASS  flow_audit detects STUB_HANDLER
  PASS  flow_audit detects FORM_NO_SUBMIT
  PASS  flow_audit detects DEAD_LINK
  PASS  flow_audit detects MISSING_API
  PASS  flow_audit detects BROKEN_NAV
  PASS  no false positive on working button/form
  PASS  MISSING_API names /api/session, not /api/users
  PASS  BROKEN_NAV names /settings only
  PASS  secret_scan finds the planted key (masked)
== Engine: requirements, contracts, tests, lifecycle
  PASS  init
  PASS  init twice refused
  PASS  requirements with area IDs
  PASS  second requirement
  PASS  component (interactive)
  PASS  IMPLEMENTED refused without behaviour contract (M15 golden rule)
  PASS  behaviour contract filled
  PASS  IMPLEMENTED with real file
  PASS  TESTED refused when no test executed
  PASS  test must target something
  PASS  test linked to component
  PASS  PASSED without evidence refused
  PASS  test run captures real exit code
  PASS  TESTED → VERIFIED
  PASS  skip VERIFIED → RELEASED refused
  PASS  APPROVED without human refused
  PASS  APPROVED by human
  PASS  RELEASED blocked: critical REQ-AUTH-001 not verified
== Graph (Part VII)
  PASS  graph check reports orphan requirement & no verification path
  PASS  nodes and links
  PASS  broken relationship refused
  PASS  impact analysis lists regression tests
  PASS  traceability matrix
  PASS  graph export JSON
== Zero-skip task lifecycle + loops (Part VIII, §20–§21)
  PASS  loop without acceptance refused
  PASS  task CREATED
  PASS  advance before validation refused
  PASS  incomplete task registered
  PASS  VALIDATED refused without requirement/agent/expected
  PASS  cancel needs a recorded reason
  PASS  cancel with reason
  PASS  validate → ready
  PASS  dependent task
  PASS  READY refused while dependency not VERIFIED
  PASS  approval-required task → NEEDS_APPROVAL
  PASS  task approval needs a human
  PASS  task approved by human → READY
  PASS  advance PLAN→BUILD→INSPECT→TEST
  PASS  failure must be classified
  PASS  failure needs expected-vs-actual detail
  PASS  fail → REPAIR
  PASS  repair → TEST (attempt 2)
  PASS  2nd failure exhausts budget → BLOCKED
  PASS  blocked task cannot advance
  PASS  unblock needs a NEW strategy
  PASS  critical task to VERIFY
  PASS  CRITICAL task RECORD refused without independent review
  PASS  reviewer cannot be the producing agent
  PASS  independent review + RECORD → VERIFIED
  PASS  handoff contract recorded
  PASS  handoff without evidence requirements refused
== Terminal, approvals, security, events
  PASS  run captures output + log
  PASS  destructive command held for approval
  PASS  approval request visible
  PASS  approve without name refused
  PASS  secret redacted in terminal log
  PASS  usage event must name provider/model
  PASS  provider-reported usage recorded
  PASS  security finding blocks release
== Checkpoints & recovery (§7.5)
  PASS  checkpoint
  PASS  tampered record detected
  PASS  restore from checkpoint
== Context (§7) & model routing (§6)
  PASS  context package keeps acceptance criteria
  PASS  context includes C0–C6 layers
  PASS  router picks an enabled model + fallback
  PASS  router escalates when local-only impossible
  PASS  internal benchmark from real records
== Factory (Part III) & prompt registry (§5.4)
  PASS  create department
  PASS  assess reuses it
  PASS  duplicate department refused
  PASS  create agent + skill + prompt
  PASS  GENERATED refused while fields empty
  PASS  GENERATED when fields filled
  PASS  TESTING refused without tests
  PASS  test without evidence refused
  PASS  record 3 competency tests
  PASS  TESTING → VERIFIED
  PASS  critical-failure override rejects
  PASS  agent security below 50 → zero override
  PASS  qualified ≥ 80
  PASS  APPROVED without human refused
  PASS  APPROVED by human → OPERATIONAL
  PASS  untested skill listed EXPERIMENTAL
  PASS  prompt test must use a §5.4 scenario
== Governance: adoption §11, benchmark §12, gates §21.6, coverage §21.5, red team §21.8, memory §22.5
  PASS  mandatory targets ECC, CLI-Anything, REA seeded NOT AUDITED
  PASS  ADOPT refused without the 13-step audit
  PASS  audit step needs evidence
  PASS  audit steps 1, 2, 7 recorded
  PASS  MONITOR decision with version/licence/evidence
  PASS  verify refused for a non-adopted repo
  PASS  benchmark needs all §12.5 fields
  PASS  benchmark observed capability
  PASS  gates report real status (not all passed)
  PASS  gate cannot be forced to PASSED
  PASS  gate override needs human + reason
  PASS  gate override N/A recorded
  PASS  coverage matrix links requirement→component→test
  PASS  red team checklist (16 areas)
  PASS  red team finding needs repro/evidence/impact/remediation
  PASS  red team finding + retest
  PASS  knowledge record needs source/limitations/reproducibility
  PASS  knowledge record DISCOVERED
  PASS  knowledge lifecycle cannot skip
  PASS  knowledge DISCOVERED → GENERATED → TESTED with evidence
  PASS  connection test needs a real command
  PASS  connection test executes
  PASS  deliverable must exist
  PASS  deliverable recorded
  PASS  test DESIGNED → WRITTEN, never counted as passed
  PASS  NEXT / BLOCKERS / HISTORY
  PASS  final report exits 3 unless VERIFIED (§27)
  PASS  git: init fixture repository
  PASS  git preflight needs a rollback strategy
  PASS  git preflight records scope + impact
  PASS  git review flags exposed secret in changes
== /CODEFORGE interface (§25), environment classes (§13.4), routing modes (§17), context (§18.3), factory (§15–16)
  PASS  dispatcher covers every §25 command in the master
  PASS  /CODEFORGE STATUS maps to a real operation
  PASS  /CODEFORGE RESEARCH states its limitation (exit 3)
  PASS  /CODEFORGE unknown command refused
  PASS  env: OUTDATED below minimum
  PASS  env: INCOMPATIBLE at exclusive maximum
  PASS  env: NEEDS APPROVAL / NOT APPLICABLE
  PASS  router B: unmeasured specialty not assumed
  PASS  router collaboration plan (D)
  PASS  context package has id, source hashes, missing info
  PASS  context --switch adds limitations + blockers
  PASS  factory seeds CF01–CF20 as DRAFT
  PASS  factory search
  PASS  skill test must use a §16.4 scenario
== Live dashboard (Part IX)
  PASS  dashboard serves page
  PASS  state API exposes real record + git sources
  PASS  state API exposes gates, red team, adoption, knowledge, task risk
  PASS  SSE stream emits state
  PASS  POST without session token refused
  PASS  diff path traversal refused
  PASS  approval through dashboard requires name
  PASS  approval through dashboard recorded
== IDE adapters & hook
  PASS  export cursor/copilot/codex/windsurf/generic
  PASS  export claude-code with hook merges settings
  PASS  hook appends a real tool event
  PASS  hook never blocks on bad input

RESULT: 160 passed, 0 failed
```

Mutation checks:

- Renaming LEARN in `codeforge.py` made the §25 dispatcher test fail (159/160).
- A harness defect was found and fixed: an `exit` inside a check used to stop the whole runner. Each check now runs in a subshell.

Dashboard smoke test: the demo project (`scripts/demo.sh`) was rendered with Playwright at 1440 px with no page or console errors. It shows the G1–G10 gates bar, test states, red team finding, decision record and approval category/risk/scope.

## Repository audit ECC / CLI-Anything / REA (2026-11-18)

Static 13-step audit recorded with `cf.py adopt` (see `audits/`). An engine gap found during the audit (ADOPT accepted with step 12 SKIPPED) was fixed and covered by two new tests.

```
  PASS  13 steps recorded with step 12 SKIPPED
  PASS  ADOPT refused when the functional test (step 12) was not executed
  PASS  ISOLATE allowed without step 12
RESULT: 163 passed, 0 failed
```
