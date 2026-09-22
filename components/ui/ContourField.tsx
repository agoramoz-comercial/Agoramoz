import { cn } from '@/lib/utils/cn';

/**
 * Malha de contorno topográfica — a textura de fundo das duas referências.
 *
 * Três decisões que a tornam gratuita em desempenho:
 *
 * 1. É gerada no servidor, por uma função DETERMINÍSTICA. Nada de
 *    `Math.random`: uma malha diferente no servidor e no cliente partiria a
 *    hidratação, e o React re-renderizaria a árvore inteira para a corrigir.
 * 2. É marcação, não imagem — zero pedidos de rede. Com os valores por
 *    omissão fica em ~6 KB antes da compressão.
 * 3. Move-se por uma única animação de `transform` num `<div>` de HTML —
 *    NUNCA num `<g>` de SVG. Medido: o Chrome não promove a camada de um `<g>`
 *    transformado, pelo que a malha era rasterizada de novo a cada frame; isso
 *    dava doze tarefas longas por scroll na home. Num elemento de HTML a
 *    transformação é composta e a thread principal nunca toca nela.
 *
 * `preserveAspectRatio="none"` estica a malha ao tamanho da secção: são
 * curvas de nível, não um logótipo — a distorção é o efeito pretendido.
 */

const W = 1200;
const H = 700;

/** Onda determinística: soma de senos com fases fixas por linha. */
function contourPath(row: number, rows: number, points: number): string {
  const baseY = (H / (rows - 1)) * row;
  /** Amplitude máxima ao centro vertical, mínima nas bordas. */
  const swell = Math.sin((row / (rows - 1)) * Math.PI);
  const amp = 26 + 92 * swell;

  const coords: string[] = [];
  for (let i = 0; i < points; i += 1) {
    const t = i / (points - 1);
    const x = t * W;
    const y =
      baseY +
      amp * 0.62 * Math.sin(t * 5.1 + row * 0.55) +
      amp * 0.26 * Math.sin(t * 11.3 - row * 0.9) +
      amp * 0.12 * Math.sin(t * 19.7 + row * 1.7);
    coords.push(`${x.toFixed(1)} ${y.toFixed(1)}`);
  }

  // "M p0 Q p1 p2 Q p3 p4 …": cada quadrática gasta um ponto de controlo e um
  // de chegada, pelo que a cauda tem de ter comprimento par — garantido por
  // `points` ser normalizado para ímpar em ContourField.
  return `M${coords[0]} ${coords
    .slice(1)
    .map((c, i) => (i % 2 === 0 ? `Q${c}` : c))
    .join(' ')}`;
}

export function ContourField({
  rows = 9,
  points = 25,
  className,
  /** Desliga a deriva onde a secção já tem movimento próprio. */
  drift = true,
}: {
  rows?: number;
  points?: number;
  className?: string;
  drift?: boolean;
}) {
  /** Ímpar por construção: ver a nota sobre a cauda par em `contourPath`. */
  const n = points % 2 === 0 ? points + 1 : points;

  const paths: string[] = [];
  for (let r = 0; r < rows; r += 1) paths.push(contourPath(r, rows, n));

  return (
    <div
      aria-hidden
      className={cn('pointer-events-none absolute inset-0 z-0 overflow-hidden', className)}
      style={{
        maskImage: 'linear-gradient(to bottom, transparent, #000 18%, #000 78%, transparent)',
        /**
         * Medido: seis malhas na home somavam ~44 KB de HTML e ~55 caminhos
         * extra, e com a CPU a 4x isso custava centenas de milissegundos. Com
         * `content-visibility: auto` só a malha que está no ecrã é
         * renderizada. É seguro aqui porque a caixa vem de `inset: 0` e não do
         * conteúdo — não há salto de layout a temer.
         */
        contentVisibility: 'auto',
      }}
    >
      {/*
        A deriva TEM de viver num elemento interior. Quando estava na mesma
        caixa que o `overflow-hidden`, o `scale(1.1)` ampliava a própria caixa
        de recorte: o documento passava a ter 1543 px de largura num ecrã de
        1440, escondido só pelo `overflow-x` do body.
      */}
      <div data-contour-drift={drift ? '' : undefined} className="h-full w-full">
        <svg
          focusable="false"
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          className="h-full w-full select-none"
        >
          <g fill="none" stroke="var(--motif)" strokeWidth="1" vectorEffect="non-scaling-stroke">
            {paths.map((d, i) => (
              <path key={i} d={d} />
            ))}
          </g>
        </svg>
      </div>
    </div>
  );
}
