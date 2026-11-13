import { Breadcrumbs } from '@/components/layout/Breadcrumbs';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PaginaArtigo } from '@/components/civico/Lei';
import {
  artigo,
  caminhoArtigo,
  caminhoDiploma,
  descricaoDoArtigo,
  diploma,
  diplomas,
  numeroDoParametro,
  tituloDoArtigo,
  trilhoDaLei,
} from '@/lib/civico/lei';
import { buildMetadata } from '@/lib/seo/site';

/** Uma página estática por artigo do corpus (1 001), gerada no build. */
export const dynamicParams = false;
export const generateStaticParams = () => diplomas().flatMap((d) => d.artigos.map((a) => ({ diploma: d.slug, artigo: `artigo-${a.n}` })));

async function ler(params: Promise<{ diploma: string; artigo: string }>) {
  const p = await params;
  const d = diploma(p.diploma);
  const n = numeroDoParametro(p.artigo);
  const r = d && n !== null ? artigo(d, n) : null;
  return d && r ? { d, ...r } : null;
}

export async function generateMetadata({ params }: { params: Promise<{ diploma: string; artigo: string }> }): Promise<Metadata> {
  const x = await ler(params);
  if (!x) return {};
  return buildMetadata({
    title: tituloDoArtigo(x.d, x.artigo),
    description: descricaoDoArtigo(x.d, x.artigo),
    path: caminhoArtigo(x.d.slug, x.artigo.n),
  });
}

export default async function ArtigoPage({ params }: { params: Promise<{ diploma: string; artigo: string }> }) {
  const x = await ler(params);
  if (!x) notFound();
  const caminho = caminhoArtigo(x.d.slug, x.artigo.n);
  return (
    <PaginaArtigo
      d={x.d}
      a={x.artigo}
      anterior={x.anterior}
      seguinte={x.seguinte}
      trilho={
        <Breadcrumbs
          items={trilhoDaLei([
            { name: x.d.titulo, path: caminhoDiploma(x.d.slug) },
            { name: `Artigo ${x.artigo.n}.º`, path: caminho },
          ])}
          className="mb-10"
        />
      }
    />
  );
}
