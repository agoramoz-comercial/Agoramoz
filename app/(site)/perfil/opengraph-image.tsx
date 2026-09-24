import { PERFIL } from '@/content/landing/perfil';
import { OG_CONTENT_TYPE, OG_SIZE, ogImage } from '@/lib/seo/og';

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = PERFIL.seo.title;

export default function Image() {
  return ogImage({ eyebrow: 'Moçambique · Portugal · Brasil', title: PERFIL.hero.h1 });
}
