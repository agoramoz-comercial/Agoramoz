/**
 * Saneamento dos parâmetros de origem, antes de qualquer persistência.
 *
 * Estes valores vêm inteiramente do URL, ou seja, de quem quer que tenha
 * escrito a ligação. Vão parar a três sítios com risco diferente: a uma tabela
 * da base, a uma tabela HTML no admin, e a um filtro de consulta. Portanto são
 * dados não confiáveis, e o tratamento é o de dados não confiáveis.
 *
 * Duas decisões explicam o resto do ficheiro.
 *
 * **Recusar, não truncar.** Um valor acima do limite não é um nome de campanha
 * — é um erro ou um ataque. Truncar produziria um valor DIFERENTE, com
 * aparência legítima, que ninguém enviou: uma campanha cortada aos 64
 * caracteres aparece no relatório como se fosse real e agrupa-se com outra que
 * partilhe o prefixo. `null` é honesto e observável.
 *
 * **Lista de permissão, e recusa — nunca remoção de caracteres.** Limpar-e-
 * guardar é o defeito clássico do sanitizador: `<scr<script>ipt>` limpo por
 * remoção torna-se `<script>`. E, pior, um valor parcialmente limpo é um valor
 * FABRICADO. Recusar é inequívoco.
 */

export const UTM_MAX = 64;
export const CAMINHO_MAX = 120;
export const HOST_MAX = 120;

/** Minúsculas ASCII, dígitos, ponto, hífen, underscore. Nada mais. */
export const UTM_PERMITIDO = /^[a-z0-9._-]+$/;
export const CAMINHO_PERMITIDO = /^\/[a-z0-9/_-]*$/;
export const HOST_PERMITIDO = /^[a-z0-9.-]+$/;

/** Marcador para um caminho que existe mas não deve ser registado. */
export const CAMINHO_PRIVADO = '(privado)';

/**
 * Prefixos cujo caminho nunca é gravado.
 *
 * `/documento` é o que interessa: um documento de diagnóstico é endereçado por
 * token, e o token viaja no caminho. Gravá-lo em `landing_page` poria um
 * segredo numa tabela lida por toda a equipa e exportável para um relatório.
 */
const PREFIXOS_PRIVADOS = ['/admin', '/api', '/documento'] as const;

/**
 * Valores que passam no conjunto de caracteres e mesmo assim não significam
 * nada. Sem isto, `utm_source=null` — que um script mal escrito envia com
 * frequência — tornava-se um canal com nome próprio nos relatórios.
 */
const SEM_SIGNIFICADO = new Set([
  'null',
  'undefined',
  'none',
  'nil',
  'not-set',
  'notset',
  '-',
  '_',
  '.',
]);

export function sanitizarUtm(valor: unknown): string | null {
  if (typeof valor !== 'string') return null;

  const limpo = valor.trim().toLowerCase();

  if (limpo.length === 0) return null;
  if (limpo.length > UTM_MAX) return null;
  if (!UTM_PERMITIDO.test(limpo)) return null;
  if (SEM_SIGNIFICADO.has(limpo)) return null;

  return limpo;
}

/**
 * Só o caminho. A query string é deitada fora inteira — é onde a informação
 * pessoal aterra, e não há nenhuma pergunta de negócio que ela responda e que
 * o caminho não responda.
 *
 * O caminho NÃO é passado a minúsculas. Um caminho de URL é sensível a
 * maiúsculas: `/Solucoes` e `/solucoes` são endereços diferentes, e só o
 * segundo existe. Normalizar inventaria um caminho que a pessoa não visitou —
 * a mesma objecção que se faz a truncar um UTM. Como todas as rotas deste site
 * são minúsculas, um caminho com maiúsculas não é nosso, e é recusado.
 */
export function sanitizarCaminho(valor: unknown): string | null {
  if (typeof valor !== 'string') return null;

  const semQuery = valor.split(/[?#]/)[0]!.trim();

  if (semQuery.length === 0) return null;
  if (!semQuery.startsWith('/')) return null;
  // `//` é relativo ao protocolo: `//evil.com` é um URL absoluto disfarçado.
  if (semQuery.startsWith('//')) return null;
  if (semQuery.includes('..')) return null;
  if (semQuery.length > CAMINHO_MAX) return null;

  if (PREFIXOS_PRIVADOS.some((p) => semQuery === p || semQuery.startsWith(`${p}/`))) {
    return CAMINHO_PRIVADO;
  }

  if (!CAMINHO_PERMITIDO.test(semQuery)) return null;

  return semQuery;
}

/**
 * Apenas o host do referenciador, nunca o URL completo.
 *
 * O URL de onde alguém veio pode transportar a query string DESSE site — o
 * termo pesquisado, um identificador de sessão, um endereço de correio. O host
 * responde à única pergunta que importa («de que sítio veio») sem transportar
 * nada disso.
 */
export function sanitizarReferenciador(valor: unknown, hostProprio: string): string | null {
  if (typeof valor !== 'string' || valor.trim().length === 0) return null;

  let host: string;
  try {
    host = new URL(valor).hostname.toLowerCase();
  } catch {
    return null;
  }

  if (host.length === 0 || host.length > HOST_MAX) return null;
  if (!HOST_PERMITIDO.test(host)) return null;
  if (!host.includes('.')) return null;
  // Navegação interna não é uma referência.
  if (host === hostProprio.toLowerCase()) return null;

  return host;
}

export function sanitizarInstante(valor: unknown, agora: Date): string | null {
  if (typeof valor !== 'string') return null;

  const t = Date.parse(valor);
  if (Number.isNaN(t)) return null;

  // O relógio do browser não é de confiança. Cinco minutos de folga cobrem
  // desvio normal; mais do que isso é um valor forjado ou uma máquina errada.
  if (t > agora.getTime() + 5 * 60_000) return null;
  if (t < agora.getTime() - 400 * 86_400_000) return null;

  return new Date(Math.floor(t / 1000) * 1000).toISOString();
}

/**
 * A porta de entrada do servidor. Recebe o que o browser enviou — isto é,
 * qualquer coisa — e devolve algo gravável, ou `null`.
 *
 * **Nunca levanta excepção, e nunca faz falhar uma submissão.** Uma origem
 * malformada custa a origem, não o lead: a pessoa preencheu cinco passos de um
 * formulário e o que ela quer é falar connosco. Perder isso porque alguém
 * escreveu um UTM esquisito seria trocar a coisa valiosa pela acessória.
 */
export function sanitizarAtribuicao(
  valor: unknown,
  ctx: { agora: Date; hostProprio: string },
): import('./types').Atribuicao | null {
  if (valor === null || typeof valor !== 'object' || Array.isArray(valor)) return null;

  const v = valor as Record<string, unknown>;

  /**
   * O instante da submissão é um facto que o SERVIDOR possui. O relógio do
   * browser pode estar errado por meses, e o valor é usado para ordenar
   * eventos comerciais — por isso é sobreposto, não aceite.
   */
  const ultimo = ctx.agora.toISOString();

  let primeiro = sanitizarInstante(v.first_touch_at, ctx.agora);
  if (primeiro !== null && primeiro > ultimo) primeiro = ultimo;

  return {
    utm_source: sanitizarUtm(v.utm_source),
    utm_medium: sanitizarUtm(v.utm_medium),
    utm_campaign: sanitizarUtm(v.utm_campaign),
    utm_content: sanitizarUtm(v.utm_content),
    landing_page: sanitizarCaminho(v.landing_page),
    referrer: sanitizarReferenciador(
      // O cliente guarda só o host; aceitar ambos evita depender disso.
      typeof v.referrer === 'string' && !v.referrer.includes('//') ? `https://${v.referrer}` : v.referrer,
      ctx.hostProprio,
    ),
    first_touch_at: primeiro,
    last_touch_at: ultimo,
  };
}
