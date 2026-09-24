import { COUNTRY_CODES, getCountry } from '@/content/registry';
import { OG_CONTENT_TYPE, OG_SIZE, ogImage } from '@/lib/seo/og';

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = 'AGORAMOZ';

export function generateStaticParams() {
  return COUNTRY_CODES.map((pais) => ({ pais }));
}

export default async function Image({ params }: { params: Promise<{ pais: string }> }) {
  const { pais } = await params;
  const c = getCountry(pais);
  return ogImage({
    eyebrow: c ? c.name : 'Moçambique · Portugal · Brasil',
    title: c ? c.hero.headline : 'AGORAMOZ',
  });
}
