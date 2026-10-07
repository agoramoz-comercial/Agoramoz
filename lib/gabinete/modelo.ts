import type { Rotulo } from '@/lib/admin/labels';

/**
 * O Gabinete do Fundador — a lógica pura do Work Operating System v1.
 *
 * O documento parte de um diagnóstico: o fundador acumula Founder, CEO e CTO
 * e torna-se o sistema operativo informal da empresa. A resposta é separar os
 * três chapéus, registar o que precisa de estar certo todas as semanas
 * (decisões, prioridades, projectos, caixa, capacidade) e medir quantas
 * decisões recorrentes já não dependem dele.
 *
 * Nada aqui inventa números: sem dados, cada indicador devolve `null` e o
 * ecrã di-lo. Não há conversão de moeda — cada soma é por moeda.
 */

// ---------------------------------------------------------------------------
// Vocabulários (iguais aos CHECK da 0018)
// ---------------------------------------------------------------------------

export const CHAPEUS = {
  founder: {
    texto: 'Founder',
    pergunta: 'Que empresa estamos a construir?',
    horizonte: '1 a 3 anos',
    resultado: 'Direcção, cultura e vantagem estratégica',
    decide: [
      'Missão',
      'Mercado',
      'Ambição',
      'Princípios',
      'Posicionamento',
      'Vantagens a construir',
      'O que a empresa deliberadamente não fará',
      'Estrutura societária',
      'Relação entre os fundadores',
    ],
  },
  ceo: {
    texto: 'CEO',
    pergunta: 'O que precisa acontecer economicamente?',
    horizonte: 'Trimestre e ano',
    resultado: 'Receita, margem, caixa, equipa e execução',
    decide: [
      'Prioridade trimestral',
      'Oferta',
      'Segmento prioritário',
      'Metas económicas',
      'Alocação de recursos',
      'Contratações',
      'Preços e excepções comerciais',
      'Capacidade',
      'Riscos empresariais',
      'Responsabilização dos líderes',
    ],
  },
  cto: {
    texto: 'CTO',
    pergunta: 'Como a tecnologia será construída e operada?',
    horizonte: 'Semana a trimestre',
    resultado: 'Arquitectura, qualidade, segurança e entrega',
    decide: [
      'Arquitectura técnica',
      'Padrões',
      'Segurança',
      'Dados',
      'Integrações',
      'Ambientes',
      'Processo de desenvolvimento',
      'Critérios de qualidade',
      'Dívida técnica',
      'Continuidade operacional',
    ],
  },
} as const;
export type Chapeu = keyof typeof CHAPEUS;

export const ESTADOS_DECISAO = {
  exige_minha: 'Exige decisão minha',
  delegavel: 'Pode ser delegada',
  precisa_info: 'Precisa de informação',
  aguarda_externa: 'Aguarda decisão externa',
  eliminar: 'Deve ser eliminada',
  decidida: 'Decidida',
} as const;
export type EstadoDecisao = keyof typeof ESTADOS_DECISAO;

/** Estados em que a decisão ainda pede trabalho. */
export const DECISAO_ABERTA: readonly EstadoDecisao[] = ['exige_minha', 'delegavel', 'precisa_info', 'aguarda_externa'];

export const QUEM_DECIDIU = { fundador: 'Eu (fundador)', delegada: 'Delegada a outra pessoa' } as const;

export const TIPOS_PRIORIDADE = {
  empresarial: 'Empresarial',
  comercial: 'Comercial',
  operacional: 'Operacional',
  tecnologica: 'Tecnológica',
  lideranca: 'Liderança pessoal',
} as const;
export type TipoPrioridade = keyof typeof TIPOS_PRIORIDADE;

export const ESTADOS_PRIORIDADE = {
  em_curso: 'Em curso',
  em_risco: 'Em risco',
  concluida: 'Concluída',
  abandonada: 'Abandonada',
} as const;

/** O ciclo público da AGORAMOZ, mais os dois estados fora do ciclo. */
export const FASES_PROJETO = {
  diagnostico: 'Diagnóstico',
  arquitetura: 'Arquitectura',
  prototipo: 'Protótipo',
  implementacao: 'Implementação',
  ativacao: 'Activação',
  evolucao: 'Evolução',
  encerrado: 'Encerrado',
  suspenso: 'Suspenso',
} as const;
export type FaseProjeto = keyof typeof FASES_PROJETO;

/** Fases que exigem os sete critérios de prontidão. */
export const FASES_EXECUCAO: readonly FaseProjeto[] = ['implementacao', 'ativacao', 'evolucao'];

export function projetoActivo(fase: string): boolean {
  return fase !== 'encerrado' && fase !== 'suspenso';
}

/** Os sete critérios do documento, pela ordem que a base recebe. */
export const PRONTIDAO = [
  { chave: 'contrato', coluna: 'pronto_contrato', texto: 'Contrato ou autorização formal' },
  { chave: 'escopo', coluna: 'pronto_escopo', texto: 'Escopo aprovado' },
  { chave: 'responsavel', coluna: 'pronto_responsavel', texto: 'Responsável' },
  { chave: 'capacidade', coluna: 'pronto_capacidade', texto: 'Capacidade reservada' },
  { chave: 'aceitacao', coluna: 'pronto_aceitacao', texto: 'Critérios de aceitação' },
  { chave: 'dependencias', coluna: 'pronto_dependencias', texto: 'Dependências identificadas' },
  { chave: 'pagamento', coluna: 'pronto_pagamento', texto: 'Condições de pagamento definidas' },
] as const;
export type ColunaProntidao = (typeof PRONTIDAO)[number]['coluna'];

export const RISCOS: Record<'baixo' | 'medio' | 'alto', Rotulo> = {
  baixo: { texto: 'Risco baixo', tom: 'bom' },
  medio: { texto: 'Risco médio', tom: 'aviso' },
  alto: { texto: 'Risco alto', tom: 'mau' },
};

export const TIPOS_MOVIMENTO = { saldo: 'Saldo (fotografia)', recebimento: 'Recebimento', pagamento: 'Pagamento' } as const;
export type TipoMovimento = keyof typeof TIPOS_MOVIMENTO;

export const AREAS = {
  gestao: 'Gestão',
  comercial: 'Comercial',
  tecnologia: 'Tecnologia',
  operacoes: 'Operações',
  energia: 'Energia',
  outro: 'Outra',
} as const;

export const MOEDAS = ['MZN', 'USD', 'EUR'] as const;

// ---------------------------------------------------------------------------
// Tipos lidos da base (já normalizados por `leitura.ts`)
// ---------------------------------------------------------------------------

export interface Decisao {
  readonly id: string;
  readonly titulo: string;
  readonly contexto: string | null;
  readonly chapeu: Chapeu;
  readonly estado: EstadoDecisao;
  readonly decisao: string | null;
  readonly responsavel: string | null;
  readonly consultados: string | null;
  readonly indicador: string | null;
  readonly data_revisao: string | null;
  readonly recorrente: boolean;
  readonly quem_decidiu: 'fundador' | 'delegada' | null;
  readonly decidida_em: string | null;
  readonly revisao: number;
  readonly updated_at: string;
}

export interface Prioridade {
  readonly id: string;
  readonly trimestre: string;
  readonly tipo: TipoPrioridade;
  readonly resultado: string;
  readonly indicador: string | null;
  readonly meta: string | null;
  readonly estado: keyof typeof ESTADOS_PRIORIDADE;
  readonly nota: string | null;
  readonly revisao: number;
}

export interface Projeto {
  readonly id: string;
  readonly nome: string;
  readonly cliente: string | null;
  readonly fase: FaseProjeto;
  readonly responsavel: string | null;
  readonly sponsor: string | null;
  readonly resultado: string | null;
  readonly escopo: string | null;
  readonly moeda: string;
  readonly receita_contratada: number | null;
  readonly receita_faturada: number | null;
  readonly receita_recebida: number | null;
  readonly custos_variaveis: number | null;
  readonly margem_bruta: number | null;
  readonly prontidao: Readonly<Record<ColunaProntidao, boolean>>;
  readonly risco: 'baixo' | 'medio' | 'alto';
  readonly proxima_accao: string | null;
  readonly proxima_data: string | null;
  readonly ligacao: string | null;
  readonly revisao: number;
  readonly updated_at: string;
}

export interface Movimento {
  readonly id: string;
  readonly tipo: TipoMovimento;
  readonly descricao: string;
  readonly projeto_id: string | null;
  readonly valor: number;
  readonly moeda: string;
  readonly data_prevista: string;
  readonly data_efectiva: string | null;
  readonly revisao: number;
  readonly created_at: string;
}

export interface Pessoa {
  readonly id: string;
  readonly nome: string;
  readonly funcao: string | null;
  readonly area: keyof typeof AREAS;
  readonly horas_semana: number;
  readonly activa: boolean;
  readonly revisao: number;
}

export interface Alocacao {
  readonly pessoa_id: string;
  readonly projeto_id: string;
  readonly horas_semana: number;
  readonly ate: string | null;
}

// ---------------------------------------------------------------------------
// Datas
// ---------------------------------------------------------------------------

/** A data de hoje em Maputo, como `AAAA-MM-DD` (as datas da base são de calendário). */
export function hojeEmMaputo(agora: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Maputo' }).format(agora);
}

/** `2026-10-07` → `2026-T4`. */
export function trimestreDe(dia: string): string {
  const [a, m] = dia.split('-').map(Number);
  return `${a}-T${Math.floor(((m ?? 1) - 1) / 3) + 1}`;
}

/** `AAAA-MM-DD` mais `n` dias (aritmética de calendário, sem fuso). */
export function somarDias(dia: string, n: number): string {
  const d = new Date(`${dia}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Projectos
// ---------------------------------------------------------------------------

/** Os critérios que faltam para entrar em implementação (vazio = pronto). */
export function prontidaoEmFalta(p: Pick<Projeto, 'prontidao'>): string[] {
  return PRONTIDAO.filter((c) => !p.prontidao[c.coluna]).map((c) => c.texto);
}

export function podeEntrarEm(fase: string, p: Pick<Projeto, 'prontidao'>): { ok: boolean; motivo?: string } {
  if (!(FASES_EXECUCAO as readonly string[]).includes(fase)) return { ok: true };
  const falta = prontidaoEmFalta(p);
  return falta.length === 0 ? { ok: true } : { ok: false, motivo: `Para implementar falta: ${falta.join(', ')}.` };
}

/** Margem bruta ÷ receita contratada; nulo sem os dois valores. */
export function margemPercentual(p: Pick<Projeto, 'margem_bruta' | 'receita_contratada'>): number | null {
  if (p.margem_bruta === null || !p.receita_contratada) return null;
  return p.margem_bruta / p.receita_contratada;
}

export type MotivoRisco = 'risco_alto' | 'accao_atrasada' | 'margem_negativa';

export const MOTIVO_RISCO: Record<MotivoRisco, Rotulo> = {
  risco_alto: { texto: 'Risco alto', tom: 'mau' },
  accao_atrasada: { texto: 'Próxima acção em atraso', tom: 'mau' },
  margem_negativa: { texto: 'Margem negativa', tom: 'mau' },
};

export function riscosDe(p: Projeto, hoje: string): MotivoRisco[] {
  if (!projetoActivo(p.fase)) return [];
  const r: MotivoRisco[] = [];
  if (p.risco === 'alto') r.push('risco_alto');
  if (p.proxima_data && p.proxima_data < hoje) r.push('accao_atrasada');
  if (p.margem_bruta !== null && p.margem_bruta < 0) r.push('margem_negativa');
  return r;
}

// ---------------------------------------------------------------------------
// Tesouraria
// ---------------------------------------------------------------------------

export interface CaixaMoeda {
  readonly moeda: string;
  /** Último saldo registado mais o que entrou e saiu (realizado) depois dele. */
  readonly valor: number;
  /** A data do saldo de partida. */
  readonly desde: string;
}

/**
 * Caixa por moeda. Sem um saldo registado, a moeda não aparece: somar
 * movimentos sem ponto de partida daria um número que parece caixa e não é.
 */
export function caixaPorMoeda(movs: readonly Movimento[]): CaixaMoeda[] {
  const porMoeda = new Map<string, Movimento[]>();
  for (const m of movs) porMoeda.set(m.moeda, [...(porMoeda.get(m.moeda) ?? []), m]);
  const r: CaixaMoeda[] = [];
  for (const [moeda, lista] of porMoeda) {
    const saldos = lista
      .filter((m) => m.tipo === 'saldo' && m.data_efectiva)
      .sort((a, b) => (a.data_efectiva! + a.created_at).localeCompare(b.data_efectiva! + b.created_at));
    const base = saldos.at(-1);
    if (!base) continue;
    let valor = base.valor;
    for (const m of lista) {
      if (m.tipo === 'saldo' || !m.data_efectiva || m.data_efectiva <= base.data_efectiva!) continue;
      valor += m.tipo === 'recebimento' ? m.valor : -m.valor;
    }
    r.push({ moeda, valor, desde: base.data_efectiva! });
  }
  return r.sort((a, b) => a.moeda.localeCompare(b.moeda));
}

export interface PrevisaoMoeda {
  readonly moeda: string;
  readonly recebimentos: number;
  readonly pagamentos: number;
  readonly recebimentosVencidos: number;
  readonly pagamentosVencidos: number;
}

/** Previsto (ainda não realizado) até `hoje + dias`, e o que já devia ter acontecido. */
export function previsaoPorMoeda(movs: readonly Movimento[], hoje: string, dias = 30): PrevisaoMoeda[] {
  const limite = somarDias(hoje, dias);
  const acc = new Map<string, { recebimentos: number; pagamentos: number; recebimentosVencidos: number; pagamentosVencidos: number }>();
  for (const m of movs) {
    if (m.tipo === 'saldo' || m.data_efectiva) continue;
    const a = acc.get(m.moeda) ?? { recebimentos: 0, pagamentos: 0, recebimentosVencidos: 0, pagamentosVencidos: 0 };
    if (m.data_prevista < hoje) {
      if (m.tipo === 'recebimento') a.recebimentosVencidos += m.valor;
      else a.pagamentosVencidos += m.valor;
    } else if (m.data_prevista <= limite) {
      if (m.tipo === 'recebimento') a.recebimentos += m.valor;
      else a.pagamentos += m.valor;
    }
    acc.set(m.moeda, a);
  }
  return [...acc.entries()].map(([moeda, v]) => ({ moeda, ...v })).sort((a, b) => a.moeda.localeCompare(b.moeda));
}

export function estadoMovimento(m: Movimento, hoje: string): 'realizado' | 'vencido' | 'previsto' {
  if (m.tipo === 'saldo' || m.data_efectiva) return 'realizado';
  return m.data_prevista < hoje ? 'vencido' : 'previsto';
}

// ---------------------------------------------------------------------------
// Receita e margem (projectos)
// ---------------------------------------------------------------------------

export interface ReceitaMoeda {
  readonly moeda: string;
  readonly contratada: number;
  readonly faturada: number;
  readonly recebida: number;
  /** Faturado e ainda não recebido. */
  readonly aReceber: number;
  readonly margem: number;
  /** Projectos com contratada e custos registados (os que entram na margem). */
  readonly comMargem: number;
}

export function receitaPorMoeda(projetos: readonly Projeto[]): ReceitaMoeda[] {
  const acc = new Map<string, { contratada: number; faturada: number; recebida: number; margem: number; comMargem: number }>();
  for (const p of projetos) {
    if (p.fase === 'suspenso') continue;
    const a = acc.get(p.moeda) ?? { contratada: 0, faturada: 0, recebida: 0, margem: 0, comMargem: 0 };
    a.contratada += p.receita_contratada ?? 0;
    a.faturada += p.receita_faturada ?? 0;
    a.recebida += p.receita_recebida ?? 0;
    if (p.margem_bruta !== null) {
      a.margem += p.margem_bruta;
      a.comMargem += 1;
    }
    acc.set(p.moeda, a);
  }
  return [...acc.entries()]
    .filter(([, v]) => v.contratada > 0 || v.faturada > 0 || v.recebida > 0)
    .map(([moeda, v]) => ({ moeda, ...v, aReceber: Math.max(0, v.faturada - v.recebida) }))
    .sort((a, b) => a.moeda.localeCompare(b.moeda));
}

// ---------------------------------------------------------------------------
// Capacidade
// ---------------------------------------------------------------------------

export interface CapacidadePessoa {
  readonly pessoa: Pessoa;
  readonly comprometida: number;
  readonly livre: number;
  readonly sobrealocada: boolean;
}

export interface Capacidade {
  readonly disponivel: number;
  readonly comprometida: number;
  /** Comprometida ÷ disponível; nulo sem horas disponíveis. */
  readonly utilizacao: number | null;
  readonly porPessoa: readonly CapacidadePessoa[];
}

/**
 * Horas por semana: disponíveis (pessoas activas) contra comprometidas
 * (alocações em vigor a projectos activos). `area` filtra (ex.: tecnologia).
 */
export function capacidade(
  pessoas: readonly Pessoa[],
  alocacoes: readonly Alocacao[],
  projetos: readonly Projeto[],
  hoje: string,
  area?: string,
): Capacidade {
  const activos = new Set(projetos.filter((p) => projetoActivo(p.fase)).map((p) => p.id));
  const porPessoa = pessoas
    .filter((p) => p.activa && (!area || p.area === area))
    .map((pessoa) => {
      const comprometida = alocacoes
        .filter((a) => a.pessoa_id === pessoa.id && activos.has(a.projeto_id) && (!a.ate || a.ate >= hoje))
        .reduce((s, a) => s + a.horas_semana, 0);
      return { pessoa, comprometida, livre: pessoa.horas_semana - comprometida, sobrealocada: comprometida > pessoa.horas_semana };
    });
  const disponivel = porPessoa.reduce((s, p) => s + p.pessoa.horas_semana, 0);
  const comprometida = porPessoa.reduce((s, p) => s + p.comprometida, 0);
  return { disponivel, comprometida, utilizacao: disponivel > 0 ? comprometida / disponivel : null, porPessoa };
}

// ---------------------------------------------------------------------------
// Decisões e a métrica crítica do documento
// ---------------------------------------------------------------------------

export function decisaoAberta(d: Pick<Decisao, 'estado'>): boolean {
  return DECISAO_ABERTA.includes(d.estado);
}

export function decisaoAtrasada(d: Pick<Decisao, 'estado' | 'data_revisao'>, hoje: string): boolean {
  return decisaoAberta(d) && d.data_revisao !== null && d.data_revisao < hoje;
}

export interface Delegacao {
  readonly delegadas: number;
  readonly total: number;
  /** Nulo sem decisões recorrentes fechadas — nunca um 0 % inventado. */
  readonly razao: number | null;
}

/**
 * «Percentagem de decisões operacionais recorrentes resolvidas sem
 * intervenção do fundador.» Mede se a empresa se está a tornar um sistema.
 */
export function delegacao(decisoes: readonly Decisao[]): Delegacao {
  const recorrentes = decisoes.filter((d) => d.recorrente && d.estado === 'decidida');
  const delegadas = recorrentes.filter((d) => d.quem_decidiu === 'delegada').length;
  return { delegadas, total: recorrentes.length, razao: recorrentes.length ? delegadas / recorrentes.length : null };
}

// ---------------------------------------------------------------------------
// Painéis
// ---------------------------------------------------------------------------

export interface Higiene {
  readonly completos: number;
  readonly activos: number;
  readonly razao: number | null;
}

/** Projectos activos com responsável, escopo, próxima acção e data (o critério de passagem do documento). */
export function higieneProjetos(projetos: readonly Projeto[]): Higiene {
  const activos = projetos.filter((p) => projetoActivo(p.fase));
  const completos = activos.filter((p) => p.responsavel && p.escopo && p.proxima_accao && p.proxima_data).length;
  return { completos, activos: activos.length, razao: activos.length ? completos / activos.length : null };
}

export interface PainelCeo {
  readonly caixa: readonly CaixaMoeda[];
  readonly previsao: readonly PrevisaoMoeda[];
  readonly receita: readonly ReceitaMoeda[];
  readonly capacidade: Capacidade;
  readonly emRisco: readonly { projeto: Projeto; motivos: MotivoRisco[] }[];
  readonly decisoesMinhas: readonly Decisao[];
  readonly decisoesAtrasadas: number;
  readonly delegacao: Delegacao;
  readonly higiene: Higiene;
  readonly prioridades: readonly Prioridade[];
  readonly trimestre: string;
}

export function painelCeo(
  d: {
    decisoes: readonly Decisao[];
    prioridades: readonly Prioridade[];
    projetos: readonly Projeto[];
    movimentos: readonly Movimento[];
    pessoas: readonly Pessoa[];
    alocacoes: readonly Alocacao[];
  },
  hoje: string,
): PainelCeo {
  const trimestre = trimestreDe(hoje);
  return {
    caixa: caixaPorMoeda(d.movimentos),
    previsao: previsaoPorMoeda(d.movimentos, hoje),
    receita: receitaPorMoeda(d.projetos),
    capacidade: capacidade(d.pessoas, d.alocacoes, d.projetos, hoje),
    emRisco: d.projetos
      .map((projeto) => ({ projeto, motivos: riscosDe(projeto, hoje) }))
      .filter((x) => x.motivos.length > 0),
    decisoesMinhas: d.decisoes
      .filter((x) => x.estado === 'exige_minha')
      .sort((a, b) => (a.data_revisao ?? '9999').localeCompare(b.data_revisao ?? '9999')),
    decisoesAtrasadas: d.decisoes.filter((x) => decisaoAtrasada(x, hoje)).length,
    delegacao: delegacao(d.decisoes),
    higiene: higieneProjetos(d.projetos),
    prioridades: d.prioridades.filter((p) => p.trimestre === trimestre),
    trimestre,
  };
}

export interface PainelCto {
  readonly decisoesCto: readonly Decisao[];
  readonly prioridadeTecnologica: Prioridade | null;
  readonly emExecucao: readonly Projeto[];
  /** Projectos antes de implementar, com os critérios que ainda faltam. */
  readonly porPreparar: readonly { projeto: Projeto; falta: string[] }[];
  readonly capacidadeTecnica: Capacidade;
}

export function painelCto(
  d: {
    decisoes: readonly Decisao[];
    prioridades: readonly Prioridade[];
    projetos: readonly Projeto[];
    pessoas: readonly Pessoa[];
    alocacoes: readonly Alocacao[];
  },
  hoje: string,
): PainelCto {
  const trimestre = trimestreDe(hoje);
  return {
    decisoesCto: d.decisoes.filter((x) => x.chapeu === 'cto' && decisaoAberta(x)),
    prioridadeTecnologica: d.prioridades.find((p) => p.trimestre === trimestre && p.tipo === 'tecnologica') ?? null,
    emExecucao: d.projetos.filter((p) => (FASES_EXECUCAO as readonly string[]).includes(p.fase)),
    porPreparar: d.projetos
      .filter((p) => ['arquitetura', 'prototipo'].includes(p.fase))
      .map((projeto) => ({ projeto, falta: prontidaoEmFalta(projeto) })),
    capacidadeTecnica: capacidade(d.pessoas, d.alocacoes, d.projetos, hoje, 'tecnologia'),
  };
}

export { formatarValor, percentagem } from '@/lib/energia/modelo';
