import { createSessionClient } from '@/lib/auth/client';
import { dbAdmin } from '@/lib/db/client';
import { CURSOS_ESTATICOS } from '@/content/cursos';
import { fonteSchema, lerCurso, type Curso, type Fonte } from './modelo';

/**
 * Leituras dos cursos (0022).
 *
 * - A equipa lê pela sessão (RLS), com as fontes, para rever e refazer.
 * - O público lê pelo servidor (`dbAdmin`), SÓ os publicados e SÓ as colunas
 *   do curso — a coluna `fontes` (o texto carregado) nunca é pedida.
 *
 * Com a 0022 por aplicar (42P01/PGRST205), os ecrãs dizem «por activar» e o
 * criador funciona na mesma: gera, verifica e descarrega, sem guardar.
 */

export const PASSO_0022 = 'Aplicar supabase/aplicar-0022.sql no SQL Editor; a linha 34 do verificar-estado deve dizer «ok».';

export const ESTADOS_CURSO = ['rascunho', 'publicado', 'arquivado'] as const;
export type EstadoCurso = (typeof ESTADOS_CURSO)[number];
export const ROTULO_ESTADO_CURSO: Readonly<Record<EstadoCurso, string>> = {
  rascunho: 'Rascunho',
  publicado: 'Publicado',
  arquivado: 'Arquivado',
};

const emFalta = (c: string | undefined) => c === '42P01' || c === 'PGRST205' || c === 'PGRST202';
const estadoDe = (x: unknown): EstadoCurso => ((ESTADOS_CURSO as readonly string[]).includes(String(x)) ? (x as EstadoCurso) : 'rascunho');

export type Leitura<T> = { readonly estado: 'ok'; readonly dados: T } | { readonly estado: 'por-activar' } | { readonly estado: 'erro' };

export interface CursoLinha {
  readonly id: string;
  readonly slug: string;
  readonly titulo: string;
  readonly estado: EstadoCurso;
  readonly revisao: number;
  readonly actualizado: string;
  readonly publicadoEm: string | null;
}

export async function listarCursos(): Promise<Leitura<CursoLinha[]>> {
  try {
    const db = await createSessionClient();
    const { data, error } = await db
      .from('cursos')
      .select('id, slug, titulo, estado, revisao, updated_at, publicado_em')
      .order('updated_at', { ascending: false })
      .limit(200);
    if (error) return emFalta(error.code) ? { estado: 'por-activar' } : { estado: 'erro' };
    return {
      estado: 'ok',
      dados: (data ?? []).map((r) => ({
        id: String(r.id),
        slug: String(r.slug),
        titulo: String(r.titulo),
        estado: estadoDe(r.estado),
        revisao: Number(r.revisao),
        actualizado: String(r.updated_at),
        publicadoEm: r.publicado_em ? String(r.publicado_em) : null,
      })),
    };
  } catch {
    return { estado: 'erro' };
  }
}

export interface CursoGuardado extends CursoLinha {
  readonly curso: Curso;
  readonly fontes: Fonte[];
}

export async function lerCursoGuardado(id: string): Promise<Leitura<CursoGuardado | null>> {
  try {
    const db = await createSessionClient();
    const { data, error } = await db
      .from('cursos')
      .select('id, slug, titulo, estado, revisao, updated_at, publicado_em, conteudo, fontes')
      .eq('id', id)
      .maybeSingle();
    if (error) return emFalta(error.code) ? { estado: 'por-activar' } : { estado: 'erro' };
    if (!data) return { estado: 'ok', dados: null };
    const curso = lerCurso(data.conteudo);
    const fontes = fonteSchema.array().safeParse(data.fontes);
    if (!curso || !fontes.success) return { estado: 'erro' };
    return {
      estado: 'ok',
      dados: {
        id: String(data.id),
        slug: String(data.slug),
        titulo: String(data.titulo),
        estado: estadoDe(data.estado),
        revisao: Number(data.revisao),
        actualizado: String(data.updated_at),
        publicadoEm: data.publicado_em ? String(data.publicado_em) : null,
        curso,
        fontes: fontes.data,
      },
    };
  } catch {
    return { estado: 'erro' };
  }
}

/* ------------------------------------------------------------------ público */

export interface CursoPublico {
  readonly slug: string;
  readonly curso: Curso;
  readonly publicadoEm: string;
  readonly actualizado: string;
}

function publico(r: Record<string, unknown>): CursoPublico | null {
  const curso = lerCurso(r.conteudo);
  if (!curso) return null;
  return { slug: String(r.slug), curso, publicadoEm: String(r.publicado_em ?? r.updated_at), actualizado: String(r.updated_at) };
}

/** Os cursos escritos no repositório (D-49): publicados sem precisar da base. */
const estaticos = (): CursoPublico[] =>
  CURSOS_ESTATICOS.map((c) => ({
    slug: c.curso.slug,
    curso: c.curso,
    publicadoEm: c.publicadoEm,
    actualizado: c.curso.verificacao.emitidaEm,
  }));

/** Os publicados, mais recentes primeiro: os do repositório e os da base (0022). */
export async function cursosPublicados(): Promise<CursoPublico[]> {
  const fixos = estaticos();
  return [...fixos, ...(await daBase()).filter((c) => !fixos.some((f) => f.slug === c.slug))];
}

async function daBase(): Promise<CursoPublico[]> {
  const db = dbAdmin();
  if (!db) return [];
  try {
    const { data, error } = await db
      .from('cursos')
      .select('slug, conteudo, publicado_em, updated_at')
      .eq('estado', 'publicado')
      .order('publicado_em', { ascending: false })
      .limit(500);
    if (error || !data) return [];
    return data.map(publico).filter((c): c is CursoPublico => c !== null);
  } catch {
    return [];
  }
}

export async function cursoPublicado(slug: string): Promise<CursoPublico | null> {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 80) return null;
  const fixo = estaticos().find((c) => c.slug === slug);
  if (fixo) return fixo;
  const db = dbAdmin();
  if (!db) return null;
  try {
    const { data, error } = await db
      .from('cursos')
      .select('slug, conteudo, publicado_em, updated_at')
      .eq('estado', 'publicado')
      .eq('slug', slug)
      .maybeSingle();
    if (error || !data) return null;
    return publico(data);
  } catch {
    return null;
  }
}
