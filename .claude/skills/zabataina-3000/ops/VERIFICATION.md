# Verification record — ZABATAINA 3000 execution layer

Executed: 2026-11-18 · Linux · Python 3.13 · Node 22 + Playwright/Chromium · Command: `bash tests/run_tests.sh`

Every line below comes from an actual run. The §48 stress tests are labelled STRESS-01…15.

```
== Source integrity
  PASS  master v2.0 has 22 parts
  PASS  master v2.0 has 59 numbered sections
  PASS  master v2.0 has 20 module sections
  PASS  20 v1 module manuals present
  PASS  24 agent contracts with 12 fields
  PASS  functional atlas has 100 domains
== Project lifecycle
  PASS  init creates sealed record
  PASS  init twice refused (never overwrite)
  PASS  track + requirements
  PASS  tasks with dependencies
== Stress tests (§48)
  PASS  STRESS-01 task omission detected (mandatory REQ without task)
  PASS    setup: validate T-001
  PASS  STRESS-02 premature completion: verify from IN_PROGRESS refused
  PASS  STRESS-03 missing acceptance criteria: validate refused
  PASS  STRESS-04 missing evidence: submit refused
  PASS    submit with evidence
  PASS  STRESS-02b unmet criterion keeps task open
  PASS  STRESS-05 context interruption: state persists across processes; stray temp file harmless
  PASS  STRESS-06 session recovery: resume shows integrity, status and next
  PASS  STRESS-07 model switching: handoff prompt is self-contained
  PASS  STRESS-08 tool failure surfaces (invalid calculator input)
  PASS  STRESS-08b tool failure surfaces (bad document block)
  PASS  STRESS-09 conflicting instruction vs mandatory requirement: cancel refused without --force
  PASS  STRESS-10 unauthorized action: approval-required task held in NEEDS_APPROVAL
  PASS  STRESS-10b approval without a named human refused
  PASS  STRESS-10c start without approval refused
  PASS    approval recorded with name releases task
  PASS  STRESS-11 incomplete final report flagged (exit 3, PARTIAL)
  PASS  STRESS-11b final report says PARTIAL
  PASS    T-002 released after T-001 VERIFIED
  PASS  STRESS-12 incorrect dependency release refused
  PASS  STRESS-13 duplicate task refused
  PASS  STRESS-14 corrupted/tampered record detected
  PASS  STRESS-14b invalid JSON record refused
  PASS    restored record accepted
  PASS    lib: add item
  PASS  STRESS-15 unverified process reuse refused
  PASS  STRESS-15b lifecycle skip refused (DRAFT→APPROVED)
  PASS    lib: DRAFT→TESTED→VERIFIED→REVIEWED
  PASS  STRESS-15c APPROVED without human approver refused
  PASS    lib: approved by human → LIBRARY → reuse allowed
== Retry budget & blocking (§34, §39)
  PASS  4th retry refused (no infinite loops)
  PASS  block without next action refused
  PASS  block with reason + next
== Reports & documents
  PASS  execution report markdown
  PASS  task implementation document A–K
  PASS  execution report PDF from process record
  PASS  spec → PDF: executive-brief
  PASS  spec → PDF: financial-feasibility
  PASS  spec → PDF: plan-180-days
  PASS  spec → PDF: commercial-proposal
== Finance, QA, atlas, export
  PASS  reverse: 100 sales / 500 opps / 5000 leads
  PASS  netprofit formula (1M, tax 25%, CM 40%, fixed 120K) = 3,633,333
  PASS  arr reaches target MRR at month 6
  PASS  breakeven 45000/(550-250)=150
  PASS  unit: negative contribution blocks scaling
  PASS  valuation range
  PASS  qa gate passes at 40/48
  PASS  qa gate blocks zero evidence
  PASS  atlas search
  PASS  export chatgpt
  PASS  export gemini
  PASS  export generic
  PASS  export claude copies skill

RESULT: 64 passed, 0 failed
```

## Coverage notes

| Stress test (§48) | How it was exercised | Result |
|---|---|---|
| 01 Task omission | Mandatory requirement without a task → `check` reports it | TESTED AND PASSED |
| 02 Premature completion | verify from IN_PROGRESS refused; unmet criterion keeps task open | TESTED AND PASSED |
| 03 Missing acceptance criteria | validate refused | TESTED AND PASSED |
| 04 Missing evidence | submit refused | TESTED AND PASSED |
| 05 Context interruption | state survives separate processes; stray temp file ignored | TESTED AND PASSED |
| 06 Session recovery | `resume` verifies integrity and shows next task | TESTED AND PASSED |
| 07 Model switching | `handoff` self-contained prompt + `export.py` | TESTED AND PASSED |
| 08 Tool failure | invalid calculator input and invalid document block fail loudly (no false success) | TESTED AND PASSED |
| 09 Conflicting instructions | instruction to cancel a task serving a mandatory requirement refused without --force + decision (engine part); precedence order is a procedural rule in SKILL.md §1 | TESTED AND PASSED |
| 10 Unauthorized action | NEEDS_APPROVAL gate, unnamed approval refused, start refused | TESTED AND PASSED |
| 11 Incomplete final report | `final` exits 3 and states PARTIAL | TESTED AND PASSED |
| 12 Incorrect dependency release | ready refused while a dependency is open | TESTED AND PASSED |
| 13 Duplicate tasks | normalised-title duplicate refused | TESTED AND PASSED |
| 14 Corrupted process records | tampered hash and invalid JSON refused | TESTED AND PASSED |
| 15 Unverified process reuse | reuse of DRAFT refused, lifecycle skip refused, APPROVED requires named human | TESTED AND PASSED |

STRESS-09 is **PARTIALLY TESTED**. Conflicts between free-text instructions are resolved by the model through the precedence rules; a script cannot fully test that.
