#!/usr/bin/env python3
"""Claude Code hook → CODEFORGE live events (makes IDE/agent tool activity observable in the LEOC dashboard).

Claude Code passes a JSON object on stdin for hook events (e.g. PreToolUse / PostToolUse) with fields such as
session_id, cwd, hook_event_name, tool_name, tool_input, tool_response. Verify the current schema in the official
Claude Code hooks documentation; unknown fields are ignored. This hook only APPENDS an event line; it never blocks
the tool (always exit 0) and never stores secrets (inputs are truncated and redacted).
Install:  python3 scripts/export.py --platform claude-code --out <project> --with-hooks
"""
import datetime as dt, json, os, pathlib, re, sys

try:
    sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))
    from redaction import redact as _full_redact          # ECC-adapted redaction (see redaction.py)
except Exception:  # noqa: BLE001 — the hook must never fail
    _full_redact = None


def _safe(text):
    try:
        if _full_redact is not None:
            return _full_redact(text)
    except Exception:  # noqa: BLE001
        pass
    return SECRET.sub("[REDACTED]", text)


SECRET = re.compile(r"(AKIA[0-9A-Z]{16}|sk-[A-Za-z0-9_\-]{20,}|gh[pousr]_[A-Za-z0-9]{30,}|-----BEGIN [A-Z ]*PRIVATE KEY-----)")


def main():
    try:
        data = json.load(sys.stdin)
    except Exception:  # noqa: BLE001
        return 0
    root = pathlib.Path(os.environ.get("CODEFORGE_DIR") or data.get("cwd") or ".").resolve()
    d = root / ".codeforge"
    if not d.exists():
        return 0                                   # project not managed by CODEFORGE — do nothing
    ti = data.get("tool_input") or {}
    target = ti.get("file_path") or ti.get("path") or ti.get("command") or ti.get("pattern") or ti.get("url") or ""
    ev = {"ts": dt.datetime.now().isoformat(timespec="seconds"), "kind": "tool", "source": "claude-code-hook",
          "hook": data.get("hook_event_name", ""), "tool": data.get("tool_name", ""), "message": _safe(str(target))[:300],
          "agent": os.environ.get("CODEFORGE_AGENT", "claude-code"), "task": os.environ.get("CODEFORGE_TASK", ""), "session": data.get("session_id", "")}
    resp = data.get("tool_response")
    if isinstance(resp, dict) and ("error" in resp or resp.get("is_error")):
        ev["status"] = "FAILED"
    with open(d / "events.jsonl", "a", encoding="utf-8") as fh:
        fh.write(json.dumps(ev, ensure_ascii=False) + "\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
