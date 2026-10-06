import { z } from 'zod';
import { dbAdmin } from '@/lib/db/client';
import { createMemoryRateLimiter } from '@/lib/http/rate-limit';
import { log } from '@/lib/log/logger';
import { POSICOES_ANUNCIO } from '@/lib/news/anuncios';
import { TOKEN } from '@/lib/news/leitor';
import { chaveDoLeitor } from '@/lib/news/leitor-servidor';
import { falhar, lerEntrada } from '@/lib/news/rota';
import { comLimite, LIMITE_ROTA_MS } from '@/lib/news/tempo';

/**
 * Impressões do outdoor, em lote (até 8), enviadas por `sendBeacon`. Responde
 * 204 sempre que o pedido é válido — o browser não espera nem mostra nada. O
 * alcance único usa uma chave por anúncio, para o mesmo leitor não ser ligado
 * de anúncio para anúncio.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const limite = createMemoryRateLimiter({ max: 120, windowMs: 600_000 });
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

const esquema = z.strictObject({
  itens: z
    .array(z.strictObject({ id: z.string().regex(UUID), posicao: z.enum(POSICOES_ANUNCIO) }))
    .min(1)
    .max(8),
  token: z.string().regex(TOKEN).optional(),
});

export async function POST(request: Request) {
  const correlationId = crypto.randomUUID();
  const e = await lerEntrada(request, {
    evento: 'news.impressoes',
    esquema,
    maxBytes: 2048,
    limite,
    correlationId,
  });
  if (!e.ok) return e.resposta;

  const db = dbAdmin();
  if (!db) return falhar(503, correlationId);
  // Um item por chamada: cada anúncio tem a sua chave de leitor.
  const resultados = await Promise.all(
    e.dados.itens.map((item) =>
      comLimite(
        db.rpc('registar_impressoes', {
          p_itens: [item],
          p_chave_hash: e.dados.token ? chaveDoLeitor(e.dados.token, item.id) : null,
        }),
        LIMITE_ROTA_MS,
      ),
    ),
  );
  const falhas = resultados.filter((r) => r.error).length;
  if (falhas > 0)
    log.warn('news.impressoes', { correlationId, reason: 'base', descartados: falhas, outcome: 'failed' });
  return new Response(null, { status: 204, headers: { 'cache-control': 'no-store' } });
}
