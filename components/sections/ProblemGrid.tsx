import { Reveal } from '@/components/motion/Reveal';
import { CAMINHOS, CAMINHOS_SECAO, CAMINHO_DO_PROBLEMA } from '@/content/i18n/inicio-2026';
import type { Idioma, Problem } from '@/content/types';
import { t } from '@/lib/i18n/texto';

/**
 * Linhas editoriais numeradas em vez de mosaico de cartões: a estrutura vem
 * da grelha e das réguas, não de contornos fechados.
 */
export function ProblemGrid({
  items,
  columns = 2,
  caminhos,
}: {
  items: Problem[];
  columns?: 2 | 3 | 4;
  /** Na página inicial: numeral gigante e ligação ao caminho que resolve cada problema. */
  caminhos?: Idioma;
}) {
  return (
    <Reveal className="mt-16">
      <ul className={columns >= 3 ? 'grid gap-4 md:grid-cols-2 lg:grid-cols-3' : 'grid gap-4 md:grid-cols-2'}>
        {items.map((p, i) => (
          <li
            key={p.title}
            data-animate
            className="v3-vidro v3-cartao-linha group border-t border-dashed border-[color:var(--hairline)] py-8 transition-colors duration-500 hover:border-[color:var(--accent)]"
          >
            <div className="flex items-start gap-6">
              <span
                className={
                  caminhos
                    ? 'numeral shrink-0 text-[length:var(--text-numeral)] leading-[0.85] text-[color:var(--muted)] transition-colors duration-500 group-hover:text-[color:var(--accent)]'
                    : 'rule-label mt-1.5 shrink-0 text-[color:var(--muted)] transition-colors duration-500 group-hover:text-[color:var(--accent)]'
                }
              >
                {String(i + 1).padStart(2, '0')}
              </span>
              <div>
                <h3 className="font-display text-[length:var(--text-h3)] font-semibold">{p.title}</h3>
                <p className="mt-3 max-w-[42ch] text-[color:var(--muted)]">{p.body}</p>
                {caminhos && CAMINHO_DO_PROBLEMA[i] && (
                  <a
                    href={`#caminho-${CAMINHO_DO_PROBLEMA[i]}`}
                    className="mt-4 inline-flex items-baseline gap-2 text-sm text-[color:var(--on-surface)] underline decoration-[color:var(--hairline)] underline-offset-4 hover:decoration-[color:var(--accent)]"
                  >
                    <span aria-hidden>→</span>
                    {t(CAMINHOS_SECAO.caminho, caminhos).replace('{n}', String(CAMINHO_DO_PROBLEMA[i]))}:{' '}
                    {t(CAMINHOS[CAMINHO_DO_PROBLEMA[i]! - 1]!.nome, caminhos)}
                  </a>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </Reveal>
  );
}
