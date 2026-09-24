#!/bin/sh
# Reinicia o servidor de produção de UMA porta, em condições limpas.
#
# Duas armadilhas já vividas neste projeto:
#   1. Um servidor antigo a servir um .next reconstruído por baixo dele devolve
#      500 em todos os chunks. Mata-se SEMPRE antes de arrancar.
#   2. Matar por "next-server" apanha TODOS os servidores, incluindo o baseline
#      noutra porta — e a prova de copy passa a comparar contra nada. Aqui
#      identifica-se o processo pela porta em argv e matam-se só os seus filhos.
set -e
PORT="${1:-3000}"
LOG="${2:-/tmp/agoramoz-server-$PORT.log}"

for PID in $(ps -eo pid,args | awk -v p="next start -p $PORT" 'index($0, p) && !/awk/ {print $1}'); do
  for KID in $(pgrep -P "$PID" 2>/dev/null); do kill "$KID" 2>/dev/null || true; done
  kill "$PID" 2>/dev/null || true
done
sleep 1

cd "$(dirname "$0")/.."
(pnpm start -p "$PORT" > "$LOG" 2>&1 &)
i=0
while [ $i -lt 40 ]; do
  if curl -sf -o /dev/null "http://127.0.0.1:$PORT/"; then echo "UP :$PORT"; exit 0; fi
  i=$((i+1)); sleep 1
done
echo "FALHOU a arrancar :$PORT"; tail -20 "$LOG"; exit 1
