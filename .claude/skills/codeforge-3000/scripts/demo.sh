#!/usr/bin/env bash
# Build a demonstration project (fixture app with planted defects) and open the live dashboard.
#   bash scripts/demo.sh [target-dir] [port]
set -e
HERE="$(cd "$(dirname "$0")/.." && pwd)"; S="$HERE/scripts"
APP="${1:-$(mktemp -d)/codeforge-demo}"; PORT="${2:-8765}"
python3 "$HERE/tests/make_fixture.py" "$APP" >/dev/null
cd "$APP" && git init -q && git add -A && git -c user.email=demo@local -c user.name=demo commit -qm "fixture" && cd - >/dev/null
CF="python3 $S/cf.py --dir $APP"
$CF init --name "Demo Shop" --objective "Visitors register, log in and pay" --preview http://127.0.0.1:3000 >/dev/null
$CF req add "A visitor can save a user" --area USER --critical --acceptance "POST /api/users returns 200;record persisted" >/dev/null
$CF req add "A user can log in" --area AUTH --critical --acceptance "valid credentials create a session" >/dev/null
$CF req add "A user can pay by card" --area PAY --acceptance "payment confirmed by webhook" >/dev/null
$CF comp add "Save user button" --kind button --req REQ-USER-001 --files app/page.tsx --id CMP-SAVE >/dev/null
$CF comp contract CMP-SAVE --role visitor --trigger click --input "form" --validation "email" --permission public --business-rule "unique email" --service UserService.create --api "POST /api/users" --data-op "INSERT users" --persistence users --response "200" --ui-change "confirmation" --error-handling "toast" >/dev/null
$CF comp add "Login page" --kind page --req REQ-AUTH-001 --files app/login/page.tsx --id CMP-LOGIN >/dev/null
$CF node API-USERS --type api --name "POST /api/users" >/dev/null; $CF node API-SESSION --type api --name "GET /api/session" >/dev/null
$CF node DB-USERS --type db --name users >/dev/null
$CF link CMP-SAVE calls API-USERS >/dev/null; $CF link API-USERS persists DB-USERS >/dev/null; $CF link CMP-LOGIN calls API-SESSION >/dev/null
$CF test add "save user e2e" --targets CMP-SAVE --layer e2e --id TST-001 --command "exit 0" >/dev/null; $CF test run TST-001 >/dev/null
$CF test add "login e2e" --targets CMP-LOGIN --layer e2e --id TST-002 --command "echo 'session cookie missing' >&2; exit 1" >/dev/null; $CF test run TST-002 >/dev/null || true
$CF test add "payment webhook contract" --targets REQ-PAY-001 --layer integration --id TST-003 >/dev/null
$CF comp status CMP-SAVE IMPLEMENTED >/dev/null; $CF comp status CMP-SAVE TESTED >/dev/null; $CF comp status CMP-SAVE VERIFIED >/dev/null
$CF task add "Implement login session" --objective "login creates a session" --acceptance "valid credentials create a session" --req REQ-AUTH-001 --comp CMP-LOGIN --model claude-sonnet-5-5 --agent "Backend Engineer" --expected "session cookie set on POST /login" --risk HIGH >/dev/null
$CF task validate T-001 >/dev/null; $CF task ready T-001 >/dev/null
$CF task advance T-001 >/dev/null; $CF task advance T-001 >/dev/null; $CF task advance T-001 >/dev/null
$CF task fail T-001 --cause code --strategy "set cookie in route" --detail "expected session cookie; actual: none (TST-002 log)" >/dev/null
$CF task add "Payment webhook" --objective "confirm card payments" --acceptance "payment confirmed by webhook" --req REQ-PAY-001 --agent "Payments Engineer" --expected "order marked paid" --deps T-001 --approval-required >/dev/null
$CF task validate T-002 >/dev/null
$CF adopt seed >/dev/null
$CF redteam add --area "Weak authentication" --severity HIGH --component CMP-LOGIN --repro "GET /api/session without cookie" --evidence "flow_audit MISSING_API" --impact "login unusable" --remediation "implement /api/session" >/dev/null
$CF decision "Session storage: httpOnly cookie" --rationale "simplest secure default for the app router" --alternatives "JWT in localStorage (XSS exposure)" --task T-001 >/dev/null
$CF event tool "Edited app/login/page.tsx" --agent "Backend Engineer" --task T-001 --tool Edit --status OPEN >/dev/null
$CF event usage --data '{"provider":"Anthropic","model":"claude-sonnet-5-5","input_tokens":18400,"output_tokens":2100,"cached_tokens":12000}' >/dev/null
echo "// fix in progress" >> "$APP/app/login/page.tsx"
$CF run --reason "list app" -- ls app >/dev/null
$CF run -- git push --force >/dev/null 2>&1 || true
python3 "$S/flow_audit.py" "$APP" --emit >/dev/null || true
python3 "$S/secret_scan.py" "$APP" --emit >/dev/null || true
$CF security add "API key committed in .env" --severity HIGH --location .env >/dev/null
$CF checkpoint --note "demo state" --next "repair login session" >/dev/null
echo "Demo project: $APP"
echo "Dashboard:    python3 $HERE/dashboard/server.py --dir $APP --port $PORT"
