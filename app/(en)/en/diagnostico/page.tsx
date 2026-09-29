import type { Metadata } from 'next';
import { Breadcrumbs } from '@/components/layout/Breadcrumbs';
import { Diagnostico } from '@/components/paginas/Diagnostico';
import { DIAGNOSTICO } from '@/content/i18n/diagnostico';
import { ligacao } from '@/lib/i18n/rotas';
import { caminhoNoIdioma, t } from '@/lib/i18n/texto';
import { buildMetadata } from '@/lib/seo/site';

const IDIOMA = 'en' as const;

export const metadata: Metadata = buildMetadata({
  title: t(DIAGNOSTICO.metaTitulo, IDIOMA),
  description: t(DIAGNOSTICO.metaDescricao, IDIOMA),
  path: caminhoNoIdioma('/diagnostico', IDIOMA),
  imagemPropria: true,
});

export default function DiagnosticEnPage() {
  return (
    <Diagnostico
      idioma={IDIOMA}
      trilho={
        <Breadcrumbs
          idioma={IDIOMA}
          items={[
            // Pela lista de rotas bilingues: `/` enquanto a home inglesa não existir, `/en` quando existir.
            { name: t(DIAGNOSTICO.inicio, IDIOMA), path: ligacao('/', IDIOMA).href },
            { name: t(DIAGNOSTICO.trilho, IDIOMA), path: caminhoNoIdioma('/diagnostico', IDIOMA) },
          ]}
          className="mb-10"
        />
      }
    />
  );
}
