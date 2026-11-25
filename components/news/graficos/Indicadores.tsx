import type { Idioma } from '@/content/types';
import { NOME_DA_SECCAO, type SeccaoJornal } from '@/lib/news/artigo';
import { formatarIndicador, formatarVariacao, type IndicadorPais, type PainelIndicadores as Painel } from '@/lib/news/indicadores';
import { NOME_DO_PAIS } from '@/lib/news/paises';
import { COR } from './Graficos';

/** A tendência do indicador (5–10 anos), com o último ponto marcado. */
function Tendencia({ i, idioma }: { i: IndicadorPais; idioma: Idioma }) {
  const w = 160;
  const h = 44;
  const vs = i.serie.map((p) => p.valor);
  const min = Math.min(...vs);
  const max = Math.max(...vs);
  const amp = max - min || 1;
  const x = (k: number) => (i.serie.length === 1 ? w / 2 : 4 + (k * (w - 8)) / (i.serie.length - 1));
  const y = (v: number) => 4 + (h - 8) * (1 - (v - min) / amp);
  const d = i.serie.map((p, k) => `${k ? 'L' : 'M'}${x(k).toFixed(1)},${y(p.valor).toFixed(1)}`).join(' ');
  const ult = i.serie.length - 1;
  const desc = i.serie.map((p) => `${p.ano}: ${formatarIndicador(p.valor, i.def, idioma)}`).join('; ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label={`${idioma === 'en' ? i.def.en : i.def.pt}. ${desc}`} className="h-11 w-full">
      {min < 0 && max > 0 && <line x1="0" x2={w} y1={y(0)} y2={y(0)} stroke={COR.tinta} strokeOpacity="0.25" strokeDasharray="2 3" />}
      <path d={d} fill="none" stroke={COR.tinta} strokeWidth="1.6" />
      <circle cx={x(ult)} cy={y(i.serie[ult]!.valor)} r="3.2" fill={COR.ferrugem} />
    </svg>
  );
}

/**
 * Os indicadores oficiais do país, escolhidos pela secção da notícia: último
 * valor (com o ano), variação face ao ano anterior com dados e a tendência.
 * Só aparece com dados lidos do Banco Mundial.
 */
export function PainelIndicadores({
  painel,
  seccao,
  idioma,
}: {
  painel: Painel;
  seccao: SeccaoJornal;
  idioma: Idioma;
}) {
  const en = idioma === 'en';
  const nome = en ? NOME_DO_PAIS[painel.pais].en : NOME_DO_PAIS[painel.pais].pt;
  const tema = en ? NOME_DA_SECCAO[seccao].en : NOME_DA_SECCAO[seccao].pt;
  return (
    <figure className="border-t-2 border-current pt-3">
      <p className="jornal-serifa text-[1.25rem] leading-tight font-bold">
        {en ? `${nome} in official indicators` : `${nome} em indicadores oficiais`}
      </p>
      <p className="mt-1 font-sans text-[0.8125rem] text-[color:var(--muted)]">
        {en
          ? `The figures that frame this story (${tema}): latest year with data, change on the previous year and trend.`
          : `Os números que enquadram esta notícia (${tema}): último ano com dados, variação face ao ano anterior e tendência.`}
      </p>
      <ul className="mt-4 grid gap-px bg-current/15 sm:grid-cols-2">
        {painel.itens.map((i) => (
          <li key={i.def.codigo} className="bg-[color:var(--surface,#f3efe6)] p-4">
            <p className="font-sans text-[0.75rem] font-semibold tracking-[0.08em] uppercase">{en ? i.def.en : i.def.pt}</p>
            <p className="jornal-serifa mt-1 text-[1.75rem] leading-none font-bold tabular-nums">
              {formatarIndicador(i.ultimo.valor, i.def, idioma)}
              <span className="ms-2 font-sans text-[0.8125rem] font-medium text-[color:var(--muted)]">{i.ultimo.ano}</span>
            </p>
            {i.variacao !== null && (
              <p className="mt-1 font-sans text-[0.8125rem] tabular-nums">
                {formatarVariacao(i.variacao, i.def, idioma)}{' '}
                <span className="text-[color:var(--muted)]">
                  {en ? `vs ${i.serie[i.serie.length - 2]!.ano}` : `face a ${i.serie[i.serie.length - 2]!.ano}`}
                </span>
              </p>
            )}
            <div className="mt-2">
              <Tendencia i={i} idioma={idioma} />
              <p className="font-sans text-[0.6875rem] text-[color:var(--muted)] tabular-nums">
                {i.serie[0]!.ano}–{i.ultimo.ano}
              </p>
            </div>
          </li>
        ))}
      </ul>
      <figcaption className="mt-3 border-t border-current/20 pt-2 font-sans text-[0.75rem] text-[color:var(--muted)]">
        {en ? 'Source' : 'Fonte'}:{' '}
        <a href={painel.itens[0]!.fonteUrl.replace(/\?.*$/, '').replace(/indicator\/.*$/, '')} className="underline underline-offset-2" rel="noopener noreferrer" target="_blank">
          {en ? 'World Bank, World Development Indicators' : 'Banco Mundial, World Development Indicators'}
        </a>{' '}
        (E1).{' '}
        {en ? 'Each figure links to its official series:' : 'Cada número liga à série oficial:'}{' '}
        {painel.itens.map((i, k) => (
          <span key={i.def.codigo}>
            {k > 0 && ' · '}
            <a href={i.fonteUrl} className="underline underline-offset-2" rel="noopener noreferrer" target="_blank">
              {i.def.codigo}
            </a>
          </span>
        ))}
      </figcaption>
    </figure>
  );
}
