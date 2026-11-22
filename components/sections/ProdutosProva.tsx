import Link from 'next/link';
import { Reveal } from '@/components/motion/Reveal';
import { SoPortugues } from '@/components/ui/SoPortugues';
import { PRODUTOS, PRODUTOS_SECAO } from '@/content/i18n/inicio-2026';
import type { Idioma } from '@/content/types';
import { ligacao } from '@/lib/i18n/rotas';
import { t } from '@/lib/i18n/texto';

/**
 * Prova que se abre num clique: os produtos AGORAMOZ que já funcionam. Sem
 * clientes para mostrar, é isto que substitui o logótipo (benchmark 2026).
 */
export function ProdutosProva({ idioma = 'pt' }: { idioma?: Idioma }) {
  return (
    <div className="mt-16">
      <h3 className="rule-label text-[color:var(--accent)]">{t(PRODUTOS_SECAO.titulo, idioma)}</h3>
      <Reveal className="mt-6 grid gap-px overflow-hidden rounded-md border border-[color:var(--hairline)] bg-[color:var(--hairline)] sm:grid-cols-2 lg:grid-cols-4">
        {PRODUTOS.map((p) => {
          const l = ligacao(p.href, idioma);
          return (
            <Link
              key={p.href}
              href={l.href}
              hrefLang={l.soPortugues ? 'pt' : undefined}
              data-animate
              className="group flex min-h-56 flex-col justify-between gap-8 bg-[color:var(--surface)] p-6 transition-colors duration-500 hover:bg-[color:var(--surface-raised)]"
            >
              <span>
                {p.demo && (
                  <span className="rule-label mb-3 block text-[color:var(--muted)]">{t(PRODUTOS_SECAO.demo, idioma)}</span>
                )}
                <span className="block font-display text-[length:var(--text-h3)] font-bold tracking-[var(--tracking-heading)]">
                  {p.nome}
                  {l.soPortugues && <SoPortugues idioma={idioma} />}
                </span>
                <span className="mt-3 block text-sm text-[color:var(--muted)]">{t(p.prova, idioma)}</span>
              </span>
              <span className="rule-label inline-flex items-center gap-2 text-[color:var(--on-surface)]">
                {t(PRODUTOS_SECAO.abrir, idioma)}
                <span aria-hidden className="transition-transform duration-300 group-hover:translate-x-1">
                  →
                </span>
              </span>
            </Link>
          );
        })}
      </Reveal>
      <p className="rule-label mt-5 text-[color:var(--muted)]">{t(PRODUTOS_SECAO.nota, idioma)}</p>
    </div>
  );
}
