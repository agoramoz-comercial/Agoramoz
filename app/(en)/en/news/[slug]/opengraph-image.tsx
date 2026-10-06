import { MARCA_NEWS } from '@/content/i18n/news';
import { NOME_DA_SECCAO } from '@/lib/news/artigo';
import { jornalLigado, obterPublicado } from '@/lib/news/jornal-servidor';
import { OG_CONTENT_TYPE, OG_SIZE, ogImage } from '@/lib/seo/og';

export const runtime = 'nodejs';
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = MARCA_NEWS;

/** A imagem de partilha de cada artigo: secção e título reais, tipográfica. */
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const a = jornalLigado() ? await obterPublicado(slug) : null;
  if (!a || a.idioma !== 'en') return ogImage({ eyebrow: MARCA_NEWS, title: 'AGORAMOZ News' });
  return ogImage({ eyebrow: `${MARCA_NEWS} · ${NOME_DA_SECCAO[a.seccao].en}`, title: a.titulo });
}
