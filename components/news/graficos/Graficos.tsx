import type { ReactNode } from 'react';
import type { Idioma } from '@/content/types';
import type { Serie } from '@/lib/news/profunda';

/**
 * Gráficos do jornal, em papel: tinta preta, ferrugem para o destaque,
 * serifa nos títulos, filetes. Barras e colunas são HTML (o texto fica
 * nítido e legível no telemóvel); linha e anel são SVG. Cada gráfico tem a
 * fonte por baixo e a tabela com os mesmos números («Ver os dados»).
 *
 * Contraste no papel #f3efe6 (WCAG 1.4.11 pede 3:1 para gráficos):
 * tinta #121110 16,4:1 · ferrugem #a8521a 4,7:1 · azul #2f5d73 6,2:1 ·
 * oliva #5b6b3a 5,1:1 · cinza #7a6f5f 4,3:1.
 */

export const COR = {
  tinta: '#121110',
  ferrugem: '#a8521a',
  azul: '#2f5d73',
  oliva: '#5b6b3a',
  cinza: '#7a6f5f',
  papel: '#f3efe6',
  linha: 'rgb(18 17 16 / 0.18)',
} as const;
export const CATEGORICAS = [COR.tinta, COR.ferrugem, COR.azul, COR.oliva, COR.cinza] as const;

const T = {
  dados: { pt: 'Ver os dados', en: 'See the data' },
  fonte: { pt: 'Fonte', en: 'Source' },
  rotulo: { pt: 'Rótulo', en: 'Label' },
  valor: { pt: 'Valor', en: 'Value' },
};
const l = (x: { pt: string; en: string }, i: Idioma) => (i === 'en' ? x.en : x.pt);

export function numero(v: number, idioma: Idioma): string {
  return new Intl.NumberFormat(idioma === 'en' ? 'en-GB' : 'pt-PT', { maximumFractionDigits: 2 }).format(v);
}

export interface Ponto {
  readonly rotulo: string;
  readonly valor: number;
}

function comUnidade(v: number, unidade: string, idioma: Idioma) {
  const n = numero(v, idioma);
  if (!unidade) return n;
  return unidade === '%' ? `${n}%` : `${n} ${unidade}`;
}

function Tabela({ pontos, unidade, idioma }: { pontos: readonly Ponto[]; unidade: string; idioma: Idioma }) {
  return (
    <details className="jornal-nao-imprimir mt-3 font-sans text-[0.8125rem]">
      <summary className="inline-flex min-h-11 cursor-pointer items-center underline underline-offset-4">
        {l(T.dados, idioma)}
      </summary>
      <table className="mt-2 w-full border-collapse text-left">
        <thead>
          <tr className="border-b border-current">
            <th scope="col" className="py-1 pr-3 font-semibold">
              {l(T.rotulo, idioma)}
            </th>
            <th scope="col" className="py-1 text-right font-semibold">
              {l(T.valor, idioma)}
              {unidade ? ` (${unidade})` : ''}
            </th>
          </tr>
        </thead>
        <tbody>
          {pontos.map((p) => (
            <tr key={p.rotulo} className="border-b border-current/15">
              <th scope="row" className="py-1 pr-3 font-normal">
                {p.rotulo}
              </th>
              <td className="py-1 text-right tabular-nums">{numero(p.valor, idioma)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}

/** O quadro comum: título com filete, o gráfico, a fonte e a tabela. */
export function Figura({
  titulo,
  subtitulo,
  fonte,
  idioma,
  pontos,
  unidade = '',
  children,
  className = '',
}: {
  titulo: string;
  subtitulo?: string;
  fonte: string;
  idioma: Idioma;
  pontos?: readonly Ponto[];
  unidade?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <figure className={`border-t-2 border-current pt-3 ${className}`}>
      <p className="jornal-serifa text-[1.25rem] leading-tight font-bold">{titulo}</p>
      {subtitulo && <p className="mt-1 font-sans text-[0.8125rem] text-[color:var(--muted)]">{subtitulo}</p>}
      <div className="mt-4">{children}</div>
      <figcaption className="mt-3 border-t border-current/20 pt-2 font-sans text-[0.75rem] text-[color:var(--muted)]">
        {l(T.fonte, idioma)}: {fonte}
      </figcaption>
      {pontos && pontos.length > 0 && <Tabela pontos={pontos} unidade={unidade} idioma={idioma} />}
    </figure>
  );
}

const resumo = (pontos: readonly Ponto[], unidade: string, idioma: Idioma) =>
  pontos.map((p) => `${p.rotulo}: ${comUnidade(p.valor, unidade, idioma)}`).join('; ');

/** Barras horizontais (aceitam negativos: a barra cresce a partir do zero). */
export function Barras({
  pontos,
  unidade = '',
  idioma,
  destaque,
}: {
  pontos: readonly Ponto[];
  unidade?: string;
  idioma: Idioma;
  /** Índice da barra a ferrugem (por omissão, a maior). */
  destaque?: number;
}) {
  const min = Math.min(0, ...pontos.map((p) => p.valor));
  const max = Math.max(0, ...pontos.map((p) => p.valor));
  const amp = max - min || 1;
  const maior = destaque ?? pontos.reduce((m, p, i) => (p.valor > pontos[m]!.valor ? i : m), 0);
  return (
    <div role="img" aria-label={resumo(pontos, unidade, idioma)} className="grid gap-2.5">
      {pontos.map((p, i) => (
        <div key={p.rotulo} className="grid grid-cols-[minmax(0,7.5rem)_1fr] items-center gap-3 sm:grid-cols-[minmax(0,10rem)_1fr]">
          <span className="truncate font-sans text-[0.8125rem]" title={p.rotulo}>
            {p.rotulo}
          </span>
          <span className="relative flex h-6 items-center">
            <span
              className="absolute inset-y-0 border-l border-current/40"
              style={{ left: `${((0 - min) / amp) * 78}%` }}
            />
            <span
              className="absolute inset-y-0.5"
              style={{
                left: `${((Math.min(p.valor, 0) - min) / amp) * 78}%`,
                width: `max(2px, ${(Math.abs(p.valor) / amp) * 78}%)`,
                background: i === maior ? COR.ferrugem : COR.tinta,
              }}
            />
            <span
              className="absolute font-sans text-[0.8125rem] font-semibold tabular-nums"
              style={{ left: `calc(${((Math.max(p.valor, 0) - min) / amp) * 78}% + 0.4rem)` }}
            >
              {comUnidade(p.valor, unidade, idioma)}
            </span>
          </span>
        </div>
      ))}
    </div>
  );
}

/** Colunas verticais: antes/depois, meses, A contra B. */
export function Colunas({ pontos, unidade = '', idioma }: { pontos: readonly Ponto[]; unidade?: string; idioma: Idioma }) {
  const max = Math.max(...pontos.map((p) => Math.abs(p.valor)), 1);
  return (
    <div role="img" aria-label={resumo(pontos, unidade, idioma)} className="flex h-56 items-end gap-2 border-b border-current sm:gap-4">
      {pontos.map((p, i) => (
        <div key={p.rotulo} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1.5">
          <span className="font-sans text-[0.8125rem] font-semibold tabular-nums">{comUnidade(p.valor, unidade, idioma)}</span>
          <span
            className="w-full max-w-20"
            style={{
              height: `${Math.max(2, (Math.abs(p.valor) / max) * 78)}%`,
              background: i === pontos.length - 1 ? COR.ferrugem : COR.tinta,
            }}
          />
        </div>
      ))}
    </div>
  );
}

function RotulosColunas({ pontos }: { pontos: readonly Ponto[] }) {
  return (
    <div aria-hidden="true" className="mt-1.5 flex gap-2 sm:gap-4">
      {pontos.map((p) => (
        <span key={p.rotulo} className="min-w-0 flex-1 truncate text-center font-sans text-[0.75rem]" title={p.rotulo}>
          {p.rotulo}
        </span>
      ))}
    </div>
  );
}

/** Uma escala «redonda» para o eixo (1, 2, 2,5 ou 5 × 10ⁿ). */
function marcas(min: number, max: number, n = 4): number[] {
  const amp = max - min || Math.abs(max) || 1;
  const bruto = amp / n;
  const p = 10 ** Math.floor(Math.log10(bruto));
  const passo = [1, 2, 2.5, 5, 10].map((m) => m * p).find((s) => s >= bruto) ?? bruto;
  const ini = Math.floor(min / passo) * passo;
  const out: number[] = [];
  for (let v = ini; v <= max + passo * 0.5 && out.length < 8; v += passo) out.push(Math.round(v * 1e6) / 1e6);
  return out;
}

/** Linha (valores ao longo do tempo, pela ordem do documento). */
export function Linha({ pontos, unidade = '', idioma }: { pontos: readonly Ponto[]; unidade?: string; idioma: Idioma }) {
  const W = 420;
  const H = 230;
  const m = { t: 34, r: 22, b: 34, l: 46 };
  const vs = pontos.map((p) => p.valor);
  const ticks = marcas(Math.min(0, ...vs), Math.max(...vs));
  const y0 = ticks[0]!;
  const y1 = ticks[ticks.length - 1]!;
  const x = (i: number) => m.l + (i * (W - m.l - m.r)) / Math.max(1, pontos.length - 1);
  const y = (v: number) => H - m.b - ((v - y0) / (y1 - y0 || 1)) * (H - m.t - m.b);
  const d = pontos.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.valor).toFixed(1)}`).join('');
  const area = `${d}L${x(pontos.length - 1).toFixed(1)},${y(y0).toFixed(1)}L${x(0).toFixed(1)},${y(y0).toFixed(1)}Z`;
  const passoRot = Math.ceil(pontos.length / 6);
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={resumo(pontos, unidade, idioma)}
      className="h-auto w-full font-sans"
    >
      {ticks.map((t) => (
        <g key={t}>
          <line x1={m.l} x2={W - m.r} y1={y(t)} y2={y(t)} stroke={COR.linha} />
          <text x={m.l - 6} y={y(t) + 4} textAnchor="end" fontSize="13" fill={COR.tinta}>
            {numero(t, idioma)}
          </text>
        </g>
      ))}
      <path d={area} fill={COR.ferrugem} opacity="0.12" />
      <path d={d} fill="none" stroke={COR.tinta} strokeWidth="2.25" strokeLinejoin="round" />
      {pontos.map((p, i) => (
        <g key={p.rotulo}>
          <circle cx={x(i)} cy={y(p.valor)} r={i === pontos.length - 1 ? 5 : 3.5} fill={i === pontos.length - 1 ? COR.ferrugem : COR.tinta} stroke={COR.papel} strokeWidth="1.5" />
          {(i === pontos.length - 1 || i === 0) && (
            <text x={x(i)} y={y(p.valor) - 10} textAnchor={i === 0 ? 'start' : 'end'} fontSize="13" fontWeight="700" fill={COR.tinta}>
              {comUnidade(p.valor, unidade, idioma)}
            </text>
          )}
          {i % passoRot === 0 && (
            <text x={x(i)} y={H - m.b + 18} textAnchor="middle" fontSize="12" fill={COR.tinta}>
              {p.rotulo.length > 12 ? `${p.rotulo.slice(0, 11)}…` : p.rotulo}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}

/** Anel de partes de um todo (percentagens que somam até 100). */
export function Anel({ pontos, idioma }: { pontos: readonly Ponto[]; idioma: Idioma }) {
  const soma = pontos.reduce((s, p) => s + p.valor, 0);
  const R = 80;
  const r = 50;
  let ang = -Math.PI / 2;
  const arco = (v: number) => {
    const a0 = ang;
    const a1 = ang + (v / 100) * Math.PI * 2;
    ang = a1;
    const g = a1 - a0 > Math.PI ? 1 : 0;
    const p = (rad: number, a: number) => `${(100 + rad * Math.cos(a)).toFixed(2)},${(100 + rad * Math.sin(a)).toFixed(2)}`;
    return `M${p(R, a0)}A${R},${R} 0 ${g} 1 ${p(R, a1)}L${p(r, a1)}A${r},${r} 0 ${g} 0 ${p(r, a0)}Z`;
  };
  const resto = Math.max(0, 100 - soma);
  return (
    <div className="flex flex-wrap items-center justify-center gap-5 [hyphens:none]">
      <svg viewBox="0 0 200 200" role="img" aria-label={resumo(pontos, '%', idioma)} className="h-44 w-44 shrink-0">
        <circle cx="100" cy="100" r={(R + r) / 2} fill="none" stroke={COR.linha} strokeWidth={R - r} />
        {pontos.map((p, i) => (
          <path key={p.rotulo} d={arco(p.valor)} fill={CATEGORICAS[i % CATEGORICAS.length]} stroke={COR.papel} strokeWidth="2" />
        ))}
        <text x="100" y="106" textAnchor="middle" fontSize="20" fontWeight="700" fill={COR.tinta} className="font-sans">
          {numero(pontos[0]!.valor, idioma)}%
        </text>
      </svg>
      <ul aria-hidden="true" className="grid min-w-[12rem] flex-1 gap-2 font-sans text-[0.875rem]">
        {pontos.map((p, i) => (
          <li key={p.rotulo} className="flex items-center gap-2.5">
            <span className="size-3.5 shrink-0" style={{ background: CATEGORICAS[i % CATEGORICAS.length] }} />
            <span className="min-w-0 flex-1">{p.rotulo}</span>
            <span className="font-semibold tabular-nums">{numero(p.valor, idioma)}%</span>
          </li>
        ))}
        {resto > 0.5 && (
          <li className="flex items-center gap-2.5 text-[color:var(--muted)]">
            <span className="size-3.5 shrink-0 border border-current/40" />
            <span className="min-w-0 flex-1">{idioma === 'en' ? 'Not broken down in the source' : 'Sem detalhe na fonte'}</span>
          </li>
        )}
      </ul>
    </div>
  );
}

/** Uma série da análise profunda no gráfico que lhe convém. */
export function GraficoSerie({ serie: s, idioma }: { serie: Serie; idioma: Idioma }) {
  const soma = s.pontos.reduce((t, p) => t + p.valor, 0);
  const corpo =
    s.tipo === 'linha' ? (
      <Linha pontos={s.pontos} unidade={s.unidade} idioma={idioma} />
    ) : s.tipo === 'percentagem' && soma <= 100.5 && s.pontos.length <= 6 ? (
      <Anel pontos={s.pontos} idioma={idioma} />
    ) : s.tipo === 'comparacao' && s.pontos.length <= 6 ? (
      <>
        <Colunas pontos={s.pontos} unidade={s.unidade} idioma={idioma} />
        <RotulosColunas pontos={s.pontos} />
      </>
    ) : (
      <Barras pontos={s.pontos} unidade={s.tipo === 'percentagem' ? '%' : s.unidade} idioma={idioma} />
    );
  return (
    <Figura titulo={s.titulo} fonte={s.fonte} idioma={idioma} pontos={s.pontos} unidade={s.unidade}>
      {corpo}
    </Figura>
  );
}

export { RotulosColunas };
