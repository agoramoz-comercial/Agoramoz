import { z } from 'zod';
import { MOEDAS, MOTIVOS_PERDA, type Moeda, type MotivoPerda } from './modelo';

/**
 * Os formulários do CRM lidos no servidor. Cada leitor devolve `ok` com
 * valores já no formato das funções da 0019, ou `erro` com a frase a mostrar.
 * Os limites são os mesmos da base: o servidor recusa antes de a base recusar.
 */

export type Lido<T> = { ok: true; valor: T } | { ok: false; erro: string };

const texto = (f: FormData, k: string) => String(f.get(k) ?? '').trim();

function dataReal(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

/** Maputo não muda de hora: UTC+2 todo o ano. */
const FUSO = '+02:00';

export function lerProximaAccao(f: FormData): Lido<{ accao: string | null; quando: string | null }> {
  const accao = texto(f, 'accao');
  const data = texto(f, 'data');
  const hora = texto(f, 'hora');
  if (!accao && !data) return { ok: true, valor: { accao: null, quando: null } };
  if (!accao || !data) return { ok: false, erro: 'A próxima acção precisa de descrição e de data.' };
  if (accao.length > 200) return { ok: false, erro: 'Descreva a acção em 200 caracteres ou menos.' };
  if (!dataReal(data)) return { ok: false, erro: 'Data inválida.' };
  if (hora && !/^([01]\d|2[0-3]):[0-5]\d$/.test(hora)) return { ok: false, erro: 'Hora inválida.' };
  return { ok: true, valor: { accao, quando: `${data}T${hora || '09:00'}:00${FUSO}` } };
}

export function lerDados(f: FormData): Lido<{ valor: number | null; moeda: Moeda | null; fecho: string | null }> {
  const bruto = texto(f, 'valor').replace(/[\s ]/g, '').replace(',', '.');
  const moeda = texto(f, 'moeda');
  const fecho = texto(f, 'fecho');
  if (fecho && !dataReal(fecho)) return { ok: false, erro: 'Data prevista de fecho inválida.' };
  if (!bruto) return { ok: true, valor: { valor: null, moeda: null, fecho: fecho || null } };
  if (!/^\d+(\.\d{1,2})?$/.test(bruto)) return { ok: false, erro: 'Valor inválido: use só números, com até duas casas decimais.' };
  const valor = Number(bruto);
  if (!Number.isFinite(valor) || valor > 999_999_999_999) return { ok: false, erro: 'Valor fora do limite.' };
  const m = z.enum(MOEDAS).safeParse(moeda);
  if (!m.success) return { ok: false, erro: 'Escolha a moeda do valor.' };
  return { ok: true, valor: { valor, moeda: m.data, fecho: fecho || null } };
}

export function lerPerda(f: FormData): Lido<{ motivo: MotivoPerda; nota: string | null }> {
  const m = z.enum(MOTIVOS_PERDA).safeParse(texto(f, 'motivo'));
  if (!m.success) return { ok: false, erro: 'Indique o motivo da perda.' };
  const nota = texto(f, 'nota').slice(0, 500) || null;
  if (m.data === 'outro' && !nota) return { ok: false, erro: 'Com o motivo «outro», escreva qual foi.' };
  return { ok: true, valor: { motivo: m.data, nota } };
}
