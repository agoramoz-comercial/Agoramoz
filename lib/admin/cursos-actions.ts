'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { requireRole } from '@/lib/auth/session';
import { createSessionClient } from '@/lib/auth/client';
import { log } from '@/lib/log/logger';
import { cursoSchema, fonteSchema, LIMITES } from '@/lib/cursos/modelo';
import { gerarAula, gerarPlano, gerarTema, type Resposta } from '@/lib/cursos/gerar';
import { criarMotor, ErroMotor } from '@/lib/cursos/motor';
import type { Plano } from '@/lib/cursos/ciclo';
import type { Aula } from '@/lib/cursos/modelo';
import { executar, mensagemDe } from './executar';

/**
 * Acções dos cursos (D-49, 0022).
 *
 * Gerar gasta IA: só `admin` e `comercial`. Cada chamada é UMA peça (o plano
 * ou uma aula) com o ciclo inteiro lá dentro; o browser encadeia-as e mostra
 * o progresso. Nada do texto das fontes vai para os registos.
 *
 * Guardar e publicar passam pelas funções da 0022, como o resto do admin.
 */

const PAPEIS = ['admin', 'comercial'] as const;

function motorOuErro() {
  try {
    return { motor: criarMotor() };
  } catch (e) {
    return { erro: e instanceof ErroMotor ? e.message : 'Motor indisponível.' };
  }
}

export async function sugerirTemaCurso(entrada: unknown): Promise<Resposta<string>> {
  await requireRole(PAPEIS);
  const m = motorOuErro();
  if (!m.motor) return { ok: false, erro: m.erro! };
  const r = await gerarTema(m.motor, entrada);
  log.info('admin.accao', { outcome: r.ok ? 'accepted' : 'failed', reason: 'curso_tema' });
  return r;
}

export async function planearCurso(entrada: unknown): Promise<Resposta<Plano>> {
  await requireRole(PAPEIS);
  const m = motorOuErro();
  if (!m.motor) return { ok: false, erro: m.erro! };
  const r = await gerarPlano(m.motor, entrada);
  log.info('admin.accao', { outcome: r.ok ? 'accepted' : 'failed', reason: 'curso_planear' });
  return r;
}

export async function escreverAulaCurso(entrada: unknown): Promise<Resposta<Aula>> {
  await requireRole(PAPEIS);
  const m = motorOuErro();
  if (!m.motor) return { ok: false, erro: m.erro! };
  const r = await gerarAula(m.motor, entrada);
  log.info('admin.accao', { outcome: r.ok ? 'accepted' : 'failed', reason: 'curso_aula' });
  return r;
}

const uuid = z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
const guardarSchema = z
  .strictObject({
    id: uuid.nullable(),
    revisao: z.number().int().min(1).nullable(),
    curso: cursoSchema,
    fontes: z.array(fonteSchema).min(1).max(LIMITES.fontes),
  })
  .refine((e) => (e.id === null) === (e.revisao === null), 'Pedido inválido.');

export type ResultadoGuardarCurso =
  | { readonly ok: true; readonly id: string; readonly slug: string; readonly revisao: number }
  | { readonly ok: false; readonly erro: string };

export async function guardarCurso(entrada: unknown): Promise<ResultadoGuardarCurso> {
  await requireRole(PAPEIS);
  const e = guardarSchema.safeParse(entrada);
  if (!e.success) return { ok: false, erro: 'O curso tem dados inválidos.' };
  try {
    const db = await createSessionClient();
    const { data, error } = await db.rpc('guardar_curso', {
      p_id: e.data.id,
      p_revisao: e.data.revisao,
      p_conteudo: e.data.curso,
      p_fontes: e.data.fontes,
    });
    if (error) {
      log.warn('admin.accao_recusada', { outcome: 'rejected', reason: 'guardar_curso', errorCode: error.code ?? 'desconhecido' });
      const falta = error.code === '42P01' || error.code === 'PGRST202' || error.code === 'PGRST205';
      return {
        ok: false,
        erro: falta
          ? 'Guardar cursos está por activar (falta aplicar a 0022). Pode descarregar o PDF na mesma.'
          : mensagemDe(error.code, error.message),
      };
    }
    const r = data as { id: string; slug: string; revisao: number };
    log.info('admin.accao', { outcome: 'accepted', reason: 'guardar_curso' });
    revalidatePath('/admin/cursos');
    revalidatePath(`/cursos/${r.slug}`);
    return { ok: true, id: r.id, slug: r.slug, revisao: r.revisao };
  } catch {
    return { ok: false, erro: 'Não foi possível guardar agora. O curso continua no ecrã: descarregue o PDF ou tente de novo.' };
  }
}

const ESTADOS = ['rascunho', 'publicado', 'arquivado'] as const;

export async function mudarEstadoCurso(formData: FormData): Promise<void> {
  const id = String(formData.get('id') ?? '');
  const revisao = Number(formData.get('revisao'));
  const estado = String(formData.get('estado') ?? '');
  if (!uuid.safeParse(id).success || !Number.isInteger(revisao) || revisao < 1 || !(ESTADOS as readonly string[]).includes(estado)) {
    redirect('/admin/cursos?erro=Pedido%20inv%C3%A1lido.');
  }
  const destino = `/admin/cursos/${id}`;
  const r = (await executar('mudar_estado_curso', { p_id: id, p_revisao: revisao, p_estado: estado }, destino)) as { slug?: string } | null;
  revalidatePath('/admin/cursos');
  revalidatePath(destino);
  revalidatePath('/cursos');
  if (r?.slug) revalidatePath(`/cursos/${r.slug}`);
  redirect(`${destino}?ok=${encodeURIComponent(estado)}`);
}
