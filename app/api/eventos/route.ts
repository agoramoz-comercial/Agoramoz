import { NextResponse } from 'next/server';
import { eventoRecebido } from '@/lib/analytics/event-schema';
import { sanitizarCaminho, sanitizarUtm } from '@/lib/attribution/sanitize';
import { serverEnv } from '@/lib/config/env';
import { dbAdmin } from '@/lib/db/client';
import { clientKey, createMemoryRateLimiter, type RateLimiter } from '@/lib/http/rate-limit';
import { log } from '@/lib/log/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Recolha de eventos de primeira parte.
 *
 * Três propriedades que a distinguem de um endpoint de analytics comum:
 *
 * 1. **Responde `204` a tudo depois do parse.** Aceite, recusado pelo schema,
 *    persistência desligada, base em baixo — a resposta é a mesma. Quem sonda
 *    não aprende o que passa e o que não passa, e a interface do site nunca
 *    depende do resultado.
 *
 * 2. **Não aceita identidade.** Não há `contact_id`, `deal_id`, `visitor_id`
 *    nem cookie. O browser não pode afirmar quem é. A ligação ao CRM faz-se
 *    por canal, do lado do servidor.
 *
 * 3. **Não aceita eventos de servidor.** `deal_created`, `deal_won` e
 *    `document_confirmed_view` nascem em gatilhos da base; o schema não os
 *    inclui, e portanto um browser não os pode forjar.
 */

const MAX_BYTES = 4_096;

let limitador: RateLimiter | null = null;
function getLimitador(max: number): RateLimiter {
  limitador ??= createMemoryRateLimiter({ max, windowMs: 60_000 });
  return limitador;
}

/** Sempre 204. Ver a nota 1 acima. */
const aceite = () => new NextResponse(null, { status: 204 });

export async function POST(request: Request): Promise<NextResponse> {
  const env = serverEnv();

  const contentType = request.headers.get('content-type') ?? '';
  if (!contentType.toLowerCase().startsWith('application/json')) {
    return new NextResponse(null, { status: 415 });
  }

  const declarado = Number(request.headers.get('content-length') ?? '0');
  if (declarado > MAX_BYTES) return new NextResponse(null, { status: 413 });

  const chave = await clientKey(request);
  if (!getLimitador(env.ANALYTICS_RATE_LIMIT_MAX).check(chave).allowed) {
    return new NextResponse(null, { status: 429 });
  }

  const bruto = await request.text();
  if (new TextEncoder().encode(bruto).length > MAX_BYTES) {
    return new NextResponse(null, { status: 413 });
  }

  let corpo: unknown;
  try {
    corpo = JSON.parse(bruto);
  } catch {
    return new NextResponse(null, { status: 400 });
  }

  const validado = eventoRecebido.safeParse(corpo);
  if (!validado.success) {
    // Contado, não devolvido: um schema recusado em massa é sinal de um
    // cliente desactualizado ou de sondagem, e ambos interessam saber.
    log.warn('analytics.rejected', { outcome: 'rejected', reason: 'schema' });
    return aceite();
  }

  if (env.ANALYTICS_PERSISTENCE !== 'on') return aceite();

  const cliente = dbAdmin();
  if (!cliente) return aceite();

  const { evento, channel, campaign, path } = validado.data;
  const { name, ...props } = evento;

  try {
    const { error } = await cliente.from('analytics_events').insert({
      name,
      channel,
      // Re-saneados no servidor: chegaram do cliente, e o cliente não é a
      // autoridade sobre eles.
      campaign: sanitizarUtm(campaign),
      path: sanitizarCaminho(path),
      props,
      origin: 'browser',
    });

    if (error) {
      log.error('analytics.insert_failed', { outcome: 'failed', errorCode: error.code ?? 'desconhecido' });
    }
  } catch {
    log.error('analytics.insert_failed', { outcome: 'failed', errorCode: 'excepcao' });
  }

  return aceite();
}
