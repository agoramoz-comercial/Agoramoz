import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Breadcrumbs } from '@/components/layout/Breadcrumbs';
import { Artigo } from '@/components/news/jornal/paginas';
import { caminhoDoArtigo, caminhoDoJornal } from '@/components/news/jornal/ligacoes';
import { jornalLigado, obterPublicado } from '@/lib/news/jornal-servidor';
import { buildMetadata } from '@/lib/seo/site';

const IDIOMA = 'pt' as const;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  if (!jornalLigado()) return {};
  const { slug } = await params;
  const a = await obterPublicado(slug);
  if (!a || a.idioma !== IDIOMA) return {};
  return {
    ...buildMetadata({
      title: a.titulo,
      description: a.entrada ?? a.titulo,
      path: caminhoDoArtigo(a.slug, IDIOMA),
      imagemPropria: true,
      bilingue: false,
    }),
    openGraph: {
      type: 'article',
      title: a.titulo,
      description: a.entrada ?? undefined,
      publishedTime: a.publicado_em,
      modifiedTime: a.actualizado_em,
      section: a.seccao,
      locale: 'pt_PT',
      siteName: 'AGORAMOZ',
    },
  };
}

export default async function ArtigoPage({ params }: { params: Promise<{ slug: string }> }) {
  if (!jornalLigado()) notFound();
  const { slug } = await params;
  const a = await obterPublicado(slug);
  if (!a || a.idioma !== IDIOMA) notFound();
  return (
    <Artigo
      idioma={IDIOMA}
      slug={slug}
      trilho={
        <Breadcrumbs
          idioma={IDIOMA}
          items={[
            { name: 'Início', path: '/' },
            { name: 'AGORAMOZ News', path: caminhoDoJornal(IDIOMA) },
            { name: a.titulo, path: caminhoDoArtigo(a.slug, IDIOMA) },
          ]}
        />
      }
    />
  );
}
