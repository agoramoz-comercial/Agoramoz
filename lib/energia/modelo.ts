import type { Rotulo } from '@/lib/admin/labels';

/**
 * O modelo do Espaço CEnO — o Opportunity Operating System da Chief Energy
 * Officer. Fonte única dos vocabulários que a migração 0017 impõe por CHECK;
 * o teste ao lado compara-os com o SQL, para um valor novo na base não
 * aparecer como «undefined» num ecrã.
 *
 * Tudo aqui é puro: sem base, sem relógio implícito (o «agora» entra por
 * argumento), para os cálculos do scorecard serem testáveis.
 */

// ---------------------------------------------------------------------------
// Pipeline
// ---------------------------------------------------------------------------

export interface Fase {
  readonly chave: string;
  readonly ordem: number;
  readonly texto: string;
  /** Condição de entrada (o que já tem de ser verdade). */
  readonly entrada: string;
  /** Critério de passagem para a seguinte. */
  readonly passagem: string;
}

export const FASES = [
  { chave: 'sinal', ordem: 0, texto: 'Sinal identificado', entrada: 'Existe empresa, projecto ou necessidade', passagem: 'Informação mínima registada' },
  { chave: 'contacto', ordem: 1, texto: 'Contacto iniciado', entrada: 'Existe pessoa-alvo', passagem: 'Resposta ou introdução confirmada' },
  { chave: 'descoberta', ordem: 2, texto: 'Descoberta marcada', entrada: 'O interlocutor aceita conversa', passagem: 'Reunião realizada' },
  { chave: 'problema_validado', ordem: 3, texto: 'Problema validado', entrada: 'Dor, impacto e urgência confirmados', passagem: 'Sponsor e processo decisório identificados' },
  { chave: 'qualificada', ordem: 4, texto: 'Oportunidade qualificada', entrada: 'Existe adequação estratégica', passagem: 'Score mínimo aprovado (≥ 24)' },
  { chave: 'estruturacao', ordem: 5, texto: 'Estruturação', entrada: 'Modelo de colaboração em desenvolvimento', passagem: 'Business case preliminar' },
  { chave: 'preparacao', ordem: 6, texto: 'Preparação para investimento', entrada: 'Dados técnicos e financeiros disponíveis', passagem: 'Dossier mínimo concluído' },
  { chave: 'proposta', ordem: 7, texto: 'Proposta ou mandato', entrada: 'Escopo e contrapartidas definidos', passagem: 'Documento enviado' },
  { chave: 'negociacao', ordem: 8, texto: 'Negociação', entrada: 'Decisores envolvidos', passagem: 'Termos comerciais acordados' },
  { chave: 'acordo', ordem: 9, texto: 'Acordo', entrada: 'Contrato, MoU, mandato ou JV assinado', passagem: 'Responsáveis de execução definidos' },
  { chave: 'execucao', ordem: 10, texto: 'Execução', entrada: 'Projecto transferido', passagem: 'Kick-off realizado' },
  { chave: 'valor_realizado', ordem: 11, texto: 'Valor realizado', entrada: 'Entregáveis ou marcos concluídos', passagem: 'Resultado e próximos passos documentados' },
] as const satisfies readonly Fase[];

export type ChaveFase = (typeof FASES)[number]['chave'];
export const TERMINAIS = ['perdida', 'arquivada'] as const;
export type Terminal = (typeof TERMINAIS)[number];
export type EstadoFase = ChaveFase | Terminal;
export const TODAS_AS_FASES: readonly EstadoFase[] = [...FASES.map((f) => f.chave), ...TERMINAIS];

/** A etapa de entrada na qualificação — daqui em diante exige score ≥ 24. */
export const ORDEM_QUALIFICADA = 4;
export const SCORE_MINIMO = 24;
/** Uma oportunidade parada mais do que isto pede decisão. */
export const DIAS_PARADA = 14;
/** Sem actividade há mais do que isto: alerta. */
export const DIAS_SEM_ACTIVIDADE = 7;

export function ordemDe(fase: string): number | null {
  return FASES.find((f) => f.chave === fase)?.ordem ?? null;
}

export function textoFase(fase: string): string {
  if (fase === 'perdida') return 'Perdida';
  if (fase === 'arquivada') return 'Arquivada';
  return FASES.find((f) => f.chave === fase)?.texto ?? fase;
}

/** Activa: conta como pipeline (não terminou, não se perdeu, não se arquivou). */
export function estaActiva(fase: string): boolean {
  const o = ordemDe(fase);
  return o !== null && o <= 10;
}

/**
 * Probabilidade de conversão por etapa, para o pipeline ponderado.
 *
 * PRESSUPOSTO DE REFERÊNCIA, não dado medido: a regra do documento é que a
 * probabilidade «não deve ser baseada apenas em boa relação» — por isso vem
 * da etapa, que tem critério de passagem, e não de opinião. Ajustar quando
 * houver histórico real de conversões (o manual diz como).
 */
export const PROBABILIDADE: Record<ChaveFase, number> = {
  sinal: 0.02,
  contacto: 0.05,
  descoberta: 0.1,
  problema_validado: 0.15,
  qualificada: 0.25,
  estruturacao: 0.35,
  preparacao: 0.45,
  proposta: 0.55,
  negociacao: 0.7,
  acordo: 1,
  execucao: 1,
  valor_realizado: 1,
};

/** Só etapas abertas (0–8) entram no pipeline ponderado; acordo em diante já é resultado. */
export function contaNoPipeline(fase: string): boolean {
  const o = ordemDe(fase);
  return o !== null && o <= 8;
}

// ---------------------------------------------------------------------------
// Qualificação
// ---------------------------------------------------------------------------

export const CRITERIOS = [
  { chave: 'dor', coluna: 'c_dor', titulo: 'Dor económica', pergunta: 'O problema custa dinheiro, tempo, risco ou capacidade?' },
  { chave: 'urgencia', coluna: 'c_urgencia', titulo: 'Urgência', pergunta: 'Existe razão concreta para agir agora?' },
  { chave: 'decisor', coluna: 'c_decisor', titulo: 'Poder de decisão', pergunta: 'Temos acesso ao decisor ou sponsor?' },
  { chave: 'capacidade', coluna: 'c_capacidade', titulo: 'Capacidade financeira', pergunta: 'Existe orçamento, activo financiável ou investidor provável?' },
  { chave: 'adequacao', coluna: 'c_adequacao', titulo: 'Adequação estratégica', pergunta: 'A oportunidade está alinhada com as capacidades da empresa?' },
  { chave: 'controlo', coluna: 'c_controlo', titulo: 'Controlo de execução', pergunta: 'A AGORAMOZ consegue influenciar o resultado?' },
  { chave: 'informacao', coluna: 'c_informacao', titulo: 'Qualidade da informação', pergunta: 'Existem dados suficientes para estruturar a oportunidade?' },
  { chave: 'valor', coluna: 'c_valor', titulo: 'Valor potencial', pergunta: 'Receita, margem, participação ou valor estratégico justificam o esforço?' },
] as const;

export type ChaveCriterio = (typeof CRITERIOS)[number]['chave'];
export type ColunaCriterio = (typeof CRITERIOS)[number]['coluna'];

export type Prioridade = 'A' | 'B' | 'incubacao' | 'abandonar';

/** A mesma regra da coluna gerada `prioridade` (0017). */
export function prioridadeDe(total: number | null): Prioridade | null {
  if (total === null) return null;
  if (total >= 32) return 'A';
  if (total >= 24) return 'B';
  if (total >= 16) return 'incubacao';
  return 'abandonar';
}

/** O total só existe com os oito critérios avaliados (como na coluna gerada). */
export function totalDe(notas: Partial<Record<ColunaCriterio, number | null>>): number | null {
  let soma = 0;
  for (const c of CRITERIOS) {
    const v = notas[c.coluna];
    if (v === null || v === undefined) return null;
    soma += v;
  }
  return soma;
}

export const PRIORIDADE: Record<Prioridade, Rotulo> = {
  A: { texto: 'Prioridade A', tom: 'bom', nota: '32–40: avançar com recursos.' },
  B: { texto: 'Prioridade B', tom: 'espera', nota: '24–31: avançar com limite de esforço.' },
  incubacao: { texto: 'Incubação', tom: 'aviso', nota: '16–23: manter em observação.' },
  abandonar: { texto: 'Abandonar', tom: 'mau', nota: '0–15: abandonar ou encaminhar.' },
};

export interface Passagem {
  readonly ok: boolean;
  readonly motivo?: string;
}

/** O critério de passagem que a base também impõe (mudar_fase_ceno). */
export function podePassarPara(destino: string, total: number | null, motivo?: string | null): Passagem {
  if (!TODAS_AS_FASES.includes(destino as EstadoFase)) return { ok: false, motivo: 'Etapa inválida.' };
  const o = ordemDe(destino);
  if (o !== null && o >= ORDEM_QUALIFICADA && (total === null || total < SCORE_MINIMO)) {
    return {
      ok: false,
      motivo: `Para qualificar, avalie os oito critérios: o score tem de ser pelo menos ${SCORE_MINIMO} (prioridade B).`,
    };
  }
  if (destino === 'perdida' && (!motivo || motivo.trim().length < 3)) {
    return { ok: false, motivo: 'Indique o motivo da perda.' };
  }
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Vocabulários (iguais aos CHECK da 0017)
// ---------------------------------------------------------------------------

export const SECTORES = {
  solar: 'Solar',
  eolica: 'Eólica',
  hidrica: 'Hídrica',
  gas: 'Gás',
  petroleo: 'Petróleo',
  mineracao: 'Mineração',
  eficiencia: 'Eficiência energética',
  redes: 'Redes e transmissão',
  infraestrutura: 'Infraestrutura',
  outro: 'Outro',
} as const;

export const FONTES = {
  evento: 'Evento',
  indicacao: 'Indicação',
  pesquisa: 'Pesquisa',
  parceiro: 'Parceiro',
  edital: 'Edital / concurso',
  inbound: 'Contacto recebido',
  outro: 'Outra',
} as const;

export const URGENCIAS = { baixa: 'Baixa', media: 'Média', alta: 'Alta' } as const;
export const MOEDAS = ['USD', 'MZN', 'EUR'] as const;

export const TIPOS_STAKEHOLDER = {
  empresa_alvo: 'Empresa-alvo',
  promotor: 'Promotor de projecto',
  investidor: 'Investidor',
  banco: 'Banco / financiador',
  consultor_tecnico: 'Consultor técnico',
  fornecedor_tecnologico: 'Fornecedor tecnológico',
  epc_operador: 'EPC / operador',
  regulador: 'Entidade reguladora',
  associacao: 'Associação empresarial',
  parceiro_jv: 'Parceiro de joint venture',
  introducer: 'Introducer / influenciador',
  decisor_cliente: 'Decisor interno do cliente',
} as const;

export const RELACOES = {
  nova: 'Nova',
  em_construcao: 'Em construção',
  activa: 'Activa',
  forte: 'Forte',
  inactiva: 'Inactiva',
} as const;

export const PAPEIS_LIGACAO = {
  decisor: 'Decisor',
  sponsor: 'Sponsor',
  influenciador: 'Influenciador',
  parceiro: 'Parceiro',
  investidor: 'Investidor',
} as const;

export const DECISOES = {
  avancar: 'Avançar',
  corrigir: 'Corrigir',
  incubar: 'Incubar',
  abandonar: 'Abandonar',
} as const;

export const ESTADOS_DOCUMENTO = { em_falta: 'Em falta', em_curso: 'Em curso', pronto: 'Pronto' } as const;

/** A estrutura documental da sala de oportunidade (pastas 1–12). */
export const PASTAS = [
  'Resumo executivo',
  'Stakeholders e decisores',
  'Diagnóstico da oportunidade',
  'Dados técnicos',
  'Modelo financeiro',
  'Riscos e pressupostos',
  'Modelo de parceria ou JV',
  'Propostas e termos',
  'Due diligence',
  'Contratos e aprovações',
  'Plano de implementação',
  'Atas e decisões',
] as const;

/** As doze secções do Opportunity Memo (as chaves que a base aceita). */
export const MEMO = [
  { chave: 'oportunidade', titulo: 'Oportunidade' },
  { chave: 'organizacao', titulo: 'Organização e decisores' },
  { chave: 'problema', titulo: 'Problema económico' },
  { chave: 'solucao', titulo: 'Solução ou modelo sugerido' },
  { chave: 'valor', titulo: 'Valor potencial' },
  { chave: 'receita', titulo: 'Modelo de receita para a AGORAMOZ' },
  { chave: 'recursos', titulo: 'Recursos necessários' },
  { chave: 'dependencias', titulo: 'Dependências' },
  { chave: 'riscos', titulo: 'Principais riscos' },
  { chave: 'proxima_decisao', titulo: 'Próxima decisão' },
  { chave: 'responsavel', titulo: 'Responsável' },
  { chave: 'prazo', titulo: 'Prazo' },
] as const;

export type ChaveMemo = (typeof MEMO)[number]['chave'];

/** Um memo conta como feito quando a oportunidade, o problema e a próxima decisão estão escritos. */
export function memoCompleto(memo: Record<string, unknown> | null | undefined): boolean {
  if (!memo) return false;
  return (['oportunidade', 'problema', 'proxima_decisao'] as const).every(
    (k) => typeof memo[k] === 'string' && (memo[k] as string).trim().length > 0,
  );
}

// ---------------------------------------------------------------------------
// Alertas e scorecard
// ---------------------------------------------------------------------------

export interface OportunidadeResumo {
  readonly id: string;
  readonly titulo: string;
  readonly fase: string;
  readonly fase_desde: string;
  readonly ultima_actividade: string;
  readonly proxima_accao: string | null;
  readonly proxima_data: string | null;
  readonly responsavel: string | null;
  readonly score_total: number | null;
  readonly prioridade: Prioridade | null;
  readonly valor_min: number | null;
  readonly valor_max: number | null;
  readonly moeda: string;
  readonly memo: Record<string, unknown> | null;
}

export type TipoAlerta = 'accao_atrasada' | 'parada' | 'sem_actividade' | 'a_sem_memo';

export const ALERTA: Record<TipoAlerta, Rotulo> = {
  accao_atrasada: { texto: 'Próxima acção em atraso', tom: 'mau' },
  parada: { texto: `Parada há mais de ${DIAS_PARADA} dias`, tom: 'mau', nota: 'Pede decisão: avançar, corrigir, incubar ou abandonar.' },
  sem_actividade: { texto: `Sem actividade há mais de ${DIAS_SEM_ACTIVIDADE} dias`, tom: 'aviso' },
  a_sem_memo: { texto: 'Prioridade A sem Opportunity Memo', tom: 'aviso' },
};

const DIA = 86_400_000;

function diasDesde(iso: string, agora: Date): number {
  return Math.floor((agora.getTime() - new Date(iso).getTime()) / DIA);
}

/** A data de hoje em Maputo, como `AAAA-MM-DD` (as datas da base são de calendário). */
export function hojeEmMaputo(agora: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Maputo' }).format(agora);
}

export function alertasDe(o: OportunidadeResumo, agora: Date): TipoAlerta[] {
  if (!estaActiva(o.fase)) return [];
  const a: TipoAlerta[] = [];
  if (o.proxima_data && o.proxima_data < hojeEmMaputo(agora)) a.push('accao_atrasada');
  if (diasDesde(o.fase_desde, agora) > DIAS_PARADA) a.push('parada');
  if (diasDesde(o.ultima_actividade, agora) > DIAS_SEM_ACTIVIDADE) a.push('sem_actividade');
  if (o.prioridade === 'A' && !memoCompleto(o.memo)) a.push('a_sem_memo');
  return a;
}

/** O ponto médio do intervalo de valor; só um dos lados → esse lado; nenhum → nulo. */
export function valorCentral(min: number | null, max: number | null): number | null {
  if (min !== null && max !== null) return (min + max) / 2;
  return min ?? max ?? null;
}

export interface Scorecard {
  /** Oportunidades com os oito critérios avaliados. */
  readonly analisadas: number;
  /** Com score ≥ 24 (o mínimo para qualificar). */
  readonly qualificadas: number;
  /** qualificadas ÷ analisadas; nulo sem análises. */
  readonly taxaQualificacao: number | null;
  /** Qualificadas com decisor ou sponsor ligado ÷ qualificadas. */
  readonly acessoDecisores: number | null;
  /** Por moeda — sem conversão cambial (não se inventa taxa). */
  readonly pipelinePonderado: Readonly<Record<string, number>>;
  /** Oportunidades abertas sem valor estimado (ficam fora do ponderado). */
  readonly semValor: number;
  readonly activas: number;
  readonly paradas: number;
  /** Activas com responsável, próxima acção e data ÷ activas. */
  readonly higiene: number | null;
  readonly prioridadeA: number;
  readonly prioridadeAComMemo: number;
  /** Chegaram a acordo ÷ chegaram a proposta (pelo registo de fases). */
  readonly propostaParaAcordo: number | null;
  readonly acordos: number;
  readonly perdidas: number;
}

export interface MudancaFase {
  readonly oportunidade_id: string;
  readonly para: string;
}

export function scorecard(
  ops: readonly OportunidadeResumo[],
  comDecisor: ReadonlySet<string>,
  mudancas: readonly MudancaFase[],
  agora: Date,
): Scorecard {
  const analisadas = ops.filter((o) => o.score_total !== null);
  const qualificadas = analisadas.filter((o) => (o.score_total ?? 0) >= SCORE_MINIMO);
  const activas = ops.filter((o) => estaActiva(o.fase));
  const higienicas = activas.filter((o) => o.responsavel && o.proxima_accao && o.proxima_data);

  const pipelinePonderado: Record<string, number> = {};
  let semValor = 0;
  for (const o of ops) {
    if (!contaNoPipeline(o.fase)) continue;
    const v = valorCentral(o.valor_min, o.valor_max);
    if (v === null) {
      semValor++;
      continue;
    }
    pipelinePonderado[o.moeda] = (pipelinePonderado[o.moeda] ?? 0) + v * PROBABILIDADE[o.fase as ChaveFase];
  }

  // «Chegou a» uma etapa: está nela agora, passou por ela (registo), ou está além dela.
  const chegouA = (ordemMinima: number) => {
    const ids = new Set<string>();
    for (const m of mudancas) {
      const o = ordemDe(m.para);
      if (o !== null && o >= ordemMinima) ids.add(m.oportunidade_id);
    }
    for (const op of ops) {
      const o = ordemDe(op.fase);
      if (o !== null && o >= ordemMinima) ids.add(op.id);
    }
    return ids;
  };
  const propostas = chegouA(7);
  const acordos = chegouA(9);
  const acordosComProposta = [...acordos].filter((id) => propostas.has(id)).length;

  const a = ops.filter((o) => o.prioridade === 'A');
  const razao = (n: number, d: number) => (d === 0 ? null : n / d);

  return {
    analisadas: analisadas.length,
    qualificadas: qualificadas.length,
    taxaQualificacao: razao(qualificadas.length, analisadas.length),
    acessoDecisores: razao(qualificadas.filter((o) => comDecisor.has(o.id)).length, qualificadas.length),
    pipelinePonderado,
    semValor,
    activas: activas.length,
    paradas: activas.filter((o) => alertasDe(o, agora).includes('parada')).length,
    higiene: razao(higienicas.length, activas.length),
    prioridadeA: a.length,
    prioridadeAComMemo: a.filter((o) => memoCompleto(o.memo)).length,
    propostaParaAcordo: razao(acordosComProposta, propostas.size),
    acordos: acordos.size,
    perdidas: ops.filter((o) => o.fase === 'perdida').length,
  };
}

/**
 * O KPI principal do sistema: das oportunidades prioritárias activas (A e B),
 * quantas têm problema validado (escrito), decisor ou sponsor identificado,
 * modelo económico preliminar (secção «receita» do memo) e próxima decisão
 * registada (secção «proxima_decisao»). Nulo sem prioritárias.
 */
export function kpiPrincipal(
  ops: readonly (OportunidadeResumo & { readonly problema?: string | null })[],
  comDecisor: ReadonlySet<string>,
): { readonly prontas: number; readonly prioritarias: number; readonly razao: number | null } {
  const texto = (v: unknown) => typeof v === 'string' && v.trim().length > 0;
  const prioritarias = ops.filter((o) => estaActiva(o.fase) && (o.prioridade === 'A' || o.prioridade === 'B'));
  const prontas = prioritarias.filter(
    (o) =>
      texto(o.problema) &&
      comDecisor.has(o.id) &&
      texto(o.memo?.['receita']) &&
      texto(o.memo?.['proxima_decisao']),
  ).length;
  return { prontas, prioritarias: prioritarias.length, razao: prioritarias.length === 0 ? null : prontas / prioritarias.length };
}

/** Moeda em pt-PT, sem casas decimais (são estimativas, não cotações). */
export function formatarValor(v: number, moeda: string): string {
  return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: moeda, maximumFractionDigits: 0 }).format(v);
}

export function percentagem(r: number | null): string {
  return r === null ? '—' : `${Math.round(r * 100)} %`;
}
