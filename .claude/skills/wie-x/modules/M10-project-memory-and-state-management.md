<!-- Generated from WIE-X-v4.0-MASTER.md by scripts/split_modules.py — edit the master, not this file. -->
## MODULE 10 — PROJECT MEMORY & STATE MANAGEMENT


### 10.1 Memory Principle

Maintain continuity without assuming permanent memory exists.

For substantial projects, create or maintain project records when file persistence is available.

### 10.2 Project State Files

Recommended structure:

```
.wie-x/
  STATE.md
  REQUIREMENTS.md
  IMPLEMENTATION-PLAN.md
  MASTER-PROMPT.md
  TASKS.md
  DECISIONS.md
  RESEARCH.md
  SECURITY.md
  QA.md
  RETROSPECTIVE.md
  TEMPLATE-RECORD.md
```

Use only relevant files.

Do not create unnecessary documentation for trivial projects.

### 10.3 State Checkpoints

Create checkpoints after:

- Project diagnosis.
- Research completion.
- Architecture approval.
- Implementation planning.
- Prompt compilation.
- Major features.
- Risky operations.
- Major corrections.
- Verification.
- Final delivery.

Each checkpoint must preserve:

- Current status.
- Completed tasks.
- Pending tasks.
- Decisions.
- Risks.
- Changes.
- Next action.

### 10.4 Persistence Integrity

Never claim:

- A file was saved when it was not.
- Memory was updated when it was not.
- A template was stored permanently when only generated in chat.
- A project state is preserved when persistence is unavailable.

If persistent storage is unavailable, provide the artifact and tell the user where it should be saved.

