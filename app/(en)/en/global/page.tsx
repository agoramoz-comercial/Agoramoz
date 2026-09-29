import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Section } from '@/components/ui/Section';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { Breadcrumbs } from '@/components/layout/Breadcrumbs';
import { ligacao } from '@/lib/i18n/rotas';
import { Reveal } from '@/components/motion/Reveal';
import { GLOBAL_CODES, GLOBAL_MARKETS } from '@/content/registry';
import { buildMetadata } from '@/lib/seo/site';
import { caminhoNoIdioma, t } from '@/lib/i18n/texto';

const IDIOMA = 'en' as const;
const INICIO = 'Home';
const LANG = 'en';

const COPIA = {
  eyebrow: { pt: 'Mercados', en: 'Markets' },
  title: {
    pt: 'Onde entramos a seguir, e porquê.',
    en: 'Where we go next, and why.',
  },
  lead: {
    pt: 'Devolvemos horas qualificadas a empresas que perdem dinheiro em trabalho documental — documentos que entram, são verificados, resumidos e reportados à mão. Preço fixo por fase, aprovação humana em cada decisão.',
    en: 'We give qualified hours back to companies losing money on document work — documents that arrive, get checked, summarised and reported by hand. Fixed price per phase, human approval on every decision.',
  },
  nota: {
    pt: 'Operamos em Moçambique, Portugal e Brasil. Os mercados abaixo são onde entramos a seguir: temos a competência e a língua, e ainda não temos operação local. Está escrito assim de propósito.',
    en: 'We operate in Mozambique, Portugal and Brazil. The markets below are where we go next: we have the capability and the language, and we do not yet have a local operation. That is stated deliberately.',
  },
} as const;

export const metadata: Metadata = buildMetadata({
  title: t(COPIA.title, IDIOMA),
  description: t(COPIA.lead, IDIOMA),
  path: caminhoNoIdioma('/global', IDIOMA),
  bilingue: true,
  imagemPropria: true,
});

export default function Page() {
  return (
    <div lang={LANG}>
      <Section surface="deep" contour>
        <Breadcrumbs
            idioma={IDIOMA}
          className="mb-10"
          items={[
            // Pela lista de rotas bilingues: `/` enquanto a home inglesa não existir, `/en` quando existir.
            { name: INICIO, path: ligacao('/', IDIOMA).href },
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
