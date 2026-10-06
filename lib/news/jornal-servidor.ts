import { cache } from 'react';
import type { Idioma } from '@/content/types';
import { serverEnv } from '@/lib/config/env';
import { dbAdmin } from '@/lib/db/client';
import { log } from '@/lib/log/logger';
import { lerAnuncios, type AnuncioPublico } from './anuncios';
import { lerArtigo, lerLista, type ArtigoCompleto, type ArtigoDaLista, type SeccaoJornal } from './artigo';
import { comLimite, LIMITE_LEITURA_MS } from './tempo';

/**
 * A leitura pública do jornal. Passa SÓ pelas funções da 0015 concedidas à
 * chave de serviço (`artigos_publicados`, `artigo_publicado`,
 * `anuncios_activos`): a chave nunca lê as tabelas, e um rascunho nunca chega
 * aqui. Uma falha devolve `null` (a página diz que não conseguiu ler) — nunca
 * uma lista vazia que pareça «não há notícias».
 */

export function jornalLigado(): boolean {
  try {
    return serverEnv().NEWS_BLOG === 'on';
  } catch {
    return false;
  }
}

export const listarPublicados = cache(
  async (idioma: Idioma, seccao: SeccaoJornal | null = null, limite = 40): Promise<ArtigoDaLista[] | null> => {
    const db = dbAdmin();
    if (!db) return null;
    const { data, error } = await comLimite(
      db.rpc('artigos_publicados', { p_idioma: idioma, p_seccao: seccao, p_limite: limite, p_antes: null }),
      LIMITE_LEITURA_MS,
    );
    if (error) {
      log.error('news.jornal_falhou', { reason: 'listar', errorCode: error.code ?? 'desconhecido', outcome: 'failed' });
      return null;
    }
    return lerLista(data);
  },
);

export const obterPublicado = cache(async (slug: string): Promise<ArtigoCompleto | null> => {
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) || slug.length > 90) return null;
  const db = dbAdmin();
  if (!db) return null;
  const { data, error } = await comLimite(db.rpc('artigo_publicado', { p_slug: slug }), LIMITE_LEITURA_MS);
  if (error) {
    log.error('news.jornal_falhou', { reason: 'artigo', errorCode: error.code ?? 'desconhecido', outcome: 'failed' });
    return null;
  }
  return data ? lerArtigo(data) : null;
});

export const anunciosNoAr = cache(async (): Promise<AnuncioPublico[]> => {
  const db = dbAdmin();
  if (!db) return [];
  const { data, error } = await comLimite(db.rpc('anuncios_activos'), LIMITE_LEITURA_MS);
  if (error) {
    // Sem anúncios, o jornal continua: publicidade nunca parte uma página.
    log.warn('news.jornal_falhou', { reason: 'anuncios', errorCode: error.code ?? 'desconhecido', outcome: 'failed' });
    return [];
  }
  return lerAnuncios(data);
});
