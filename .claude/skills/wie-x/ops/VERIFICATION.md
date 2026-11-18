# Verification record — WIE-X skill (Module 26.3)

Executed: 2026-11-18 · Environment: Linux, Python 3.13, Node 22 · Command: `bash tests/run_tests.sh`

Status: **TESTED AND PASSED** — every result below comes from an actual run (not inspection).

```
== Source integrity
  PASS  master has 40 modules
  PASS  split_modules regenerates 40
  PASS  modules/ has 40 files
  PASS  module text matches master
  PASS  SKILL.md has front matter name
== wiex_init
  PASS  L3 init creates 10 files
  PASS  re-init never overwrites
  PASS  placeholders substituted
== traceability
  PASS  template project fails gate (REQ-001 NOT TESTED)
  PASS  passing test passes gate
  PASS  untraced mandatory REQ fails
  PASS  missing files -> exit 2
== template_score
  PASS  92 & no critical -> eligible
  PASS  critical failure blocks
  PASS  weighted total is correct (85.75)
== decision_score
  PASS  ranks options
== library
  PASS  add Q0 template
  PASS  same version refused
  PASS  new version keeps history
  PASS  search finds by tag
  PASS  min-status filters it out
  PASS  Q4 without score refused
  PASS  Q4 with evidence accepted
  PASS  reuse-plan prints assessment
  PASS  secret in package refused
== capability_probe & export
  PASS  probe prints table
  PASS  probe marks agent caps UNKNOWN
  PASS  export cursor
  PASS  export copilot
  PASS  export codex
  PASS  export windsurf
  PASS  export generic
  PASS  cursor rule has front matter
  PASS  full export contains MODULE 39
  PASS  export refuses overwrite
  PASS  core export is compact
  PASS  claude-code export copies skill

RESULT: 37 passed, 0 failed
```

## Not verified (honest limits)

- Platform exports for Cursor, Copilot, Codex and Windsurf were generated and checked for structure, but **not loaded inside those products** (NOT EXECUTED — TOOL UNAVAILABLE). Confirm the file locations against each platform's current docs.
- The master prompt behaviour (Module 07.5 test bench) depends on the host model and was not benchmarked here.
- Reference repositories in Module 12 were not inspected; the M12.2 protocol is applied at use time.
