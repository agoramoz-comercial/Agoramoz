'use server';

import { randomBytes } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { currentSession, podeEscrever } from '@/lib/auth/session';
import { serverEnv } from '@/lib/config/env';
import { formularioAnuncio } from '@/lib/news/anuncios';
import { formularioArtigo, rascunhoDeAnalise, slugDeArtigo } from '@/lib/news/artigo';
import { validarAnalise } from '@/lib/news/esquema';
import { IDIOMAS_MOTOR } from '@/lib/news/limites';
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
});

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
  revalidatePath('/admin/news');
  redirect(`/admin/news/${id}?ok=criado`);
}

export async function guardarArtigo(formData: FormData): Promise<void> {
  exigirNews();
  const id = idDe(formData);
  const destino = `/admin/news/${id}`;
  const revisao = revisaoDe(formData, destino);
  const f = formularioArtigo.safeParse({
    slug: formData.get('slug') ?? '',
    titulo: formData.get('titulo') ?? '',
    entrada: formData.get('entrada') ?? '',
    seccao: formData.get('seccao') ?? '',
    nota: formData.get('nota') ?? '',
    fonteNome: formData.get('fonteNome') ?? '',
    fonteUrl: formData.get('fonteUrl') ?? '',
  });
  if (!f.success) voltarCom(destino, f.error.issues[0]?.message ?? 'Pedido inválido.');

  await executar(
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
