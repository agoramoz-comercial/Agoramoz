import { OFFER } from '@/content/site';
import { OG_CONTENT_TYPE, OG_SIZE, ogImage } from '@/lib/seo/og';

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = OFFER.name;

export default function Image() {
  return ogImage({ eyebrow: OFFER.name, title: OFFER.title });
}
