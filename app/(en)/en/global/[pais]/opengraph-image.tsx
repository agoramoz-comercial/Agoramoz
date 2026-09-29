import { CHROME } from '@/content/i18n/chrome';
import { GLOBAL_CODES, getGlobalMarket } from '@/content/registry';
import { OG_CONTENT_TYPE, OG_SIZE, ogImage } from '@/lib/seo/og';

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = 'AGORAMOZ global market';

export function generateStaticParams() {
  return GLOBAL_CODES.map((pais) => ({ pais }));
}

/** Cada mercado global com o seu nome, em inglês. */
export default async function Image({ params }: { params: Promise<{ pais: string }> }) {
  const { pais } = await params;
  const m = getGlobalMarket(pais);
  return ogImage({ eyebrow: CHROME.mercadosGlobais.en, title: m ? m.name.en : CHROME.mercadosGlobais.en });
}
