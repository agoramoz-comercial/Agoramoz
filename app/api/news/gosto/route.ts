import { after, NextResponse } from 'next/server';
import { z } from 'zod';
import { registarEventoServidor } from '@/lib/analytics/servidor';
import { dbAdmin } from '@/lib/db/client';
import { createMemoryRateLimiter } from '@/lib/http/rate-limit';
import { log } from '@/lib/log/logger';
import { TOKEN } from '@/lib/news/leitor';
import { chaveDoLeitor } from '@/lib/news/leitor-servidor';
import { falhar, lerEntrada } from '@/lib/news/rota';

/**
 * Gosto num artigo publicado: um por browser (hash do token anónimo + artigo).
 * Repetir não soma — a base é que garante (`gostar_artigo`, 0015).
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const limite = createMemoryRateLimiter({ max: 60, windowMs: 600_000 });

const esquema = z.strictObject({
  slug: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/).max(90),
  token: z.string().regex(TOKEN),
});

export async function POST(request: Request) {
  const correlationId = crypto.randomUUID();
  const e = await lerEntrada(request, { evento: 'news.gosto', esquema, maxBytes: 1024, limite, correlationId });
  if (!e.ok) return e.resposta;

  const db = dbAdmin();
  if (!db) return falhar(503, correlationId);
  const chave = chaveDoLeitor(e.dados.token, e.dados.slug)!;
  const { data, error } = await db.rpc('gostar_artigo', { p_slug: e.dados.slug, p_chave_hash: chave });
  if (error) {
    const status = error.code === 'P0002' ? 404 : 503;
    log.warn('news.gosto', { correlationId, reason: 'base', errorCode: error.code ?? 'desconhecido', outcome: 'failed' });
    return falhar(status, correlationId);
  }
  const r = z.object({ gostos: z.number().int(), novo: z.boolean() }).safeParse(data);
  if (!r.success) return falhar(503, correlationId);
  if (r.data.novo) after(() => registarEventoServidor('news_gosto', {}, { path: '/news' }));
  log.info('news.gosto', { correlationId, outcome: r.data.novo ? 'accepted' : 'duplicate' });
  return NextResponse.json({ ok: true, gostos: r.data.gostos }, { headers: { 'cache-control': 'no-store' } });
}
