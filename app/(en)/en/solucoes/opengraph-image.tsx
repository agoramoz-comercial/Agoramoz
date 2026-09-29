import { INDICE_SOLUCOES } from '@/content/i18n/paginas';
import { OG_CONTENT_TYPE, OG_SIZE, ogImage } from '@/lib/seo/og';

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = INDICE_SOLUCOES.titulo.en;

/** O índice de soluções, em inglês — o título que a página mostra. */
export default function Image() {
  return ogImage({ eyebrow: INDICE_SOLUCOES.eyebrow.en, title: INDICE_SOLUCOES.titulo.en });
}
