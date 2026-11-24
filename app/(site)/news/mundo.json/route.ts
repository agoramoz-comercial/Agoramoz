import { mundoParaTextura } from '@/lib/news/mapa';

/**
 * O mundo (Natural Earth 1:110m, domínio público) em caminhos SVG
 * equirectangulares, para a textura do globo 3D do News. Gerado no build:
 * o globo nunca pede mapas a terceiros.
 */
export const dynamic = 'force-static';

export function GET() {
  return Response.json(mundoParaTextura(), {
    headers: { 'cache-control': 'public, max-age=86400, stale-while-revalidate=604800' },
  });
}
