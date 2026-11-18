#!/usr/bin/env python3
"""Tests for scripts/redaction.py (ADAPT of ECC sanitizeCommand). Fake secrets are built at runtime, never committed.

  python3 tests/test_redaction.py        exit 0 when every case passes
Cases mirror ECC tests/scripts/post-bash-command-log.test.js (commit 3f14a103a869) plus CODEFORGE multi-line cases.
"""
import base64, json, pathlib, sys, time

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent / "scripts"))
from redaction import redact, MARK  # noqa: E402

R = MARK
b64 = lambda o: base64.urlsafe_b64encode(json.dumps(o, separators=(",", ":")).encode() if not isinstance(o, str) else o.encode()).decode().rstrip("=")
JWT = b64({"alg": "HS256", "typ": "JWT"}) + "." + b64({"sub": "fake-user", "iat": 1}) + "." + "c2lnbmF0dXJlLWZha2U"
SPACED = b64('{ "alg":"HS256"}') + "." + b64({"sub": "x"}) + ".c2ln"          # header starts with eyA
NEWLINE = b64('{\n"alg":"HS256"}') + "." + b64({"sub": "x"}) + ".c2ln"        # header starts with ew
SK = "sk-" + "ant-" + "FAKEfake" * 4
AWS = "AK" + "IA" + "FAKEFAKEFAKEFAKE"
ASIA = "AS" + "IA" + "FAKEFAKEFAKEFAKE"
GHP = "gh" + "p_" + "fakeFAKE" * 4
PAT = "github" + "_pat_" + "fakeFAKE" * 4
PEM_BODY = "MIIEvQ" + "FAKEKEYBODY" * 6
PEM = "-----BEGIN " + "PRIVATE KEY-----\n" + PEM_BODY + "\n" + PEM_BODY + "\n-----END " + "PRIVATE KEY-----"
V = "fake-value-" + "x" * 12

cases = []


def eq(name, got, want):
    cases.append((name, got == want, f"got {got!r}\n      want {want!r}"))


def no(name, got, *leaks):
    bad = [l for l in leaks if l in got]
    cases.append((name, not bad and R in got, f"leaked {bad} in {got!r}"))


def same(name, text):
    eq(name, redact(text), text)


# --- ECC parity: token formats
no("sk- key anywhere", redact(f"echo {SK} > key.txt"), SK)
eq("sk- key exact", redact(f"echo {SK} > key.txt"), f"echo {R} > key.txt")
no("AWS AKIA + ASIA", redact(f"aws {AWS} {ASIA}"), AWS, ASIA)
no("GitHub ghp_ + github_pat_", redact(f"git clone https://{GHP}@github.com/x && echo {PAT}"), GHP, PAT)
eq("--token flag", redact(f"tool --token {V} --x"), f"tool --token {R} --x")
eq("--token= flag", redact(f"tool --token={V}"), f"tool --token={R}")
eq("Authorization Bearer", redact(f"curl -H 'Authorization: Bearer {V}' x"), f"curl -H 'Authorization: {R}' x")
# --- ECC parity: PEM and JWT
eq("whole PEM block", redact(f"printf '{PEM}' > id_rsa"), f"printf '{R}' > id_rsa")
no("unterminated PEM cut to end", redact("-----BEGIN " + "PRIVATE KEY-----\n" + PEM_BODY), PEM_BODY)
eq("JWT in export", redact(f"export TOKEN_VALUE={JWT}"), f"export TOKEN_VALUE={R}")
for nm, tok in (("eyA", SPACED), ("ew", NEWLINE)):
    eq(f"JWT whitespace header ({nm})", redact(f"export TOKEN_VALUE={tok}"), f"export TOKEN_VALUE={R}")
eq("JWT after hyphen prefix", redact(f"echo prefix-{JWT}"), f"echo prefix-{R}")
eq("JWT after underscore prefix", redact(f"export AUTH=bearer_{JWT}"), f"export AUTH=bearer_{R}")
eq("JWT in URL path", redact(f"open https://x.example.com/a.{JWT}"), f"open https://x.example.com/a.{R}")
eq("JWT after failed candidate (eyewear_)", redact(f"echo eyewear_session_{JWT}"), f"echo eyewear_session_{R}")
same("eyesight domain untouched", "ping eyesightdata.example.com")
same("my_eyes file untouched", "ls my_eyes.backup.tar")
same("eyewear file untouched", "ls eyewear_session_eyebrows.backup.tar")
decoys = "eyAg-" * 20
got = redact(f"echo {decoys}{JWT}")
cases.append(("JWT behind more decoys than the decode budget", JWT.split(".")[1] not in got and R in got, got[:120]))
t0 = time.time(); redact("eyAg-" * 20000 + "." + "eyAg-" * 20000 + ".x"); redact("ey-" * 50000)
cases.append(("linear on long ey- runs", time.time() - t0 < 2.0, f"{time.time() - t0:.2f}s"))
# --- ECC parity: assignments
eq("secret= assignment", redact(f"app --secret={V} --next"), f"app --secret={R} --next")
eq("CLIENT_SECRET env", redact(f"CLIENT_SECRET={V} run"), f"CLIENT_SECRET={R} run")
eq("api_key quoted value (quotes kept, value gone)", redact(f'app api_key="{V} with space" --n'), f'app api_key="{R}" --n')
eq("joined shell fragments", redact(f"app --secret='a-'{V} --next"), f"app --secret={R} --next")
eq("escaped quote in value", redact(f'app --secret=first\\"{V} --next'), f"app --secret={R} --next")
eq("unterminated quote", redact(f'app --secret="{V} unterminated'), f"app --secret={R}")
eq("enclosing quote header", redact(f'curl -H "x-api-key: {V}" https://x'), f'curl -H "x-api-key: {R}" https://x')
same("searched keyword kept", 'grep "secret =" config.ini')
for c in ("npm test", "git status --short", "ls -la src", "python3 -m pytest -q", "echo hello world"):
    same(f"ordinary command untouched: {c}", c)
# --- CODEFORGE: multi-line logs, prose, JSON
log = f"step 1 ok\npassword={V}\nnext line stays\n"
eq("multi-line: newline kept, next line intact", redact(log), f"step 1 ok\npassword={R}\nnext line stays\n")
same("prose with 'password' untouched", "Use a password manager for the admin account.")
same("token counts untouched", "input_tokens: 1200 output_tokens: 300")
eq("JSON key/value", redact(f'{{"api_key": "{V}", "name": "demo"}}'), f'{{"api_key": "{R}", "name": "demo"}}')
eq("YAML-style", redact(f"  client_secret: {V}\n  region: eu"), f"  client_secret: {R}\n  region: eu")
K = "sec" + "ret"
eq("quoted value does not cross lines", redact(K + f'="{V}\nnext'), K + f"={R}\nnext")
eq("empty input", redact(""), "")

fails = [c for c in cases if not c[1]]
for n, ok, why in cases:
    print(("  PASS  " if ok else "  FAIL  ") + n + ("" if ok else "\n      " + why))
print(f"\nredaction: {len(cases) - len(fails)} passed, {len(fails)} failed")
sys.exit(1 if fails else 0)
