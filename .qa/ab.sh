#!/bin/sh
# Comparação A/B controlada: NUNCA os dois servidores ligados ao mesmo tempo.
# Com a CPU a 4x, um segundo servidor a competir desloca o LCP em centenas de
# milissegundos e torna a comparação inútil.
set -e
ROOT=/home/user/Agoramoz
BASE=/tmp/agoramoz-base
killall_next() {
  for PID in $(ps -eo pid,args | awk '/next-server/ && !/awk/ {print $1}'); do kill "$PID" 2>/dev/null || true; done
  sleep 2
}
run() { # $1=dir $2=port $3=rótulo
  killall_next
  cd "$1"; (pnpm start -p "$2" > /tmp/ab-$2.log 2>&1 &)
  i=0; while [ $i -lt 40 ]; do curl -sf -o /dev/null "http://127.0.0.1:$2/" && break; i=$((i+1)); sleep 1; done
  echo "--- $3 ---"
  cd "$ROOT"; PORT="$2" RUNS=5 node .qa/lcp-probe.mjs
}
for _ in 1; do
  run "$BASE" 3001 "ANTES (cf686e5)"
  run "$ROOT" 3000 "DEPOIS (novo)"
done
killall_next
