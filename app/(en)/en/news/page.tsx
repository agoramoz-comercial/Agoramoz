import type { Metadata } from 'next';
import { Breadcrumbs } from '@/components/layout/Breadcrumbs';
import { News } from '@/components/paginas/News';
import { PrimeiraPagina, seccaoDe } from '@/components/news/jornal/paginas';
import { jornalLigado } from '@/lib/news/jornal-servidor';
import { NEWS } from '@/content/i18n/news';
import { ligacao } from '@/lib/i18n/rotas';
import { caminhoNoIdioma, t } from '@/lib/i18n/texto';
import { absolute, buildMetadata } from '@/lib/seo/site';

const IDIOMA = 'en' as const;

const BASE = buildMetadata({
  title: t(NEWS.metaTitulo, IDIOMA),
  description: t(NEWS.metaDescricao, IDIOMA),
  path: caminhoNoIdioma('/news', IDIOMA),
  imagemPropria: true,
});

/** O RSS do jornal anunciado no `<head>` (leitores de feeds e agregadores). */
export const metadata: Metadata = {
  ...BASE,
  alternates: {
    ...BASE.alternates,
    types: { 'application/rss+xml': absolute('/en/news/feed.xml') },
  },
};

/**
 * Com `NEWS_BLOG=on`, o jornal (artigos publicados pela redacção). Com `off`,
 * a ferramenta de análise pública de sempre.
 */
export default async function NewsEnPage({
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
          idioma={IDIOMA}
          items={[
            { name: t(NEWS.inicio, IDIOMA), path: ligacao('/', IDIOMA).href },
            {
              name: t(NEWS.trilho, IDIOMA),
              path: caminhoNoIdioma('/news', IDIOMA),
            },
          ]}
          className="mb-10"
        />
      }
    />
  );
}
