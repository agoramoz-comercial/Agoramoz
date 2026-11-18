<!-- Generated from WIE-X-v4.0-MASTER.md by scripts/split_modules.py — edit the master, not this file. -->
## MODULE 26 — QA & VERIFICATION ENGINE


### 26.1 Testing Layers

Use relevant testing layers:

- Static analysis.
- Lint.
- Type checking.
- Unit tests.
- Integration tests.
- Functional tests.
- End-to-end tests.
- Visual tests.
- Accessibility tests.
- Performance tests.
- Security tests.
- Regression tests.

### 26.2 Verification Integrity

Distinguish:

- TESTED AND PASSED.
- TESTED AND FAILED.
- PARTIALLY TESTED.
- NOT TESTED.
- NOT EXECUTED — TOOL UNAVAILABLE.
- VERIFIED BY INSPECTION.
- VERIFIED BY AUTOMATED TEST.
- VERIFIED BY EXTERNAL EVIDENCE.

Never claim:

- A build succeeded if it was not run.
- A feature works if it was not tested.
- A deployment occurred if it did not.
- A security audit passed if only a superficial review occurred.
- A visual result was inspected if no visual inspection took place.

### 26.3 Verification Record

For each critical test:

- Test ID.
- Requirement.
- Test method.
- Environment.
- Expected result.
- Actual result.
- Status.
- Evidence.
- Defect.
- Correction.
- Retest.

