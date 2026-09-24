'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createSessionClient } from '@/lib/auth/client';
import { log } from '@/lib/log/logger';
import { RPC, type NomeRpc } from './rpc';

/**
 * Acções de escrita do admin.
 *
 * Nenhuma escreve em tabela. Todas chamam uma função `security definer` da
 * migração 0006, que verifica o papel outra vez, deriva o autor de
 * `auth.uid()` em vez de o aceitar como argumento, confirma a revisão onde
 * faz sentido e escreve a auditoria na mesma transação.
 *
 * É por isso que um botão escondido não é um problema de segurança aqui: o
 * ecrã decide o que mostrar, a base decide o que acontece.
 */

/**
 * Traduz o erro para algo que se possa mostrar.
 *
 * Nunca se devolve a mensagem do Postgres tal como vem: pode descrever o
 * esquema, e num erro de unicidade pode conter o próprio valor que colidiu.
 * Os códigos são os que as funções de 0006 levantam de propósito.
 */
function mensagemDe(codigo: string | undefined, mensagem: string | undefined): string {
  switch (codigo) {
    case '42501':
      return 'Não tem permissão para esta acção.';
    case '40001':
      return 'O registo mudou entretanto. Recarregue a página e reveja antes de decidir.';
    case 'P0002':
      return 'Registo não encontrado.';
    case '23514':
    case '23503':
    case '22023':
      // Texto nosso, escrito nas funções da migração para ser lido por pessoas.
      return mensagem?.split('\n')[0] ?? 'Pedido inválido.';
    default:
      return 'Não foi possível concluir a acção.';
  }
}

async function chamar(
  funcao: NomeRpc,
  argumentos: Record<string, unknown>,
  destino: string,
): Promise<never> {
  // Falha cedo e em desenvolvimento se alguém passar um argumento que a função
  // não declara: o PostgREST responderia «função não encontrada», que manda
  // procurar no sítio errado.
  const esperados = RPC[funcao] as readonly string[];
  for (const chave of Object.keys(argumentos)) {
    if (!esperados.includes(chave))
      throw new Error(`Parâmetro desconhecido em ${funcao}: ${chave}`);
  }

  const supabase = await createSessionClient();
  const { error } = await supabase.rpc(funcao, argumentos);

  if (error) {
    log.warn('admin.accao_recusada', {
      outcome: 'rejected',
      reason: funcao,
      errorCode: error.code ?? 'desconhecido',
    });
    redirect(`${destino}?erro=${encodeURIComponent(mensagemDe(error.code, error.message))}`);
  }

  log.info('admin.accao', { outcome: 'accepted', reason: funcao });
  revalidatePath(destino);
  revalidatePath('/admin');
  redirect(`${destino}?ok=1`);
}

function idDe(formData: FormData, campo: string): string {
  const valor = String(formData.get(campo) ?? '').trim();
  if (!/^[0-9a-f-]{36}$/i.test(valor)) redirect('/admin?erro=Pedido%20inv%C3%A1lido.');
  return valor;
}

function revisaoDe(formData: FormData): number {
  const n = Number(formData.get('revision'));
  if (!Number.isInteger(n) || n < 1) redirect('/admin?erro=Pedido%20inv%C3%A1lido.');
  return n;
}

// ── Diagnósticos ──────────────────────────────────────────────────────────

export async function enviarParaRevisao(formData: FormData): Promise<void> {
  const id = idDe(formData, 'id');
  await chamar(
    'enviar_para_revisao',
    { p_id: id, p_revision: revisaoDe(formData) },
    `/admin/diagnosticos/${id}`,
  );
}

export async function aprovarDiagnostico(formData: FormData): Promise<void> {
  const id = idDe(formData, 'id');
  await chamar(
    'aprovar_diagnostico',
    { p_id: id, p_revision: revisaoDe(formData) },
    `/admin/diagnosticos/${id}`,
  );
}

export async function rejeitarDiagnostico(formData: FormData): Promise<void> {
  const id = idDe(formData, 'id');
  await chamar(
    'rejeitar_diagnostico',
    {
      p_id: id,
      p_revision: revisaoDe(formData),
      p_motivo: String(formData.get('motivo') ?? ''),
    },
    `/admin/diagnosticos/${id}`,
  );
}

// ── Oportunidades ─────────────────────────────────────────────────────────

export async function mudarFase(formData: FormData): Promise<void> {
  const id = idDe(formData, 'id');
  await chamar(
    'mudar_fase_oportunidade',
    {
      p_deal_id: id,
      p_fase: String(formData.get('fase') ?? ''),
      p_nota: String(formData.get('nota') ?? '') || null,
    },
    `/admin/oportunidades/${id}`,
  );
}

export async function atribuirOportunidade(formData: FormData): Promise<void> {
  const id = idDe(formData, 'id');
  const dono = String(formData.get('owner') ?? '').trim();
  await chamar(
    'atribuir_oportunidade',
    { p_deal_id: id, p_owner: dono === '' ? null : dono },
    `/admin/oportunidades/${id}`,
  );
}

export async function registarNota(formData: FormData): Promise<void> {
  const id = idDe(formData, 'id');
  await chamar(
    'registar_actividade',
    { p_deal_id: id, p_tipo: 'nota', p_corpo: String(formData.get('corpo') ?? '') },
    `/admin/oportunidades/${id}`,
  );
}

// ── Equipa ────────────────────────────────────────────────────────────────

export async function definirPapel(formData: FormData): Promise<void> {
  await chamar(
    'definir_papel',
    { p_user: idDe(formData, 'id'), p_papel: String(formData.get('papel') ?? '') },
    '/admin/equipa',
  );
}

export async function definirActivo(formData: FormData): Promise<void> {
  await chamar(
    'definir_perfil_activo',
    { p_user: idDe(formData, 'id'), p_activo: formData.get('activo') === 'sim' },
    '/admin/equipa',
  );
}
