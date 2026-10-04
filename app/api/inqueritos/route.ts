import { NextResponse } from 'next/server';
import { z } from 'zod';
import { serverEnv } from '@/lib/config/env';
import { dbAdmin } from '@/lib/db/client';
import { hashForStorage } from '@/lib/diagnostic/normalize';
import { lerCorpoLimitado } from '@/lib/http/corpo';
import {
  clientKey,
  clientSource,
  createMemoryRateLimiter,
  type RateLimiter,
} from '@/lib/http/rate-limit';
import { log } from '@/lib/log/logger';
import { validarResposta } from '@/lib/inqueritos/respostas';
import {
  ErroDeBase,
  gravarResposta,
  obterInqueritoPublico,
  type ResultadoGravar,
} from '@/lib/inqueritos/servidor';
import { versaoDoConsentimento } from '@/lib/inqueritos/spec';
import {
  SUBMISSAO_VALIDA,
  TOKEN_VALIDO,
  chaveDeIdempotencia,
  hashToken,
  impressaoDasRespostas,
} from '@/lib/inqueritos/token';

/**
 * Recepção pública de respostas a um inquérito.
 *
 * O mesmo endurecimento da rota do diagnóstico, por esta ordem: flag, tipo de
 * conteúdo, tamanho declarado, limite por origem, tamanho real, JSON,
 * envelope, armadilha, limite por link. Só depois se toca na base — e sempre
 * pelas duas funções da 0013, com a chave de serviço.
 *
 * O token vem no CORPO, nunca no URL deste pedido: assim não fica em logs de
 * acesso nem em cabeçalhos `Referer`. Daqui para dentro só circula o hash.
 *
 * As respostas são dados não confiáveis. São validadas contra o spec guardado
 * na base (não contra o que o browser diz que o inquérito é) e nunca entram em
 * logs — nem elas, nem o contacto, nem o token.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** O spec admite até 50 perguntas com textos longos; 64 KB chega com folga. */
const MAX_BYTES = 64 * 1024;

const JANELA_MS = 10 * 60 * 1000;
const MAX_POR_ORIGEM = 20;
/** Um link partilhado numa sala inteira não deve tropeçar no limite. */
const MAX_POR_LINK = 600;

let porOrigem: RateLimiter | null = null;
let porLink: RateLimiter | null = null;
function limitadores(): { origem: RateLimiter; link: RateLimiter } {
  porOrigem ??= createMemoryRateLimiter({ max: MAX_POR_ORIGEM, windowMs: JANELA_MS });
  porLink ??= createMemoryRateLimiter({ max: MAX_POR_LINK, windowMs: JANELA_MS });
  return { origem: porOrigem, link: porLink };
}

const envelope = z.strictObject({
  token: z.string().regex(TOKEN_VALIDO),
  submissionId: z.string().regex(SUBMISSAO_VALIDA),
  respostas: z.record(z.string(), z.unknown()),
  contacto: z.unknown().optional(),
  fax: z.string().max(500).optional(),
});

/** A mesma resposta vaga do diagnóstico: nada que ensine quem sonda. */
function fail(status: number, correlationId: string, headers?: HeadersInit) {
  return NextResponse.json(
    { error: 'Não foi possível processar o pedido.', correlationId },
    { status, headers },
  );
}

/**
 * Link que existiu mas já não aceita respostas: 410 com o estado, para a
 * página dizer «fechado» ou «expirado» em vez de um erro genérico. Um link
 * desconhecido é 404 — e um 404 igual ao da flag desligada.
 */
function fechado(estado: 'fechado' | 'expirado' | 'inexistente', correlationId: string) {
  if (estado === 'inexistente') return fail(404, correlationId);
  return NextResponse.json({ estado, correlationId }, { status: 410 });
}

function esperar(resetAt: number): string {
  return String(Math.max(1, Math.ceil((resetAt - Date.now()) / 1000)));
}

export async function POST(request: Request) {
  const started = Date.now();
  const correlationId = crypto.randomUUID();
  const env = serverEnv();

  // 0. Desligado: a rota não existe para quem está fora.
  if (env.SURVEYS !== 'on') return fail(404, correlationId);

  // 1. Tipo de conteúdo — fecha a porta ao POST «simples» sem CORS.
  const contentType = request.headers.get('content-type') ?? '';
  if (!contentType.toLowerCase().startsWith('application/json')) {
    log.warn('inquerito.recusado', { correlationId, reason: 'content-type', outcome: 'rejected' });
    return fail(415, correlationId);
  }

  // 2. Tamanho declarado.
  const declarado = Number(request.headers.get('content-length') ?? '0');
  if (Number.isFinite(declarado) && declarado > MAX_BYTES) {
    log.warn('inquerito.recusado', {
      correlationId,
      reason: 'content-length',
      bytes: declarado,
      outcome: 'rejected',
    });
    return fail(413, correlationId);
  }

  // 3. Limite por origem, antes de ler o corpo.
  const { origem, link } = limitadores();
  const veredito = origem.check(await clientKey(request));
  if (!veredito.allowed) {
    log.warn('inquerito.limitado', {
      correlationId,
      reason: 'origem',
      limit: MAX_POR_ORIGEM,
      windowMs: JANELA_MS,
      outcome: 'rejected',
    });
    return fail(429, correlationId, { 'Retry-After': esperar(veredito.resetAt) });
  }

  // 4. Tamanho real, lido com tecto — o cabeçalho pode mentir ou faltar.
  const corpo = await lerCorpoLimitado(request, MAX_BYTES);
  if (!corpo.ok) {
    log.warn('inquerito.recusado', { correlationId, reason: corpo.motivo, outcome: 'rejected' });
    return fail(corpo.motivo === 'grande' ? 413 : 400, correlationId);
  }

  // 5. JSON.
  let bruto: unknown;
  try {
    bruto = JSON.parse(corpo.texto);
  } catch {
    log.warn('inquerito.recusado', { correlationId, reason: 'json', outcome: 'rejected' });
    return fail(400, correlationId);
  }

  // 6. Envelope. O conteúdo das respostas valida-se mais à frente, contra o spec.
  const lido = envelope.safeParse(bruto);
  if (!lido.success) {
    log.warn('inquerito.recusado', { correlationId, reason: 'envelope', outcome: 'rejected' });
    return fail(400, correlationId);
  }
  const { token, submissionId, respostas, contacto, fax } = lido.data;

  // 7. Armadilha: sucesso indistinguível, como no diagnóstico.
  if (fax) {
    log.info('inquerito.armadilha', { correlationId, outcome: 'discarded' });
    return NextResponse.json({ ok: true, correlationId }, { status: 202 });
  }

  const tokenHash = hashToken(token);

  const cliente = dbAdmin();
  if (!cliente) {
    // A validação de configuração exige as chaves com SURVEYS=on; chegar aqui é avaria.
    log.error('inquerito.falhou', { correlationId, reason: 'sem-cliente', outcome: 'failed' });
    return fail(503, correlationId, { 'Retry-After': '30' });
  }

  try {
    // 9. O inquérito como está na base, agora — não como o browser o recebeu.
    const inquerito = await obterInqueritoPublico(cliente, tokenHash);
    if (inquerito.estado !== 'aberto') {
      log.info('inquerito.fechado', {
        correlationId,
        reason: inquerito.estado,
        outcome: 'rejected',
      });
      return fechado(inquerito.estado, correlationId);
    }
    const baseLog = { correlationId, entityType: 'inquerito', entityId: inquerito.inquerito };

    // 9-bis. Limite por link — DEPOIS de o link existir. Contado antes, um
    // atacante enchia o limitador com tokens inventados e, cheio, ele recusa
    // chaves novas: os links verdadeiros ficavam a dar 429 (revisão ECC, M1).
    const porEsteLink = link.check(tokenHash);
    if (!porEsteLink.allowed) {
      log.warn('inquerito.limitado', {
        ...baseLog,
        reason: 'link',
        limit: MAX_POR_LINK,
        windowMs: JANELA_MS,
        outcome: 'rejected',
      });
      return fail(429, correlationId, { 'Retry-After': esperar(porEsteLink.resetAt) });
    }

    // 10. Validação pelo spec guardado.
    const validacao = validarResposta(inquerito.spec, { respostas, contacto });
    if (!validacao.ok) {
      log.warn('inquerito.recusado', {
        ...baseLog,
        reason: 'respostas',
        // Só o código do primeiro erro: diz o tipo de falha sem expor conteúdo.
        errorCode: validacao.erros[0]?.codigo,
        outcome: 'rejected',
      });
      return fail(400, correlationId);
    }

    // 11. Gravação. O consentimento é versionado pelo texto que a pessoa leu.
    const textoConsentimento = inquerito.spec.contacto?.textoConsentimento;
    const userAgent = request.headers.get('user-agent') ?? '';
    const resultado: ResultadoGravar = await gravarResposta(cliente, {
      tokenHash,
      respostas: validacao.respostas,
      idempotencyKey: chaveDeIdempotencia(tokenHash, submissionId),
      fingerprint: impressaoDasRespostas(validacao.respostas),
      contacto: validacao.contacto,
      versaoConsentimento:
        validacao.contacto && textoConsentimento
          ? await versaoDoConsentimento(textoConsentimento)
          : null,
      ipHash: await hashForStorage(clientSource(request)),
      uaHash: userAgent ? await hashForStorage(userAgent) : null,
    });

    if (!resultado.ok) {
      if (resultado.estado === 'limitado') {
        log.warn('inquerito.limitado', { ...baseLog, reason: 'origem-base', outcome: 'rejected' });
        return fail(429, correlationId, { 'Retry-After': '600' });
      }
      // Fechou entre a leitura e a gravação (revogado, tecto atingido).
      log.info('inquerito.fechado', { ...baseLog, reason: resultado.estado, outcome: 'rejected' });
      return fechado(resultado.estado, correlationId);
    }

    log.info('inquerito.aceite', {
      ...baseLog,
      duplicate: resultado.duplicado,
      durationMs: Date.now() - started,
      outcome: 'accepted',
    });
    // A mesma resposta para nova e repetida: o browser não precisa de saber.
    return NextResponse.json({ ok: true, correlationId }, { status: 200 });
  } catch (erro) {
    log.error('inquerito.falhou', {
      correlationId,
      errorCode: erro instanceof ErroDeBase ? erro.codigo : 'desconhecido',
      durationMs: Date.now() - started,
      outcome: 'failed',
    });
    return fail(503, correlationId, { 'Retry-After': '30' });
  }
}
