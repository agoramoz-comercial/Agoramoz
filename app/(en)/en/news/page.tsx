import type { Metadata } from 'next';
import { Breadcrumbs } from '@/components/layout/Breadcrumbs';
import { News } from '@/components/paginas/News';
import { NEWS } from '@/content/i18n/news';
import { ligacao } from '@/lib/i18n/rotas';
import { caminhoNoIdioma, t } from '@/lib/i18n/texto';
import { buildMetadata } from '@/lib/seo/site';

const IDIOMA = 'en' as const;

export const metadata: Metadata = buildMetadata({
  title: t(NEWS.metaTitulo, IDIOMA),
  description: t(NEWS.metaDescricao, IDIOMA),
  path: caminhoNoIdioma('/news', IDIOMA),
  imagemPropria: true,
});

export default function NewsEnPage() {
  return (
    <News
      idioma={IDIOMA}
      trilho={
        <Breadcrumbs
          idioma={IDIOMA}
          items={[
            { name: t(NEWS.inicio, IDIOMA), path: ligacao('/', IDIOMA).href },
            { name: t(NEWS.trilho, IDIOMA), path: caminhoNoIdioma('/news', IDIOMA) },
          ]}
          className="mb-10"
        />
      }
    />
  );
}
