import Link from 'next/link';
import { Reveal } from '@/components/motion/Reveal';
import { SoPortugues } from '@/components/ui/SoPortugues';
import { getSolutionSummaries } from '@/content/registry';
import { RESUMO_SOLUCAO } from '@/content/i18n/chrome';
import { CAMINHOS, CAMINHOS_SECAO, CAMINHO_DO_PROBLEMA } from '@/content/i18n/inicio-2026';
import type { Idioma, Problem } from '@/content/types';
import { ligacao } from '@/lib/i18n/rotas';
import { t } from '@/lib/i18n/texto';

/**
 * A oferta em três caminhos (benchmark 2026). Cada caminho é uma linha a toda
 * a largura com o numeral gigante, a frase e as capacidades que o compõem; as
 * sete soluções continuam todas, com ligação à página de cada uma.
 */
export function CaminhosGrid({ idioma = 'pt', problemas }: { idioma?: Idioma; problemas: Problem[] }) {
  const porSlug = new Map(getSolutionSummaries().map((s) => [s.slug, s]));

  return (
    <Reveal className="mt-16">
      <ol>
        {CAMINHOS.map((c) => {
          const resolve = problemas.filter((_, i) => CAMINHO_DO_PROBLEMA[i] === c.numero).map((p) => p.title);
          return (
            <li
              key={c.numero}
              id={`caminho-${c.numero}`}
              data-animate
              className="grid scroll-mt-28 gap-6 border-t border-[color:var(--hairline)] py-10 md:grid-cols-12 md:gap-8 md:py-14"
            >
              <span
                aria-hidden
                className="numeral text-[length:var(--text-numeral-xl)] leading-[0.8] text-[color:var(--muted)] md:col-span-2"
              >
                {String(c.numero).padStart(2, '0')}
              </span>

              <div className="md:col-span-5">
                <p className="rule-label text-[color:var(--muted)]">
                  {t(CAMINHOS_SECAO.caminho, idioma).replace('{n}', String(c.numero))}
                </p>
                <h3 className="mt-3 font-display text-[length:var(--text-h2)] leading-[1.02] font-bold tracking-[var(--tracking-heading)]">
                  {t(c.nome, idioma)}
                </h3>
                <p className="mt-5 max-w-[44ch] text-[color:var(--muted)]">{t(c.frase, idioma)}</p>
                {resolve.length > 0 && (
                  <p className="mt-5 text-sm">
                    <span className="rule-label mr-3 text-[color:var(--muted)]">{t(CAMINHOS_SECAO.resolve, idioma)}:</span>{' '}
                    {resolve.join(' · ')}
                  </p>
                )}
              </div>

              <ul className="md:col-span-5">
                {c.capacidades.map((slug) => {
                  const s = porSlug.get(slug);
                  if (!s) return null;
                  const l = ligacao(s.href, idioma);
                  return (
                    <li key={slug}>
                      <Link
                        href={l.href}
                        hrefLang={l.soPortugues ? 'pt' : undefined}
                        className="group flex items-baseline justify-between gap-6 border-t border-dashed border-[color:var(--hairline)] py-4 transition-colors duration-500 hover:border-[color:var(--accent)]"
                      >
                        <span>
                          <span className="block font-display text-[length:var(--text-h3)] font-semibold">
                            {t(RESUMO_SOLUCAO[slug].label, idioma)}
                            {l.soPortugues && <SoPortugues idioma={idioma} />}
                          </span>
                          <span className="mt-1 block text-sm text-[color:var(--muted)]">
                            {t(RESUMO_SOLUCAO[slug].short, idioma)}
                          </span>
                        </span>
                        <span
                          aria-hidden
                          className="shrink-0 font-display text-xl text-[color:var(--muted)] transition-all duration-500 group-hover:translate-x-1.5 group-hover:text-[color:var(--accent)]"
                        >
                          →
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </li>
          );
        })}
      </ol>
    </Reveal>
  );
}
