import { jornalLigado, listarPublicados } from '@/lib/news/jornal-servidor';
import { rssDoJornal } from '@/lib/news/rss';
import { SITE_URL } from '@/lib/seo/site';

export const revalidate = 600;

export async function GET() {
  if (!jornalLigado()) return new Response('Not found', { status: 404 });
  const artigos = await listarPublicados('pt', null, 30);
  if (artigos === null) return new Response('Indisponível', { status: 503, headers: { 'retry-after': '120' } });
  return new Response(rssDoJornal(artigos, 'pt', SITE_URL), {
    headers: { 'content-type': 'application/rss+xml; charset=utf-8', 'cache-control': 'public, max-age=600' },
  });
}
