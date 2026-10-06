import type { OportunidadeResumo, Prioridade } from './modelo';

/**
 * O que as páginas do Espaço CEnO lêem da base (0017) e como o normalizam.
 * A RLS já só devolve as linhas da dona; aqui só se dá forma aos dados — o
 * PostgREST pode devolver `numeric` como texto, e um ecrã que somasse texto
 * mostraria «1000500» em vez de 1500.
 */

export const COLUNAS_OPORTUNIDADE =
  'id, titulo, organizacao, sector, problema, fonte, urgencia, valor_min, valor_max, moeda, valor_evidencia, ' +
  'fase, fase_desde, c_dor, c_urgencia, c_decisor, c_capacidade, c_adequacao, c_controlo, c_informacao, c_valor, ' +
  'score_total, prioridade, proxima_accao, proxima_data, responsavel, memo, motivo_perda, ultima_actividade, ' +
  'revisao, created_at, updated_at';

export const COLUNAS_STAKEHOLDER =
  'id, organizacao, pessoa, cargo, pais, sector, tipo, interesse, poder_decisao, relacao, ultima_interacao, ' +
  'proxima_accao, proxima_data, origem_dados, consentimento, responsavel, activo, revisao, updated_at';

export interface Oportunidade extends OportunidadeResumo {
  readonly organizacao: string | null;
  readonly sector: string;
  readonly problema: string | null;
  readonly fonte: string | null;
  readonly urgencia: string;
  readonly valor_evidencia: string | null;
  readonly c_dor: number | null;
  readonly c_urgencia: number | null;
  readonly c_decisor: number | null;
  readonly c_capacidade: number | null;
  readonly c_adequacao: number | null;
  readonly c_controlo: number | null;
  readonly c_informacao: number | null;
  readonly c_valor: number | null;
  readonly motivo_perda: string | null;
  readonly revisao: number;
  readonly created_at: string;
  readonly updated_at: string;
}

export interface Stakeholder {
  readonly id: string;
  readonly organizacao: string;
  readonly pessoa: string | null;
  readonly cargo: string | null;
  readonly pais: string | null;
  readonly sector: string | null;
  readonly tipo: string;
  readonly interesse: string | null;
  readonly poder_decisao: number | null;
  readonly relacao: string;
  readonly ultima_interacao: string | null;
  readonly proxima_accao: string | null;
  readonly proxima_data: string | null;
  readonly origem_dados: string | null;
  readonly consentimento: boolean;
  readonly responsavel: string | null;
  readonly activo: boolean;
  readonly revisao: number;
  readonly updated_at: string;
}

export interface Registo {
  readonly id: number;
  readonly tipo: 'nota' | 'reuniao' | 'decisao' | 'fase' | 'documento';
  readonly decisao: string | null;
  readonly corpo: string | null;
  readonly metadata: Record<string, unknown>;
  readonly ocorreu_em: string;
}

export interface Documento {
  readonly pasta: number;
  readonly estado: 'em_falta' | 'em_curso' | 'pronto';
  readonly ligacao: string | null;
  readonly nota: string | null;
}

export interface Ligacao {
  readonly stakeholder_id: string;
  readonly papel: string;
}

const numeroOuNulo = (v: unknown): number | null => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const textoOuNulo = (v: unknown): string | null => (typeof v === 'string' ? v : null);

/** Uma linha de `ceno_oportunidades`, com números como números. */
export function oportunidadeDe(r: Record<string, unknown>): Oportunidade {
  const memo = r.memo && typeof r.memo === 'object' && !Array.isArray(r.memo) ? (r.memo as Record<string, unknown>) : {};
  return {
    id: String(r.id),
    titulo: String(r.titulo ?? ''),
    organizacao: textoOuNulo(r.organizacao),
    sector: String(r.sector ?? 'outro'),
    problema: textoOuNulo(r.problema),
    fonte: textoOuNulo(r.fonte),
    urgencia: String(r.urgencia ?? 'media'),
    valor_min: numeroOuNulo(r.valor_min),
    valor_max: numeroOuNulo(r.valor_max),
    moeda: String(r.moeda ?? 'USD'),
    valor_evidencia: textoOuNulo(r.valor_evidencia),
    fase: String(r.fase ?? 'sinal'),
    fase_desde: String(r.fase_desde ?? r.created_at ?? ''),
    c_dor: numeroOuNulo(r.c_dor),
    c_urgencia: numeroOuNulo(r.c_urgencia),
    c_decisor: numeroOuNulo(r.c_decisor),
    c_capacidade: numeroOuNulo(r.c_capacidade),
    c_adequacao: numeroOuNulo(r.c_adequacao),
    c_controlo: numeroOuNulo(r.c_controlo),
    c_informacao: numeroOuNulo(r.c_informacao),
    c_valor: numeroOuNulo(r.c_valor),
    score_total: numeroOuNulo(r.score_total),
    prioridade: (textoOuNulo(r.prioridade) as Prioridade | null) ?? null,
    proxima_accao: textoOuNulo(r.proxima_accao),
    proxima_data: textoOuNulo(r.proxima_data),
    responsavel: textoOuNulo(r.responsavel),
    memo,
    motivo_perda: textoOuNulo(r.motivo_perda),
    ultima_actividade: String(r.ultima_actividade ?? r.updated_at ?? ''),
    revisao: numeroOuNulo(r.revisao) ?? 1,
    created_at: String(r.created_at ?? ''),
    updated_at: String(r.updated_at ?? ''),
  };
}

export function stakeholderDe(r: Record<string, unknown>): Stakeholder {
  return {
    id: String(r.id),
    organizacao: String(r.organizacao ?? ''),
    pessoa: textoOuNulo(r.pessoa),
    cargo: textoOuNulo(r.cargo),
    pais: textoOuNulo(r.pais),
    sector: textoOuNulo(r.sector),
    tipo: String(r.tipo ?? ''),
    interesse: textoOuNulo(r.interesse),
    poder_decisao: numeroOuNulo(r.poder_decisao),
    relacao: String(r.relacao ?? 'nova'),
    ultima_interacao: textoOuNulo(r.ultima_interacao),
    proxima_accao: textoOuNulo(r.proxima_accao),
    proxima_data: textoOuNulo(r.proxima_data),
    origem_dados: textoOuNulo(r.origem_dados),
    consentimento: r.consentimento === true,
    responsavel: textoOuNulo(r.responsavel),
    activo: r.activo !== false,
    revisao: numeroOuNulo(r.revisao) ?? 1,
    updated_at: String(r.updated_at ?? ''),
  };
}

/** `AAAA-MM-DD` (data de calendário) → «8 out. 2026». Sem fuso: é uma data, não um instante. */
export function dataCurta(iso: string | null): string {
  if (!iso) return '—';
  const [a, m, d] = iso.slice(0, 10).split('-').map(Number);
  if (!a || !m || !d) return '—';
  return new Intl.DateTimeFormat('pt-PT', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(
    new Date(Date.UTC(a, m - 1, d)),
  );
}
