import { normalizar, type Analise } from './esquema';
import type { Pedido } from './pedido';

/**
 * Adaptador do motor Lovable (`analyze-news`, Lovable Cloud).
 *
 * O contrato foi lido no bundle público do Lovable: o browser deles invoca a
 * função com `{ lang, url }` ou `{ lang, content }` e recebe `{ analysis }` —
 * ou `{ error }` quando o motor recusa. Aqui fazemos a mesma chamada, mas do
 * servidor, com tempo máximo, tecto de tamanho e a resposta normalizada antes
 * de sair.
 *
 * Trocar de motor é escrever outra função com esta assinatura.
 */

export interface ConfigMotor {
  readonly url: string;
  readonly chave: string;
  readonly timeoutMs: number;
}

/**
 * - `indisponivel`: o motor recusou por credenciais ou quota (401/402/403/429).
 *   É problema nosso, não do artigo — a rota responde 503.
 * - `grande`: resposta acima do tecto.
 * - `vazio`: JSON válido, mas sem nada que se possa chamar análise.
 */
export type FalhaMotor = 'timeout' | 'rede' | 'http' | 'indisponivel' | 'grande' | 'json' | 'motor' | 'vazio';

export type ResultadoMotor =
  | { readonly ok: true; readonly analise: Analise }
  | { readonly ok: false; readonly motivo: FalhaMotor; readonly status?: number; readonly codigo?: string };

/** Uma análise completa tem dezenas de KB. Isto é folga, não alvo. */
const MAX_RESPOSTA = 1_000_000;

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

export async function analisarComLovable(
  pedido: Pedido,
  cfg: ConfigMotor,
  fetchImpl: typeof fetch = fetch,
): Promise<ResultadoMotor> {
  const corpo =
    pedido.modo === 'url' ? { lang: pedido.idioma, url: pedido.url } : { lang: pedido.idioma, content: pedido.texto };

  let res: Response;
  try {
    res = await fetchImpl(cfg.url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        // Os dois cabeçalhos que o cliente Supabase envia ao invocar uma função.
        authorization: `Bearer ${cfg.chave}`,
        apikey: cfg.chave,
      },
      body: JSON.stringify(corpo),
      signal: AbortSignal.timeout(cfg.timeoutMs),
      cache: 'no-store',
      // Num redireccionamento para outro domínio o `authorization` é retirado,
      // mas o `apikey` seguiria. O motor não redirecciona; se o fizer, é erro.
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
  if (Number.isFinite(declarado) && declarado > MAX_RESPOSTA) return { ok: false, motivo: 'grande' };

  let texto: string;
  try {
    texto = await res.text();
  } catch (erro) {
    // O `AbortSignal.timeout` também cobre a leitura do corpo.
    return eTimeout(erro) ? { ok: false, motivo: 'timeout' } : { ok: false, motivo: 'rede', codigo: codigoDe(erro) };
  }
  if (texto.length > MAX_RESPOSTA) return { ok: false, motivo: 'grande' };

  let json: unknown;
  try {
    json = JSON.parse(texto);
  } catch {
    return { ok: false, motivo: 'json' };
  }

  const envelope = (typeof json === 'object' && json !== null ? json : {}) as { analysis?: unknown; error?: unknown };
  // A mensagem do motor não passa nem para o cliente nem para o log: pode
  // trazer detalhe interno dele, ou o artigo.
  if (envelope.error) return { ok: false, motivo: 'motor' };

  const analise = normalizar(envelope.analysis);
  return analise ? { ok: true, analise } : { ok: false, motivo: 'vazio' };
}
