import { CHROME } from '@/content/i18n/chrome';
import { OG_CONTENT_TYPE, OG_SIZE, ogImage } from '@/lib/seo/og';

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

/** O título de `/en/global`, que vive como constante local da página (o Next não deixa exportá-lo de `page.tsx`). */
const TITULO = 'Where we go next, and why.';
export const alt = TITULO;

export default function Image() {
  return ogImage({ eyebrow: CHROME.mercadosGlobais.en, title: TITULO });
}
