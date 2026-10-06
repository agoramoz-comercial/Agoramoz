import type { Metadata } from 'next';
import { Breadcrumbs } from '@/components/layout/Breadcrumbs';
import { News } from '@/components/paginas/News';
import { PrimeiraPagina, seccaoDe } from '@/components/news/jornal/paginas';
import { jornalLigado } from '@/lib/news/jornal-servidor';
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

/**
 * Com `NEWS_BLOG=on`, o jornal (artigos publicados pela redacção). Com `off`,
 * a ferramenta de análise pública de sempre.
 */
export default async function NewsPage({
  searchParams,
}: {
  searchParams: Promise<{ seccao?: string | string[] }>;
}) {
  if (jornalLigado()) {
    const { seccao } = await searchParams;
    return <PrimeiraPagina idioma={IDIOMA} seccao={seccaoDe(seccao)} />;
  }
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
