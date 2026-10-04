import { createSessionClient } from '@/lib/auth/client';
import { currentSession, podeEscrever } from '@/lib/auth/session';
import { serverEnv } from '@/lib/config/env';
import { qrDe, svgDe } from '@/lib/inqueritos/qr';
import { tokenDoLink, urlDoInquerito } from '@/lib/inqueritos/token';
import { SITE_URL } from '@/lib/seo/site';

/**
 * O código QR de um link, em SVG, para imprimir. Só para a equipa: o
 * middleware exige sessão em /admin, e aqui volta a verificar-se o perfil (só
 * quem pode escrever) e a ler-se o link pela sessão (RLS). Um link revogado
 * não tem QR.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const nada = (status: number) =>
  new Response(null, { status, headers: { 'Cache-Control': 'no-store' } });

export async function GET(
  _pedido: Request,
  { params }: { params: Promise<{ id: string; linkId: string }> },
) {
  const env = serverEnv();
  if (env.SURVEYS !== 'on') return nada(404);
  const { id, linkId } = await params;
  if (!UUID.test(id) || !UUID.test(linkId)) return nada(404);
  const sessao = await currentSession();
  if (!sessao) return nada(404);
  // O QR é uma capacidade de responder: só para admin e comercial.
  if (!podeEscrever(sessao.papel)) return nada(403);
  if (!env.SURVEY_LINK_SECRET) return nada(503);

  const supabase = await createSessionClient();
  const { data } = await supabase
    .from('survey_links')
    .select('id, revoked_at')
    .eq('id', linkId)
    .eq('questionnaire_id', id)
    .maybeSingle();
  if (!data || data.revoked_at) return nada(404);

  const svg = svgDe(qrDe(urlDoInquerito(SITE_URL, tokenDoLink(env.SURVEY_LINK_SECRET, linkId))));
  return new Response(svg, {
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Content-Disposition': 'attachment; filename="inquerito-qr.svg"',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
