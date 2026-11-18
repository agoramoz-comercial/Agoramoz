# Repository audit — ECC, CLI-Anything, REA (§11.2–§11.4)

**Date:** 2026-11-18 · **Responsible agent:** CF05 (repository intelligence) · **Method:** the 13-step audit protocol of §11.3, recorded step by step with `cf.py adopt audit` and `cf.py adopt decide`. The engine record is in [`adoption-record-2026-11-18.json`](adoption-record-2026-11-18.json).

## Scope and limits of this audit

- **Static audit (steps 1–11, 13).** Each repository was shallow-cloned read-only from its official source and inspected: README and docs, structure, source, manifests, install scripts, licence, CI and tests. The engine's own scanners were also run on each clone: `repo_scan.py` and `secret_scan.py`.
- **Step 12 (functional test) was executed in a second pass**, after the user added a permission rule for the projects' test commands:
  - dependencies were installed only inside each clone, with `npm ci --ignore-scripts`, so no install scripts ran and nothing was installed globally;
  - each project's own test commands were run;
  - this session's `~/.claude` was hashed before and after the ECC suite: no file changed except Claude Code's own `.last-cleanup`.
  See [§ Step 12 results](#step-12-results).
- **Maintenance was judged from a shallow clone.** That means the last commit, the version and the CI configuration only. Long-term history, open issues and release cadence were not inspected.
- **No integration was performed.** CODEFORGE contains no code from these repositories. The decisions below are *intentions*, all with verification **NOT VERIFIED** (§11.6).

## Summary

| | ECC | CLI-Anything | REA |
|---|---|---|---|
| Official source | github.com/affaan-m/ECC | github.com/HKUDS/CLI-Anything | github.com/morluto/rea |
| Audited commit | `3f14a103a869` (2026-11-17) | `34f519533bc1` (2026-09-22) | `b21db3f3293b` (2026-11-18) |
| Version | ecc-universal 2.2.3 | per-harness packages | rea-agents 6.9.0 |
| Licence | MIT | Apache-2.0 | MIT, plus GPL/LGPL third-party components |
| Size | 4 878 files | 1 872 files | 9 215 files |
| Main languages | JavaScript, Python, Rust | Python | TypeScript, plus Python/C bridges |
| Tests and CI (inspected) | 508 JS test files; CI on ubuntu/windows/macos with node 18–22; SLSA provenance | 164 pytest files; skill/plugin checks | vitest + mutation testing (stryker), conformance tests, CodeQL |
| Secret-scan hits | 159, all examples/fixtures | 13, all fixtures | 73, all fixtures |
| Main risk | Global hooks run code on every tool call and edit harness config | Registry installs run with `shell=True` (incl. `curl … \| bash`) and drive real apps via subprocess | Runs analysis tools with host permissions on untrusted binaries; legal constraints |
| Step 12 (executed) | 11/11 validators pass; `npm test` 10 415 / 10 423 pass | 53 / 66 harness unit suites fully green; 3 358 passed, 41 failed, 17 errors | partial: 2 151 tests before the 1 700 s limit, 1 failed, 57 skipped |
| Decision | **ADAPT** (selected patterns) | **ISOLATE** | **ISOLATE** |

## Secret-scan triage (step 10)

- None of the 245 hits is a live credential:
  - every high-signal hit (AWS, GitHub, OpenAI-style keys, private keys, JWTs) sits in a test file or a documentation example;
  - the AWS hits are documented placeholders (`AKIA…EXAMPLE`, `AKIA…XX`);
  - every "private key" hit is a PEM header with a synthetic or short body. A structural check found **0 PEM blocks with a real key body** in any of the three repositories.
- No repository tracks `.env` files.
- Credential-assignment and DB-URL hits are tutorial snippets in skills and docs (placeholder Postgres URLs with an inline user and password).

## ECC — evaluation against §11.2

- **Agent architecture and orchestration:** 72 agent definitions plus a Rust `ecc2` crate. One installer targets many harnesses (Claude Code, Codex, Cursor, OpenCode, Qoder and others).
- **Skills and reusable instructions:** 659 files under `skills/`, 98 commands and 122 rules. The documentation is translated into 17 languages.
- **Hooks and lifecycle automation:** `hooks/hooks.json` registers 28 handlers:
  - PreToolUse 10, Stop 8, SessionStart 2, UserPromptSubmit 2, PostToolUse 2, PostToolUseFailure 2, PreCompact 1, SessionEnd 1;
  - the handlers run Node scripts, some of which spawn child processes;
  - no network calls were found in the hook scripts.
- **Context and memory:** `contexts/`, a memory-persistence hook and a "unified memory" vault for handoffs between harnesses.
- **Security mechanisms:** config-protection and secret-redaction hooks, a `block-no-verify` guard, and SECURITY.md with private advisory reporting.
- **Testing and quality:** 508 JS test files. `npm test` chains 12 validators plus `tests/run-all.js`. There are also npm-scan and SLSA provenance workflows.
- **Installation:** `install.sh` runs `npm install --ignore-scripts` locally, then copies components into `~/.claude` or other harness config directories. That is a **GLOBAL_CONFIG** change and needs human approval. No postinstall script exists.
- **Dependencies:** 5 runtime dependencies (ajv, js-yaml, sql.js, zod, @iarna/toml), 13 dev dependencies, node ≥ 18.
- **Integration assessment:** ECC overlaps heavily with CODEFORGE's agents, skills and hooks. The realistic path is a selective **ADAPT** of specific patterns, such as the secret-redaction hooks and catalogue validators, after their tests have been run in isolation. A wholesale install of global hooks is not recommended.
- **Decision: ADAPT** (after step 12). Selected patterns only, never the global hook install. Verification is NOT VERIFIED until an adapted pattern is implemented and tested in CODEFORGE.

## CLI-Anything — evaluation against §11.2

- **CLI generation and application interaction:** a 7-phase methodology (`HARNESS.md`) generates a click-based CLI plus a backend for an existing application. The repository has 69 harnesses (GIMP, Blender, FreeCAD, Inkscape, Audacity, draw.io, Godot, QGIS and more).
- **Command execution architecture:** 370 `subprocess` call sites drive the real applications. Most harnesses also provide a REPL skin. `cli-hub` installs community CLIs from a registry.
- **Reliability and error handling:** SECURITY.md documents a threat model (subprocess arguments, Script-Fu and XML injection, path traversal, credential files at `0o600`), with escaping helpers per backend. End-to-end tests require the real applications to be installed.
- **Installation:**
  - `pip install cli-anything-hub` then `cli-hub install <name>`;
  - plugin and skill copies into agent config directories;
  - python ≥ 3.10, plus the target desktop application.
- **Security implications:** `cli-hub/cli_hub/installer.py` runs registry install commands with `shell=True` whenever they contain shell operators, including `curl … | bash`. Security therefore depends entirely on trusting the registry. In CODEFORGE these commands would be classified as **INSTALL** and held for approval.
- **Maintenance:** the last commit was 2026-09-22, about two months before this audit.
- **Integration assessment:** CLI-Anything provides a layer CODEFORGE lacks: driving desktop applications from agents. If used, it should be **ISOLATE**d per project: one harness at a time, in a container or VM with the target application, invoked through `cf.py run` so commands are captured and classified.
- **Decision: ISOLATE** (after step 12). One harness at a time, in a container with the target application, run through `cf.py run`. Verification is NOT VERIFIED.

## REA — evaluation against §11.2

- **Repository and software inspection, reverse engineering:** one MCP server plus a CLI for analysing binaries, applications and runtime behaviour. It has providers for Android/APK, .NET, Electron, Flutter, firmware, EVM, browsers, Frida instrumentation, Ghidra, LLDB, Cutter and mitmproxy.
- **Architecture discovery and dependency analysis:**
  - TypeScript core (6 987 files) with shared application workflows for CLI and MCP;
  - Python bridges and a native C/C++ addon;
  - 42 runtime dependencies (including `@modelcontextprotocol/server` 2.3.1 and `node-pty`);
  - strict Node engines: `^22.23.4 || ^24.22.1 || >=26.12.1`.
- **Installation:** `install.sh` resolves the latest GitHub release with `curl` and npm-installs `rea-agents` globally or into `~/.local`. `mcp.json` pins `npx -y rea-agents@6.9.0`.
- **Limitations and security:** SECURITY.md states that REA runs with the host account's permissions and **is not a sandbox**, and that target binaries are untrusted data. DISCLAIMER.md restricts use to lawful, authorized analysis: no DRM, anti-cheat or authentication bypass.
- **Licence:** REA itself is MIT. It also involves:
  - a Windows addon that statically links the GCC runtime (GPL-3.0 with the runtime exception);
  - optional Frida (LGPL-2.0 with the wxWindows exception);
  - GDB (GPL-3.0) and Unicorn (GPL-2.0) as separately obtained tools.
  
  Redistribution must preserve these notices.
- **Maintenance:** very active. The audited commit is from the same day; it uses release-please and a CHANGELOG.
- **Integration assessment:** REA complements `repo_scan.py`, which handles source code only, with binary and runtime analysis. It should only ever run **ISOLATE**d, as an optional MCP server inside a VM or container, for authorized engagements, with each tool call approved by the host.
- **Decision: ISOLATE** (after a partial step 12). Only in a VM or container, for authorized engagements. Verification is NOT VERIFIED, and the full suite has not been completed.

## Engine finding fixed during this audit

While recording the decisions, an attempted `ADOPT` for ECC was **accepted** even though step 12 was SKIPPED. That was a gap in `cf_gov.py`. The rule now requires step 12 DONE for ADOPT, ADAPT and INTEGRATE. ISOLATE, MONITOR and REJECT remain possible without an executed test. The decision was set back to MONITOR, and the erroneous ADOPT remains visible in the record history. A regression test was added to `tests/run_tests.sh`.

## Step 12 results

All runs were made at the audited commits, in this cloud container, with dependencies installed locally and install scripts disabled. The evidence files are in [`evidence/`](evidence/).

### ECC

- **CI validators: 11/11 pass** ([evidence](evidence/ecc-ci-validators.txt)): 72 agents, 98 commands, 122 rules, 845 skill directories, 28 hook matchers, 49 install modules and 7 profiles. Host-compatibility validation reports 421 warnings.
- **`npm test`: 10 415 of 10 423 tests pass; 8 fail, in 6 of 508 files** ([summary](evidence/ecc-npm-test-summary.txt)). Every failure traced back to this environment:

  | Failures | Cause | Test file |
  |---|---|---|
  | 3 | `ssh-keygen` not installed | `ci/grok-pin` |
  | 3 | the clone is shallow, so `git show` of older commits fails, plus a Grok-source check that depends on it | `plugin-manifest`, `install-apply`, `ownership-guard` |
  | 1 | container process cleanup | `install-sh` |
  | 1 | observation file fixture | `hooks/hooks` |

- The engine records TST-ECC-FULL as **FAILED**, not "mostly passed".

### CLI-Anything

- **drawio harness: 120/120 pass.**
- **All 66 `test_core.py` suites** ([evidence](evidence/cli-anything-harness-unit.txt)):
  - 53 harnesses are fully green;
  - 3 358 tests passed, 41 failed, 17 errors, 2 skipped;
  - the errors are collection failures from optional modules that are not installed (`trimesh`, `iterm2`, …);
  - the failures concentrate in iterm2, videocaptioner, zotero, krita, nsight-graphics, unrealinsights, cloudcompare and shotcut.
- The end-to-end tests that need the real desktop applications were **not** run.

### REA

- **`npm test` was stopped by the 1 700 s limit before its summary** ([summary](evidence/rea-npm-test-summary.txt)):
  - 377 test files ran, covering 2 151 tests;
  - 1 test failed: `tests/acceptance/jsonLinesCli.test.ts` › "refuses non-record SQLite selections as caller output errors";
  - 57 tests were skipped, mostly native or platform-specific;
  - the native addon was not built, because install scripts were disabled.
- The full suite has **not** been completed.

### Engineering loop

- One task per repository (T-001 ECC, T-002 CLI-Anything, T-003 REA) went CREATED → VALIDATED → READY → IN_PROGRESS → TEST.
- The engine **refused VERIFY**, because the linked tests are not PASSED.
- Each failure was classified (ENVIRONMENT or DEPENDENCY) and each task was DEFERRED with the reason: step 12 was executed and recorded, and fixing the remaining failures belongs to the upstream projects.

## Next steps (beyond this audit)

1. **ECC (ADAPT).** Pick one concrete pattern, for example the secret-redaction rules from its hooks. Re-implement it in CODEFORGE with tests, then run `cf.py adopt verify ECC --evidence …`.
2. **CLI-Anything (ISOLATE).** Choose the harness a real project needs and run its end-to-end tests in a container with the target application. Commands go through `cf.py run` so the installers are classified and held for approval.
3. **REA (ISOLATE).** Run the full suite without a time limit, ideally in REA's own CI configuration and with the native addon built, inside a VM. Only then use it as an MCP server, and only for authorized engagements.
