import type { Metadata } from 'next';
import { Breadcrumbs } from '@/components/layout/Breadcrumbs';
import { News } from '@/components/paginas/News';
import { NEWS } from '@/content/i18n/news';
import { t } from '@/lib/i18n/texto';
import { buildMetadata } from '@/lib/seo/site';

const IDIOMA = 'pt' as const;

export const metadata: Metadata = buildMetadata({
  title: t(NEWS.metaTitulo, IDIOMA),
  description: t(NEWS.metaDescricao, IDIOMA),
  path: '/news',
  imagemPropria: true,
});

export default function NewsPage() {
  return (
    <News
      idioma={IDIOMA}
      trilho={
        <Breadcrumbs
          items={[
            { name: t(NEWS.inicio, IDIOMA), path: '/' },
            { name: t(NEWS.trilho, IDIOMA), path: '/news' },
          ]}
          className="mb-10"
        />
      }
    />
  );
}
