import { FASES_OPORTUNIDADE } from '@/lib/admin/labels';
import { CANAIS } from '@/lib/attribution/types';
import { sanitizarUtm } from '@/lib/attribution/sanitize';
import { estadoProximaAccao, estaParada, FASES_FECHADAS } from './modelo';

/**
 * O pipeline lido como uma consola: vistas predefinidas, ordenação por
 * cabeçalho e quadro por fase, tudo derivado do URL. Funções puras: a página
 * lê da base e passa as linhas; aqui decide-se o que se mostra.
 */

export interface OportunidadePipeline {
  readonly id: string;
  readonly stage: string;
  readonly tier: string | null;
  readonly score: number | null;
  readonly owner_id: string | null;
  readonly next_action_at: string | null;
  readonly proxima_accao: string | null;
  readonly fase_desde: string | null;
  readonly valor: number | null;
  readonly moeda: string | null;
  readonly created_at: string;
  readonly canal: string;
  readonly campanha: string | null;
  readonly contacto: { id: string; nome: string } | null;
  readonly organizacao: { id: string; nome: string } | null;
  readonly ultima_actividade: string | null;
}

export const VISTAS = ['abertas', 'minhas', 'atrasadas', 'sem-dono', 'paradas', 'todas'] as const;
export type Vista = (typeof VISTAS)[number];
export const VISTA: Readonly<Record<Vista, string>> = {
  abertas: 'Abertas',
  minhas: 'As minhas',
  atrasadas: 'Atrasadas',
  'sem-dono': 'Sem dono',
  paradas: 'Paradas',
  todas: 'Todas',
};

export const ORDENS = ['proxima', 'valor', 'fase', 'actividade', 'criada'] as const;
export type Ordem = (typeof ORDENS)[number];

export interface Filtros {
  readonly vista: Vista;
  readonly modo: 'lista' | 'quadro';
  readonly ordem: Ordem;
  readonly sentido: 'asc' | 'desc';
  readonly fase?: string;
  readonly canal?: string;
  readonly campanha?: string;
  /** Um UUID da equipa, ou `sem` para as sem dono (drill-down do painel). */
  readonly dono?: string;
  readonly pagina: number;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const um = <T extends string>(v: unknown, lista: readonly T[]): T | undefined =>
  typeof v === 'string' && (lista as readonly string[]).includes(v) ? (v as T) : undefined;

export function lerFiltros(p: Record<string, string | undefined>): Filtros {
  const n = Number.parseInt(p.pagina ?? '1', 10);
  return {
    vista: um(p.vista, VISTAS) ?? 'abertas',
    modo: p.modo === 'quadro' ? 'quadro' : 'lista',
    ordem: um(p.ordem, ORDENS) ?? 'proxima',
    sentido: p.sentido === 'desc' ? 'desc' : 'asc',
    fase: um(p.fase, FASES_OPORTUNIDADE),
    canal: um(p.canal, CANAIS),
    // O mesmo sanitizador da escrita: `_` e `%` nunca chegam a um padrão LIKE.
    campanha: sanitizarUtm(p.campanha) ?? undefined,
    dono: p.dono === 'sem' || (p.dono && UUID.test(p.dono)) ? p.dono : undefined,
    pagina: Number.isFinite(n) && n > 0 ? n : 1,
  };
}

/** O URL da lista com estes filtros e as mudanças pedidas; omite os valores por omissão. */
export function urlCom(f: Filtros, mudar: Partial<Filtros>): string {
  const g = { ...f, ...mudar };
  const q = new URLSearchParams();
  if (g.vista !== 'abertas') q.set('vista', g.vista);
  if (g.modo !== 'lista') q.set('modo', g.modo);
  if (g.ordem !== 'proxima') q.set('ordem', g.ordem);
  if (g.sentido !== 'asc') q.set('sentido', g.sentido);
  if (g.fase) q.set('fase', g.fase);
  if (g.canal) q.set('canal', g.canal);
  if (g.campanha) q.set('campanha', g.campanha);
  if (g.dono) q.set('dono', g.dono);
  if (g.pagina > 1) q.set('pagina', String(g.pagina));
  const s = q.toString();
  return s ? `/admin/oportunidades?${s}` : '/admin/oportunidades';
}

const aberta = (o: OportunidadePipeline) => !(FASES_FECHADAS as readonly string[]).includes(o.stage);

/** O filtro de responsável, aplicado depois da vista. */
export function filtrarDono<T extends OportunidadePipeline>(itens: readonly T[], dono: string | undefined): T[] {
  if (!dono) return [...itens];
  return itens.filter((o) => (dono === 'sem' ? o.owner_id === null : o.owner_id === dono));
}

export function aplicarVista<T extends OportunidadePipeline>(itens: readonly T[], vista: Vista, eu: string, agora: Date): T[] {
  switch (vista) {
    case 'todas':
      return [...itens];
    case 'abertas':
      return itens.filter(aberta);
    case 'minhas':
      return itens.filter((o) => aberta(o) && o.owner_id === eu);
    case 'atrasadas':
      return itens.filter((o) => aberta(o) && estadoProximaAccao(o.next_action_at, agora) === 'atrasada');
    case 'sem-dono':
      return itens.filter((o) => aberta(o) && o.owner_id === null);
    case 'paradas':
      return itens.filter((o) => aberta(o) && estaParada(o.ultima_actividade, agora));
  }
}

function chave(o: OportunidadePipeline, ordem: Ordem): number | null {
  const t = (s: string | null) => (s ? Date.parse(s) : null);
  switch (ordem) {
    case 'proxima':
      return t(o.next_action_at);
    case 'valor':
      return o.valor;
    case 'fase':
      return t(o.fase_desde);
    case 'actividade':
      return t(o.ultima_actividade);
    case 'criada':
      return t(o.created_at);
  }
}

/**
 * Valores em falta vão sempre para o fim, em qualquer sentido. O valor não tem
 * câmbio: ordena-se por moeda (sempre alfabética) e só depois pelo montante —
 * 18 000 EUR e 350 000 MZN não se comparam.
 */
export function ordenar<T extends OportunidadePipeline>(itens: readonly T[], ordem: Ordem, sentido: 'asc' | 'desc'): T[] {
  const s = sentido === 'asc' ? 1 : -1;
  return [...itens].sort((a, b) => {
    if (ordem === 'valor' && a.valor !== null && b.valor !== null && a.moeda !== b.moeda) {
      return (a.moeda ?? '').localeCompare(b.moeda ?? '');
    }
    const x = chave(a, ordem);
    const y = chave(b, ordem);
    if (x === null && y === null) return 0;
    if (x === null) return 1;
    if (y === null) return -1;
    return (x - y) * s;
  });
}

export function agruparPorFase<T extends OportunidadePipeline>(itens: readonly T[]): { fase: string; itens: T[] }[] {
  return FASES_OPORTUNIDADE.map((fase) => ({ fase, itens: itens.filter((o) => o.stage === fase) }));
}

export function totaisPorMoeda(itens: readonly { readonly valor: number | null; readonly moeda: string | null }[]): { moeda: string; total: number }[] {
  const m = new Map<string, number>();
  for (const o of itens) if (o.valor !== null && o.moeda) m.set(o.moeda, (m.get(o.moeda) ?? 0) + o.valor);
  return [...m.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([moeda, total]) => ({ moeda, total }));
}

export function paginar<T>(itens: readonly T[], pagina: number, tamanho = 50): { itens: T[]; haMais: boolean } {
  const de = (pagina - 1) * tamanho;
  return { itens: itens.slice(de, de + tamanho), haMais: itens.length > de + tamanho };
}

/**
 * Para onde volta uma acção feita a partir da lista, do quadro ou da ficha.
 * Só caminhos do próprio pipeline (lista com filtros, ou uma ficha) e do ecrã
 * Hoje — nunca um destino arbitrário vindo do formulário.
 */
export function destinoSeguroCrm(bruto: string | null | undefined, padrao: string): string {
  const v = String(bruto ?? '');
  return /^\/admin(\/oportunidades(\/[0-9a-f-]{36})?)?(\?[\w\-=&%.+]*)?$/.test(v) ? v : padrao;
}
