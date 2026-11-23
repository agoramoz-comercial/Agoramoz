'use server';

import { randomBytes } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createSessionClient } from '@/lib/auth/client';
import { currentSession, podeEscrever } from '@/lib/auth/session';
import { serverEnv } from '@/lib/config/env';
import { formularioAnuncio } from '@/lib/news/anuncios';
import { formularioArtigo, rascunhoDeAnalise, slugDeArtigo } from '@/lib/news/artigo';
import { validarAnalise } from '@/lib/news/esquema';
import { BUCKET_IMAGENS } from '@/lib/news/imagem';
import { IDIOMAS_MOTOR } from '@/lib/news/limites';
import { log } from '@/lib/log/logger';
import { ePaisNews, PAISES_NEWS, type PaisNews } from '@/lib/news/paises';
import { FONTE_MAX, gerarProfunda, MENSAGEM_FALHA } from '@/lib/news/profunda';
import { executar, voltarCom } from './executar';

/**
 * Acções da redacção do AGORAMOZ News (0015). Nada é publicado sem passar por
 * aqui: a análise vira RASCUNHO, uma pessoa revê e carrega em «Publicar».
 * Cada função da base verifica o papel outra vez e escreve a auditoria; aqui
 * valida-se a forma, porque o que chega a uma Server Action é tão pouco
 * confiável como o que chega a uma rota.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** A coluna `analise` aceita até 256 KB; o JSON enviado mede-se antes. */
const MAX_ANALISE = 262_144;

function exigirNews(): void {
  if (serverEnv().NEWS_BLOG !== 'on') redirect('/admin');
}

function idDe(formData: FormData, campo = 'id'): string {
  const valor = String(formData.get(campo) ?? '').trim();
  if (!UUID.test(valor)) redirect('/admin/news?erro=Pedido%20inv%C3%A1lido.');
  return valor;
}

function revisaoDe(formData: FormData, destino: string): number {
  const n = Number(formData.get('revisao'));
  if (!Number.isInteger(n) || n < 1) voltarCom(destino, 'Pedido inválido.');
  return n;
}

function jornalMudou(slug?: string): void {
  revalidatePath('/news');
  revalidatePath('/en/news');
  if (slug && /^[a-z0-9-]{3,90}$/.test(slug)) {
    revalidatePath(`/news/${slug}`);
    revalidatePath(`/en/news/${slug}`);
  }
  revalidatePath('/admin/news');
}

// ── Artigos ──────────────────────────────────────────────────────────────────

const entradaRascunho = z.object({
  analise: z.unknown(),
  idioma: z.enum(IDIOMAS_MOTOR),
  /** O país que a notícia afecta directamente: obrigatório. */
  pais: z.enum(PAISES_NEWS),
  /** O documento colado (modo texto): a fonte da análise profunda e dos números. */
  fonte: z.string().max(FONTE_MAX * 2).optional(),
});

/** A análise profunda, se ligada: devolve a revisão nova ou o motivo da falha. */
async function correrProfunda(
  id: string,
  revisao: number,
  fonte: string,
  pais: PaisNews,
  idioma: 'pt' | 'en',
  destino: string,
): Promise<{ revisao: number } | { falha: string }> {
  const env = serverEnv();
  const r = await gerarProfunda(
    { fonte, pais, idioma },
    {
      ligada: env.NEWS_ANALISE_PROFUNDA === 'kimi',
      chave: env.KIMI_API_KEY,
      modelo: env.KIMI_MODEL,
      baseUrl: env.KIMI_BASE_URL,
    },
  );
  if (!r.ok) {
    log.warn('news.profunda', { outcome: 'failed', reason: r.falha });
    return { falha: MENSAGEM_FALHA[r.falha] ?? `O Kimi recusou o pedido (${r.falha}).` };
  }
  log.info('news.profunda', { outcome: 'accepted', reason: `retirados_${r.analise.retirados}` });
  const nova = await executar(
    'guardar_profunda_artigo',
    { p_id: id, p_revisao: revisao, p_profunda: r.analise },
    destino,
  );
  return { revisao: Number(nova) };
}

export type ResultadoRascunho = { readonly ok: false; readonly motivo: string };

/**
 * Do relatório ao rascunho. Devolve só em erro: no sucesso abre o editor do
 * rascunho acabado de criar.
 */
export async function criarArtigoDeAnalise(bruto: unknown): Promise<ResultadoRascunho> {
  if (serverEnv().NEWS_BLOG !== 'on') return { ok: false, motivo: 'O jornal está desligado.' };
  const sessao = await currentSession();
  if (!sessao || !podeEscrever(sessao.papel))
    return { ok: false, motivo: 'Não tem permissão para esta acção.' };

  const e = entradaRascunho.safeParse(bruto);
  if (!e.success) return { ok: false, motivo: 'Pedido inválido.' };
  let tamanho = 0;
  try {
    tamanho = JSON.stringify(e.data.analise).length;
  } catch {
    return { ok: false, motivo: 'Pedido inválido.' };
  }
  if (tamanho > MAX_ANALISE || !validarAnalise(e.data.analise))
    return { ok: false, motivo: 'Esta análise não tem o formato esperado. Volte a analisar.' };

  const analise = e.data.analise;
  const r = rascunhoDeAnalise(analise);
  // A edição em inglês recebe o que foi analisado em inglês; o resto, a portuguesa.
  const idioma = e.data.idioma === 'en' ? 'en' : 'pt';
  const id = await executar(
    'criar_artigo',
    {
      p_slug: slugDeArtigo(r.titulo, randomBytes(3).toString('hex')),
      p_idioma: idioma,
      p_titulo: r.titulo,
      p_entrada: r.entrada,
      p_seccao: r.seccao,
      p_prioridade: r.prioridade,
      p_analise: analise,
      p_fonte_nome: r.fonteNome,
      p_fonte_url: null,
    },
    '/admin/news',
  );
  if (typeof id !== 'string' || !UUID.test(id))
    return { ok: false, motivo: 'Não foi possível criar o rascunho.' };
  const destino = `/admin/news/${id}`;
  const rev = Number(await executar('definir_pais_artigo', { p_id: id, p_revisao: 1, p_pais: e.data.pais }, destino));
  // Análise profunda só com o documento colado (é contra ele que os números se verificam).
  let aviso = '';
  const fonte = e.data.fonte?.trim() ?? '';
  if (serverEnv().NEWS_ANALISE_PROFUNDA === 'kimi' && fonte) {
    const p = await correrProfunda(id, rev, fonte, e.data.pais, idioma, destino);
    if ('falha' in p) aviso = `&erro=${encodeURIComponent(`Rascunho criado sem análise profunda: ${p.falha}`)}`;
  }
  revalidatePath('/admin/news');
  redirect(`${destino}?ok=criado${aviso}`);
}

export async function guardarArtigo(formData: FormData): Promise<void> {
  exigirNews();
  const id = idDe(formData);
  const destino = `/admin/news/${id}`;
  const revisao = revisaoDe(formData, destino);
  const f = formularioArtigo.safeParse({
    pais: formData.get('pais') ?? '',
    slug: formData.get('slug') ?? '',
    titulo: formData.get('titulo') ?? '',
    entrada: formData.get('entrada') ?? '',
    seccao: formData.get('seccao') ?? '',
    nota: formData.get('nota') ?? '',
    fonteNome: formData.get('fonteNome') ?? '',
    fonteUrl: formData.get('fonteUrl') ?? '',
  });
  if (!f.success) voltarCom(destino, f.error.issues[0]?.message ?? 'Pedido inválido.');

  const nova = await executar(
    'guardar_artigo',
    {
      p_id: id,
      p_revisao: revisao,
      p_slug: f.data.slug,
      p_titulo: f.data.titulo,
      p_entrada: f.data.entrada,
      p_seccao: f.data.seccao,
      p_nota: f.data.nota,
      p_fonte_nome: f.data.fonteNome,
      p_fonte_url: f.data.fonteUrl,
    },
    destino,
  );
  if (formData.get('paisAntes') !== f.data.pais)
    await executar('definir_pais_artigo', { p_id: id, p_revisao: Number(nova), p_pais: f.data.pais }, destino);
  jornalMudou(f.data.slug);
  redirect(`${destino}?ok=guardado`);
}

export async function publicarArtigo(formData: FormData): Promise<void> {
  exigirNews();
  const id = idDe(formData);
  const destino = `/admin/news/${id}`;
  const revisao = revisaoDe(formData, destino);
  // A confirmação está no próprio ecrã: quem publica marca que reviu.
  if (formData.get('revi') !== 'sim')
    voltarCom(destino, 'Confirme que reviu o artigo antes de publicar.');
  await executar('publicar_artigo', { p_id: id, p_revisao: revisao }, destino);
  jornalMudou(String(formData.get('slug') ?? ''));
  redirect(`${destino}?ok=publicado`);
}

export async function arquivarArtigo(formData: FormData): Promise<void> {
  exigirNews();
  const id = idDe(formData);
  const destino = `/admin/news/${id}`;
  const revisao = revisaoDe(formData, destino);
  await executar('arquivar_artigo', { p_id: id, p_revisao: revisao }, destino);
  jornalMudou(String(formData.get('slug') ?? ''));
  redirect(`${destino}?ok=arquivado`);
}

/** «Gerar análise profunda» no editor: o documento colado contra o país do artigo. */
export async function gerarProfundaArtigo(formData: FormData): Promise<void> {
  exigirNews();
  const id = idDe(formData);
  const destino = `/admin/news/${id}`;
  const revisao = revisaoDe(formData, destino);
  const pais = String(formData.get('pais') ?? '');
  const idioma = formData.get('idioma') === 'en' ? 'en' : 'pt';
  if (!ePaisNews(pais)) voltarCom(destino, 'Escolha e guarde primeiro o país que a notícia afecta.');
  const fonte = String(formData.get('fonte') ?? '').slice(0, FONTE_MAX * 2);
  const p = await correrProfunda(id, revisao, fonte, pais, idioma, destino);
  if ('falha' in p) voltarCom(destino, p.falha);
  jornalMudou(String(formData.get('slug') ?? ''));
  redirect(`${destino}?ok=profunda`);
}

export async function apagarProfundaArtigo(formData: FormData): Promise<void> {
  exigirNews();
  const id = idDe(formData);
  const destino = `/admin/news/${id}`;
  const revisao = revisaoDe(formData, destino);
  await executar('guardar_profunda_artigo', { p_id: id, p_revisao: revisao, p_profunda: null }, destino);
  jornalMudou(String(formData.get('slug') ?? ''));
  redirect(`${destino}?ok=profunda-apagada`);
}

/** Até 1,5 MB por ficheiro (o browser já reduziu a ≤ 1600 px). */
const MAX_FOTO = 1_572_864;

function assinatura(bytes: Uint8Array, tipo: 'webp' | 'jpg'): boolean {
  if (tipo === 'jpg') return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const t = (i: number, n: number) => String.fromCharCode(...bytes.slice(i, i + n));
  return t(0, 4) === 'RIFF' && t(8, 4) === 'WEBP';
}

async function lerFoto(v: FormDataEntryValue | null, tipo: 'webp' | 'jpg'): Promise<Uint8Array | null> {
  if (!(v instanceof File) || v.size < 100 || v.size > MAX_FOTO) return null;
  const bytes = new Uint8Array(await v.arrayBuffer());
  return assinatura(bytes, tipo) ? bytes : null;
}

/**
 * A fotografia do artigo: o browser envia a mesma imagem em WebP (site) e em
 * JPEG (revista em PDF), ambas com ≤ 1600 px. Confere-se a assinatura dos
 * bytes — não o nome nem o tipo declarado — e guarda-se pela sessão de quem
 * publica (a política do bucket só deixa escrever `admin` e `comercial`).
 */
export async function guardarImagemArtigo(formData: FormData): Promise<void> {
  exigirNews();
  const id = idDe(formData);
  const destino = `/admin/news/${id}`;
  const revisao = revisaoDe(formData, destino);
  const alt = String(formData.get('alt') ?? '').trim();
  const credito = String(formData.get('credito') ?? '').trim();
  if (alt.length < 3 || alt.length > 300)
    voltarCom(destino, 'Descreva a fotografia (texto alternativo, 3 a 300 caracteres).');
  if (credito.length > 160) voltarCom(destino, 'O crédito tem no máximo 160 caracteres.');
  const [webp, jpg] = await Promise.all([lerFoto(formData.get('webp'), 'webp'), lerFoto(formData.get('jpg'), 'jpg')]);
  if (!webp || !jpg) voltarCom(destino, 'Fotografia inválida. Escolha uma imagem JPEG, PNG ou WebP e tente de novo.');

  const base = `${id}/${randomBytes(8).toString('hex')}`;
  const supabase = await createSessionClient();
  for (const [ext, bytes, tipo] of [
    ['webp', webp, 'image/webp'],
    ['jpg', jpg, 'image/jpeg'],
  ] as const) {
    const { error } = await supabase.storage
      .from(BUCKET_IMAGENS)
      .upload(`${base}.${ext}`, bytes, { contentType: tipo, cacheControl: '31536000', upsert: false });
    if (error) {
      log.warn('news.imagem', { outcome: 'failed', reason: 'upload' });
      voltarCom(destino, 'Não foi possível guardar a fotografia. Confirme que a 0023 está aplicada.');
    }
  }
  await executar(
    'definir_imagem_artigo',
    { p_id: id, p_revisao: revisao, p_caminho: base, p_alt: alt, p_credito: credito || null },
    destino,
  );
  jornalMudou(String(formData.get('slug') ?? ''));
  redirect(`${destino}?ok=imagem`);
}

export async function removerImagemArtigo(formData: FormData): Promise<void> {
  exigirNews();
  const id = idDe(formData);
  const destino = `/admin/news/${id}`;
  const revisao = revisaoDe(formData, destino);
  await executar(
    'definir_imagem_artigo',
    { p_id: id, p_revisao: revisao, p_caminho: null, p_alt: null, p_credito: null },
    destino,
  );
  jornalMudou(String(formData.get('slug') ?? ''));
  redirect(`${destino}?ok=imagem-removida`);
}

// ── Publicidade ──────────────────────────────────────────────────────────────

export async function guardarAnuncio(formData: FormData): Promise<void> {
  exigirNews();
  const idBruto = String(formData.get('id') ?? '').trim();
  const novo = idBruto === '';
  if (!novo && !UUID.test(idBruto)) redirect('/admin/news/publicidade?erro=Pedido%20inv%C3%A1lido.');
  const destino = novo ? '/admin/news/publicidade' : `/admin/news/publicidade/${idBruto}`;
  const revisao = novo ? null : revisaoDe(formData, destino);

  const f = formularioAnuncio.safeParse({
    slug: formData.get('slug') ?? '',
    titulo: formData.get('titulo') ?? '',
    mensagem: formData.get('mensagem') ?? '',
    ticker: formData.get('ticker') ?? '',
    cta: formData.get('cta') ?? '',
    destino: formData.get('destino') ?? '',
    tema: formData.get('tema') ?? '',
    inicio: formData.get('inicio') ?? '',
    fim: formData.get('fim') ?? '',
    peso: formData.get('peso') ?? '1',
  });
  if (!f.success) voltarCom(destino, f.error.issues[0]?.message ?? 'Pedido inválido.');

  const id = await executar(
    'guardar_anuncio',
    {
      p_id: novo ? null : idBruto,
      p_revisao: revisao,
      p_slug: f.data.slug,
      p_titulo: f.data.titulo,
      p_mensagem: f.data.mensagem,
      p_ticker: f.data.ticker,
      p_cta: f.data.cta,
      p_destino: f.data.destino,
      p_tema: f.data.tema,
      p_inicio: f.data.inicio,
      p_fim: f.data.fim,
      p_peso: f.data.peso,
    },
    destino,
  );
  if (typeof id !== 'string' || !UUID.test(id)) voltarCom(destino, 'Não foi possível concluir a acção.');
  jornalMudou();
  revalidatePath('/admin/news/publicidade');
  redirect(`/admin/news/publicidade/${id}?ok=${novo ? 'criado' : 'guardado'}`);
}

export async function definirAnuncioActivo(formData: FormData): Promise<void> {
  exigirNews();
  const id = idDe(formData);
  const destino = `/admin/news/publicidade/${id}`;
  const activo = formData.get('activo') === 'sim';
  await executar('definir_anuncio_activo', { p_id: id, p_activo: activo }, destino);
  jornalMudou();
  revalidatePath('/admin/news/publicidade');
  redirect(`${destino}?ok=${activo ? 'ligado' : 'desligado'}`);
}
