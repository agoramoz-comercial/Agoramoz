import { MARCA_NEWS, NEWS } from '@/content/i18n/news';
import { OG_CONTENT_TYPE, OG_SIZE, ogImage } from '@/lib/seo/og';

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = `${MARCA_NEWS} — ${NEWS.titulo.en}`;

export default function Image() {
  return ogImage({ eyebrow: MARCA_NEWS, title: NEWS.titulo.en });
}
