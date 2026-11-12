import { CIVICO, MARCA_CIVICO } from '@/content/civico';
import { OG_CONTENT_TYPE, OG_SIZE, ogImage } from '@/lib/seo/og';

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = `${MARCA_CIVICO} — ${CIVICO.titulo}`;

export default function Image() {
  return ogImage({ eyebrow: MARCA_CIVICO, title: CIVICO.titulo });
}
