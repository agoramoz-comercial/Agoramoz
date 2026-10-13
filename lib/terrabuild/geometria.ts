import type { Retangulo } from '@/content/projetos/tipos';

/** Geometria plana na grelha local (metros). Polígonos convexos apenas. */

export type Ponto = readonly [number, number];
export type Poligono = readonly Ponto[];

/** Os quatro cantos de um retângulo orientado, em sentido anti-horário. */
export function cantos(r: Retangulo): Poligono {
  const a = ((r.rot ?? 0) * Math.PI) / 180;
  const c = Math.cos(a);
  const s = Math.sin(a);
  const hw = r.w / 2;
  const hd = r.d / 2;
  return ([
    [-hw, -hd],
    [hw, -hd],
    [hw, hd],
    [-hw, hd],
  ] as const).map(([x, y]) => [r.cx + x * c - y * s, r.cy + x * s + y * c] as const);
}

/** Um troço de estrada ou de tubagem como retângulo com a largura dada. */
export function segmentoComoRetangulo(a: Ponto, b: Ponto, largura: number): Retangulo {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  return {
    cx: (a[0] + b[0]) / 2,
    cy: (a[1] + b[1]) / 2,
    w: Math.hypot(dx, dy),
    d: largura,
    rot: (Math.atan2(dy, dx) * 180) / Math.PI,
  };
}

function eixos(p: Poligono): Ponto[] {
  return p.map((a, i) => {
    const b = p[(i + 1) % p.length]!;
    return [-(b[1] - a[1]), b[0] - a[0]] as const;
  });
}

function projetar(p: Poligono, eixo: Ponto): [number, number] {
  let min = Infinity;
  let max = -Infinity;
  for (const [x, y] of p) {
    const v = x * eixo[0] + y * eixo[1];
    if (v < min) min = v;
    if (v > max) max = v;
  }
  return [min, max];
}

/**
 * Teorema do eixo separador: dois convexos não se tocam se houver um eixo em
 * que as projeções não se sobrepõem. `folga` (m) conta como sobreposição.
 */
export function intersectam(a: Poligono, b: Poligono, folga = 0): boolean {
  for (const eixo of [...eixos(a), ...eixos(b)]) {
    const len = Math.hypot(eixo[0], eixo[1]) || 1;
    const e: Ponto = [eixo[0] / len, eixo[1] / len];
    const [a0, a1] = projetar(a, e);
    const [b0, b1] = projetar(b, e);
    if (a1 + folga < b0 || b1 + folga < a0) return false;
  }
  return true;
}

export function dentroDe(p: Poligono, largura: number, profundidade: number, margem = 0): boolean {
  return p.every(([x, y]) => x >= margem && y >= margem && x <= largura - margem && y <= profundidade - margem);
}
