import { Breadcrumbs } from '@/components/layout/Breadcrumbs';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { IndiceDiploma } from '@/components/civico/Lei';
import { caminhoDiploma, descricaoDoDiploma, diploma, SLUGS_DIPLOMA, tituloDoDiploma, trilhoDaLei } from '@/lib/civico/lei';
import { buildMetadata } from '@/lib/seo/site';

export const dynamicParams = false;
export const generateStaticParams = () => SLUGS_DIPLOMA.map((d) => ({ diploma: d }));

export async function generateMetadata({ params }: { params: Promise<{ diploma: string }> }): Promise<Metadata> {
  const d = diploma((await params).diploma);
  if (!d) return {};
  return buildMetadata({ title: tituloDoDiploma(d), description: descricaoDoDiploma(d), path: caminhoDiploma(d.slug) });
}

export default async function DiplomaPage({ params }: { params: Promise<{ diploma: string }> }) {
  const d = diploma((await params).diploma);
  if (!d) notFound();
  return (
    <IndiceDiploma
      d={d}
      trilho={<Breadcrumbs items={trilhoDaLei([{ name: d.titulo, path: caminhoDiploma(d.slug) }])} className="mb-10" />}
    />
  );
}
