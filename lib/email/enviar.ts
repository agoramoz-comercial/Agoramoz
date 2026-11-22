import { serverEnv } from '@/lib/config/env';
import type { LeadInput } from '@/lib/forms/lead-schema';
import { log } from '@/lib/log/logger';
import { assunto, construirEnquadramento, nomeDoFicheiro } from './enquadramento';
import { htmlDoEmail, textoDoEmail } from './html';
import { gerarPdfEnquadramento } from './pdf';

/**
 * Envia à pessoa o «Enquadramento preliminar» depois do diagnóstico.
 *
 * Corre DEPOIS da resposta ao browser (`after()` na rota): nunca atrasa nem
 * faz falhar o formulário. Regras:
 * - `EMAIL_LEADS=off` ou sem `RESEND_API_KEY` → não envia, regista o motivo.
 * - Só para submissões NOVAS (a rota não chama isto quando a ingestão diz
 *   `duplicate`) e com consentimento (o schema já o exige: `consent: true`).
 * - Idempotente: a chave `enquadramento/<diagnóstico>` vai no cabeçalho
 *   `Idempotency-Key` da Resend, que recusa o mesmo envio repetido.
 * - Os logs NUNCA levam o endereço, o nome, a empresa nem a chave.
 */

export type ResultadoEnvio =
  | { readonly enviado: true; readonly id: string }
  | { readonly enviado: false; readonly motivo: 'desligado' | 'sem-chave' | 'falhou' };

const URL_RESEND = 'https://api.resend.com/emails';
const LIMITE_MS = 15_000;

export interface PedidoEnvio {
  readonly input: LeadInput;
  readonly diagnosticId: string;
  readonly correlationId: string;
  /** Injectável nos testes. */
  readonly fetcher?: typeof fetch;
  readonly agora?: Date;
}

export async function enviarEnquadramento(p: PedidoEnvio): Promise<ResultadoEnvio> {
  const env = serverEnv();
  const base = { correlationId: p.correlationId, entityType: 'diagnostic', entityId: p.diagnosticId, idioma: p.input.idioma };

  if (env.EMAIL_LEADS !== 'on') {
    log.info('email.enquadramento', { ...base, reason: 'EMAIL_LEADS=off', outcome: 'skipped' });
    return { enviado: false, motivo: 'desligado' };
  }
  if (!env.RESEND_API_KEY) {
    log.warn('email.enquadramento', { ...base, reason: 'sem RESEND_API_KEY', outcome: 'skipped' });
    return { enviado: false, motivo: 'sem-chave' };
  }

  const inicio = Date.now();
  try {
    const doc = construirEnquadramento(p.input, p.input.idioma);
    const pdf = await gerarPdfEnquadramento(doc, p.agora);
    const corpo = {
      from: env.EMAIL_FROM,
      to: [p.input.workEmail],
      reply_to: env.EMAIL_REPLY_TO,
      ...(env.EMAIL_BCC_INTERNO ? { bcc: [env.EMAIL_BCC_INTERNO] } : {}),
      subject: assunto(doc),
      html: htmlDoEmail(doc, env.EMAIL_REPLY_TO),
      text: textoDoEmail(doc),
      attachments: [{ filename: nomeDoFicheiro(doc), content: Buffer.from(pdf).toString('base64') }],
      tags: [
        { name: 'tipo', value: 'enquadramento' },
        { name: 'idioma', value: p.input.idioma },
      ],
    };

    const resposta = await (p.fetcher ?? fetch)(URL_RESEND, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${env.RESEND_API_KEY}`,
        'content-type': 'application/json',
        'idempotency-key': `enquadramento/${p.diagnosticId}`,
      },
      body: JSON.stringify(corpo),
      signal: AbortSignal.timeout(LIMITE_MS),
    });

    if (!resposta.ok) {
      log.error('email.enquadramento', {
        ...base,
        status: resposta.status,
        errorCode: `http_${resposta.status}`,
        durationMs: Date.now() - inicio,
        outcome: 'failed',
      });
      return { enviado: false, motivo: 'falhou' };
    }
    const json = (await resposta.json().catch(() => ({}))) as { id?: string };
    log.info('email.enquadramento', {
      ...base,
      status: resposta.status,
      bytes: pdf.byteLength,
      durationMs: Date.now() - inicio,
      outcome: 'sent',
    });
    return { enviado: true, id: json.id ?? '' };
  } catch (erro) {
    const nome = (erro as { name?: string }).name;
    log.error('email.enquadramento', {
      ...base,
      errorCode: nome === 'TimeoutError' || nome === 'AbortError' ? 'timeout' : 'erro',
      durationMs: Date.now() - inicio,
      outcome: 'failed',
    });
    return { enviado: false, motivo: 'falhou' };
  }
}
