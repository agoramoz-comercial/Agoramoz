import { NextResponse } from 'next/server';
import { log } from '@/lib/log/logger';

/**
 * Recetor dos relatórios da Content-Security-Policy.
 *
 * Sem isto, o modo `Report-Only` não serve para nada: o browser calcula as
 * violações e não tem para onde as mandar. É este endpoint que transforma
 * «vamos pôr CSP um dia» em «sabemos exactamente o que a CSP partiria se a
 * impuséssemos hoje».
 *
 * O corpo vem do browser, logo é dado não confiável e pode ser enviado por
 * qualquer um. Por isso: nada dele é ecoado na resposta, só três campos são
 * extraídos, e cada um é truncado. Um relatório forjado polui os logs; não faz
 * mais do que isso.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Corta valores longos para um relatório inflado não encher o log. */
function clamp(value: unknown, max = 200): string | undefined {
  return typeof value === 'string' ? value.slice(0, max) : undefined;
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    // Um corpo inválido não merece um erro detalhado nem um estado de falha:
    // o browser não faz nada com a resposta.
    return new NextResponse(null, { status: 204 });
  }

  /**
   * Dois formatos em circulação: o antigo `{ "csp-report": {...} }` e o do
   * Reporting API, `[{ body: {...} }]`. Aceitar os dois evita perder relatórios
   * consoante o browser.
   */
  const record = Array.isArray(body)
    ? ((body[0] as { body?: Record<string, unknown> })?.body ?? {})
    : ((body as { 'csp-report'?: Record<string, unknown> })?.['csp-report'] ??
      (body as Record<string, unknown>));

  log.warn('csp.violation', {
    // Nomes de diretiva e de URI de recurso — não há PII nestes campos.
    reason: clamp(record['effective-directive'] ?? record['effectiveDirective'] ?? 'desconhecida', 60),
    entityType: 'blocked-uri',
    entityId: clamp(record['blocked-uri'] ?? record['blockedURL'], 200),
    status: clamp(record['document-uri'] ?? record['documentURL'], 200),
    outcome: 'reported',
  });

  return new NextResponse(null, { status: 204 });
}
