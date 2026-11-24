import { z } from 'zod';
import { LIMITES, NIVEIS, type OrigemFonte } from './modelo';
import type { Motor } from './ciclo';
import { lerResposta } from './motor';
import { promptPesquisa, promptTextoBase, SCHEMA_PESQUISA, SCHEMA_TEXTO_BASE, type PedidoFontesIA } from './prompts';

/**
 * Fontes pela IA (D-49, extensão).
 *
 * O curso é verificado contra as fontes. Por isso a origem de uma fonte da IA
 * nunca se esconde:
 *
 * - **Pesquisa na internet** (`ia-pesquisa`): o motor pesquisa e devolve, por
 *   página, o título, o link e o que lá está. Só se aceita uma resposta que
 *   a função do ZabaEdu marque como feita com pesquisa (`internet: true`);
 *   sem isso, os links podiam ser de memória — inventados. Cada link é depois
 *   confirmado daqui (a página responde); o conteúdo não é, e o curso diz-o.
 * - **Texto-base** (`ia-texto`): o motor escreve do que sabe. Entra marcado
 *   «escrito pela IA, sem origem verificável», e o curso publicado mostra-o.
 */

export const pedidoFontesSchema = z.strictObject({
  titulo: z.string().trim().min(3).max(LIMITES.curto),
  tema: z.string().trim().max(LIMITES.tema).default(''),
  publico: z.string().trim().max(300).default(''),
  nivel: z.enum(NIVEIS),
});

export interface FonteIA {
  readonly titulo: string;
  readonly texto: string;
  readonly url?: string;
  readonly origem: OrigemFonte;
}

export type CodigoFontesIA = 'sem_internet' | 'sem_resultados' | 'texto_curto';

export class ErroFontesIA extends Error {
  constructor(readonly codigo: CodigoFontesIA) {
    super(MENSAGEM_FONTES_IA[codigo]);
  }
}

export const MENSAGEM_FONTES_IA: Readonly<Record<CodigoFontesIA, string>> = {
  sem_internet:
    'O motor dos cursos não pesquisa na internet (o Kimi não pesquisa; no ZabaEdu, actualize a função agoramoz_llm, docs/CURSOS.md). Sem pesquisa os links podiam ser inventados: carregue as fontes ou use o texto-base.',
  sem_resultados: 'A pesquisa não devolveu nenhuma fonte com link confirmado. Tente outro título ou carregue as fontes.',
  texto_curto: 'A IA devolveu um texto curto de mais para servir de fonte. Tente de novo.',
};

const TEXTO_MIN_PESQUISA = 300;
const TEXTO_MAX = 20_000;
const TEXTO_MIN_BASE = 1_500;
const MAX_PESQUISA = 5;

/* ----------------------------------------------------------------- links */

/** Só endereços públicos: https, nome com domínio, sem IP, porta ou nomes internos. */
export function urlPublico(u: string): URL | null {
  let url: URL;
  try {
    url = new URL(u.trim());
  } catch {
    return null;
  }
  const h = url.hostname.toLowerCase();
  if (url.protocol !== 'https:' || url.port || url.username || url.password) return null;
  if (!h.includes('.') || h.startsWith('[') || /^\d+(\.\d+){3}$/.test(h)) return null;
  if (/(^|\.)(localhost|local|internal|intranet|lan|home|corp)$/.test(h)) return null;
  return url;
}

export type Confirmar = (url: string) => Promise<boolean>;

/**
 * A página existe? Um pedido daqui, sem seguir redireccionamentos (um
 * redireccionamento conta como resposta). 404/410 ou sem resposta: não existe.
 * 401/403/429 contam como existentes (muitos sites recusam robôs).
 */
export function confirmarLigacao(f: typeof fetch = fetch, tempoMs = 8_000): Confirmar {
  return async (u) => {
    const url = urlPublico(u);
    if (!url) return false;
    try {
      const r = await f(url.href, {
        method: 'GET',
        redirect: 'manual',
        signal: AbortSignal.timeout(tempoMs),
        headers: { accept: 'text/html,application/pdf;q=0.9,*/*;q=0.5', 'user-agent': 'AGORAMOZ-cursos/1.0 (verificacao de ligacao)' },
        cache: 'no-store',
      });
      await r.body?.cancel().catch(() => undefined);
      return r.status < 400 || r.status === 401 || r.status === 403 || r.status === 429;
    } catch {
      return false;
    }
  };
}

/* -------------------------------------------------------------- pesquisa */

const brutoPesquisaSchema = z.object({
  fontes: z.array(z.object({ titulo: z.string(), url: z.string(), texto: z.string() }).loose()).max(12),
});

export interface ResultadoPesquisa {
  readonly fontes: readonly FonteIA[];
  /** O que não entrou e porquê (para o ecrã). */
  readonly recusadas: readonly string[];
}

export async function pesquisarFontes(motor: Motor, pedido: PedidoFontesIA, confirmar: Confirmar): Promise<ResultadoPesquisa> {
  const resposta = await motor({ tarefa: 'pesquisar_fontes', prompt: promptPesquisa(pedido), schema: SCHEMA_PESQUISA });
  // A função do ZabaEdu actualizada responde { internet: true, resultado }.
  const r = resposta as { internet?: unknown; resultado?: unknown } | null;
  if (!r || typeof r !== 'object' || r.internet !== true) throw new ErroFontesIA('sem_internet');
  let resultado: unknown;
  try {
    resultado = lerResposta(r.resultado);
  } catch {
    throw new ErroFontesIA('sem_resultados');
  }
  const b = brutoPesquisaSchema.safeParse(resultado);
  if (!b.success) throw new ErroFontesIA('sem_resultados');

  const recusadas: string[] = [];
  const vistos = new Set<string>();
  const candidatas: { titulo: string; texto: string; url: string }[] = [];
  for (const x of b.data.fontes) {
    const titulo = x.titulo.trim().slice(0, LIMITES.curto) || 'Sem título';
    const texto = x.texto.trim();
    const url = urlPublico(x.url);
    if (!url) recusadas.push(`«${titulo}»: endereço inválido ou não público.`);
    else if (texto.length < TEXTO_MIN_PESQUISA) recusadas.push(`«${titulo}»: texto curto de mais.`);
    else if (vistos.has(url.href)) continue;
    else {
      vistos.add(url.href);
      candidatas.push({ titulo, texto: texto.slice(0, TEXTO_MAX), url: url.href });
    }
  }
  const confirmadas = await Promise.all(candidatas.slice(0, MAX_PESQUISA).map((c) => confirmar(c.url)));
  const fontes: FonteIA[] = [];
  candidatas.slice(0, MAX_PESQUISA).forEach((c, i) => {
    if (confirmadas[i]) fontes.push({ ...c, origem: 'ia-pesquisa' });
    else recusadas.push(`«${c.titulo}»: o link não abre (${c.url}).`);
  });
  if (!fontes.length) throw new ErroFontesIA('sem_resultados');
  return { fontes, recusadas };
}

/* ------------------------------------------------------------ texto-base */

const brutoTextoSchema = z.object({ titulo: z.string(), texto: z.string() });

export async function escreverTextoBase(motor: Motor, pedido: PedidoFontesIA): Promise<FonteIA> {
  for (let n = 0; n < 2; n += 1) {
    const b = brutoTextoSchema.safeParse(
      await motor({ tarefa: 'escrever_fonte', prompt: promptTextoBase(pedido), schema: SCHEMA_TEXTO_BASE }),
    );
    if (b.success && b.data.texto.trim().length >= TEXTO_MIN_BASE)
      return {
        titulo: (b.data.titulo.trim() || `Texto-base: ${pedido.titulo}`).slice(0, LIMITES.curto),
        texto: b.data.texto.trim().slice(0, TEXTO_MAX),
        origem: 'ia-texto',
      };
  }
  throw new ErroFontesIA('texto_curto');
}
