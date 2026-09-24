import { SITE } from '@/content/site';
import { OG_CONTENT_TYPE, OG_SIZE, ogImage } from '@/lib/seo/og';

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = `AGORAMOZ — ${SITE.tagline}`;

export default function OpengraphImage() {
  return ogImage({
    eyebrow: 'Moçambique · Portugal · Brasil',
    title: 'Transformamos processos lentos e oportunidades perdidas em sistemas digitais.',
  });
}
