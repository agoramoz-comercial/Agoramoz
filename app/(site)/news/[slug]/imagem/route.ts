import Imagem from '../opengraph-image';

/**
 * A imagem do artigo num endereço ESTÁVEL (`/news/<slug>/imagem`), para o
 * `image` do JSON-LD NewsArticle: a rota `opengraph-image` leva um sufixo que
 * o Next gera, e que não se pode prever na página.
 */
export const runtime = 'nodejs';

export async function GET(_: Request, { params }: { params: Promise<{ slug: string }> }) {
  return Imagem({ params });
}
