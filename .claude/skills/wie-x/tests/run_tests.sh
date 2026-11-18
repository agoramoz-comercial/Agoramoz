#!/usr/bin/env bash
# WIE-X self-test (Module 26 applied to the skill itself). Uses a temporary directory; touches nothing else.
set -u
HERE="$(cd "$(dirname "$0")/.." && pwd)"
S="$HERE/scripts"
T="$(mktemp -d)"; trap 'rm -rf "$T"' EXIT
pass=0; fail=0
ok()   { echo "  PASS  $1"; pass=$((pass+1)); }
bad()  { echo "  FAIL  $1"; fail=$((fail+1)); }
check(){ if eval "$2" >/dev/null 2>&1; then ok "$1"; else bad "$1"; fi; }

echo "== Source integrity"
check "master has 40 modules"            "[ \$(grep -c '^## MODULE ' '$HERE/WIE-X-v4.0-MASTER.md') -eq 40 ]"
check "split_modules regenerates 40"     "python3 '$S/split_modules.py'"
check "modules/ has 40 files"            "[ \$(ls '$HERE/modules' | wc -l) -eq 40 ]"
check "module text matches master"       "python3 - <<'PY'
import pathlib,re
r=pathlib.Path('$HERE'); m=(r/'WIE-X-v4.0-MASTER.md').read_text()
body=''.join(re.sub(r'^<!--.*?-->\n','',f.read_text(),flags=re.S) for f in sorted((r/'modules').glob('M*.md')))
norm=lambda s: re.sub(r'\s+|---','',s)
assert norm(body) in norm(m), 'module text differs from master'
PY"
check "SKILL.md has front matter name"   "grep -q '^name: wie-x' '$HERE/SKILL.md'"

echo "== wiex_init"
check "L3 init creates 10 files"         "python3 '$S/wiex_init.py' --name 'Demo Shop' --level L3 --dir '$T/p' && [ \$(ls '$T/p/.wie-x' | wc -l) -eq 10 ]"
echo "sentinel" >> "$T/p/.wie-x/STATE.md"
check "re-init never overwrites"         "python3 '$S/wiex_init.py' --name 'Demo Shop' --level L4 --dir '$T/p' && grep -q sentinel '$T/p/.wie-x/STATE.md' && [ -f '$T/p/.wie-x/TEMPLATE-RECORD.md' ]"
check "placeholders substituted"         "! grep -q '{{PROJECT_NAME}}' '$T/p/.wie-x/STATE.md'"

echo "== traceability"
check "template project fails gate (REQ-001 NOT TESTED)" "! python3 '$S/traceability.py' --dir '$T/p'"
python3 - "$T/p/.wie-x" <<'PY'
import sys,pathlib
d=pathlib.Path(sys.argv[1])
q=(d/'QA.md').read_text().replace('| TEST-001 | REQ-001 | | | | | NOT TESTED | |','| TEST-001 | REQ-001 | e2e | local | ok | ok | TESTED AND PASSED | log.txt |')
(d/'QA.md').write_text(q)
PY
check "passing test passes gate"         "python3 '$S/traceability.py' --dir '$T/p'"
python3 - "$T/p/.wie-x" <<'PY'
import sys,pathlib
d=pathlib.Path(sys.argv[1]); r=d/'REQUIREMENTS.md'
r.write_text(r.read_text().replace('| REQ-001 | | Mandatory | High | | User | Open |','| REQ-001 | | Mandatory | High | | User | Open |\n| REQ-002 | Login | Mandatory | High | | User | Open |'))
PY
check "untraced mandatory REQ fails"     "! python3 '$S/traceability.py' --dir '$T/p'"
check "missing files -> exit 2"          "python3 '$S/traceability.py' --dir '$T/none'; [ \$? -eq 2 ]"

echo "== template_score"
check "92 & no critical -> eligible"     "python3 '$S/template_score.py' --objective 95 --functional 92 --fidelity 90 --security 92 --technical 90 --reusability 90 --prompt 90"
check "critical failure blocks"          "! python3 '$S/template_score.py' --objective 95 --functional 95 --fidelity 95 --security 95 --technical 95 --reusability 95 --prompt 95 --critical 1"
check "weighted total is correct (85.75)" "python3 '$S/template_score.py' --objective 90 --functional 80 --fidelity 85 --security 90 --technical 80 --reusability 85 --prompt 90 --json | grep -q '\"total\": 85.75'"

echo "== decision_score"
cat > "$T/opt.json" <<'J'
{"options":{"Next.js":{"fit":5,"reliability":4,"performance":4,"security":4,"maintainability":4,"compatibility":5,"cost":4,"dx":5},
            "Astro":{"fit":3,"reliability":4,"performance":5,"security":4,"maintainability":4,"compatibility":4,"cost":5,"dx":4}}}
J
check "ranks options"                    "python3 '$S/decision_score.py' '$T/opt.json' | grep -q '| 1 | Next.js'"

echo "== library"
L="$T/lib"
mkdir -p "$T/pkg"; cp "$T/p/.wie-x/TEMPLATE-RECORD.md" "$T/pkg/"
sed -i 's/^tags: \[\]/tags: [saas, ecommerce, stripe]/; s/^stack: \[\]/stack: [nextjs, postgres]/; s/^category: .*/category: ecommerce/' "$T/pkg/TEMPLATE-RECORD.md"
check "add Q0 template"                  "python3 '$S/library.py' --lib '$L' add '$T/pkg'"
check "same version refused"             "! python3 '$S/library.py' --lib '$L' add '$T/pkg'"
sed -i 's/^version: 1.0.0/version: 1.1.0/' "$T/pkg/TEMPLATE-RECORD.md"
check "new version keeps history"        "python3 '$S/library.py' --lib '$L' add '$T/pkg' && ls '$L'/templates/*/history/1.0.0/TEMPLATE-RECORD.md"
check "search finds by tag"              "python3 '$S/library.py' --lib '$L' search 'stripe checkout' | grep -q 'TPL-'"
check "min-status filters it out"        "python3 '$S/library.py' --lib '$L' search 'stripe' --min-status Q2 | grep -q 'No matching'"
TID=$(python3 -c "import json;print(list(json.load(open('$L/index.json'))['templates'])[0])")
check "Q4 without score refused"         "! python3 '$S/library.py' --lib '$L' status $TID Q4"
check "Q4 with evidence accepted"        "python3 '$S/library.py' --lib '$L' status $TID Q4 --score 93 --critical 0 --approved-by Owner"
check "reuse-plan prints assessment"     "python3 '$S/library.py' --lib '$L' reuse-plan $TID | grep -q REVALIDATE"
mkdir -p "$T/leak"; cp "$T/pkg/TEMPLATE-RECORD.md" "$T/leak/"; sed -i 's/^version: .*/version: 9.0.0/' "$T/leak/TEMPLATE-RECORD.md"
echo 'api_key = "sk-abcdefghijklmnopqrstuvwxyz123456"' > "$T/leak/config.env"
check "secret in package refused"        "! python3 '$S/library.py' --lib '$L' add '$T/leak'"

echo "== capability_probe & export"
check "probe prints table"               "python3 '$S/capability_probe.py' --network-url http://127.0.0.1:9 | grep -q '| Terminal | Available'"
check "probe marks agent caps UNKNOWN"   "python3 '$S/capability_probe.py' --network-url http://127.0.0.1:9 | grep -q '| MCP | UNKNOWN'"
for p in cursor copilot codex windsurf generic; do
  check "export $p"                      "python3 '$S/export_adapter.py' --platform $p --out '$T/x-$p'"
done
check "cursor rule has front matter"     "head -1 '$T/x-cursor/.cursor/rules/wie-x.mdc' | grep -q -- '---'"
check "full export contains MODULE 39"   "grep -q 'MODULE 39' '$T/x-generic/WIE-X-SYSTEM-PROMPT.md'"
check "export refuses overwrite"         "! python3 '$S/export_adapter.py' --platform codex --out '$T/x-codex'"
check "core export is compact"           "python3 '$S/export_adapter.py' --platform generic --mode core --out '$T/core' && ! grep -q 'MODULE 39 — FINAL' '$T/core/WIE-X-SYSTEM-PROMPT.md'"
check "claude-code export copies skill"  "python3 '$S/export_adapter.py' --platform claude-code --out '$T/cc' && [ -f '$T/cc/.claude/skills/wie-x/SKILL.md' ]"

echo
echo "RESULT: $pass passed, $fail failed"
[ "$fail" -eq 0 ]
