/**
 * IA-429-01 — O que fazer quando o Kimi (Moonshot) responde 429.
 *
 * O 429 da Moonshot tem duas causas que pedem respostas diferentes:
 *  - `saldo`: a conta não tem saldo (`exceeded_current_quota_error`). Esperar
 *    não adianta: é preciso carregar a conta em platform.moonshot.ai.
 *  - `limite`: a conta passou o número de pedidos por minuto ou em simultâneo
 *    (`rate_limit_reached_error`, `engine_overloaded_error`). Passa sozinho:
 *    espera-se (Retry-After, ou recuo exponencial) e tenta-se outra vez.
 *
 * Do corpo da resposta lê-se SÓ `error.type` (e, se faltar, se a mensagem fala
 * de saldo/quota). Nada do corpo é registado nem mostrado: pode trazer dados da
 * conta.
 */

export type Motivo429 = 'saldo' | 'limite';

export const MENSAGEM_429: Readonly<Record<Motivo429, string>> = {
  saldo:
    'A conta Kimi está sem saldo. Carregue-a em platform.moonshot.ai (Billing) e tente de novo — esperar não resolve.',
  limite:
    'A conta Kimi atingiu o limite de pedidos por minuto. Esperámos e tentámos de novo sem êxito; aguarde um minuto e repita. Carregar a conta sobe este limite.',
};

const SALDO = /quota|balance|insufficient|saldo|余额/i;

/** Lê o motivo de um 429 sem nunca devolver o corpo. Consome o corpo. */
export async function motivo429(res: Response): Promise<Motivo429> {
  try {
    const corpo = (await res.json()) as { error?: { type?: unknown; message?: unknown } } | null;
    const tipo = typeof corpo?.error?.type === 'string' ? corpo.error.type : '';
    if (tipo) return SALDO.test(tipo) ? 'saldo' : 'limite';
    const msg = typeof corpo?.error?.message === 'string' ? corpo.error.message : '';
    return SALDO.test(msg) ? 'saldo' : 'limite';
  } catch {
    return 'limite';
  }
}

/** Quanto esperar antes da tentativa `n` (0, 1, 2…): Retry-After se vier, senão 1 s, 2 s, 4 s. Tecto de 8 s. */
export function esperaAntes(res: Response | null, n: number): number {
  const ra = res?.headers.get('retry-after');
  const s = ra ? Number(ra) : NaN;
  const ms = Number.isFinite(s) && s >= 0 ? s * 1000 : 1000 * 2 ** n;
  return Math.min(8_000, Math.max(250, ms));
}

export type Resultado429 = { readonly res: Response } | { readonly sem: Motivo429 };

/**
 * Faz o pedido e, num 429 de limite, espera e repete (até `tentativas` no
 * total). Num 429 de saldo pára logo. Qualquer outra resposta volta tal e qual.
 * `fazer` recebe o número da tentativa e tem de criar um pedido novo de cada vez.
 */
export async function comRecuo429(
  fazer: (tentativa: number) => Promise<Response>,
  opcoes: { tentativas?: number; dormir?: (ms: number) => Promise<void> } = {},
): Promise<Resultado429> {
  const max = Math.max(1, opcoes.tentativas ?? 3);
  const dormir = opcoes.dormir ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  for (let n = 0; ; n++) {
    const res = await fazer(n);
    if (res.status !== 429) return { res };
    const espera = esperaAntes(res, n);
    const motivo = await motivo429(res);
    if (motivo === 'saldo' || n + 1 >= max) return { sem: motivo };
    await dormir(espera);
  }
}
