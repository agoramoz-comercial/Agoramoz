import { NextResponse } from 'next/server';
import { serverEnv } from '@/lib/config/env';
import { idempotencyKey } from '@/lib/diagnostic/normalize';
import { leadSchema } from '@/lib/forms/lead-schema';
import { scoreLead } from '@/lib/forms/lead-score';
import { clientKey, createMemoryRateLimiter, type RateLimiter } from '@/lib/http/rate-limit';
import { log } from '@/lib/log/logger';

/**
 * Ingestão do diagnóstico.
 *
 * ⚠ ESTADO CONHECIDO: esta rota AINDA NÃO PERSISTE. Valida, pontua, regista e
 * devolve 200 — e o utilizador vê «obrigado». Enquanto não existir base de
 * dados, uma submissão válida não fica em lado nenhum recuperável. É a falha
 * mais grave do sistema (T-01 em `docs/THREAT_MODEL.md`) e só se fecha quando
 * a função transacional de ingestão existir.
 *
 * O que este lote fecha é o resto: a rota deixa de ser abusável, deixa de
 * vazar informação em erros e em logs, e passa a produzir o identificador de
 * correlação e a chave de idempotência que a persistência vai precisar — para
 * que ligá-la seja acrescentar uma chamada, não redesenhar isto.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Versão do questionário. Entra na chave de idempotência para que o mesmo
 * cliente possa responder de novo quando as perguntas mudarem — é resposta
 * nova, não repetição. Passa a vir da base de dados na Fase seguinte.
 */
const QUESTIONNAIRE_VERSION = 'diagnostico-v1';

/**
 * Instanciado à primeira chamada, não no topo do módulo: `serverEnv()` valida
 * e lança, e fazê-lo durante o build quebraria a compilação por uma variável
 * que só é precisa em execução.
 */
let limiter: RateLimiter | null = null;
function getLimiter(): RateLimiter {
  const env = serverEnv();
  limiter ??= createMemoryRateLimiter({
    max: env.DIAGNOSTIC_RATE_LIMIT_MAX,
    windowMs: env.DIAGNOSTIC_RATE_LIMIT_WINDOW_MS,
  });
  return limiter;
}

/**
 * Resposta de erro única e deliberadamente vaga.
 *
 * O que existia antes devolvia `fieldErrors` do Zod. Isso é confortável para
 * quem integra e é um mapa para quem sonda: revela nomes de campos, formatos
 * aceites e, quando houver contactos em base, permitiria distinguir «este
 * e-mail já existe» de «este não existe». O `correlationId` dá ao utilizador
 * legítimo algo para citar no suporte sem revelar nada a mais.
 */
function fail(status: number, correlationId: string, headers?: HeadersInit) {
  return NextResponse.json(
    { error: 'Não foi possível processar o pedido.', correlationId },
    { status, headers },
  );
}

export async function POST(request: Request) {
  const started = Date.now();
  const correlationId = crypto.randomUUID();
  const env = serverEnv();

  // 1. Tipo de conteúdo. Um POST com `text/plain` evita a verificação prévia
  //    de CORS no browser; exigir JSON fecha essa porta.
  const contentType = request.headers.get('content-type') ?? '';
  if (!contentType.toLowerCase().startsWith('application/json')) {
    log.warn('diagnostic.rejected', { correlationId, reason: 'content-type', outcome: 'rejected' });
    return fail(415, correlationId);
  }

  // 2. Tamanho declarado. Barato e rejeita antes de ler seja o que for.
  const declared = Number(request.headers.get('content-length') ?? '0');
  if (Number.isFinite(declared) && declared > env.DIAGNOSTIC_MAX_BODY_BYTES) {
    log.warn('diagnostic.rejected', {
      correlationId,
      reason: 'content-length',
      bytes: declared,
      outcome: 'rejected',
    });
    return fail(413, correlationId);
  }

  // 3. Limite de taxa, antes de trabalho de parsing.
  const key = await clientKey(request);
  const verdict = getLimiter().check(key);
  if (!verdict.allowed) {
    const retryAfter = Math.max(1, Math.ceil((verdict.resetAt - Date.now()) / 1000));
    log.warn('diagnostic.rate_limited', {
      correlationId,
      limit: env.DIAGNOSTIC_RATE_LIMIT_MAX,
      windowMs: env.DIAGNOSTIC_RATE_LIMIT_WINDOW_MS,
      outcome: 'rejected',
    });
    return fail(429, correlationId, { 'Retry-After': String(retryAfter) });
  }

  // 4. Tamanho real. O cabeçalho pode mentir ou faltar; isto é o que vale.
  let raw: string;
  try {
    raw = await request.text();
  } catch {
    return fail(400, correlationId);
  }

  const bytes = new TextEncoder().encode(raw).length;
  if (bytes > env.DIAGNOSTIC_MAX_BODY_BYTES) {
    log.warn('diagnostic.rejected', {
      correlationId,
      reason: 'body-bytes',
      bytes,
      outcome: 'rejected',
    });
    return fail(413, correlationId);
  }

  // 5. Parse.
  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    log.warn('diagnostic.rejected', { correlationId, reason: 'json', outcome: 'rejected' });
    return fail(400, correlationId);
  }

  // 6. Validação. O mesmo schema que corre no cliente.
  const parsed = leadSchema.safeParse(payload);
  if (!parsed.success) {
    log.warn('diagnostic.rejected', { correlationId, reason: 'schema', outcome: 'rejected' });
    return fail(400, correlationId);
  }

  // 7. Armadilha. Sucesso indistinguível: um bot que receba erro aprende qual
  //    é o campo que o denuncia. Ver `lead-schema.ts` para o resto do raciocínio.
  if (parsed.data.fax) {
    log.info('diagnostic.honeypot', { correlationId, outcome: 'discarded' });
    return NextResponse.json({ ok: true, correlationId }, { status: 202 });
  }

  const { score, tier } = scoreLead(parsed.data);
  const idempotency = await idempotencyKey(parsed.data, QUESTIONNAIRE_VERSION);

  /**
   * `tier` e `score` ficam no log, que é interno, e NÃO na resposta.
   * Antes eram devolvidos ao browser e publicados em `window.dataLayer`, ao
   * contrário da regra escrita em `lead-score.ts`: qualquer visitante via em
   * devtools que tinha sido classificado. Ver D-15 em `docs/DECISIONS.md`.
   *
   * `company`, `name`, `workEmail` e `phone` nunca entram aqui — o logger
   * descarta-os por lista de permissões, mas não são sequer passados.
   */
  log.info('diagnostic.accepted', {
    correlationId,
    country: parsed.data.country,
    sector: parsed.data.sector,
    companySize: parsed.data.companySize,
    decisionTimeframe: parsed.data.decisionTimeframe,
    decisionRole: parsed.data.decisionRole,
    score,
    tier,
    // Hash, não conteúdo: serve para reconhecer repetições sem guardar nada.
    entityType: 'idempotency',
    entityId: idempotency.slice(0, 16),
    durationMs: Date.now() - started,
    outcome: 'accepted',
  });

  return NextResponse.json({ ok: true, correlationId }, { status: 200 });
}
