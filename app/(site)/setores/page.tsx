import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Breadcrumbs } from '@/components/layout/Breadcrumbs';
import { Reveal } from '@/components/motion/Reveal';
import { FinalCta } from '@/components/sections/FinalCta';
import { Section } from '@/components/ui/Section';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { SETORES_2026 } from '@/content/site';
import { buildMetadata } from '@/lib/seo/site';

export const metadata: Metadata = buildMetadata({
  title: 'Setores: processos críticos e ofertas de entrada',
  description:
    'Serviços B2B, logística, energia e mineração, construção, agronegócio e desenvolvimento: o processo inicial, quem decide e por onde começar.',
  path: '/setores',
});

/**
 * Website Final 2026, §18. Uma página honesta: o processo de entrada de cada
 * setor, sem afirmar especialização onde ainda não há página completa.
 */
export default function SetoresPage() {
  return (
    <>
      <Section surface="deep" contour>
        <Breadcrumbs items={[{ name: 'Início', path: '/' }, { name: 'Setores', path: '/setores' }]} className="mb-10" />
        <SectionHeading as="h1" eyebrow={SETORES_2026.eyebrow} title={SETORES_2026.title} lead={SETORES_2026.lead} max="wide" />
      </Section>

      <Section surface="light" aria-labelledby="h-setores">
        <SectionHeading id="h-setores" title="Processo inicial, quem decide e por onde começar." />
        <Reveal className="mt-14">
          <ul className="grid gap-x-10 gap-y-10 md:grid-cols-2 lg:grid-cols-3">
            {SETORES_2026.itens.map((s, i) => (
              <li key={s.nome} data-animate className="border-t border-dashed border-[color:var(--hairline)] pt-6">
                <div className="flex items-baseline gap-4">
                  <span className="numeral text-[length:var(--text-h3)] text-[color:var(--muted)]">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <h3 className="font-display text-[length:var(--text-h3)] font-semibold tracking-[var(--tracking-heading)]">
                    {s.nome}
                  </h3>
                </div>
                <dl className="mt-4 grid gap-3 text-sm">
                  <div>
                    <dt className="rule-label text-[color:var(--muted)]">Processo inicial</dt>
                    <dd className="mt-1">{s.processo}</dd>
                  </div>
                  <div>
                    <dt className="rule-label text-[color:var(--muted)]">Quem decide</dt>
                    <dd className="mt-1 text-[color:var(--muted)]">{s.compradores}</dd>
                  </div>
                  <div>
                    <dt className="rule-label text-[color:var(--muted)]">Oferta de entrada</dt>
                    <dd className="mt-1">{s.oferta}</dd>
                  </div>
                </dl>
                <Link href={s.href} className="group mt-5 inline-flex min-h-11 items-center gap-2 text-sm font-medium">
                  {s.href.startsWith('/mz/') ? 'Ver a página do setor' : 'Avaliar este processo'}
                  <span className="sr-only">: {s.nome}</span>
                  <ArrowRight aria-hidden className="size-4 transition-transform duration-300 group-hover:translate-x-0.5" />
                </Link>
              </li>
            ))}
          </ul>
        </Reveal>
      </Section>

      <Section surface="deep" contour>
        <FinalCta />
      </Section>
    </>
  );
}
