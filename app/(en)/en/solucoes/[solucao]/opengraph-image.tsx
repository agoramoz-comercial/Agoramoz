import { getAllSolutionParams, getSolucao } from '@/content/registry';
import { OG_CONTENT_TYPE, OG_SIZE, ogImage } from '@/lib/seo/og';

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = 'AGORAMOZ solution';

export function generateStaticParams() {
  return getAllSolutionParams();
}

/** A mesma imagem da versão portuguesa, com o texto em inglês. */
export default async function Image({ params }: { params: Promise<{ solucao: string }> }) {
  const { solucao } = await params;
  const s = getSolucao(solucao, 'en');
  return ogImage({ eyebrow: s ? s.hero.eyebrow : 'Solutions', title: s ? s.label : 'Solutions' });
}
