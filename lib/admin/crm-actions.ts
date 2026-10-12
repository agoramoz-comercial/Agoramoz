'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireRole } from '@/lib/auth/session';
import { lerDados, lerPerda, lerProximaAccao } from '@/lib/crm/formularios';
import { TIPOS_ACTIVIDADE } from '@/lib/crm/modelo';
import { destinoSeguroCrm } from '@/lib/crm/pipeline';
import { FASES_OPORTUNIDADE } from './labels';
import { executar, voltarCom } from './executar';

/**
 * Acções do CRM operacional (0019). A base decide quem pode (cada função
 * exige `admin` ou `comercial` e grava a auditoria); aqui valida-se a forma,
 * porque o que chega a uma Server Action é tão pouco confiável como o que
 * chega a uma rota. Todas voltam para onde a pessoa estava — a lista com os
 * seus filtros, o quadro, a ficha ou o Hoje — com uma mensagem específica.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function idDe(f: FormData, destino: string): string {
  const v = String(f.get('id') ?? '').trim();
  if (!UUID.test(v)) voltarCom(destino, 'Pedido inválido.');
  return v;
}

function revisaoDe(f: FormData, destino: string): number {
  const n = Number(f.get('revisao'));
  if (!Number.isInteger(n) || n < 1) voltarCom(destino, 'Pedido inválido.');
  return n;
}

function ficha(id: string) {
  return `/admin/oportunidades/${id}`;
}

function voltar(f: FormData, id: string): string {
  return destinoSeguroCrm(String(f.get('voltar') ?? ''), ficha(id));
}

function concluir(destino: string, ok: string): never {
  revalidatePath('/admin/oportunidades', 'layout');
  revalidatePath('/admin');
  revalidatePath('/admin/painel');
  const [caminho, query] = destino.split('?');
  const q = new URLSearchParams(query ?? '');
  q.delete('erro');
  q.set('ok', ok);
  redirect(`${caminho}?${q.toString()}`);
}

export async function moverFase(f: FormData): Promise<void> {
  await requireRole(['admin', 'comercial']);
  const id = idDe(f, '/admin/oportunidades');
  const destino = voltar(f, id);
  const fase = String(f.get('fase') ?? '');
  if (!(FASES_OPORTUNIDADE as readonly string[]).includes(fase)) voltarCom(destino, 'Fase desconhecida.');
  // «Perdido» precisa de motivo: vai para a ficha, ao formulário da perda.
  if (fase === 'perdido') redirect(`${ficha(id)}?perder=1#perder`);
  await executar('mudar_fase_oportunidade', { p_deal_id: id, p_fase: fase, p_nota: null }, destino);
  concluir(destino, 'fase');
}

export async function definirProximaAccao(f: FormData): Promise<void> {
  await requireRole(['admin', 'comercial']);
  const id = idDe(f, '/admin/oportunidades');
  const destino = voltar(f, id);
  const lido = lerProximaAccao(f);
  if (!lido.ok) voltarCom(destino, lido.erro);
  await executar(
    'definir_proxima_accao',
    { p_deal_id: id, p_revisao: revisaoDe(f, destino), p_accao: lido.valor.accao, p_quando: lido.valor.quando },
    destino,
  );
  concluir(destino, lido.valor.accao ? 'proxima' : 'proxima-limpa');
}

export async function guardarDados(f: FormData): Promise<void> {
  await requireRole(['admin', 'comercial']);
  const id = idDe(f, '/admin/oportunidades');
  const destino = voltar(f, id);
  const lido = lerDados(f);
  if (!lido.ok) voltarCom(destino, lido.erro);
  await executar(
    'guardar_oportunidade_crm',
    {
      p_deal_id: id,
      p_revisao: revisaoDe(f, destino),
      p_valor: lido.valor.valor,
      p_moeda: lido.valor.moeda,
      p_data_prevista_fecho: lido.valor.fecho,
    },
    destino,
  );
  concluir(destino, 'dados');
}

export async function marcarPerdida(f: FormData): Promise<void> {
  await requireRole(['admin', 'comercial']);
  const id = idDe(f, '/admin/oportunidades');
  const destino = voltar(f, id);
  const lido = lerPerda(f);
  if (!lido.ok) voltarCom(destino, lido.erro);
  await executar('marcar_perdida', { p_deal_id: id, p_motivo: lido.valor.motivo, p_nota: lido.valor.nota }, destino);
  concluir(destino, 'perdida');
}

export async function atribuirAMim(f: FormData): Promise<void> {
  const sessao = await requireRole(['admin', 'comercial']);
  const id = idDe(f, '/admin/oportunidades');
  const destino = voltar(f, id);
  await executar('atribuir_oportunidade', { p_deal_id: id, p_owner: sessao.userId }, destino);
  concluir(destino, 'minha');
}

export async function registarActividade(f: FormData): Promise<void> {
  await requireRole(['admin', 'comercial']);
  const id = idDe(f, '/admin/oportunidades');
  const destino = voltar(f, id);
  const tipo = String(f.get('tipo') ?? 'nota');
  if (!(TIPOS_ACTIVIDADE as readonly string[]).includes(tipo)) voltarCom(destino, 'Tipo de actividade desconhecido.');
  const corpo = String(f.get('corpo') ?? '').replace(/\r\n?/g, '\n').trim();
  if (!corpo) voltarCom(destino, 'Escreva o que aconteceu.');
  if (corpo.length > 4000) voltarCom(destino, 'Texto demasiado longo (máximo 4000 caracteres).');
  await executar('registar_actividade', { p_deal_id: id, p_tipo: tipo, p_corpo: corpo }, destino);
  concluir(destino, 'actividade');
}
