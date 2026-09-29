import { Suspense } from 'react';
import { Section } from '@/components/ui/Section';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { SplitHeading } from '@/components/motion/SplitHeading';
import { Accordion } from '@/components/ui/Accordion';
import { DiagnosticForm } from '@/components/form/DiagnosticForm';
import { FaqJsonLd } from '@/components/seo/JsonLd';
import { DIAGNOSTICO } from '@/content/i18n/diagnostico';
import { OFFER } from '@/content/site';
import type { Idioma } from '@/content/types';
import { caminhoNoIdioma, t } from '@/lib/i18n/texto';

/**
 * O corpo da página de diagnóstico, nos dois idiomas. A marcação é a que
 * estava em `app/(site)/diagnostico/page.tsx`, sem mudar uma classe: o design
 * português fica igual e o inglês é o mesmo design.
 *
 * O trilho vem da rota — cada `page.tsx` declara o seu `<Breadcrumbs>`, que é o
 * contrato de `lib/seo/rotas.test.ts`.
 *
 * A FAQ passa a ter o caminho da página. Sem ele, o `@id` saía `…/#faq`, o
 * mesmo da FAQ da página inicial — o defeito já corrigido nas soluções.
 */
export function Diagnostico({ idioma, trilho }: { idioma: Idioma; trilho: React.ReactNode }) {
  const faq = DIAGNOSTICO.faq.map((f) => ({ q: t(f.q, idioma), a: t(f.a, idioma) }));

  return (
    <>
      <FaqJsonLd items={faq} path={caminhoNoIdioma('/diagnostico', idioma)} />

      <Section surface="deep" contour>
        {trilho}
        <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
          <div>
            <div className="rule flex items-baseline gap-4 pt-6">
              <span className="rule-label text-[color:var(--muted)]">{t(DIAGNOSTICO.eyebrow, idioma)}</span>
              <span className="rule-label text-[color:var(--accent)]">{OFFER.name}</span>
            </div>
            <SplitHeading
              as="h1"
              className="mt-10 max-w-[15ch] text-[length:var(--text-h1)] leading-[var(--leading-display)] font-bold tracking-[var(--tracking-display)]"
            >
              {t(DIAGNOSTICO.titulo, idioma)}
            </SplitHeading>
            <p className="mt-8 max-w-[48ch] text-[length:var(--text-lead)] text-[color:var(--muted)]">
              {t(DIAGNOSTICO.promessa, idioma)}
            </p>
            <ol className="mt-12">
              {DIAGNOSTICO.entregas.map((d, i) => (
                <li key={d.pt} className="flex items-baseline gap-6 border-t border-dashed border-[color:var(--hairline)] py-4">
                  <span className="rule-label shrink-0 text-[color:var(--accent)]">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="text-sm text-[color:var(--muted)]">{t(d, idioma)}</span>
                </li>
              ))}
            </ol>
            <p className="rule mt-10 pt-5 text-sm text-[color:var(--muted)]">{t(DIAGNOSTICO.garantia, idioma)}</p>
          </div>

          <Suspense fallback={<div className="min-h-[32rem]  border border-[color:var(--border)]" />}>
            <DiagnosticForm idioma={idioma} />
          </Suspense>
        </div>
      </Section>

      <Section surface="light" aria-labelledby="h-faq-diag">
        <SectionHeading
          id="h-faq-diag"
          eyebrow={t(DIAGNOSTICO.faqEyebrow, idioma)}
          title={t(DIAGNOSTICO.faqTitulo, idioma)}
        />
        <div className="mt-10 max-w-[52rem]">
          <Accordion items={faq} />
        </div>
      </Section>
    </>
  );
}
