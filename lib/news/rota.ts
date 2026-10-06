import { NextResponse } from 'next/server';
import type { ZodType } from 'zod';
import { lerCorpoLimitado } from '@/lib/http/corpo';
import { clientKey, type RateLimiter } from '@/lib/http/rate-limit';
import { log } from '@/lib/log/logger';
import { jornalLigado } from './jornal-servidor';

/**
 * A entrada comum das rotas públicas do jornal (gosto, partilha, impressões):
 * jornal ligado (404), JSON (415), tamanho declarado e real (413), limite por
 * origem (429), JSON válido e envelope estrito (400). Só depois a rota toca na
 * base. Os logs levam o motivo, nunca o corpo, o token nem o IP.
 */

export function falhar(status: number, correlationId: string, headers?: HeadersInit) {
  return NextResponse.json(
    { error: 'Não foi possível processar o pedido.', correlationId },
    { status, headers: { 'cache-control': 'no-store', ...headers } },
  );
}

export type Entrada<T> = { ok: true; dados: T } | { ok: false; resposta: NextResponse };

export async function lerEntrada<T>(
  request: Request,
  opcoes: { evento: string; esquema: ZodType<T>; maxBytes: number; limite: RateLimiter; correlationId: string },
): Promise<Entrada<T>> {
  const { evento, esquema, maxBytes, limite, correlationId } = opcoes;
  const recusar = (status: number, reason: string, headers?: HeadersInit): Entrada<T> => {
    log.warn(evento, { correlationId, reason, outcome: 'rejected' });
    return { ok: false, resposta: falhar(status, correlationId, headers) };
  };

  if (!jornalLigado()) return recusar(404, 'desligado');
  const tipo = request.headers.get('content-type') ?? '';
  if (!tipo.toLowerCase().startsWith('application/json')) return recusar(415, 'content-type');
  const declarado = Number(request.headers.get('content-length') ?? '0');
  if (Number.isFinite(declarado) && declarado > maxBytes) return recusar(413, 'content-length');

  const v = limite.check(await clientKey(request));
  if (!v.allowed) {
    const espera = Math.max(1, Math.ceil((v.resetAt - Date.now()) / 1000));
    return recusar(429, 'rate-limit', { 'Retry-After': String(espera) });
  }

  const corpo = await lerCorpoLimitado(request, maxBytes);
  if (!corpo.ok) return recusar(corpo.motivo === 'grande' ? 413 : 400, `corpo-${corpo.motivo}`);
  let bruto: unknown;
  try {
    bruto = JSON.parse(corpo.texto);
  } catch {
    return recusar(400, 'json');
  }
  const r = esquema.safeParse(bruto);
  if (!r.success) return recusar(400, 'envelope');
  return { ok: true, dados: r.data };
}
