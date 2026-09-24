import { CANAIS, type Canal } from '@/lib/attribution/types';
import { DIAGNOSTIC_STATES, type DiagnosticState } from '@/lib/diagnostic/types';

/**
 * Rótulos em português para os estados que vivem na base de dados.
 *
 * Fonte única. Um `switch` espalhado por três ecrãs diverge ao terceiro, e o
 * teste que acompanha este ficheiro exige que **todos** os valores do enum
 * tenham rótulo — acrescentar um estado à base sem lhe dar nome aqui parte a
 * verificação em vez de aparecer como «undefined» num ecrã.
 */

export type Tom = 'neutro' | 'espera' | 'bom' | 'mau' | 'aviso';

export interface Rotulo {
  readonly texto: string;
  readonly tom: Tom;
  /** O que a pessoa precisa de saber para agir. Não é decoração. */
  readonly nota?: string;
}

export const ESTADO_DIAGNOSTICO: Record<DiagnosticState, Rotulo> = {
  computed: { texto: 'Calculado', tom: 'neutro', nota: 'Pronto para revisão humana.' },
  drafting: { texto: 'A redigir', tom: 'espera' },
  drafted: { texto: 'Redigido', tom: 'espera' },
  pending_review: { texto: 'Em revisão', tom: 'aviso', nota: 'À espera de decisão humana.' },
  approved: { texto: 'Aprovado', tom: 'bom' },
  rendering: { texto: 'A gerar documento', tom: 'espera' },
  ready: { texto: 'Documento pronto', tom: 'bom' },
  sending: { texto: 'A enviar', tom: 'espera' },
  sent: { texto: 'Enviado', tom: 'bom' },
  draft_failed: { texto: 'Falhou a redação', tom: 'mau' },
  validation_failed: { texto: 'Recusado na validação', tom: 'mau' },
  rejected: { texto: 'Rejeitado', tom: 'mau' },
  render_failed: { texto: 'Falhou o documento', tom: 'mau' },
  send_failed: { texto: 'Falhou o envio', tom: 'mau' },
  revoked: { texto: 'Revogado', tom: 'neutro' },
};

/** As fases de `deals.stage`, tal como o CHECK da tabela as define. */
export const FASES_OPORTUNIDADE = [
  'novo',
  'qualificacao',
  'proposta',
  'negociacao',
  'ganho',
  'perdido',
] as const;

export type FaseOportunidade = (typeof FASES_OPORTUNIDADE)[number];

export const FASE_OPORTUNIDADE: Record<FaseOportunidade, Rotulo> = {
  novo: { texto: 'Novo', tom: 'neutro' },
  qualificacao: { texto: 'Qualificação', tom: 'espera' },
  proposta: { texto: 'Proposta', tom: 'espera' },
  negociacao: { texto: 'Negociação', tom: 'aviso' },
  ganho: { texto: 'Ganho', tom: 'bom' },
  perdido: { texto: 'Perdido', tom: 'mau' },
};

export const PAPEL: Record<string, Rotulo> = {
  admin: { texto: 'Administração', tom: 'bom' },
  comercial: { texto: 'Comercial', tom: 'neutro' },
  leitura: { texto: 'Leitura', tom: 'espera' },
};

export const CLASSIFICACAO: Record<string, string> = {
  A: 'Prioridade máxima',
  B: 'Prioridade alta',
  C: 'Acompanhar',
  D: 'Baixa prioridade',
};

/** Só para o teste que prova que nenhum estado ficou sem nome. */
export const __estados = DIAGNOSTIC_STATES;

/**
 * Achados: o `code` estável vira frase aqui, e só aqui.
 *
 * O motor produz códigos e factos tipados, nunca prosa — foi desenhado assim
 * para que a conclusão não possa mudar por alguém ter reescrito uma frase. É
 * este mapa que escolhe as palavras, e é por isso que ele vive no admin e não
 * no motor.
 *
 * Um código sem entrada aqui aparece como o próprio código, em vez de
 * desaparecer: uma regra nova tem de ser visível mesmo antes de alguém lhe dar
 * nome.
 */
export const ACHADO: Record<string, { titulo: string; explicacao: string }> = {
  SEM_PRESENCA_WEB: {
    titulo: 'Sem presença web declarada',
    explicacao: 'Não indicou um endereço de site na resposta.',
  },
  DECISOR_AUSENTE: {
    titulo: 'Quem respondeu não é quem decide',
    explicacao: 'O papel indicado não é o de decisor, o que alonga o ciclo de decisão.',
  },
  URGENCIA_SEM_ORCAMENTO: {
    titulo: 'Urgência declarada sem faixa de investimento definida',
    explicacao: 'Duas respostas em tensão: prazo imediato e orçamento por definir.',
  },
  AMBITO_LARGO_EQUIPA_PEQUENA: {
    titulo: 'Âmbito largo face à dimensão declarada',
    explicacao: 'Selecionou vários processos a melhorar para a dimensão de equipa indicada.',
  },
  CONTEXTO_INSUFICIENTE: {
    titulo: 'Contexto pouco detalhado',
    explicacao: 'A descrição do impacto é curta para sustentar conclusões firmes.',
  },
};

export const SEVERIDADE: Record<string, Rotulo> = {
  critica: { texto: 'Crítica', tom: 'mau' },
  alta: { texto: 'Alta', tom: 'aviso' },
  media: { texto: 'Média', tom: 'espera' },
  baixa: { texto: 'Baixa', tom: 'neutro' },
  informativa: { texto: 'Informativa', tom: 'neutro' },
};

/** De onde vem cada facto. Três origens, e nenhuma é «benchmark de mercado». */
export const ORIGEM_EVIDENCIA: Record<string, string> = {
  resposta: 'Respondido pelo cliente',
  derivado: 'Calculado a partir das respostas',
  catalogo: 'Conteúdo da AGORAMOZ',
};

/**
 * Os canais de aquisição.
 *
 * A lista vem de `lib/attribution/types.ts` — a mesma que o `check` da base
 * espelha e que `derivarCanal` produz. Redeclará-la aqui criava a terceira
 * cópia de uma lista de sete valores, e a terceira cópia é sempre a que fica
 * para trás.
 */
export const CANAL: Record<Canal, Rotulo> = {
  gbp: { texto: 'Perfil de empresa', tom: 'bom', nota: 'Chegou pelo perfil da AGORAMOZ no Google.' },
  organico: { texto: 'Pesquisa orgânica', tom: 'bom' },
  social: { texto: 'Redes sociais', tom: 'neutro' },
  referencia: { texto: 'Referência', tom: 'neutro', nota: 'Veio de outro site.' },
  campanha: { texto: 'Campanha', tom: 'espera' },
  directo: { texto: 'Direto', tom: 'neutro', nota: 'Escreveu o endereço ou usou um marcador.' },
  desconhecido: {
    texto: 'Desconhecido',
    tom: 'aviso',
    nota: 'Sem JavaScript, ou sem sinal de origem. Vigiar: mede quanta atribuição se está a perder.',
  },
};

/** Para o teste que exige rótulo para todo o canal. */
export const __canais = CANAIS;
