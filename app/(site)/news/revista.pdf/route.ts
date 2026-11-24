import { respostaRevista } from '@/lib/news/revista-servidor';
import { SITE_URL } from '@/lib/seo/site';

/** A revista do AGORAMOZ News em PDF (edição pt); refeita no máximo a cada 10 minutos. */
export const revalidate = 600;

export async function GET() {
  return respostaRevista('pt', SITE_URL);
}
