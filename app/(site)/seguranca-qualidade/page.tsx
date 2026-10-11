import type { Metadata } from 'next';
import { Breadcrumbs } from '@/components/layout/Breadcrumbs';
import { FinalCta } from '@/components/sections/FinalCta';
import { ProblemGrid } from '@/components/sections/ProblemGrid';
import { Section } from '@/components/ui/Section';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { SEGURANCA_2026 } from '@/content/site';
import { buildMetadata } from '@/lib/seo/site';

export const metadata: Metadata = buildMetadata({
  title: 'Segurança, privacidade e qualidade',
  description:
    'Os controlos que cada projeto documenta: acessos, ambientes, backups, incidentes, testes e aceitação. Sem prometer conformidade automática.',
  path: '/seguranca-qualidade',
});

function Pontos({ itens }: { itens: readonly string[] }) {
  return (
    <div className="mt-10 grid gap-4 sm:grid-cols-2">
      {itens.map((p) => (
        <p key={p} className="border-l-2 border-[color:var(--accent)] pl-5 text-[color:var(--muted)]">
          {p}
        </p>
      ))}
    </div>
  );
}

/** Website Final 2026, §21. Explica o modelo operacional; não declara conformidade. */
export default function SegurancaQualidadePage() {
  const s = SEGURANCA_2026;
  return (
    <>
      <Section surface="deep" contour>
        <Breadcrumbs
          items={[{ name: 'Início', path: '/' }, { name: 'Segurança e qualidade', path: '/seguranca-qualidade' }]}
          className="mb-10"
        />
        <SectionHeading as="h1" eyebrow={s.eyebrow} title={s.title} lead={s.lead} max="wide" />
      </Section>

      <Section surface="light" aria-labelledby="h-security">
        <SectionHeading id="h-security" title={s.security.title} lead={s.security.lead} />
        <Pontos itens={s.security.points} />
      </Section>

      <Section surface="tint" aria-labelledby="h-quality">
        <SectionHeading id="h-quality" title={s.quality.title} lead={s.quality.lead} />
        <Pontos itens={s.quality.points} />
      </Section>

      <Section surface="light" aria-labelledby="h-mercados-seg">
        <SectionHeading id="h-mercados-seg" title={s.mercados.title} lead={s.mercados.lead} />
        <ProblemGrid items={[...s.mercados.itens]} />
      </Section>

      <Section surface="deep" contour>
        <FinalCta />
      </Section>
    </>
  );
}
