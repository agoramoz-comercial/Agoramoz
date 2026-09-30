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

export type FalhaMotor = 'timeout' | 'rede' | 'http' | 'json' | 'motor' | 'vazio';

export type ResultadoMotor =
  | { readonly ok: true; readonly analise: Analise }
  | { readonly ok: false; readonly motivo: FalhaMotor; readonly status?: number };

/** Uma análise completa tem dezenas de KB. Isto é folga, não alvo. */
const MAX_RESPOSTA = 1_000_000;

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
    });
  } catch (erro) {
    const nome = (erro as { name?: string }).name;
    return { ok: false, motivo: nome === 'TimeoutError' || nome === 'AbortError' ? 'timeout' : 'rede' };
  }

  if (!res.ok) return { ok: false, motivo: 'http', status: res.status };

  let texto: string;
  try {
    texto = await res.text();
  } catch {
    return { ok: false, motivo: 'rede' };
  }
  if (texto.length > MAX_RESPOSTA) return { ok: false, motivo: 'json' };

  let json: unknown;
  try {
    json = JSON.parse(texto);
  } catch {
    return { ok: false, motivo: 'json' };
  }

  const envelope = (typeof json === 'object' && json !== null ? json : {}) as { analysis?: unknown; error?: unknown };
  // A mensagem do motor não passa: pode trazer detalhe interno dele.
  if (envelope.error) return { ok: false, motivo: 'motor' };

  const analise = normalizar(envelope.analysis);
  return analise ? { ok: true, analise } : { ok: false, motivo: 'vazio' };
}
