import { getAllSolutionParams, getSolution } from '@/content/registry';
import { OG_CONTENT_TYPE, OG_SIZE, ogImage } from '@/lib/seo/og';

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = 'Solução AGORAMOZ';

export function generateStaticParams() {
  return getAllSolutionParams();
}

export default async function Image({ params }: { params: Promise<{ solucao: string }> }) {
  const { solucao } = await params;
  const s = getSolution(solucao);
  return ogImage({ eyebrow: s ? s.hero.eyebrow : 'Soluções', title: s ? s.label : 'Soluções' });
}
