import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Section } from '@/components/ui/Section';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { Breadcrumbs } from '@/components/layout/Breadcrumbs';
import { Reveal } from '@/components/motion/Reveal';
import { GLOBAL_CODES, GLOBAL_MARKETS } from '@/content/registry';
import { buildMetadata } from '@/lib/seo/site';
import { caminhoNoIdioma, t } from '@/lib/i18n/texto';

const IDIOMA = 'pt' as const;
const INICIO = 'Início';
const LANG = 'pt-PT';

const COPIA = {
  eyebrow: { pt: 'Infraestrutura operacional digital', en: 'Operational digital infrastructure' },
  /** Só o <title>: o H1 continua a ser `title`. O que se pesquisa, não a frase. */
  metaTitulo: {
    pt: 'Infraestrutura operacional digital e automação',
    en: 'Operational digital infrastructure and automation',
  },
  title: {
    pt: 'Transforme operações fragmentadas num sistema que funciona.',
    en: 'Turn fragmented operations into a system that works.',
  },
  lead: {
    pt: 'Ligamos processos, dados e sistemas: diagnóstico, automação, software, agentes de IA e infraestrutura, entregues por fases controladas.',
    en: 'Connect processes, data and systems. Diagnostic, automation, enterprise software, AI agents and digital infrastructure delivered in controlled stages.',
  },
  nota: {
    pt: 'Operamos em Moçambique, Portugal e Brasil; os mercados abaixo são onde entramos a seguir, sem operação local ainda. Antes de entregar fora destes três, acordamos entidade contratante e lei aplicável, moeda e impostos, localização e transferência de dados, língua e horário, segurança, subcontratados, aceitação e suporte. Não descrevemos um projeto como conforme em todo o mundo sem revisão por jurisdição.',
    en: 'We operate in Mozambique, Portugal and Brazil; the markets below are where we go next, without a local operation yet. Before delivering outside those three, we agree the contracting entity and governing law, currency and tax, data location and transfers, working language and service hours, security, subcontractors, acceptance and support. We do not describe a project as globally compliant without jurisdiction-specific review.',
  },
} as const;

export const metadata: Metadata = buildMetadata({
  title: t(COPIA.metaTitulo, IDIOMA),
  description: t(COPIA.lead, IDIOMA),
  path: caminhoNoIdioma('/global', IDIOMA),
  bilingue: true,
});

export default function Page() {
  return (
    <div lang={LANG}>
      <Section surface="deep" contour>
        <Breadcrumbs
          className="mb-10"
          items={[
            { name: INICIO, path: caminhoNoIdioma('/', IDIOMA) },
            { name: t(COPIA.eyebrow, IDIOMA), path: caminhoNoIdioma('/global', IDIOMA) },
          ]}
        />
        <SectionHeading
          as="h1"
          eyebrow={t(COPIA.eyebrow, IDIOMA)}
          title={t(COPIA.title, IDIOMA)}
          lead={t(COPIA.lead, IDIOMA)}
          max="wide"
        />
        <p className="rule mt-12 max-w-[62ch] pt-8 text-sm text-[color:var(--muted)]">
          {t(COPIA.nota, IDIOMA)}
        </p>
      </Section>

      <Section surface="light" aria-labelledby="h-mercados">
        <SectionHeading id="h-mercados" title={t(COPIA.eyebrow, IDIOMA)} />
        <Reveal className="mt-14">
          <ul className="grid gap-x-10 gap-y-10 md:grid-cols-2 lg:grid-cols-3">
            {GLOBAL_CODES.map((code, i) => {
              const m = GLOBAL_MARKETS[code]!;
              return (
                <li key={code} data-animate className="border-t border-dashed border-[color:var(--hairline)] pt-6">
                  <Link
                    href={caminhoNoIdioma(`/global/${code}`, IDIOMA)}
                    className="group flex min-h-11 items-baseline gap-4"
                  >
                    <span className="numeral text-[length:var(--text-h3)] text-[color:var(--muted)]">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className="font-display text-[length:var(--text-h3)] font-semibold tracking-[var(--tracking-heading)]">
                      {t(m.name, IDIOMA)}
                    </span>
                    <ArrowRight
                      aria-hidden
                      className="size-4 shrink-0 self-center transition-transform duration-300 group-hover:translate-x-0.5"
                    />
                  </Link>
                  <p className="mt-3 max-w-[40ch] text-sm text-[color:var(--muted)]">{t(m.why, IDIOMA)}</p>
                </li>
              );
            })}
          </ul>
        </Reveal>
      </Section>
    </div>
  );
}
