import { Breadcrumbs } from '@/components/layout/Breadcrumbs';
import type { Metadata } from 'next';
import { IndiceLeis } from '@/components/civico/Lei';
import { LEI } from '@/content/civico';
import { diplomas, trilhoDaLei } from '@/lib/civico/lei';
import { buildMetadata } from '@/lib/seo/site';

export const metadata: Metadata = buildMetadata({ title: LEI.indiceMetaTitulo, description: LEI.indiceMetaDescricao, path: '/civico/lei' });

export default function LeisPage() {
  return <IndiceLeis diplomas={diplomas()} trilho={<Breadcrumbs items={trilhoDaLei()} className="mb-10" />} />;
}
