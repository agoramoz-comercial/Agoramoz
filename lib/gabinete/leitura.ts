import type { Alocacao, Decisao, Movimento, Pessoa, Prioridade, Projeto } from './modelo';
import { PRONTIDAO } from './modelo';

/**
 * O que as páginas do Gabinete lêem da base (0018) e como o normalizam. A RLS
 * já só devolve as linhas do dono; aqui só se dá forma aos dados — o
 * PostgREST devolve `numeric` como texto, e somar texto daria lixo.
 */

export const COLUNAS_DECISAO =
  'id, titulo, contexto, chapeu, estado, decisao, responsavel, consultados, indicador, data_revisao, ' +
  'recorrente, quem_decidiu, decidida_em, revisao, updated_at';

export const COLUNAS_PRIORIDADE = 'id, trimestre, tipo, resultado, indicador, meta, estado, nota, revisao';

export const COLUNAS_PROJETO =
  'id, nome, cliente, fase, responsavel, sponsor, resultado, escopo, moeda, receita_contratada, receita_faturada, ' +
  'receita_recebida, custos_variaveis, margem_bruta, pronto_contrato, pronto_escopo, pronto_responsavel, ' +
  'pronto_capacidade, pronto_aceitacao, pronto_dependencias, pronto_pagamento, risco, proxima_accao, proxima_data, ' +
  'ligacao, revisao, updated_at';

export const COLUNAS_MOVIMENTO =
  'id, tipo, descricao, projeto_id, valor, moeda, data_prevista, data_efectiva, revisao, created_at';

export const COLUNAS_PESSOA = 'id, nome, funcao, area, horas_semana, activa, revisao';

export const COLUNAS_ALOCACAO = 'pessoa_id, projeto_id, horas_semana, ate';

type Linha = Record<string, unknown>;

const numeroOuNulo = (v: unknown): number | null => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
const numero = (v: unknown): number => numeroOuNulo(v) ?? 0;
const textoOuNulo = (v: unknown): string | null => (typeof v === 'string' ? v : null);
const texto = (v: unknown, omissao = ''): string => (typeof v === 'string' ? v : omissao);

export function decisaoDe(r: Linha): Decisao {
  return {
    id: String(r.id),
    titulo: texto(r.titulo),
    contexto: textoOuNulo(r.contexto),
    chapeu: texto(r.chapeu, 'ceo') as Decisao['chapeu'],
    estado: texto(r.estado, 'exige_minha') as Decisao['estado'],
    decisao: textoOuNulo(r.decisao),
    responsavel: textoOuNulo(r.responsavel),
    consultados: textoOuNulo(r.consultados),
    indicador: textoOuNulo(r.indicador),
    data_revisao: textoOuNulo(r.data_revisao),
    recorrente: r.recorrente === true,
    quem_decidiu: (textoOuNulo(r.quem_decidiu) as Decisao['quem_decidiu']) ?? null,
    decidida_em: textoOuNulo(r.decidida_em),
    revisao: numeroOuNulo(r.revisao) ?? 1,
    updated_at: texto(r.updated_at),
  };
}

export function prioridadeDe(r: Linha): Prioridade {
  return {
    id: String(r.id),
    trimestre: texto(r.trimestre),
    tipo: texto(r.tipo, 'empresarial') as Prioridade['tipo'],
    resultado: texto(r.resultado),
    indicador: textoOuNulo(r.indicador),
    meta: textoOuNulo(r.meta),
    estado: texto(r.estado, 'em_curso') as Prioridade['estado'],
    nota: textoOuNulo(r.nota),
    revisao: numeroOuNulo(r.revisao) ?? 1,
  };
}

export function projetoDe(r: Linha): Projeto {
  return {
    id: String(r.id),
    nome: texto(r.nome),
    cliente: textoOuNulo(r.cliente),
    fase: texto(r.fase, 'diagnostico') as Projeto['fase'],
    responsavel: textoOuNulo(r.responsavel),
    sponsor: textoOuNulo(r.sponsor),
    resultado: textoOuNulo(r.resultado),
    escopo: textoOuNulo(r.escopo),
    moeda: texto(r.moeda, 'MZN'),
    receita_contratada: numeroOuNulo(r.receita_contratada),
    receita_faturada: numeroOuNulo(r.receita_faturada),
    receita_recebida: numeroOuNulo(r.receita_recebida),
    custos_variaveis: numeroOuNulo(r.custos_variaveis),
    margem_bruta: numeroOuNulo(r.margem_bruta),
    prontidao: Object.fromEntries(PRONTIDAO.map((c) => [c.coluna, r[c.coluna] === true])) as Projeto['prontidao'],
    risco: texto(r.risco, 'baixo') as Projeto['risco'],
    proxima_accao: textoOuNulo(r.proxima_accao),
    proxima_data: textoOuNulo(r.proxima_data),
    ligacao: textoOuNulo(r.ligacao),
    revisao: numeroOuNulo(r.revisao) ?? 1,
    updated_at: texto(r.updated_at),
  };
}

export function movimentoDe(r: Linha): Movimento {
  return {
    id: String(r.id),
    tipo: texto(r.tipo, 'recebimento') as Movimento['tipo'],
    descricao: texto(r.descricao),
    projeto_id: textoOuNulo(r.projeto_id),
    valor: numero(r.valor),
    moeda: texto(r.moeda, 'MZN'),
    data_prevista: texto(r.data_prevista),
    data_efectiva: textoOuNulo(r.data_efectiva),
    revisao: numeroOuNulo(r.revisao) ?? 1,
    created_at: texto(r.created_at),
  };
}

export function pessoaDe(r: Linha): Pessoa {
  return {
    id: String(r.id),
    nome: texto(r.nome),
    funcao: textoOuNulo(r.funcao),
    area: texto(r.area, 'outro') as Pessoa['area'],
    horas_semana: numero(r.horas_semana),
    activa: r.activa !== false,
    revisao: numeroOuNulo(r.revisao) ?? 1,
  };
}

export function alocacaoDe(r: Linha): Alocacao {
  return {
    pessoa_id: String(r.pessoa_id),
    projeto_id: String(r.projeto_id),
    horas_semana: numero(r.horas_semana),
    ate: textoOuNulo(r.ate),
  };
}
