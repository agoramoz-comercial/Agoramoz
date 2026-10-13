/**
 * Terreno FICTÍCIO da demo, gerado por fórmula: um declive suave de noroeste
 * para sudeste, ondulação de ruído com semente e uma linha de drenagem no
 * canto sudeste — que é onde está o risco de cheia. Determinístico: o mesmo
 * terreno no servidor, no browser, no 2D e no 3D, e nos testes.
 *
 * Numa versão real isto vem de um modelo digital de elevação, de um
 * levantamento com drone ou de pontos topográficos — nunca de uma fórmula.
 */

export interface Terreno {
  readonly largura: number;
  readonly profundidade: number;
  readonly semente: number;
}

function hash(ix: number, iy: number, semente: number): number {
  let h = (ix * 374761393 + iy * 668265263 + semente * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

const suave = (t: number) => t * t * (3 - 2 * t);

function ruidoValor(x: number, y: number, semente: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = suave(x - ix);
  const fy = suave(y - iy);
  const a = hash(ix, iy, semente);
  const b = hash(ix + 1, iy, semente);
  const c = hash(ix, iy + 1, semente);
  const d = hash(ix + 1, iy + 1, semente);
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
}

/** A linha de drenagem: do bordo sul (x=320) ao bordo este (y=110). */
const DRENO_A = [320, 0] as const;
const DRENO_B = [400, 110] as const;

export function distanciaAoDreno(x: number, y: number): number {
  const [ax, ay] = DRENO_A;
  const [bx, by] = DRENO_B;
  const dx = bx - ax;
  const dy = by - ay;
  const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(x - (ax + t * dx), y - (ay + t * dy));
}

/** Cota em metros (relativa: o ponto mais baixo anda perto de zero). */
export function altura(t: Terreno, x: number, y: number): number {
  const declive = 4 + 0.025 * y + 0.01 * (t.largura - x);
  let r = 0;
  let amp = 1.2;
  let freq = 1 / 80;
  for (let o = 0; o < 3; o++) {
    r += (ruidoValor(x * freq, y * freq, t.semente + o) - 0.5) * 2 * amp;
    amp /= 2;
    freq *= 2;
  }
  const d = distanciaAoDreno(x, y);
  const vale = 3.5 * Math.exp(-((d / 28) ** 2));
  return Math.max(0, declive + r - vale);
}

/** Abaixo desta cota a demo marca risco de cheia. */
export const COTA_CHEIA = 3.2;

export interface Grelha {
  readonly nx: number;
  readonly ny: number;
  readonly passo: number;
  /** (nx+1) × (ny+1) cotas, linha a linha de sul para norte. */
  readonly alturas: Float32Array;
  readonly min: number;
  readonly max: number;
}

export function grelha(t: Terreno, passo = 10): Grelha {
  const nx = Math.round(t.largura / passo);
  const ny = Math.round(t.profundidade / passo);
  const alturas = new Float32Array((nx + 1) * (ny + 1));
  let min = Infinity;
  let max = -Infinity;
  for (let j = 0; j <= ny; j++)
    for (let i = 0; i <= nx; i++) {
      const h = altura(t, i * passo, j * passo);
      alturas[j * (nx + 1) + i] = h;
      if (h < min) min = h;
      if (h > max) max = h;
    }
  return { nx, ny, passo, alturas, min, max };
}

/** Fração do terreno abaixo da cota de cheia, a partir da grelha. */
export function fracaoCheia(g: Grelha, cota = COTA_CHEIA): number {
  let n = 0;
  for (const h of g.alturas) if (h < cota) n++;
  return n / g.alturas.length;
}

/**
 * Curvas de nível por marching squares: um caminho SVG por cota, em
 * coordenadas da grelha local (y para norte — quem desenha inverte).
 */
export function curvasDeNivel(g: Grelha, intervalo = 1): { cota: number; d: string }[] {
  const out: { cota: number; d: string }[] = [];
  const v = (i: number, j: number) => g.alturas[j * (g.nx + 1) + i]!;
  const r = (n: number) => Math.round(n * 10) / 10;
  for (let cota = Math.ceil(g.min / intervalo) * intervalo; cota <= g.max; cota += intervalo) {
    let d = '';
    for (let j = 0; j < g.ny; j++)
      for (let i = 0; i < g.nx; i++) {
        const c = [v(i, j), v(i + 1, j), v(i + 1, j + 1), v(i, j + 1)] as const;
        const x0 = i * g.passo;
        const y0 = j * g.passo;
        const p = g.passo;
        const lerp = (a: number, b: number) => (cota - a) / (b - a);
        // Pontos de corte em cada aresta (sul, este, norte, oeste).
        const pts: [number, number][] = [];
        if (c[0] < cota !== c[1] < cota) pts.push([x0 + lerp(c[0], c[1]) * p, y0]);
        if (c[1] < cota !== c[2] < cota) pts.push([x0 + p, y0 + lerp(c[1], c[2]) * p]);
        if (c[3] < cota !== c[2] < cota) pts.push([x0 + lerp(c[3], c[2]) * p, y0 + p]);
        if (c[0] < cota !== c[3] < cota) pts.push([x0, y0 + lerp(c[0], c[3]) * p]);
        for (let k = 0; k + 1 < pts.length; k += 2) {
          const [a, b] = [pts[k]!, pts[k + 1]!];
          d += `M${r(a[0])} ${r(a[1])}L${r(b[0])} ${r(b[1])}`;
        }
      }
    if (d) out.push({ cota, d });
  }
  return out;
}
