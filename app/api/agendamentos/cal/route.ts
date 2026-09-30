import { NextResponse } from 'next/server';
import { assinaturaValida, lerEntrega } from '@/lib/agendamento/cal';
import { registarReuniao } from '@/lib/agendamento/servidor';
import { serverEnv } from '@/lib/config/env';
import { dbAdmin } from '@/lib/db/client';
import { lerCorpoLimitado } from '@/lib/http/corpo';
import { clientKey, createMemoryRateLimiter, type RateLimiter } from '@/lib/http/rate-limit';
import { log } from '@/lib/log/logger';

/**
 * Webhook do Cal.com: marcações, remarcações, cancelamentos e fim de reunião.
 *
 * A ordem das guardas importa. A assinatura verifica-se sobre o corpo EM
 * BRUTO e ANTES de qualquer parsing: nada do que chega é interpretado sem se
 * saber que veio do Cal. Depois disso, o conteúdo continua a ser dado não
 * confiável — `lerEntrega` guarda só uid, datas, tipo e o `ref` no formato
 * exacto que geramos, e deita fora participantes, respostas e link de vídeo.
 *
 * Respostas: 2xx para tudo o que está resolvido (inclusive o que se ignora),
 * porque o Cal só deixa de reenviar com 2xx; 503 quando a base falha, para
 * que reenvie. Nunca um corpo com detalhe.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_CORPO = 64 * 1024;

/**
 * O Cal envia poucas entregas; um tecto folgado por origem trava só quem
 * inunda o endpoint (e o log) com pedidos sem assinatura. Em memória, por
 * instância — é um travão, não uma quota.
 */
let limitador: RateLimiter | null = null;
const limite = () => (limitador ??= createMemoryRateLimiter({ max: 120, windowMs: 60_000 }));

const resposta = (status: number) =>
  NextResponse.json({ ok: status < 300 }, { status, headers: { 'Cache-Control': 'no-store' } });

export async function POST(request: Request) {
  const started = Date.now();

  let env: ReturnType<typeof serverEnv>;
  try {
    env = serverEnv();
  } catch {
    log.error('agendamento.falhou', { reason: 'config-invalida', outcome: 'failed' });
    return resposta(503);
  }

  if (env.SCHEDULING !== 'cal' || !env.CAL_WEBHOOK_SECRET) {
    log.warn('agendamento.falhou', { reason: 'desligado', outcome: 'rejected' });
    return resposta(503);
  }

  if (!(request.headers.get('content-type') ?? '').toLowerCase().startsWith('application/json')) {
    log.warn('agendamento.falhou', { reason: 'content-type', outcome: 'rejected' });
    return resposta(415);
  }

  const declarado = Number(request.headers.get('content-length') ?? '0');
  if (Number.isFinite(declarado) && declarado > MAX_CORPO) {
    log.warn('agendamento.falhou', { reason: 'content-length', bytes: declarado, outcome: 'rejected' });
    return resposta(413);
  }

  if (!limite().check(await clientKey(request)).allowed) {
    log.warn('agendamento.falhou', { reason: 'rate-limit', outcome: 'rejected' });
    return resposta(429);
  }

  // Lido com tecto: sem `Content-Length`, o corpo não fica inteiro em memória
  // antes de a assinatura ser verificada.
  const corpo = await lerCorpoLimitado(request, MAX_CORPO);
  if (!corpo.ok) {
    log.warn('agendamento.falhou', { reason: corpo.motivo === 'grande' ? 'body-bytes' : 'body-read', outcome: 'rejected' });
    return resposta(corpo.motivo === 'grande' ? 413 : 400);
  }
  const bruto = corpo.texto;

  if (!assinaturaValida(bruto, request.headers.get('x-cal-signature-256'), env.CAL_WEBHOOK_SECRET)) {
    log.warn('agendamento.falhou', { reason: 'assinatura', outcome: 'rejected' });
    return resposta(401);
  }

  let json: unknown;
  try {
    json = JSON.parse(bruto);
  } catch {
    log.warn('agendamento.falhou', { reason: 'json', outcome: 'rejected' });
    return resposta(400);
  }

  const leitura = lerEntrega(json);
  if (leitura.tipo === 'ignorada') {
    if (leitura.motivo === 'forma') {
      /**
       * Assinada pelo Cal mas ilegível: se o Cal mudar o formato, TODAS as
       * marcações caem aqui. 202 na mesma (reenviar não ajuda), mas em erro,
       * para se ver — nunca misturado com os eventos que não subscrevemos.
       */
      log.error('agendamento.falhou', { reason: 'forma', evento: leitura.evento, outcome: 'failed' });
    } else {
      log.info('agendamento.ignorado', { reason: 'evento', outcome: 'ignored' });
    }
    return resposta(202);
  }

  const cliente = dbAdmin();
  if (!cliente) {
    log.error('agendamento.falhou', { reason: 'sem-cliente', outcome: 'failed' });
    return resposta(503);
  }

  const { reuniao } = leitura;
  try {
    const r = await registarReuniao(cliente, reuniao);
    // Sem ref, ou com um ref que não liga, a reunião fica gravada mas sem
    // oportunidade: é aviso, porque é aqui que se vê se o link perdeu o ref.
    (r.ligada ? log.info : log.warn)('agendamento.registado', {
      evento: reuniao.evento,
      ligada: r.ligada,
      reason: r.motivo,
      durationMs: Date.now() - started,
      // Sem mudança: repetição, entrega fora de ordem ou estado final.
      outcome: r.mudou ? 'ok' : 'sem-mudanca',
    });
    return resposta(200);
  } catch (erro) {
    log.error('agendamento.falhou', {
      evento: reuniao.evento,
      reason: 'base',
      errorCode: (erro as { code?: string }).code ?? 'desconhecido',
      durationMs: Date.now() - started,
      outcome: 'failed',
    });
    return resposta(503);
  }
}
