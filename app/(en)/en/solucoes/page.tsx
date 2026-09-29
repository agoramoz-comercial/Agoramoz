import type { Metadata } from 'next';
import { Breadcrumbs } from '@/components/layout/Breadcrumbs';
import { IndiceSolucoes } from '@/components/paginas/IndiceSolucoes';
import { INDICE_SOLUCOES } from '@/content/i18n/paginas';
import { ligacao } from '@/lib/i18n/rotas';
import { caminhoNoIdioma, t } from '@/lib/i18n/texto';
import { buildMetadata } from '@/lib/seo/site';

const IDIOMA = 'en' as const;

export const metadata: Metadata = buildMetadata({
  title: t(INDICE_SOLUCOES.metaTitulo, IDIOMA),
  description: t(INDICE_SOLUCOES.metaDescricao, IDIOMA),
  path: caminhoNoIdioma('/solucoes', IDIOMA),
});

export default function SolutionsEnPage() {
  return (
    <IndiceSolucoes
      idioma={IDIOMA}
      trilho={
        <Breadcrumbs
          idioma={IDIOMA}
          items={[
            // `/` enquanto a home inglesa não existir; `/en` quando existir.
            { name: t(INDICE_SOLUCOES.inicio, IDIOMA), path: ligacao('/', IDIOMA).href },
            { name: t(INDICE_SOLUCOES.trilho, IDIOMA), path: caminhoNoIdioma('/solucoes', IDIOMA) },
          ]}
          className="mb-10"
        />
      }
    />
  );
}
