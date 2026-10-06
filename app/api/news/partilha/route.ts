import { after, NextResponse } from 'next/server';
import { z } from 'zod';
import { registarEventoServidor } from '@/lib/analytics/servidor';
import { dbAdmin } from '@/lib/db/client';
import { createMemoryRateLimiter } from '@/lib/http/rate-limit';
import { log } from '@/lib/log/logger';
import { CANAIS_PARTILHA } from '@/lib/news/partilha';
import { falhar, lerEntrada } from '@/lib/news/rota';
import { comLimite, LIMITE_ROTA_MS } from '@/lib/news/tempo';

/** Conta uma partilha de um artigo publicado, por canal (sem saber quem). */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const limite = createMemoryRateLimiter({ max: 30, windowMs: 600_000 });

const esquema = z.strictObject({
  slug: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/).max(90),
  canal: z.enum(CANAIS_PARTILHA),
});

export async function POST(request: Request) {
  const correlationId = crypto.randomUUID();
  const e = await lerEntrada(request, { evento: 'news.partilha', esquema, maxBytes: 512, limite, correlationId });
  if (!e.ok) return e.resposta;

  const db = dbAdmin();
  if (!db) return falhar(503, correlationId);
  const { data, error } = await comLimite(
    db.rpc('partilhar_artigo', { p_slug: e.dados.slug, p_canal: e.dados.canal }),
    LIMITE_ROTA_MS,
  );
  if (error) {
    log.warn('news.partilha', { correlationId, reason: 'base', errorCode: error.code ?? 'desconhecido', outcome: 'failed' });
    return falhar(error.code === 'P0002' ? 404 : 503, correlationId);
  }
  after(() => registarEventoServidor('news_partilha', { canal: e.dados.canal }, { path: '/news' }));
  log.info('news.partilha', { correlationId, modo: e.dados.canal, outcome: 'accepted' });
  return NextResponse.json(
    { ok: true, partilhas: typeof data === 'number' ? data : null },
    { headers: { 'cache-control': 'no-store' } },
  );
}
