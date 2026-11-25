import { respostaArtigoPdf } from '@/lib/news/revista-servidor';
import { SITE_URL } from '@/lib/seo/site';

/** O PDF desta notícia (edição en): texto, análise profunda, mapas citados e indicadores oficiais. */
export const runtime = 'nodejs';

export async function GET(_: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return respostaArtigoPdf(slug, 'en', SITE_URL);
}
