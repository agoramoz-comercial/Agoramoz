#!/usr/bin/env bash
# Optimiza os GLB do Blender para o browser, SEM descodificadores: a CSP do site
# não permite WebAssembly, por isso nada de Draco, meshopt nem KTX2.
#   dedup    → malhas, materiais e texturas iguais passam a ser um só
#   prune    → retira o que ficou órfão (atributos UV sem textura, etc.)
#   quantize → KHR_mesh_quantization (inteiros em vez de float32), que o
#              GLTFLoader do three lê nativamente.
# Nota: o quantize põe escala/translação no nó; no site, cada clone vai dentro
# de um <group> posicionado, para não pisar essa transformação.
#
# Uso: .qa/blender/otimizar.sh <pasta-entrada> <pasta-saida>
set -euo pipefail
ENT="$1"
SAI="$2"
mkdir -p "$SAI"
GT=(npx --yes @gltf-transform/cli@4.5.1)
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

for nome in fazenda-001 instancias; do
  "${GT[@]}" dedup "$ENT/$nome.glb" "$TMP/$nome.1.glb" >/dev/null
  "${GT[@]}" prune "$TMP/$nome.1.glb" "$TMP/$nome.2.glb" >/dev/null
  "${GT[@]}" quantize "$TMP/$nome.2.glb" "$SAI/$nome.glb" >/dev/null
  printf '%-16s %6s KB -> %6s KB\n' "$nome" "$(($(stat -c%s "$ENT/$nome.glb") / 1024))" "$(($(stat -c%s "$SAI/$nome.glb") / 1024))"
done
