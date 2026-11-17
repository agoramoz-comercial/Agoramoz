import { serverEnv } from '@/lib/config/env';
import type { Motor } from './ciclo';

/**
 * O motor dos cursos: a função `agoramoz_llm` da app ZabaEdu (Base44).
 *
 * A função do lado de lá é curta de propósito (código em docs/CURSOS.md):
 * confere o segredo partilhado, chama a IA da app (`InvokeLLM`) com o pedido
 * e o esquema JSON que mandamos, e devolve o JSON. Não decide nada.
 *
 * Erros viram `ErroMotor` com um código, nunca com o corpo da resposta (que
 * pode trazer o pedido, e o pedido traz o texto das fontes).
 */

export type CodigoMotor = 'desligado' | 'timeout' | 'recusado' | 'indisponivel' | 'resposta_invalida';

export class ErroMotor extends Error {
  constructor(readonly codigo: CodigoMotor) {
    super(MENSAGEM[codigo]);
  }
}

export const MENSAGEM: Readonly<Record<CodigoMotor, string>> = {
  desligado: 'O motor dos cursos está desligado (CURSOS_ENGINE=off).',
  timeout: 'O motor demorou demasiado a responder.',
  recusado: 'O motor recusou o pedido: confirme o segredo partilhado (ZABAEDU_CHAVE / AGORAMOZ_CHAVE).',
  indisponivel: 'O motor está indisponível neste momento.',
  resposta_invalida: 'O motor respondeu sem JSON válido.',
};

/** Tempo máximo de uma chamada: cabe no `maxDuration` da página com folga para três tentativas. */
export const TEMPO_MAX_MS = 85_000;

export function motorCursosLigado(): boolean {
  try {
    const env = serverEnv();
    return env.CURSOS_ENGINE === 'zabaedu' && Boolean(env.ZABAEDU_FUNCTION_URL && env.ZABAEDU_CHAVE);
  } catch {
    return false;
  }
}

/** O Base44 pode devolver o objecto, uma string JSON, ou o objecto embrulhado. */
export function lerResposta(x: unknown): unknown {
  let v = x;
  if (typeof v === 'string') {
    const t = v.trim().replace(/^```(?:json)?\s*|\s*```$/g, '');
    try {
      v = JSON.parse(t);
    } catch {
      throw new ErroMotor('resposta_invalida');
    }
  }
  if (v && typeof v === 'object' && !Array.isArray(v)) {
    const o = v as Record<string, unknown>;
    for (const k of ['resultado', 'result', 'data', 'response']) {
      if (Object.keys(o).length === 1 && k in o) return lerResposta(o[k]);
    }
    return o;
  }
  throw new ErroMotor('resposta_invalida');
}

export function criarMotor(opcoes?: { url: string; chave: string; fetch?: typeof fetch; tempoMs?: number }): Motor {
  let url = opcoes?.url;
  let chave = opcoes?.chave;
  if (!url || !chave) {
    if (!motorCursosLigado()) throw new ErroMotor('desligado');
    const env = serverEnv();
    url = env.ZABAEDU_FUNCTION_URL!;
    chave = env.ZABAEDU_CHAVE!;
  }
  const f = opcoes?.fetch ?? fetch;
  const tempo = opcoes?.tempoMs ?? TEMPO_MAX_MS;
  return async ({ tarefa, prompt, schema }) => {
    let r: Response;
    try {
      r = await f(url!, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-agoramoz-chave': chave! },
        body: JSON.stringify({ tarefa, prompt, schema }),
        signal: AbortSignal.timeout(tempo),
        cache: 'no-store',
      });
    } catch (e) {
      throw new ErroMotor(e instanceof Error && (e.name === 'TimeoutError' || e.name === 'AbortError') ? 'timeout' : 'indisponivel');
    }
    if (r.status === 401 || r.status === 403) throw new ErroMotor('recusado');
    if (!r.ok) throw new ErroMotor('indisponivel');
    let corpo: unknown;
    try {
      corpo = await r.json();
    } catch {
      throw new ErroMotor('resposta_invalida');
    }
    return lerResposta(corpo);
  };
}
