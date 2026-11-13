'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { executar } from './executar';

/**
 * Registar e anular facturas (0021). Como as outras acções do admin: validam
 * a forma aqui e chamam a função `security definer`, que volta a verificar o
 * papel, a fase `ganho`, a revisão e o número único, e audita.
 */

const DESTINO = '/admin/facturacao';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MOEDAS = ['MZN', 'EUR', 'BRL', 'USD'];

function voltar(erro: string): never {
  redirect(`${DESTINO}?erro=${encodeURIComponent(erro)}`);
}

function revisaoDe(v: FormDataEntryValue | null): number | null {
  const t = String(v ?? '').trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isInteger(n) && n >= 1 ? n : voltar('Pedido inválido.');
}

export async function marcarFacturada(formData: FormData): Promise<void> {
  const dealId = String(formData.get('deal_id') ?? '');
  if (!UUID.test(dealId)) voltar('Pedido inválido.');
  const numero = String(formData.get('numero') ?? '').trim();
  const data = String(formData.get('data') ?? '');
  const valor = Number(
    String(formData.get('valor') ?? '')
      .replace(/\s/g, '')
      .replace(',', '.'),
  );
  const moeda = String(formData.get('moeda') ?? '');
  const nota = String(formData.get('nota') ?? '').trim();
  if (!numero || numero.length > 60) voltar('Indique o número da factura (até 60 caracteres).');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) voltar('Indique a data da factura.');
  if (!Number.isFinite(valor) || valor < 0) voltar('Indique o valor facturado.');
  if (!MOEDAS.includes(moeda)) voltar('Escolha a moeda.');
  if (nota.length > 300) voltar('A nota tem no máximo 300 caracteres.');
  await executar(
    'marcar_facturada',
    {
      p_deal_id: dealId,
      p_revisao: revisaoDe(formData.get('revisao')),
      p_numero: numero,
      p_data: data,
      p_valor: valor,
      p_moeda: moeda,
      p_nota: nota || null,
    },
    DESTINO,
  );
  revalidatePath(DESTINO);
  revalidatePath('/admin/painel');
  redirect(`${DESTINO}?ok=facturada`);
}

export async function anularFacturacao(formData: FormData): Promise<void> {
  const dealId = String(formData.get('deal_id') ?? '');
  if (!UUID.test(dealId)) voltar('Pedido inválido.');
  const revisao = revisaoDe(formData.get('revisao'));
  const motivo = String(formData.get('motivo') ?? '').trim();
  if (revisao === null) voltar('Pedido inválido.');
  if (motivo.length < 3 || motivo.length > 300) voltar('Diga porque anula (entre 3 e 300 caracteres).');
  await executar('anular_facturacao', { p_deal_id: dealId, p_revisao: revisao, p_motivo: motivo }, DESTINO);
  revalidatePath(DESTINO);
  redirect(`${DESTINO}?ok=anulada`);
}
