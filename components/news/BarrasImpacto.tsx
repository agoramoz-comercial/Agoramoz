import type { Idioma } from '@/content/types';
import { RELATORIO } from '@/content/i18n/news';
import type { Pontuacao } from '@/lib/news/esquema';
import { t } from '@/lib/i18n/texto';
import { assinado } from './formato';

/**
 * Barras divergentes de −100 a +100, a partir do zero ao centro.
 *
 * Substitui o radar e a tarta do Lovable. Um radar liga dimensões que não têm
 * ordem entre si e deforma a área; uma tarta de três fatias diz pior o que uma
 * contagem diz melhor. Aqui cada dimensão é uma linha, o comprimento é o
 * número, e o número está escrito — a cor (vermelho para negativo) nunca é o
 * único código.
 *
 * HTML e CSS, não SVG: a largura acompanha o contentor sem viewBox, e o texto
 * é texto seleccionável e legível por leitor de ecrã.
 */
export function BarrasImpacto({
  pontuacoes,
  idioma,
  lang,
}: {
  pontuacoes: readonly Pontuacao[];
  idioma: Idioma;
  /** O idioma do texto do motor (os nomes das dimensões vêm dele). */
  lang?: string;
}) {
  if (pontuacoes.length === 0) return null;

  return (
    <figure className="m-0">
      <figcaption className="rule-label text-[color:var(--muted)]">{t(RELATORIO.graficoTitulo, idioma)}</figcaption>
      <ul className="mt-6 grid gap-3" role="list">
        {pontuacoes.map((p, i) => {
          const metade = `${Math.abs(p.score) / 2}%`;
          const negativo = p.score < 0;
          return (
            <li
              // Índice: o motor pode repetir o nome de uma dimensão.
              key={i}
              className="grid grid-cols-[minmax(0,7rem)_1fr_3.25rem] items-center gap-3 sm:grid-cols-[minmax(0,10rem)_1fr_3.5rem]"
            >
              <span className="truncate text-sm" title={p.dimensao} lang={lang}>
                {p.dimensao}
              </span>
              <span className="relative h-3 bg-[color:var(--surface-raised)]" aria-hidden>
                <span className="absolute inset-y-[-3px] left-1/2 w-px bg-[color:var(--hairline)]" />
                <span
                  className={
                    negativo
                      ? 'absolute inset-y-0 right-1/2 bg-[color:var(--signal)]'
                      : 'absolute inset-y-0 left-1/2 bg-[color:var(--on-surface)]'
                  }
                  style={{ width: metade }}
                />
              </span>
              <span className="text-right font-[family-name:var(--font-techno)] text-sm tabular-nums">
                {assinado(p.score)}
              </span>
            </li>
          );
        })}
      </ul>
      <div
        className="mt-2 grid grid-cols-[minmax(0,7rem)_1fr_3.25rem] gap-3 sm:grid-cols-[minmax(0,10rem)_1fr_3.5rem]"
        aria-hidden
      >
        <span />
        <span className="flex justify-between text-[length:var(--text-micro)] tabular-nums text-[color:var(--muted)]">
          <span>−100</span>
          <span>0</span>
          <span>+100</span>
        </span>
        <span />
      </div>
      <p className="mt-3 text-[length:var(--text-micro)] text-[color:var(--muted)]">{t(RELATORIO.graficoFonte, idioma)}</p>
    </figure>
  );
}
