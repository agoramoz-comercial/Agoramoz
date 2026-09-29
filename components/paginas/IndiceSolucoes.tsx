import { Section } from '@/components/ui/Section';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { SolutionsGrid } from '@/components/sections/SolutionsGrid';
import { FinalCta } from '@/components/sections/FinalCta';
import { INDICE_SOLUCOES } from '@/content/i18n/paginas';
import type { Idioma } from '@/content/types';
import { t } from '@/lib/i18n/texto';

/**
 * O índice de soluções nos dois idiomas, com a marcação que estava em
 * `app/(site)/solucoes/page.tsx`. O trilho vem da rota (contrato de
 * `lib/seo/rotas.test.ts`).
 */
export function IndiceSolucoes({ idioma, trilho }: { idioma: Idioma; trilho: React.ReactNode }) {
  return (
    <>
      <Section surface="deep" contour>
        {trilho}
        <SectionHeading
          as="h1"
          eyebrow={t(INDICE_SOLUCOES.eyebrow, idioma)}
          title={t(INDICE_SOLUCOES.titulo, idioma)}
          lead={t(INDICE_SOLUCOES.lead, idioma)}
          max="wide"
        />
        <SolutionsGrid idioma={idioma} />
      </Section>
      <Section surface="light">
        <FinalCta idioma={idioma} />
      </Section>
    </>
  );
}
