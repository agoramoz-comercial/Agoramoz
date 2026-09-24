#!/bin/sh
# A/B intercalado. Blocos curtos e alternados para que a variação de carga da
# máquina caia igualmente nos dois lados: medir A cinco vezes e depois B cinco
# vezes atribui a deriva da máquina ao build, o que já levou a conclusões
# falsas neste projeto.
set -e
ROOT=/home/user/Agoramoz; BASE=/tmp/agoramoz-base
killall_next() {
  for PID in $(ps -eo pid,args | awk '/next-server/ && !/awk/ {print $1}'); do kill "$PID" 2>/dev/null || true; done
  sleep 2
}
serve() {
  killall_next; cd "$1"; (pnpm start -p "$2" > /tmp/ab-$2.log 2>&1 &)
  i=0; while [ $i -lt 40 ]; do curl -sf -o /dev/null "http://127.0.0.1:$2/" && return 0; i=$((i+1)); sleep 1; done
  echo "falhou :$2"; exit 1
}
: > /tmp/ab-antes.txt; : > /tmp/ab-depois.txt
n=1
while [ $n -le 5 ]; do
  serve "$BASE" 3001; cd "$ROOT"; PORT=3001 RUNS=3 RAW=1 node .qa/lcp-probe.mjs >> /tmp/ab-antes.txt
  serve "$ROOT" 3000; cd "$ROOT"; PORT=3000 RUNS=3 RAW=1 node .qa/lcp-probe.mjs >> /tmp/ab-depois.txt
  n=$((n+1))
done
killall_next
node -e '
const fs=require("fs");
const nums=f=>fs.readFileSync(f,"utf8").trim().split(/\s+/).map(Number).filter(Number.isFinite);
const stat=a=>{const s=[...a].sort((x,y)=>x-y);const m=s[Math.floor(s.length/2)];
  const t=s.slice(2,s.length-2);const tm=Math.round(t.reduce((p,c)=>p+c,0)/t.length);
  return {n:s.length,med:m,tmean:tm,min:s[0],max:s[s.length-1]};};
const a=stat(nums("/tmp/ab-antes.txt")), b=stat(nums("/tmp/ab-depois.txt"));
const f=o=>`n=${o.n} mediana=${o.med}ms média-aparada=${o.tmean}ms [${o.min}–${o.max}]`;
console.log("ANTES  (cf686e5):", f(a));
console.log("DEPOIS (novo)   :", f(b));
console.log("delta mediana =", b.med-a.med, "ms | delta média-aparada =", b.tmean-a.tmean, "ms");
'
