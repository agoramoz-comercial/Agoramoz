#!/usr/bin/env bash
# ZABATAINA 3000 — self-test incl. the 15 mandatory stress tests (Master Prompt v2.0 §48).
# Uses temporary directories only. Results are printed with exact pass/fail; nothing is assumed.
set -u
HERE="$(cd "$(dirname "$0")/.." && pwd)"; S="$HERE/scripts"
T="$(mktemp -d)"; trap 'rm -rf "$T"' EXIT
export Z3000_LIBRARY="$T/lib"
Z="python3 $S/z3k.py --dir $T/p"
pass=0; fail=0
ok(){ echo "  PASS  $1"; pass=$((pass+1)); }; bad(){ echo "  FAIL  $1"; fail=$((fail+1)); }
check(){ if eval "$2" >/dev/null 2>&1; then ok "$1"; else bad "$1"; fi; }
refused(){ if eval "$2" >/dev/null 2>&1; then bad "$1 (was NOT refused)"; else ok "$1"; fi; }

echo "== Source integrity"
check "master v2.0 has 22 parts"            "[ \$(grep -c '^## PART ' '$HERE/Z3000-MASTER-v2.0.md') -eq 22 ]"
check "master v2.0 has 59 numbered sections" "[ \$(grep -cE '^### [0-9]+\. ' '$HERE/Z3000-MASTER-v2.0.md') -eq 59 ]"
check "master v2.0 has 20 module sections"  "[ \$(grep -cE '^### M[0-9]{2} — ' '$HERE/Z3000-MASTER-v2.0.md') -eq 20 ]"
check "20 v1 module manuals present"        "[ \$(ls '$HERE'/modules/M*.md | wc -l) -eq 20 ]"
check "24 agent contracts with 12 fields"   "python3 -c \"import json;a=json.load(open('$HERE/data/agents.json'))['agents'];assert len(a)==24 and all(len(x)==12 for x in a)\""
check "functional atlas has 100 domains"    "python3 -c \"import json;assert len(json.load(open('$HERE/data/functional-atlas.json'))['domains'])==100\""

echo "== Project lifecycle"
check "init creates sealed record"           "$Z init --name 'Test Co' --objective 'US\$1M revenue' && [ -f $T/p/.z3000/process.json ]"
refused "init twice refused (never overwrite)" "$Z init --name X --objective Y"
check "track + requirements"                 "$Z track A --target 1000000 --baseline 100000 --currency USD --verdict 'HIGH RISK' && $Z req add 'Baseline verified' --acceptance 'a;b' && $Z req add 'Model built'"
check "tasks with dependencies"              "$Z task add 'Collect financials' --priority P0 --owner CFO --objective base --acceptance 'P&L;bank' --req REQ-001 && $Z task add 'Build model' --priority P1 --owner CFO --objective m --deps T-001 --acceptance 'scenarios' --req REQ-002"

echo "== Stress tests (§48)"
$Z req add 'Orphan mandatory requirement' >/dev/null 2>&1
refused "STRESS-01 task omission detected (mandatory REQ without task)" "$Z check"
$Z task add 'Cover orphan' --owner PM --objective o --acceptance x --req REQ-003 >/dev/null 2>&1
$Z task add 'No criteria task' --owner PM --objective o >/dev/null 2>&1
check "  setup: validate T-001"              "$Z task validate T-001 && $Z task ready T-001 && $Z task start T-001"
refused "STRESS-02 premature completion: verify from IN_PROGRESS refused" "$Z task verify T-001"
refused "STRESS-03 missing acceptance criteria: validate refused" "$Z task validate T-004"
refused "STRESS-04 missing evidence: submit refused"  "$Z task submit T-001"
check "  submit with evidence"               "$Z task submit T-001 --evidence pl.xlsx"
$Z task verify T-001 --met 1 >/dev/null 2>&1
check "STRESS-02b unmet criterion keeps task open" "python3 -c \"import json;assert json.load(open('$T/p/.z3000/process.json'))['tasks']['T-001']['status']=='IN_PROGRESS'\""
touch "$T/p/.z3000/stray123.tmp"
check "STRESS-05 context interruption: state persists across processes; stray temp file harmless" "$Z status | grep -q '0/4 VERIFIED' && $Z task submit T-001 --evidence bank.pdf && $Z task verify T-001 --verifier QA"
check "STRESS-06 session recovery: resume shows integrity, status and next" "$Z resume | grep -q 'integrity OK' && $Z resume | grep -q 'Next: T-002'"
check "STRESS-07 model switching: handoff prompt is self-contained" "$Z handoff | grep -q 'NEXT ELIGIBLE TASK: T-002' && $Z handoff | grep -q 'TASK IMPLEMENTATION DOCUMENT' && python3 $S/export.py --platform generic --out $T/x | grep -q Wrote"
refused "STRESS-08 tool failure surfaces (invalid calculator input)" "python3 $S/finance.py reverse --price 100 --close 1.5 --qual 0.1"
refused "STRESS-08b tool failure surfaces (bad document block)" "echo '{\"pages\":[{\"blocks\":[{\"type\":\"nope\"}]}]}' > $T/bad.json && python3 $HERE/reports/scripts/doc_builder.py $T/bad.json $T/bad.html"
refused "STRESS-09 conflicting instruction vs mandatory requirement: cancel refused without --force" "$Z task cancel T-002 --reason 'not needed'"
$Z task add 'Send proposal to client' --owner CEO --objective rev --acceptance sent --approval-required >/dev/null 2>&1
$Z task validate T-005 >/dev/null 2>&1; $Z task ready T-005 >/dev/null 2>&1
check "STRESS-10 unauthorized action: approval-required task held in NEEDS_APPROVAL" "python3 -c \"import json;assert json.load(open('$T/p/.z3000/process.json'))['tasks']['T-005']['status']=='NEEDS_APPROVAL'\""
refused "STRESS-10b approval without a named human refused" "$Z approve T-005"
refused "STRESS-10c start without approval refused"          "$Z task start T-005"
check "  approval recorded with name releases task"          "$Z approve T-005 --by 'Owner Name' && $Z task start T-005"
refused "STRESS-11 incomplete final report flagged (exit 3, PARTIAL)" "$Z final --out $T/final.md"
check "STRESS-11b final report says PARTIAL"   "grep -q 'PARTIAL' $T/final.md"
$Z task validate T-002 >/dev/null 2>&1
check "  T-002 released after T-001 VERIFIED" "$Z task ready T-002"
$Z task add 'Step C' --owner PM --objective c --acceptance c --deps T-002 >/dev/null 2>&1; $Z task validate T-006 >/dev/null 2>&1
refused "STRESS-12 incorrect dependency release refused" "$Z task ready T-006"
refused "STRESS-13 duplicate task refused"     "$Z task add 'Collect  FINANCIALS' --owner X"
cp $T/p/.z3000/process.json $T/backup.json
python3 -c "import json;f='$T/p/.z3000/process.json';d=json.load(open(f));d['tasks']['T-002']['status']='VERIFIED';json.dump(d,open(f,'w'))"
refused "STRESS-14 corrupted/tampered record detected" "$Z status"
echo '{broken' > $T/p/.z3000/process.json
refused "STRESS-14b invalid JSON record refused" "$Z status"
cp $T/backup.json $T/p/.z3000/process.json
check "  restored record accepted"             "$Z status"
check "  lib: add item"                        "$Z lib add 'Diagnosis SOP' --type sop"
refused "STRESS-15 unverified process reuse refused" "$Z lib reuse LIB-001"
refused "STRESS-15b lifecycle skip refused (DRAFT→APPROVED)" "$Z lib promote LIB-001 --to APPROVED --approved-by X"
check "  lib: DRAFT→TESTED→VERIFIED→REVIEWED"  "$Z lib promote LIB-001 --to TESTED --evidence run1 && $Z lib promote LIB-001 --to VERIFIED --evidence qa1 && $Z lib promote LIB-001 --to REVIEWED"
refused "STRESS-15c APPROVED without human approver refused" "$Z lib promote LIB-001 --to APPROVED"
check "  lib: approved by human → LIBRARY → reuse allowed" "$Z lib promote LIB-001 --to APPROVED --approved-by Owner && $Z lib promote LIB-001 --to LIBRARY && $Z lib reuse LIB-001"

echo "== Retry budget & blocking (§34, §39)"
$Z task validate T-003 >/dev/null 2>&1; $Z task ready T-003 >/dev/null 2>&1; $Z task start T-003 >/dev/null 2>&1
for i in 1 2; do $Z task fail T-003 --reason "err $i" >/dev/null 2>&1; $Z task retry T-003 >/dev/null 2>&1; done
$Z task fail T-003 --reason 'err 3' >/dev/null 2>&1
refused "4th retry refused (no infinite loops)" "$Z task retry T-003"
refused "block without next action refused"   "$Z task block T-003 --reason x"
check "block with reason + next"               "$Z task block T-003 --reason 'API down' --next 'Escalate to vendor' && $Z blockers | grep -q 'API down'"

echo "== Reports & documents"
check "execution report markdown"              "$Z report | grep -q 'EXECUTION REPORT'"
check "task implementation document A–K"      "$Z task doc T-002 | grep -q '## K. Completion Record'"
if node -e "require('playwright')" >/dev/null 2>&1; then
  check "execution report PDF from process record" "$Z report --pdf $T/exec.pdf && [ -s $T/exec.pdf ]"
  for s in executive-brief financial-feasibility plan-180-days commercial-proposal; do
    check "spec → PDF: $s" "python3 $HERE/reports/scripts/doc_builder.py $HERE/reports/specs/$s.json $T/$s.html --pdf $T/$s.pdf && [ -s $T/$s.pdf ]"
  done
else
  echo "  SKIP  PDF rendering — NOT EXECUTED — TOOL UNAVAILABLE (playwright not found)"
fi

echo "== Finance, QA, atlas, export"
check "reverse: 100 sales / 500 opps / 5000 leads" "python3 $S/finance.py --json reverse --price 10000 --close 0.2 --qual 0.1 | python3 -c \"import json,sys;d=json.load(sys.stdin);assert (d['sales'],d['opportunities'],d['leads'])==(100,500,5000)\""
check "netprofit formula (1M, tax 25%, CM 40%, fixed 120K) = 3,633,333" "python3 $S/finance.py --json netprofit --cm 0.4 --fixed-monthly 20000 | python3 -c \"import json,sys;assert round(json.load(sys.stdin)['required_revenue'])==3633333\""
check "arr reaches target MRR at month 6"     "python3 $S/finance.py --json arr --price-monthly 500 --churn 0.03 | python3 -c \"import json,sys;d=json.load(sys.stdin);assert abs(d['mrr_path'][-1]-d['target_mrr'])<1\""
check "breakeven 45000/(550-250)=150"         "python3 $S/finance.py --json breakeven --fixed 45000 --price 550 --variable 250 | python3 -c \"import json,sys;assert json.load(sys.stdin)['units']==150\""
check "unit: negative contribution blocks scaling" "python3 $S/finance.py --json unit --price 100 --variable 120 --cac 50 --churn 0.1 | python3 -c \"import json,sys;assert json.load(sys.stdin)['scaling_allowed'] is False\""
check "valuation range"                       "python3 $S/finance.py --json valuation --metric 200000 --multiples 3,5 --net-debt 50000 | python3 -c \"import json,sys;assert json.load(sys.stdin)['equity_value']==[550000.0,950000.0]\""
check "qa gate passes at 40/48"               "python3 $S/qa.py --completeness 4 --accuracy 3 --consistency 3 --executability 3 --evidence 3 --feasibility 4 --technical 3 --financial 4 --security 3 --compliance 3 --clarity 4 --maintainability 3"
refused "qa gate blocks zero evidence"        "python3 $S/qa.py --completeness 4 --accuracy 4 --consistency 4 --executability 4 --evidence 0 --feasibility 4 --technical 4 --financial 4 --security 4 --compliance 4 --clarity 4 --maintainability 4"
check "atlas search"                          "python3 $S/atlas.py search treasury | grep -q EFA-014"
for p in chatgpt gemini generic; do check "export $p" "python3 $S/export.py --platform $p --out $T/e-$p"; done
check "export claude copies skill"            "python3 $S/export.py --platform claude --out $T/c && [ -f $T/c/.claude/skills/zabataina-3000/SKILL.md ]"

echo; echo "RESULT: $pass passed, $fail failed"
[ "$fail" -eq 0 ]
