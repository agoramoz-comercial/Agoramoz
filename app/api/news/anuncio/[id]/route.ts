import { after, NextResponse } from 'next/server';
import { z } from 'zod';
import { registarEventoServidor } from '@/lib/analytics/servidor';
import { dbAdmin } from '@/lib/db/client';
import { clientKey, createMemoryRateLimiter } from '@/lib/http/rate-limit';
import { log } from '@/lib/log/logger';
import { comUtm, destinoSeguro, POSICOES_ANUNCIO, type PosicaoAnuncio } from '@/lib/news/anuncios';
import { jornalLigado } from '@/lib/news/jornal-servidor';

/**
 * O clique num anúncio do outdoor: conta e manda (303) para o destino
 * GUARDADO na base, com a campanha UTM. O URL deste pedido nunca escolhe o
 * destino — um link adulterado não abre redireccionamento para lado nenhum.
 * Um anúncio que já não está no ar leva ao jornal.
 *
 * O redireccionamento acontece SEMPRE (mesmo com o limite atingido ou a base
 * em baixo): quem clica chega a algum lado; só a contagem é que fica de fora.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const limite = createMemoryRateLimiter({ max: 30, windowMs: 600_000 });
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
/** `k`: a chave do leitor JÁ derivada no browser (`sha256(token:id)`) — o token nunca vem no URL. */
const CHAVE = /^[0-9a-f]{64}$/;

function irPara(destino: string, request: Request) {
  return NextResponse.redirect(new URL(destino, request.url), {
    status: 303,
    headers: { 'cache-control': 'no-store', 'referrer-policy': 'strict-origin-when-cross-origin' },
  });
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const correlationId = crypto.randomUUID();
  const { id } = await params;
  if (!jornalLigado() || !UUID.test(id)) return irPara('/news', request);

  const url = new URL(request.url);
  const p = url.searchParams.get('p');
  const posicao: PosicaoAnuncio | null = (POSICOES_ANUNCIO as readonly string[]).includes(p ?? '')
    ? (p as PosicaoAnuncio)
    : null;

  const k = url.searchParams.get('k');
  const chave = k && CHAVE.test(k) ? k : null;

  const db = dbAdmin();
  const conta = limite.check(await clientKey(request)).allowed;
  if (!db) return irPara('/news', request);

  const { data, error } = await db.rpc('registar_clique_anuncio', {
    p_id: id,
    p_posicao: conta ? posicao : null,
    p_chave_hash: conta ? chave : null,
  });
  if (error) {
    log.warn('news.anuncio_clique', { correlationId, reason: 'base', errorCode: error.code ?? 'desconhecido', outcome: 'failed' });
    return irPara('/news', request);
  }
  const r = z.object({ destino: z.string(), slug: z.string() }).nullable().safeParse(data);
  if (!r.success || !r.data || !destinoSeguro(r.data.destino)) return irPara('/news', request);

  if (conta) after(() => registarEventoServidor('anuncio_clique', { posicao: posicao ?? 'desconhecida' }, { path: '/news' }));
  log.info('news.anuncio_clique', { correlationId, entityType: 'news_anuncio', entityId: id, outcome: conta ? 'accepted' : 'limitado' });
  return irPara(comUtm(r.data.destino, r.data.slug, posicao), request);
}
