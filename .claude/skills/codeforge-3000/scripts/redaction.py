#!/usr/bin/env python3
"""Secret redaction for CODEFORGE logs, context packages, dashboard diffs and hook events (Module 17).

  python3 redaction.py < text            prints the redacted text
  from redaction import redact

Adapted from ECC's `scripts/hooks/post-bash-command-log.js` (sanitizeCommand) at commit 3f14a103a869,
https://github.com/affaan-m/ECC — MIT License, Copyright (c) 2026 Affaan Mustafa. See NOTICE-ECC.md.

What was adopted from ECC (§11.4 ADAPT):
  - whole PEM private-key blocks are removed, not only the BEGIN line (an unterminated block is cut to the end);
  - JWTs are found in runs of [A-Za-z0-9_.-], including after a `-`/`_` prefix (session_<JWT>), with the header
    validated (``eyJ`` or base64url JSON with an ``alg`` field) under a bounded decode budget, so scanning stays linear
    and decoy candidates cannot hide a token (fail closed once the budget is spent);
  - assignment values (secret=, api_key=, …) are redacted as whole shell words, honouring quotes and escapes and the
    enclosing quote (`-H "x-api-key: VALUE"`); a searched keyword (`grep "secret =" f`) is left alone;
  - --token flags, Authorization headers, AWS ASIA keys and github_pat_ tokens.
What was changed for CODEFORGE:
  - input is multi-line (terminal output, diffs), so newlines are kept and no rule crosses a line break;
  - `password`/`passwd`/`token` keys are only redacted in assignment form (`password=…`), never in prose;
  - JSON-style keys (`"api_key": "value"`) are recognised and the quoted value is replaced without eating `,`/`}`;
  - the marker is [REDACTED-SECRET], as before.
"""
import base64
import json
import re
import sys

MARK = "[REDACTED-SECRET]"

# ------------------------------------------------------------------ JWT (ECC findJwtHeader / redactJwtsInChain)
MAX_HEADER_DECODES = 8


def _b64url(s):
    s = re.sub(r"[^A-Za-z0-9_-]", "", s)
    try:
        return base64.urlsafe_b64decode(s + "=" * (-len(s) % 4))
    except (ValueError, TypeError):
        return b""


def _is_jwt_header(header):
    if header.startswith("eyJ"):
        return True
    try:
        d = json.loads(_b64url(header).decode("utf-8"))
    except (ValueError, UnicodeDecodeError):
        return False
    return isinstance(d, dict) and isinstance(d.get("alg"), str)


def _may_be_jwt_header(seg, j):
    b = _b64url(seg[j:j + 4])
    return len(b) >= 2 and b[1] in (0x22, 0x20, 0x09, 0x0A, 0x0D)


def _find_jwt_header(seg):
    decodes = 0
    for j in range(0, len(seg) - 9):
        if not ((j == 0 or seg[j - 1] in "-_") and seg[j] == "e" and seg[j + 1] in "yw"):
            continue
        if seg.startswith("eyJ", j):
            return j
        if not _may_be_jwt_header(seg, j):
            continue
        if decodes >= MAX_HEADER_DECODES:
            return j                                   # fail closed: decoys cannot exhaust the scan
        decodes += 1
        if _is_jwt_header(seg[j:]):
            return j
    return -1


def _redact_jwts_in_chain(m):
    chain = m.group(0)
    if "." not in chain:
        return chain
    segs, out, i = chain.split("."), [], 0
    while i < len(segs):
        seg = segs[i]
        if i + 2 < len(segs) and segs[i + 1]:
            start = _find_jwt_header(seg)
            if start >= 0:
                out.append(seg[:start] + MARK)
                i += 3
                continue
        out.append(seg)
        i += 1
    return ".".join(out)


CHAIN = re.compile(r"[A-Za-z0-9_.-]+")

# ------------------------------------------------------------------ assignments (ECC redactAssignments, multi-line)
ASSIGNMENT_KEY = re.compile(
    r"(?:\b|_)(?:client[_-]?secret|secret(?:[_-]?key)?|api[_-]?key|access[_-]?key|private[_-]?key|auth[_-]?token|access[_-]?token|"
    r"refresh[_-]?token|password|passwd|pwd)([\"']?[ \t]*[:=][ \t]*)", re.I)
SEP = ",;}])"


def _is_quote_start(t, i):
    return t[i] in "\"'" or (t[i] == "$" and i + 1 < len(t) and t[i + 1] == "'")


def _skip_quoted(t, start):
    ansi = t[start] == "$"
    q = "'" if ansi else t[start]
    esc = ansi or q == '"'
    i = start + (2 if ansi else 1)
    while i < len(t) and t[i] != "\n":
        if esc and t[i] == "\\":
            i += 2
        elif t[i] == q:
            return i + 1
        else:
            i += 1
    return min(i, len(t))


def _word_end(t, start):
    i = start
    while i < len(t) and not t[i].isspace():
        if _is_quote_start(t, i):
            i = _skip_quoted(t, i)
            if i < len(t) and t[i] in SEP:           # JSON value: stop before the separator
                return i
        elif t[i] == "\\":
            i += 2
        else:
            i += 1
    return min(i, len(t))


def _enclosed_end(t, start, open_):
    close = '"' if open_ == '"' else "'"
    esc = open_ != "'"
    if start < len(t) and t[start] == close:
        nxt = t[start + 1] if start + 1 < len(t) else ""
        return start if (not nxt or nxt.isspace() or nxt in SEP) else _word_end(t, start)
    i = start
    while i < len(t) and t[i] != close and t[i] != "\n":
        i += 2 if esc and t[i] == "\\" else 1
    return min(i, len(t))


def _redact_assignments(t):
    out, copied, scan, open_ = [], 0, 0, None
    pos = 0
    while True:
        m = ASSIGNMENT_KEY.search(t, pos)
        if not m:
            break
        vs = m.end()
        while scan < vs:                                # track the quote that encloses the value
            c = t[scan]
            if c == "\n":
                open_ = None; scan += 1
            elif open_ is None:
                if _is_quote_start(t, scan):
                    open_ = "$'" if c == "$" else c
                    scan += len(open_)
                else:
                    scan += 2 if c == "\\" else 1
            elif open_ != "'" and c == "\\":
                scan += 2
            else:
                if c == ('"' if open_ == '"' else "'"):
                    open_ = None
                scan += 1
        # a JSON key `"api_key": "v"` closes its own quote inside the match: the value is not enclosed
        if open_ is not None and m.group(1)[:1] in "\"'":
            open_ = None
        end = _word_end(t, vs) if open_ is None else _enclosed_end(t, vs, open_)
        if end > vs:
            val = t[vs:end]
            q = val[0] if val[:1] in "\"'" and len(val) > 1 and val[-1] == val[0] else ""
            out.append(t[copied:vs] + (q + MARK + q if q else MARK))
            copied = end
            pos = end
            scan = max(scan, end)
        else:
            pos = vs if vs > m.start() else m.start() + 1
    return "".join(out) + t[copied:]


# ------------------------------------------------------------------ token formats
PEM = re.compile(r"-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----[\s\S]*?(?:-----END [A-Z0-9 ]*PRIVATE KEY-----|$)")
TOKENS = [
    (re.compile(r"\bsk-[A-Za-z0-9_-]{20,}"), MARK),
    (re.compile(r"\b(?:AKIA|ASIA)[A-Z0-9]{16}\b"), MARK),
    (re.compile(r"\bgh[pousr]_[A-Za-z0-9_]{20,}"), MARK),
    (re.compile(r"\bgithub_pat_[A-Za-z0-9_]{20,}"), MARK),
    (re.compile(r"\bxox[abprs]-[A-Za-z0-9-]{10,}"), MARK),
    (re.compile(r"\bAIza[0-9A-Za-z_-]{35}"), MARK),
    (re.compile(r"--token(=|[ \t]+)[^\s]+"), r"--token\1" + MARK),
    (re.compile(r"(Authorization:)[ \t]*(?:(?:Bearer|Basic|Token|Bot)[ \t]+)?[^\s\"']+", re.I), r"\1 " + MARK),
]


def redact(text):
    """Return `text` with secrets replaced by [REDACTED-SECRET]. Never raises on str input."""
    if not text:
        return text
    t = PEM.sub(MARK, str(text))
    t = CHAIN.sub(_redact_jwts_in_chain, t)
    t = _redact_assignments(t)
    for rx, rep in TOKENS:
        t = rx.sub(rep, t)
    return t


if __name__ == "__main__":
    sys.stdout.write(redact(sys.stdin.read()))
