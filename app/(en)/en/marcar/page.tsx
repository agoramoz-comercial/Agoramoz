import type { Metadata } from 'next';
import { Breadcrumbs } from '@/components/layout/Breadcrumbs';
import { Marcar } from '@/components/paginas/Marcar';
import { MARCAR } from '@/content/i18n/marcar';
import { ligacao } from '@/lib/i18n/rotas';
import { caminhoNoIdioma, t } from '@/lib/i18n/texto';
import { buildMetadata } from '@/lib/seo/site';

const IDIOMA = 'en' as const;

export const dynamic = 'force-dynamic';

export const metadata: Metadata = buildMetadata({
  title: t(MARCAR.metaTitulo, IDIOMA),
  description: t(MARCAR.metaDescricao, IDIOMA),
  path: caminhoNoIdioma('/marcar', IDIOMA),
});

export default function MarcarEnPage() {
  return (
    <Marcar
      idioma={IDIOMA}
      trilho={
        <Breadcrumbs
          idioma={IDIOMA}
          items={[
            { name: t(MARCAR.inicio, IDIOMA), path: ligacao('/', IDIOMA).href },
            { name: t(MARCAR.trilho, IDIOMA), path: caminhoNoIdioma('/marcar', IDIOMA) },
          ]}
          className="mb-10"
        />
      }
    />
  );
}
