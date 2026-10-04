import { createHash, createHmac } from 'node:crypto';
import { hashRef } from '@/lib/agendamento/cal';

/**
 * O token de um link de inquérito.
 *
 * `token = base64url(HMAC-SHA256(SURVEY_LINK_SECRET, "inquerito-link:" + link_id))`
 *
 *  - Não se adivinha: 32 bytes de HMAC com um segredo que só o servidor tem.
 *  - Não se guarda: a base fica com `sha256(token)` (`survey_links.token_hash`),
 *    regra do projecto — token público nunca em claro.
 *  - Volta a mostrar-se: o admin conhece o `link_id` e o segredo, e deriva o
 *    mesmo token sempre que a equipa abre o painel de partilha.
 *
 * Trocar o segredo invalida todos os links já distribuídos (docs/INQUERITOS.md).
 */

/** 32 bytes em base64url: 43 caracteres, sem `+`, `/` nem `=`. */
export const TOKEN_VALIDO = /^[A-Za-z0-9_-]{43}$/;

/** O id por submissão que o browser gera (UUID v4) — base da idempotência. */
export const SUBMISSAO_VALIDA =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

export function tokenDoLink(segredo: string, linkId: string): string {
  return createHmac('sha256', segredo)
    .update(`inquerito-link:${linkId}`, 'utf8')
    .digest('base64url');
}

/** O mesmo SHA-256 em hexadecimal que guarda os `ref` do Cal. */
export const hashToken = hashRef;

export function urlDoInquerito(origem: string, token: string): string {
  return new URL(`/i/${token}`, origem).toString();
}

function sha256(texto: string): string {
  return createHash('sha256').update(texto, 'utf8').digest('hex');
}

/**
 * A chave de idempotência: o link e o id da submissão, nunca as respostas.
 * Duas pessoas anónimas que respondem o mesmo são duas respostas; a mesma
 * submissão entregue duas vezes (rede lenta, duplo clique) é uma só.
 */
export function chaveDeIdempotencia(tokenHash: string, submissionId: string): string {
  return sha256(`inquerito:${tokenHash}:${submissionId}`);
}

/** JSON com as chaves ordenadas, para a mesma resposta dar sempre o mesmo texto. */
function canonico(valor: unknown): string {
  if (Array.isArray(valor)) return `[${valor.map(canonico).join(',')}]`;
  if (valor && typeof valor === 'object') {
    const entradas = Object.entries(valor as Record<string, unknown>).sort(([a], [b]) =>
      a < b ? -1 : a > b ? 1 : 0,
    );
    return `{${entradas.map(([k, v]) => `${JSON.stringify(k)}:${canonico(v)}`).join(',')}}`;
  }
  return JSON.stringify(valor);
}

/** Impressão digital do conteúdo das respostas (sem contacto). */
export function impressaoDasRespostas(respostas: Readonly<Record<string, unknown>>): string {
  return sha256(canonico(respostas));
}
