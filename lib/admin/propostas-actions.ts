'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createSessionClient } from '@/lib/auth/client';
import { log } from '@/lib/log/logger';
import { podeSair, propostaSchema, verificar } from '@/lib/propostas/modelo';
import { MAX_TEXTO_COLADO } from '@/lib/propostas/texto';
import { executar, mensagemDe } from './executar';

/**
 * Acções das propostas (0020). Como as outras do admin, nenhuma escreve em
 * tabela: chamam `guardar_proposta` e `mudar_estado_proposta`, que verificam
 * o papel outra vez, calculam o total na base, confirmam a revisão e
 * auditam na mesma transacção.
 *
 * `guardarProposta` é chamada pelo editor (componente de cliente) e devolve
 * um resultado em vez de redireccionar: o editor tem o trabalho todo em
 * memória e um redireccionamento deitava-o fora. O conteúdo é validado aqui
 * com o mesmo esquema que o editor usa — o browser não é de confiança.
 */

const uuid = z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);

const entradaSchema = z
  .object({
    id: uuid.nullable(),
    revisao: z.number().int().min(1).nullable(),
    dealId: uuid.nullable(),
    conteudo: propostaSchema,
    textoColado: z.string().max(MAX_TEXTO_COLADO).nullable(),
    nota: z.string().max(300).nullable(),
  })
  .strict()
  .refine((e) => (e.id === null) === (e.revisao === null), 'Pedido inválido.');

export type ResultadoGuardar =
  | { readonly ok: true; readonly id: string; readonly versao: number; readonly revisao: number; readonly nova: boolean }
  | { readonly ok: false; readonly erro: string };

export async function guardarProposta(entrada: unknown): Promise<ResultadoGuardar> {
  const e = entradaSchema.safeParse(entrada);
  if (!e.success) return { ok: false, erro: 'A proposta tem dados inválidos. Reveja os campos.' };
  const bloqueios = verificar(e.data.conteudo).filter((a) => a.nivel === 'bloqueia');
  if (!podeSair(bloqueios)) return { ok: false, erro: bloqueios.map((a) => a.texto).join(' ') };

  // Tudo o que pode falhar daqui para baixo (configuração, rede, sessão)
  // volta como resultado: uma excepção levava o editor ao ecrã de erro e
  // deitava fora a proposta que estava escrita.
  try {
    return await gravar(e.data);
  } catch {
    log.warn('admin.accao_recusada', { outcome: 'failed', reason: 'guardar_proposta', errorCode: 'excepcao' });
    return { ok: false, erro: 'Não foi possível guardar agora. A proposta continua no editor: tente de novo ou exporte o rascunho.' };
  }
}

async function gravar(e: z.infer<typeof entradaSchema>): Promise<ResultadoGuardar> {
  const supabase = await createSessionClient();
  const { data, error } = await supabase.rpc('guardar_proposta', {
    p_id: e.id,
    p_revisao: e.revisao,
    p_deal_id: e.dealId,
    p_conteudo: e.conteudo,
    p_texto_colado: e.textoColado?.trim() ? e.textoColado : null,
    p_nota: e.nota?.trim() ? e.nota.trim() : null,
  });
  if (error) {
    log.warn('admin.accao_recusada', { outcome: 'rejected', reason: 'guardar_proposta', errorCode: error.code ?? 'desconhecido' });
    return { ok: false, erro: mensagemDe(error.code, error.message) };
  }
  const r = data as { id: string; versao: number; revisao: number; nova: boolean };
  log.info('admin.accao', { outcome: 'accepted', reason: 'guardar_proposta' });
  revalidatePath('/admin/propostas');
  revalidatePath(`/admin/propostas/${r.id}`);
  return { ok: true, id: r.id, versao: r.versao, revisao: r.revisao, nova: r.nova };
}

const ESTADOS = ['rascunho', 'enviada', 'aceite', 'recusada', 'arquivada'] as const;

export async function mudarEstadoProposta(formData: FormData): Promise<void> {
  const id = String(formData.get('id') ?? '');
  const revisao = Number(formData.get('revisao'));
  const estado = String(formData.get('estado') ?? '');
  if (!uuid.safeParse(id).success || !Number.isInteger(revisao) || revisao < 1 || !(ESTADOS as readonly string[]).includes(estado)) {
    redirect('/admin/propostas?erro=Pedido%20inv%C3%A1lido.');
  }
  const destino = `/admin/propostas/${id}`;
  await executar('mudar_estado_proposta', { p_id: id, p_revisao: revisao, p_estado: estado }, destino);
  revalidatePath('/admin/propostas');
  revalidatePath(destino);
  redirect(`${destino}?ok=${encodeURIComponent(estado)}`);
}
