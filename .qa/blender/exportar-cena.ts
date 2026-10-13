/**
 * Exporta para JSON a fazenda que o site calcula, para o Blender construir a
 * MESMA cena (modelos com as medidas da planta, terreno com as mesmas cotas).
 * Uma só fonte de verdade: os dados vivem em `content/projetos`, as fórmulas
 * em `lib/terrabuild`; o Blender só lê.
 *
 *   npx tsx .qa/blender/exportar-cena.ts <saida/cena.json>
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { CASA_REFERENCIA, FAZENDA_001 as P } from '@/content/projetos/fazenda-inteligente-001';
import { grelha } from '@/lib/terrabuild/terreno';

const saida = process.argv[2] ?? '.qa/blender/saida/cena.json';
const g = grelha(P.terreno, 5);

const cena = {
  versao: 1,
  /** Exagero vertical da vista 3D do site (Cena3D.tsx); o render usa o mesmo. */
  exagero: 2,
  terreno: { largura: P.terreno.largura, profundidade: P.terreno.profundidade, passo: g.passo, nx: g.nx, ny: g.ny, alturas: Array.from(g.alturas) },
  elementos: P.elementos.map((e) => ({ id: e.id, nome: e.nome, camada: e.camada, forma: e.forma, fases: e.fases, futuro: Boolean(e.futuro) })),
  culturas: P.culturas.map((c) => ({ id: c.id, nome: c.nome, talhoes: c.talhoes })),
  casa: CASA_REFERENCIA,
};

mkdirSync(dirname(saida), { recursive: true });
writeFileSync(saida, JSON.stringify(cena));
console.log(`cena: ${cena.elementos.length} elementos, grelha ${g.nx}×${g.ny} → ${saida}`);
