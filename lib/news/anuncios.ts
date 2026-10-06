import { z } from 'zod';

/**
 * O «outdoor» do AGORAMOZ News: anúncios da AGORAMOZ que correm no jornal,
 * cada um com o seu destino e a sua medição. O clique passa sempre pela rota
 * `/api/news/anuncio/[id]`, que conta e manda para o destino GUARDADO na base,
 * com a campanha no URL — é isso que liga o anúncio ao diagnóstico ou à
 * oportunidade que ele gerou.
 */

export const TEMAS_ANUNCIO = ['tinta', 'sinal', 'crescimento', 'energia'] as const;
export type TemaAnuncio = (typeof TEMAS_ANUNCIO)[number];

export const POSICOES_ANUNCIO = ['topo', 'feed', 'artigo', 'fim'] as const;
export type PosicaoAnuncio = (typeof POSICOES_ANUNCIO)[number];

export const NOME_DA_POSICAO: Record<PosicaoAnuncio, string> = {
  topo: 'Topo do jornal',
  feed: 'A meio da lista',
  artigo: 'Dentro do artigo',
  fim: 'Fim do artigo',
};

const CAMINHO = /^\/[a-z0-9/_-]{0,119}$/;
const HTTPS =
  /^https:\/\/[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+(\/[A-Za-z0-9/_.~%-]*)?$/;

/** A mesma regra da tabela (0015): caminho do site ou https sem credenciais nem query. */
export function destinoSeguro(destino: string): boolean {
  if (CAMINHO.test(destino)) return !destino.includes('//');
  return destino.length <= 300 && HTTPS.test(destino);
}

/**
 * O destino com a campanha: `utm_source=agoramoz_news`, `utm_medium=outdoor`,
 * `utm_campaign=<slug do anúncio>`, `utm_content=<lugar>`. Só valores que a
 * sanitização de atribuição aceita (`[a-z0-9._-]`), para chegarem inteiros ao
 * diagnóstico.
 */
export function comUtm(destino: string, slug: string, posicao: PosicaoAnuncio | null): string {
  const parametros = new URLSearchParams({
    utm_source: 'agoramoz_news',
    utm_medium: 'outdoor',
    utm_campaign: slug,
  });
  if (posicao) parametros.set('utm_content', posicao);
  return `${destino}?${parametros.toString()}`;
}

/** CTR em percentagem com uma casa; sem impressões não há taxa (nunca 0 inventado). */
export function taxa(cliques: number, impressoes: number): number | null {
  if (impressoes <= 0) return null;
  return Math.round((cliques / impressoes) * 1000) / 10;
}

export interface AnuncioPublico {
  readonly id: string;
  readonly slug: string;
  readonly titulo: string;
  readonly mensagem: string | null;
  readonly ticker: string | null;
  readonly cta: string;
  readonly tema: TemaAnuncio;
  readonly peso: number;
}

const anuncioPublico = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  titulo: z.string(),
  mensagem: z.string().nullable(),
  ticker: z.string().nullable(),
  cta: z.string(),
  tema: z.enum(TEMAS_ANUNCIO),
  peso: z.number().int(),
});

export function lerAnuncios(bruto: unknown): AnuncioPublico[] {
  if (!Array.isArray(bruto)) return [];
  return bruto.flatMap((linha) => {
    const r = anuncioPublico.safeParse(linha);
    return r.success ? [r.data] : [];
  });
}

/**
 * A ordem de rotação: os de mais peso aparecem mais vezes (repetidos pelo
 * peso), intercalados para o mesmo anúncio nunca vir duas vezes seguidas
 * quando há alternativa. Determinística: servidor e browser vêem o mesmo.
 */
export function rotacao(anuncios: readonly AnuncioPublico[]): AnuncioPublico[] {
  const filas = anuncios.map((a) => ({ a, restam: Math.max(1, Math.min(10, a.peso)) }));
  const ordem: AnuncioPublico[] = [];
  let ultimo: string | null = null;
  for (;;) {
    const candidatos = filas.filter((f) => f.restam > 0);
    if (candidatos.length === 0) break;
    candidatos.sort((x, y) => y.restam - x.restam);
    const escolhido = candidatos.find((f) => f.a.id !== ultimo) ?? candidatos[0]!;
    escolhido.restam -= 1;
    ordem.push(escolhido.a);
    ultimo = escolhido.a.id;
  }
  return ordem;
}

/** Que anúncio abre em cada lugar da página: lugares diferentes começam em anúncios diferentes. */
export function primeiroDoLugar(ordem: readonly AnuncioPublico[], posicao: PosicaoAnuncio): number {
  if (ordem.length === 0) return 0;
  // Os anúncios distintos pela ordem em que aparecem; cada lugar abre no
  // seguinte, para a mesma página não mostrar o mesmo criativo duas vezes.
  const distintos = [...new Set(ordem.map((a) => a.id))];
  const alvo = distintos[POSICOES_ANUNCIO.indexOf(posicao) % distintos.length];
  return Math.max(0, ordem.findIndex((a) => a.id === alvo));
}

// ── Formulário do admin ──────────────────────────────────────────────────────

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const opcional = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v === '' ? null : v));
/** Moçambique não tem hora de verão: Maputo é sempre UTC+2. */
const FUSO_MAPUTO = '+02:00';

/** `2026-10-10T09:00` (o que o campo `datetime-local` envia) lido na hora de Maputo. */
export function horaDeMaputo(valor: string): string {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(valor) ? `${valor}:00${FUSO_MAPUTO}` : valor;
}

/** O inverso, para preencher o campo: ISO → `AAAA-MM-DDTHH:MM` em Maputo. */
export function paraCampoDeMaputo(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(new Date(iso).getTime() + 2 * 3_600_000);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 16);
}

const dataOpcional = z
  .string()
  .trim()
  .transform((v, ctx) => {
    if (v === '') return null;
    const d = new Date(horaDeMaputo(v));
    if (Number.isNaN(d.getTime())) {
      ctx.addIssue({ code: 'custom', message: 'Data inválida.' });
      return z.NEVER;
    }
    return d.toISOString();
  });

export const formularioAnuncio = z
  .object({
    slug: z.string().trim().min(3).max(64).regex(SLUG, 'Só letras minúsculas, números e hífenes.'),
    titulo: z.string().trim().min(3).max(80),
    mensagem: opcional(160),
    ticker: opcional(160),
    cta: z.string().trim().min(2).max(28),
    destino: z
      .string()
      .trim()
      .refine(destinoSeguro, 'Um caminho do site (/solucoes/…) ou um endereço https.'),
    tema: z.enum(TEMAS_ANUNCIO),
    inicio: dataOpcional,
    fim: dataOpcional,
    peso: z.coerce.number().int().min(1).max(10),
  })
  .refine((f) => !f.inicio || !f.fim || f.fim > f.inicio, {
    message: 'O fim tem de ser depois do início.',
    path: ['fim'],
  });
export type FormularioAnuncio = z.infer<typeof formularioAnuncio>;
