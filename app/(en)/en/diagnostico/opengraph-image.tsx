import { DIAGNOSTICO } from '@/content/i18n/diagnostico';
import { OFFER } from '@/content/site';
import { OG_CONTENT_TYPE, OG_SIZE, ogImage } from '@/lib/seo/og';

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = OFFER.name;

/** A mesma imagem da versão portuguesa, com o título em inglês — é o que o LinkedIn mostra. */
export default function Image() {
  return ogImage({ eyebrow: OFFER.name, title: DIAGNOSTICO.titulo.en });
}
