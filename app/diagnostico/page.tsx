import { Suspense } from 'react';
import type { Metadata } from 'next';
import { Section } from '@/components/ui/Section';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { Accordion } from '@/components/ui/Accordion';
import { DiagnosticForm } from '@/components/form/DiagnosticForm';
import { BreadcrumbJsonLd, FaqJsonLd } from '@/components/seo/JsonLd';
import { OFFER } from '@/content/site';
import { buildMetadata } from '@/lib/seo/site';
import { Check } from 'lucide-react';

const FAQ = [
  {
    q: 'O diagnóstico tem custo?',
    a: 'O âmbito e as condições do diagnóstico são acordados no primeiro contacto, em função da dimensão do processo a analisar. Dizemo-lo antes de começar, nunca depois.',
  },
  {
    q: 'Quanto tempo demora?',
    a: 'Depende do número de pessoas a entrevistar e da complexidade do processo. A duração é estimada e comunicada depois desta primeira conversa, não antes de sabermos o que vamos analisar.',
  },
  {
    q: 'O que acontece se concluírem que não há adequação?',
    a: 'Dizemos isso e não há proposta. Entregamos na mesma o que o diagnóstico apurou — o mapa do processo e as fricções identificadas são seus, independentemente de trabalharmos juntos.',
  },
  {
    q: 'Preciso de ter tudo definido antes de submeter?',
    a: 'Não. Basta conseguir descrever o processo que o incomoda e o efeito que isso tem. O resto é o que o diagnóstico existe para descobrir.',
  },
];

export const metadata: Metadata = buildMetadata({
  title: 'Solicitar Diagnóstico Estratégico',
  description:
    'O AGORA Opportunity Diagnostic identifica onde a sua empresa perde oportunidades, tempo ou capacidade operacional e recomenda a arquitetura de maior impacto.',
  path: '/diagnostico',
});

export default function DiagnosticoPage() {
  return (
    <>
      <FaqJsonLd items={FAQ} />
      <BreadcrumbJsonLd items={[{ name: 'Início', path: '/' }, { name: 'Diagnóstico', path: '/diagnostico' }]} />

      <Section surface="deep">
        <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
          <div>
            <SectionHeading as="h1" eyebrow={OFFER.name} title={OFFER.title} lead={OFFER.promise} max="none" />
            <ul className="mt-9 space-y-3.5">
              {OFFER.deliverables.map((d) => (
                <li key={d} className="flex items-start gap-3">
                  <Check aria-hidden className="mt-1 size-4 shrink-0 text-[color:var(--ok)]" />
                  <span className="text-sm text-[color:var(--muted)]">{d}</span>
                </li>
              ))}
            </ul>
            <p className="mt-9 border-t border-[color:var(--border)] pt-5 text-sm text-[color:var(--muted)]">
              Não garantimos resultados que dependem da procura, do preço ou da execução da sua equipa.
              Garantimos os compromissos técnicos e operacionais que forem definidos contratualmente.
            </p>
          </div>

          <Suspense fallback={<div className="min-h-[32rem] rounded-[--radius-xl] border border-[color:var(--border)]" />}>
            <DiagnosticForm />
          </Suspense>
        </div>
      </Section>

      <Section surface="light" aria-labelledby="h-faq-diag">
        <SectionHeading id="h-faq-diag" eyebrow="Perguntas frequentes" title="Sobre o diagnóstico." />
        <div className="mt-10 max-w-[52rem]">
          <Accordion items={FAQ} />
        </div>
      </Section>
    </>
  );
}
