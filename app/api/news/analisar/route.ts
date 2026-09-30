import { NextResponse } from 'next/server';
import { serverEnv } from '@/lib/config/env';
import { clientKey, createMemoryRateLimiter, type RateLimiter } from '@/lib/http/rate-limit';
import { log } from '@/lib/log/logger';
import { analisarComLovable } from '@/lib/news/motor';
import { pedidoSchema } from '@/lib/news/pedido';

/**
 * AGORAMOZ Moz News — a análise de uma notícia.
 *
 * O browser nunca fala com o motor. Esta rota é o único caminho: valida o
 * pedido, limita a taxa (cada análise gasta créditos de IA na conta Lovable),
 * chama `analyze-news` com a chave do lado do servidor e devolve a análise já
 * normalizada — o que sai daqui é o nosso modelo, não o JSON do motor.
 *
 * Nada é guardado. Publicar uma análise é outra decisão, humana (fase 2).
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_CORPO = 64 * 1024;
/** O motor lê o artigo e gera o relatório; 20–40 s é normal. */
const TIMEOUT_MOTOR_MS = 60_000;
export const maxDuration = 70;

let limiter: RateLimiter | null = null;
function getLimiter(): RateLimiter {
  const env = serverEnv();
  limiter ??= createMemoryRateLimiter({ max: env.NEWS_RATE_LIMIT_MAX, windowMs: env.NEWS_RATE_LIMIT_WINDOW_MS });
  return limiter;
}

const SEM_CACHE = { 'Cache-Control': 'no-store' };

/** A mesma mensagem vaga para tudo — o cliente escolhe o texto pelo código. */
function fail(status: number, correlationId: string, headers?: Record<string, string>) {
  return NextResponse.json(
    { error: 'Não foi possível analisar esta notícia.', correlationId },
    { status, headers: { ...SEM_CACHE, ...headers } },
  );
}

export async function POST(request: Request) {
  const started = Date.now();
  const correlationId = crypto.randomUUID();
  const env = serverEnv();

  if (env.NEWS_ENGINE === 'off' || !env.LOVABLE_NEWS_FUNCTION_URL || !env.LOVABLE_NEWS_API_KEY) {
    log.warn('news.falhou', { correlationId, reason: 'motor-desligado', outcome: 'rejected' });
    return fail(503, correlationId);
  }

  const contentType = request.headers.get('content-type') ?? '';
  if (!contentType.toLowerCase().startsWith('application/json')) {
    log.warn('news.falhou', { correlationId, reason: 'content-type', outcome: 'rejected' });
    return fail(415, correlationId);
  }

  const declarado = Number(request.headers.get('content-length') ?? '0');
  if (Number.isFinite(declarado) && declarado > MAX_CORPO) {
    log.warn('news.falhou', { correlationId, reason: 'content-length', bytes: declarado, outcome: 'rejected' });
    return fail(413, correlationId);
  }

  const veredicto = getLimiter().check(await clientKey(request));
  if (!veredicto.allowed) {
    const retryAfter = Math.max(1, Math.ceil((veredicto.resetAt - Date.now()) / 1000));
    log.warn('news.falhou', {
      correlationId,
      reason: 'rate-limit',
      limit: env.NEWS_RATE_LIMIT_MAX,
      windowMs: env.NEWS_RATE_LIMIT_WINDOW_MS,
      outcome: 'rejected',
    });
    return fail(429, correlationId, { 'Retry-After': String(retryAfter) });
  }

  let bruto: string;
  try {
    bruto = await request.text();
  } catch {
    return fail(400, correlationId);
  }
  const bytes = new TextEncoder().encode(bruto).length;
  if (bytes > MAX_CORPO) {
    log.warn('news.falhou', { correlationId, reason: 'body-bytes', bytes, outcome: 'rejected' });
    return fail(413, correlationId);
  }

  let json: unknown;
  try {
    json = JSON.parse(bruto);
  } catch {
    log.warn('news.falhou', { correlationId, reason: 'json', outcome: 'rejected' });
    return fail(400, correlationId);
  }

  const parsed = pedidoSchema.safeParse(json);
  if (!parsed.success) {
    log.warn('news.falhou', { correlationId, reason: 'schema', outcome: 'rejected' });
    return fail(400, correlationId);
  }
  const pedido = parsed.data;

  // O URL e o texto NUNCA vão para o log: dizem o que alguém anda a ler.
  const baseLog = { correlationId, idioma: pedido.idioma, modo: pedido.modo };

  const resultado = await analisarComLovable(pedido, {
    url: env.LOVABLE_NEWS_FUNCTION_URL,
    chave: env.LOVABLE_NEWS_API_KEY,
    timeoutMs: TIMEOUT_MOTOR_MS,
  });

  if (!resultado.ok) {
    log.error('news.falhou', {
      ...baseLog,
      reason: resultado.motivo,
      status: resultado.status,
      durationMs: Date.now() - started,
      outcome: 'failed',
    });
    return fail(resultado.motivo === 'timeout' ? 504 : 502, correlationId);
  }

  log.info('news.analisada', {
    ...baseLog,
    prioridade: resultado.analise.prioridade ?? 'desconhecida',
    durationMs: Date.now() - started,
    outcome: 'ok',
  });

  return NextResponse.json(
    { ok: true, correlationId, motor: 'lovable', analise: resultado.analise },
    { status: 200, headers: SEM_CACHE },
  );
}
