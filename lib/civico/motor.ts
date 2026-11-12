import { lerFluxo } from './fluxo';
import type { Pedido } from './pedido';
import { normalizar, type Resposta } from './resposta';

/**
 * Adaptador do motor cívico (o portal Lovable `fonte-clara-source-guide`).
 *
 * O contrato foi lido no bundle público do portal: o browser deles faz
 * `POST /api/consulta` com as mensagens no formato do AI SDK —
 *
 *   { id, trigger: 'submit-message',
 *     messages: [{ id, role: 'user' | 'assistant', parts: [{ type: 'text', text }] }] }
 *
 * — e o cabeçalho `x-idioma`, e recebe um fluxo de eventos com o texto da
 * resposta em Markdown (ver `fluxo.ts`). Aqui fazemos a mesma chamada, mas do
 * servidor: com tempo máximo, tecto de tamanho, e a resposta lida inteira e
 * normalizada ANTES de sair. O browser de quem pergunta nunca vê o motor.
 *
 * Porque não se repassa o fluxo ao browser: uma resposta sobre a lei mostrada
 * a meio, antes de se saber se o motor a acaba ou a recusa, é pior do que
 * esperar uns segundos por ela inteira.
 *
 * Trocar de motor é escrever outra função com esta assinatura.
 */

export interface ConfigMotor {
  readonly url: string;
  readonly timeoutMs: number;
}

/**
 * - `indisponivel`: o motor recusou por credenciais, quota ou protecção contra
 *   bots (401/402/403/429). É problema nosso, não da pergunta — a rota responde 503.
 * - `grande`: resposta acima do tecto.
 * - `vazio`: o fluxo chegou ao fim sem texto, ou o texto não tinha conteúdo.
 */
export type FalhaMotor = 'timeout' | 'rede' | 'http' | 'indisponivel' | 'grande' | 'motor' | 'vazio';

export type ResultadoMotor =
  | { readonly ok: true; readonly resposta: Resposta }
  | { readonly ok: false; readonly motivo: FalhaMotor; readonly status?: number; readonly codigo?: string };

/** O texto de uma resposta longa anda pelos 6–8 KB. Isto é folga, não alvo. */
export const MAX_TEXTO = 24_000;
/** O fluxo embrulha cada pedaço em JSON: o corpo bruto é várias vezes o texto. */
const MAX_CORPO = 600_000;

const eTimeout = (e: unknown) => {
  const nome = (e as { name?: string }).name;
  return nome === 'TimeoutError' || nome === 'AbortError';
};

/** Só o código da causa (`ECONNREFUSED`, `ENOTFOUND`…) — nunca a mensagem, que pode trazer o URL. */
function codigoDe(e: unknown): string {
  const causa = (e as { cause?: { code?: unknown } }).cause;
  const codigo = typeof causa?.code === 'string' ? causa.code : (e as { name?: string }).name;
  return /^[A-Za-z_]{1,40}$/.test(codigo ?? '') ? codigo! : 'desconhecido';
}

const mensagem = (role: 'user' | 'assistant', text: string) => ({
  id: crypto.randomUUID(),
  role,
  parts: [{ type: 'text', text }],
});

/** O corpo que o transporte de chat do portal envia, com as trocas anteriores à frente. */
export function corpoDoPedido(pedido: Pedido) {
  return {
    id: crypto.randomUUID(),
    trigger: 'submit-message',
    messages: [
      ...pedido.historico.flatMap((t) => [mensagem('user', t.pergunta), mensagem('assistant', t.resposta)]),
      mensagem('user', pedido.pergunta),
    ],
  };
}

export async function consultarLovable(
  pedido: Pedido,
  cfg: ConfigMotor,
  fetchImpl: typeof fetch = fetch,
): Promise<ResultadoMotor> {
  let res: Response;
  try {
    res = await fetchImpl(cfg.url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'text/event-stream',
        // O idioma da resposta. A página é portuguesa; o motor aceita outros.
        'x-idioma': 'pt',
      },
      body: JSON.stringify(corpoDoPedido(pedido)),
      signal: AbortSignal.timeout(cfg.timeoutMs),
      cache: 'no-store',
      // O motor não redirecciona; se o fizer, a pergunta não segue para outro sítio.
      redirect: 'error',
    });
  } catch (erro) {
    return eTimeout(erro) ? { ok: false, motivo: 'timeout' } : { ok: false, motivo: 'rede', codigo: codigoDe(erro) };
  }

  if (!res.ok) {
    const indisponivel = [401, 402, 403, 429].includes(res.status);
    return { ok: false, motivo: indisponivel ? 'indisponivel' : 'http', status: res.status };
  }

  const declarado = Number(res.headers?.get('content-length') ?? '0');
  if (Number.isFinite(declarado) && declarado > MAX_CORPO) return { ok: false, motivo: 'grande' };

  let corpo: string;
  try {
    // O `AbortSignal.timeout` também cobre a leitura do fluxo até ao fim.
    corpo = await res.text();
  } catch (erro) {
    return eTimeout(erro) ? { ok: false, motivo: 'timeout' } : { ok: false, motivo: 'rede', codigo: codigoDe(erro) };
  }
  if (corpo.length > MAX_CORPO) return { ok: false, motivo: 'grande' };

  const fluxo = lerFluxo(corpo, MAX_TEXTO);
  if (!fluxo.ok) return { ok: false, motivo: fluxo.motivo };

  const resposta = normalizar(fluxo.texto);
  return resposta ? { ok: true, resposta } : { ok: false, motivo: 'vazio' };
}
