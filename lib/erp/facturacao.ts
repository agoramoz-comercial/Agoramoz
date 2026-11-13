import { BOM, linha } from '@/lib/inqueritos/csv';

/**
 * Facturação interna (D-48): a fila «A facturar», sem ERP. Funções puras.
 *
 * Uma oportunidade ganha está «por facturar» enquanto não tiver uma factura
 * válida registada (`facturacao`, 0021). Anular devolve-a à fila. Os totais
 * são por moeda: MZN e USD não se somam.
 */

export type EstadoFacturacao = 'por-facturar' | 'facturada';
export const FILTROS = ['por-facturar', 'facturadas', 'todas'] as const;
export type FiltroFacturacao = (typeof FILTROS)[number];

export interface Factura {
  readonly estado: 'facturada' | 'anulada';
  readonly numero: string;
  readonly data: string;
  readonly valor: number;
  readonly moeda: string;
  readonly nota: string | null;
  readonly motivoAnulacao: string | null;
  readonly revisao: number;
}

export interface LinhaFacturacao {
  readonly dealId: string;
  readonly cliente: string;
  readonly contacto: string | null;
  readonly responsavel: string | null;
  /** Quando passou a «ganho» (`fase_desde`). */
  readonly ganhaEm: string;
  /** O valor e a moeda da oportunidade (o que se espera facturar). */
  readonly valor: number | null;
  readonly moeda: string | null;
  readonly factura: Factura | null;
}

export const estadoDe = (l: LinhaFacturacao): EstadoFacturacao => (l.factura?.estado === 'facturada' ? 'facturada' : 'por-facturar');

export function lerFiltro(v: string | undefined): FiltroFacturacao {
  return (FILTROS as readonly string[]).includes(v ?? '') ? (v as FiltroFacturacao) : 'por-facturar';
}

export function filtrar(linhas: readonly LinhaFacturacao[], f: FiltroFacturacao): LinhaFacturacao[] {
  if (f === 'todas') return [...linhas];
  return linhas.filter((l) => estadoDe(l) === (f === 'facturadas' ? 'facturada' : 'por-facturar'));
}

/** Dias desde que foi ganha: o que diz há quanto tempo o dinheiro está por pedir. */
export function diasDesde(iso: string, agora: Date): number {
  return Math.max(0, Math.floor((agora.getTime() - Date.parse(iso)) / 86_400_000));
}

export interface Totais {
  readonly porFacturar: { readonly n: number; readonly semValor: number; readonly porMoeda: Readonly<Record<string, number>> };
  readonly facturadoNoMes: { readonly n: number; readonly porMoeda: Readonly<Record<string, number>> };
  /** Por facturar há mais de 7 dias (limite AEOS para facturas vencidas, aplicado ao que ainda nem foi facturado). */
  readonly atrasadas: number;
}

export function totais(linhas: readonly LinhaFacturacao[], agora: Date): Totais {
  const mes = agora.toISOString().slice(0, 7);
  const porMoeda: Record<string, number> = {};
  const noMes: Record<string, number> = {};
  let n = 0;
  let semValor = 0;
  let nMes = 0;
  let atrasadas = 0;
  for (const l of linhas) {
    if (estadoDe(l) === 'por-facturar') {
      n += 1;
      if (l.valor === null || !l.moeda) semValor += 1;
      else porMoeda[l.moeda] = (porMoeda[l.moeda] ?? 0) + l.valor;
      if (diasDesde(l.ganhaEm, agora) > 7) atrasadas += 1;
    } else if (l.factura && l.factura.data.startsWith(mes)) {
      nMes += 1;
      noMes[l.factura.moeda] = (noMes[l.factura.moeda] ?? 0) + l.factura.valor;
    }
  }
  return { porFacturar: { n, semValor, porMoeda }, facturadoNoMes: { n: nMes, porMoeda: noMes }, atrasadas };
}

const valorCsv = (n: number | null) => (n === null ? '' : n.toFixed(2));
const dia = (iso: string) => new Date(iso).toLocaleDateString('sv-SE', { timeZone: 'Africa/Maputo' });

/** Para o contabilista: separador `;`, BOM UTF-8, valores com ponto decimal, fórmulas neutralizadas. */
export function csvFacturacao(linhas: readonly LinhaFacturacao[]): string {
  const cab = linha([
    'Estado',
    'Cliente',
    'Contacto',
    'Responsável',
    'Ganha em',
    'Valor da oportunidade',
    'Moeda da oportunidade',
    'N.º da factura',
    'Data da factura',
    'Valor facturado',
    'Moeda da factura',
    'Nota',
    'Anulada (motivo)',
    'Id da oportunidade',
  ]);
  const corpo = linhas.map((l) => {
    const f = l.factura;
    const valida = f?.estado === 'facturada';
    return linha([
      valida ? 'Facturada' : 'Por facturar',
      l.cliente,
      l.contacto ?? '',
      l.responsavel ?? '',
      dia(l.ganhaEm),
      valorCsv(l.valor),
      l.moeda ?? '',
      valida ? f.numero : '',
      valida ? f.data : '',
      valida ? valorCsv(f.valor) : '',
      valida ? f.moeda : '',
      f?.nota ?? '',
      f?.estado === 'anulada' ? `${f.numero}: ${f.motivoAnulacao ?? ''}` : '',
      l.dealId,
    ]);
  });
  return BOM + cab + corpo.join('');
}

export function nomeFicheiroFacturacao(agora: Date): string {
  const d = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Maputo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(
    agora,
  );
  return `a-facturar-${d}.csv`;
}
