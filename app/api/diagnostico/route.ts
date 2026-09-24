import { NextResponse } from 'next/server';
import { serverEnv } from '@/lib/config/env';
import { dbAdmin, ingestDiagnosticResponse, type IngestResult } from '@/lib/db/client';
import { consentTextFor, consentVersionFor } from '@/lib/diagnostic/consent';
import {
  canonicalAnswers,
  idempotencyKey,
  inputFingerprint,
  hashForStorage,
} from '@/lib/diagnostic/normalize';
import { runRules } from '@/lib/diagnostic/rules';
import { SCORING_VERSION, scoreDiagnostic } from '@/lib/diagnostic/score';
import { leadSchema, type LeadInput } from '@/lib/forms/lead-schema';
import {
  clientKey,
  clientSource,
  createMemoryRateLimiter,
  type RateLimiter,
} from '@/lib/http/rate-limit';
import { log } from '@/lib/log/logger';

/**
 * Ingestão do diagnóstico.
 *
 * O pedido público termina no COMMIT da função transacional `ingest_diagnostic_
 * response`: ou fica gravado o contacto, o consentimento, a resposta, o
 * diagnóstico, a oportunidade e o evento de fila, ou não fica nada. Nada
 * externo — n8n, IA, e-mail — é chamado a partir daqui. O que faz esse trabalho
 * lê a fila depois, e por isso uma VPS em baixo deixa de poder perder um lead.
 *
 * O que esta rota NÃO faz, de propósito: não redige, não gera documento, não
 * envia. Um diagnóstico nasce em `computed` e só sai de lá por decisão humana.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Versão do questionário PARA EFEITOS DE IDEMPOTÊNCIA. Entra na chave para que
 * o mesmo cliente possa responder de novo quando as perguntas mudarem — é
 * resposta nova, não repetição.
 *
 * É deliberadamente uma constante e não o slug da base: mudá-la invalida todas
 * as chaves existentes, e isso tem de ser uma edição visível em código, não um
 * efeito lateral de alguém renomear um questionário no painel.
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
 * aceites e, agora que há contactos em base, permitiria distinguir «este
 * e-mail já existe» de «este não existe». O `correlationId` dá ao utilizador
 * legítimo algo para citar no suporte sem revelar nada a mais.
 */
function fail(status: number, correlationId: string, headers?: HeadersInit) {
  return NextResponse.json(
    { error: 'Não foi possível processar o pedido.', correlationId },
    { status, headers },
  );
}

/**
 * O que é gravado como resposta em bruto.
 *
 * Sai a armadilha: `fax` é mecanismo nosso, está sempre vazio quando se chega
 * aqui, e guardá-lo só ensinaria a quem lesse a base qual é o campo que
 * denuncia um bot.
 */
function rawForStorage(input: LeadInput): Record<string, unknown> {
  const campos: Record<string, unknown> = { ...input };
  delete campos.fax;
  return campos;
}

/**
 * O que é gravado como respostas normalizadas, uma linha por pergunta.
 *
 * Sai o `workEmail`: a identidade da pessoa vive em `contacts`, e repeti-la
 * numa tabela cuja razão de existir é agregar respostas espalharia PII por um
 * sítio onde ela não é precisa para nada. O e-mail continua a entrar na
 * impressão digital e na chave de idempotência — aí é usado, não guardado.
 */
function normalizedForStorage(input: LeadInput): Record<string, unknown> {
  const campos: Record<string, unknown> = { ...canonicalAnswers(input) };
  delete campos.workEmail;
  return campos;
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

  const input = parsed.data;

  // 8. Pontuação e regras. Puro, determinístico, sem rede — o resultado é o
  //    mesmo em cada execução, e é isso que torna um diagnóstico reproduzível.
  const { score, tier } = scoreDiagnostic(input);
  const bundle = runRules(input, SCORING_VERSION);
  const idempotency = await idempotencyKey(input, QUESTIONNAIRE_VERSION);

  /**
   * `tier` e `score` ficam no log, que é interno, e NÃO na resposta.
   * Antes eram devolvidos ao browser e publicados em `window.dataLayer`, ao
   * contrário da regra escrita em `lead-score.ts`: qualquer visitante via em
   * devtools que tinha sido classificado. Ver D-15 em `docs/DECISIONS.md`.
   *
   * `company`, `name`, `workEmail` e `phone` nunca entram aqui — o logger
   * descarta-os por lista de permissões, mas não são sequer passados.
   */
  const baseLog = {
    correlationId,
    country: input.country,
    sector: input.sector,
    companySize: input.companySize,
    decisionTimeframe: input.decisionTimeframe,
    decisionRole: input.decisionRole,
    score,
    tier,
    // Hash, não conteúdo: serve para reconhecer repetições sem guardar nada.
    entityType: 'idempotency',
    entityId: idempotency.slice(0, 16),
  };

  // 9. Persistência.
  if (env.DIAGNOSTIC_PERSISTENCE === 'off') {
    /**
     * Modo sem base de dados. Grita a cada submissão de propósito: uma
     * submissão aceite e não guardada é a pior falha possível deste sistema, e
     * a única coisa pior do que ela acontecer é acontecer em silêncio.
     */
    log.warn('diagnostic.not_persisted', {
      ...baseLog,
      reason: 'DIAGNOSTIC_PERSISTENCE=off',
      durationMs: Date.now() - started,
      outcome: 'accepted_not_persisted',
    });
    return NextResponse.json({ ok: true, correlationId }, { status: 200 });
  }

  const client = dbAdmin();
  if (!client) {
    // A validação de configuração já impede este estado quando o modo é
    // `required`. Se ainda assim acontecer, é falha de serviço — nunca um 200.
    log.error('diagnostic.persist_failed', {
      ...baseLog,
      reason: 'sem-cliente',
      durationMs: Date.now() - started,
      outcome: 'failed',
    });
    return fail(503, correlationId, { 'Retry-After': '30' });
  }

  let resultado: IngestResult;
  try {
    const fingerprint = await inputFingerprint(input);
    const consentText = consentTextFor(input.country);
    const consentVersion = await consentVersionFor(input.country);
    const userAgent = request.headers.get('user-agent') ?? '';

    resultado = await ingestDiagnosticResponse(client, {
      questionnaireSlug: env.DIAGNOSTIC_QUESTIONNAIRE_SLUG,
      payload: rawForStorage(input),
      normalized: normalizedForStorage(input),
      idempotencyKey: idempotency,
      inputFingerprint: fingerprint,
      score,
      tier,
      rulesetVersion: bundle.rulesetVersion,
      scoringVersion: bundle.scoringVersion,
      findings: bundle.findings,
      /**
       * O pacote SEM os achados. `findings` tem coluna própria, que é onde se
       * consulta e se indexa; repeti-los aqui criaria duas cópias que um dia
       * discordariam uma da outra. Quem precisar do pacote inteiro recompõe-o
       * com `{ ...evidence_bundle, findings }`.
       */
      evidenceBundle: {
        rulesetVersion: bundle.rulesetVersion,
        scoringVersion: bundle.scoringVersion,
        evidence: bundle.evidence,
        allowedNumbers: bundle.allowedNumbers,
      },
      consentText,
      consentVersion,
      correlationId,
      /**
       * SHA-256 completo, não a chave do limitador. As colunas `ip_hash` e
       * `user_agent_hash` exigem 64 hexadecimais por CHECK; a chave do
       * limitador é truncada a 32 e não serve para aqui.
       */
      ipHash: await hashForStorage(clientSource(request)),
      userAgentHash: userAgent ? await hashForStorage(userAgent) : null,
    });
  } catch (erro) {
    /**
     * 503 e não 200. O cliente vê erro e pode voltar a tentar — e voltar a
     * tentar é seguro, porque a chave de idempotência é derivada do conteúdo:
     * a segunda submissão idêntica reconhece-se e não duplica o lead.
     *
     * Devolver 200 aqui seria dizer «recebemos» sobre algo que se perdeu. É
     * exactamente a falha que toda esta arquitetura existe para impedir.
     */
    log.error('diagnostic.persist_failed', {
      ...baseLog,
      errorCode: (erro as { code?: string }).code ?? 'desconhecido',
      durationMs: Date.now() - started,
      outcome: 'failed',
    });
    return fail(503, correlationId, { 'Retry-After': '30' });
  }

  log.info('diagnostic.accepted', {
    ...baseLog,
    duplicate: resultado.duplicate,
    durationMs: Date.now() - started,
    outcome: 'accepted',
  });

  /**
   * A resposta é a MESMA quer seja submissão nova quer seja repetição. Dizer
   * ao cliente «já tínhamos isto» não lhe serve para nada e serve para sondar:
   * permitiria descobrir, e-mail a e-mail, quem já pediu um diagnóstico.
   */
  return NextResponse.json({ ok: true, correlationId }, { status: 200 });
}
