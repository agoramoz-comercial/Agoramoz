#!/usr/bin/env bash
# Regenera os activos 3D do TerraBuild a partir dos dados fictícios do site
# (uma só fonte de verdade: content/projetos + lib/terrabuild).
#
# Requisitos, fora do package.json de propósito (só quem gera os activos precisa):
#   Python 3.11 com `pip install bpy==5.0.1` (o Blender como módulo; traz numpy)
#   Node/npx (tsx e @gltf-transform/cli, descarregados à primeira vez)
# Demora cerca de 1 minuto numa máquina de 4 núcleos.
#
# Uso: BLENDER_PY=/caminho/do/venv/bin/python .qa/blender/gerar.sh
set -euo pipefail
cd "$(dirname "$0")/../.."
PY="${BLENDER_PY:-python3}"
OUT=.qa/blender/saida
DEST=public/terrabuild
mkdir -p "$OUT" "$DEST/tex"

npx --yes tsx@4.20.6 .qa/blender/exportar-cena.ts "$OUT/cena.json"
"$PY" .qa/blender/texturas.py "$OUT/tex"
"$PY" .qa/blender/modelos.py "$OUT/cena.json" "$OUT/tex" "$OUT/glb" 2>&1 | grep -v ' INFO: '
.qa/blender/otimizar.sh "$OUT/glb" "$DEST"
# Só as texturas do chão vão à parte; as das construções seguem dentro do GLB.
for t in savana solo solo-normal gravilha; do
  cp "$OUT/tex/$t.webp" "$DEST/tex/"
done
du -ch "$DEST"/*.glb "$DEST"/tex/*.webp | tail -1
