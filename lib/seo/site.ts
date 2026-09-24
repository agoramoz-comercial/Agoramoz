import type { Metadata } from 'next';
import { SITE } from '@/content/site';

export const SITE_URL = SITE.url.replace(/\/$/, '');

export function absolute(path: string) {
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

export interface ImagemSocial {
  url: string;
  width: number;
  height: number;
  alt: string;
}

/**
 * A imagem de partilha, declarada em vez de herdada.
 *
 * Porque é explícita: em 2026-09-24 medi a produção e `app/opengraph-image.tsx`
 * existia, respondia `200 image/png` em `/opengraph-image` — e **nenhuma página
 * emitia `og:image`**. Zero etiquetas `og:image` e `twitter:image` em `/` e em
 * `/solucoes/agentes-ia`. A convenção de ficheiro do Next não sobreviveu ao
 * objecto `openGraph` explícito que esta função devolve, e o defeito era
 * invisível a partir do código: a imagem existia, funcionava, e ninguém lhe
 * apontava. O efeito era cada ligação partilhada no LinkedIn e no WhatsApp sair
 * sem imagem — os dois canais onde a AGORAMOZ é de facto partilhada.
 *
 * Declarar aqui torna o resultado independente da resolução de convenções do
 * Next, e abre a porta a uma imagem própria por página, que era impossível
 * enquanto a herança era implícita.
 */
export const OG_IMAGE_PADRAO: ImagemSocial = {
  url: absolute('/opengraph-image'),
  width: 1200,
  height: 630,
  alt: `AGORAMOZ — ${SITE.tagline}`,
};

/**
 * hreflang recíproco. Só emitimos alternates para páginas que existem de
 * facto — um hreflang para uma página inexistente é, na melhor das hipóteses,
 * ignorado pelos motores de busca.
 */
export function buildMetadata({
  title,
  description,
  path,
  languages,
  noindex,
  image,
  tituloAbsoluto,
}: {
  title: string;
  description: string;
  path: string;
  languages?: Record<string, string>;
  noindex?: boolean;
  image?: ImagemSocial;
  /**
   * Ignora o template `'%s | AGORAMOZ'` da raiz.
   *
   * Só a página inicial precisa disto: é a única cujo título deve começar pela
   * marca. Sem isto, o template acrescentava a marca a um título que já a
   * continha — que foi exactamente o defeito medido nas páginas de solução,
   * onde o `<title>` saía `'... | AGORAMOZ | AGORAMOZ'`.
   */
  tituloAbsoluto?: boolean;
}): Metadata {
  const imagem = image ?? OG_IMAGE_PADRAO;

  return {
    title: tituloAbsoluto ? { absolute: title } : title,
    description,
    alternates: {
      canonical: absolute(path),
      ...(languages ? { languages } : {}),
    },
    openGraph: {
      title,
      description,
      url: absolute(path),
      siteName: 'AGORAMOZ',
      locale: 'pt_PT',
      type: 'website',
      images: [imagem],
    },
    twitter: { card: 'summary_large_image', title, description, images: [imagem.url] },
    ...(noindex ? { robots: { index: false, follow: false } } : {}),
  };
}
