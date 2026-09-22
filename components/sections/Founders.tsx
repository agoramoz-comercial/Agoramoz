import { Linkedin } from 'lucide-react';
import { Reveal } from '@/components/motion/Reveal';
import { DitherMark } from '@/components/ui/DitherMark';
import { FOUNDERS } from '@/content/site';

/**
 * Perfis de quem lidera. Numeral techno em escala de estatística, cargo em
 * rótulo, responsabilidade em texto, LinkedIn com nome e ícone.
 *
 * O bloco de credenciais só existe quando há credenciais. Um cabeçalho
 * "Certificações" sobre uma lista vazia diz ao visitante que não há nenhuma —
 * é pior do que não mostrar nada. Ver a nota em `content/site.ts` sobre porque
 * é que este array está vazio de propósito.
 */
export function Founders() {
  return (
    <Reveal className="mt-16">
      <ul>
        {FOUNDERS.people.map((p, i) => (
          <li
            key={p.name}
            data-animate
            className="grid gap-6 border-t border-dashed border-[color:var(--hairline)] py-10 md:grid-cols-12 md:gap-10"
          >
            <span className="numeral text-[length:var(--text-numeral)] text-[color:var(--muted)] md:col-span-2 lg:col-span-1">
              {String(i + 1).padStart(2, '0')}
            </span>

            <div className="md:col-span-10 lg:col-span-4">
              <h3 className="font-display text-[length:var(--text-h2)] leading-[1.02] font-bold tracking-[var(--tracking-heading)]">
                {p.name}
              </h3>
              <p className="mt-3 flex items-center gap-2.5">
                <DitherMark size="sm" />
                <span className="rule-label text-[color:var(--accent)]">{p.role}</span>
              </p>
            </div>

            <div className="md:col-span-12 lg:col-span-7">
              <p className="max-w-[46ch] text-[color:var(--muted)]">{p.body}</p>

              {p.certifications.length > 0 && (
                <div className="mt-7">
                  <p className="rule-label text-[color:var(--muted)]">Certificações</p>
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {p.certifications.map((c) => (
                      <li
                        key={`${c.issuer}-${c.name}`}
                        className="border border-dashed border-[color:var(--hairline)] px-3 py-2"
                      >
                        <span className="block text-sm text-[color:var(--on-surface)]">{c.name}</span>
                        <span className="rule-label mt-0.5 block text-[color:var(--muted)]">
                          {c.issuer}
                          {c.year ? ` · ${c.year}` : ''}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <a
                href={p.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="group mt-7 inline-flex min-h-11 items-center gap-2.5 text-[color:var(--accent)] transition-opacity hover:opacity-70"
              >
                <Linkedin aria-hidden className="size-4" />
                <span className="rule-label">Perfil público de {p.name} no LinkedIn</span>
                <span aria-hidden className="transition-transform duration-300 group-hover:translate-x-0.5">
                  ↗
                </span>
                <span className="sr-only">(abre noutro separador)</span>
              </a>
            </div>
          </li>
        ))}
      </ul>
    </Reveal>
  );
}
