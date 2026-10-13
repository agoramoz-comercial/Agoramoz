import type { CasaConfig, Parede } from './quantidades';

/**
 * A planta esquemática da casa, em metros, numa só fonte para o desenho do
 * construtor (SVG) e para o DXF que abre no AutoCAD. Origem no canto sudoeste,
 * x para este, y para norte. É um esquema de demonstração: mostra a
 * disposição das divisões e das aberturas, não é projeto de arquitectura.
 */

export interface Abertura {
  readonly x: number;
  readonly y: number;
  /** Numa parede (ou divisória) paralela ao eixo x. */
  readonly horizontal: boolean;
  readonly largura: number;
}

export interface Planta {
  readonly comprimento: number;
  readonly largura: number;
  /** Espessura da parede exterior, pelo tipo de parede escolhido. */
  readonly espessura: number;
  /** Divisórias interiores: [x1, y1, x2, y2]. */
  readonly divisorias: readonly (readonly [number, number, number, number])[];
  readonly janelas: readonly Abertura[];
  readonly portas: readonly Abertura[];
}

export const LARGURA_JANELA = 1.1;
export const LARGURA_PORTA = 0.9;

const ESPESSURA: Readonly<Record<Parede, number>> = {
  'bloco-15': 0.15,
  'tijolo-macico': 0.22,
  'bloco-solo-cimento': 0.15,
};

export function plantaCasa(c: CasaConfig): Planta {
  const L = c.comprimento;
  const A = c.largura;
  const colunas = Math.ceil(c.divisoes / 2);
  const linhas = c.divisoes > 1 ? 2 : 1;

  const divisorias: [number, number, number, number][] = [];
  for (let i = 1; i < colunas; i++) divisorias.push([(i * L) / colunas, 0, (i * L) / colunas, A]);
  if (linhas === 2) divisorias.push([0, A / 2, L, A / 2]);

  // Janelas repartidas pelo perímetro: norte (de oeste para este), este (de
  // norte para sul), sul (de este para oeste) e oeste (de sul para norte).
  const perimetro = 2 * (L + A);
  const noPerimetro = (t: number): Abertura => {
    let d = t * perimetro;
    if (d < L) return { x: d, y: A, horizontal: true, largura: LARGURA_JANELA };
    d -= L;
    if (d < A) return { x: L, y: A - d, horizontal: false, largura: LARGURA_JANELA };
    d -= A;
    if (d < L) return { x: L - d, y: 0, horizontal: true, largura: LARGURA_JANELA };
    d -= L;
    return { x: 0, y: d, horizontal: false, largura: LARGURA_JANELA };
  };
  const janelas = Array.from({ length: c.janelas }, (_, i) => noPerimetro((i + 0.5) / c.janelas));

  // Uma porta por divisão, até ao número pedido: na divisória central, ou na
  // parede sul quando só há uma fila de divisões.
  const portas = Array.from({ length: Math.min(c.portas, colunas * linhas) }, (_, i) => ({
    x: (((i % colunas) + 0.5) * L) / colunas,
    y: linhas === 2 ? A / 2 : 0,
    horizontal: true,
    largura: LARGURA_PORTA,
  }));

  return { comprimento: L, largura: A, espessura: ESPESSURA[c.parede] ?? 0.15, divisorias, janelas, portas };
}
