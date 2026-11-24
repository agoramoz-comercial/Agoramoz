import type { ArtigoCompleto } from './artigo';
import { urlDaImagem } from './imagem';
import { anunciosNoAr, jornalLigado, listarPublicados, obterPublicado } from './jornal-servidor';
import { gerarRevista } from './revista';

/** Artigos por edição: a capa e mais sete. */
const POR_EDICAO = 8;
/** Tempo máximo para ler uma fotografia; a que não chegar, fica de fora. */
const LIMITE_FOTO_MS = 4_000;

async function lerFoto(a: ArtigoCompleto): Promise<[string, Uint8Array] | null> {
  const url = urlDaImagem(a.imagem_caminho, 'jpg');
  if (!url) return null;
  try {
    const res = await fetch(url, { cache: 'force-cache', redirect: 'error', signal: AbortSignal.timeout(LIMITE_FOTO_MS) });
    if (!res.ok) return null;
    const bytes = new Uint8Array(await res.arrayBuffer());
    return bytes.length > 0 && bytes.length <= 2_097_152 ? [a.id, bytes] : null;
  } catch {
    return null;
  }
}

/**
 * A resposta de `/news/revista.pdf` e `/en/news/revista.pdf`: a revista com
 * os últimos artigos publicados nessa edição, as fotografias e a página dos
 * anunciantes activos. Sem jornal, 404; sem base, 503 (nunca uma revista
 * vazia a fingir que não há notícias).
 */
export async function respostaRevista(idioma: 'pt' | 'en', site: string): Promise<Response> {
  if (!jornalLigado()) return new Response('Not found', { status: 404 });
  const lista = await listarPublicados(idioma, null, POR_EDICAO);
  if (lista === null) return new Response('Indisponível', { status: 503, headers: { 'retry-after': '120' } });
  const [completos, anuncios] = await Promise.all([
    Promise.all(lista.map((a) => obterPublicado(a.slug))),
    anunciosNoAr(),
  ]);
  const artigos = completos.filter((a): a is ArtigoCompleto => a !== null && a.idioma === idioma);
  const fotos = await Promise.all(artigos.map(lerFoto));
  const data = new Date(Date.now());
  const pdf = await gerarRevista({
    idioma,
    data,
    artigos,
    anuncios,
    imagens: new Map(fotos.filter((x): x is [string, Uint8Array] => x !== null)),
    site,
  });
  const dia = data.toISOString().slice(0, 10);
  return new Response(new Uint8Array(pdf), {
    headers: {
      'content-type': 'application/pdf',
      'content-disposition': `attachment; filename="agoramoz-news-${idioma}-${dia}.pdf"`,
      'cache-control': 'public, max-age=600',
      'x-robots-tag': 'noindex',
    },
  });
}
