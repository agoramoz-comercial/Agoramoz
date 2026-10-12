/**
 * O modelo do CRM operacional (0019), em funções puras e testadas: os
 * vocabulários que a base aceita, o tempo no fuso de Maputo e a fila de cada
 * pessoa. As páginas só leem e mostram; as contas fazem-se aqui.
 */

/** Iguais à CHECK de `deals.motivo_perda` (teste de paridade). */
export const MOTIVOS_PERDA = [
  'preco',
  'timing',
  'concorrente',
  'sem_orcamento',
  'sem_decisor',
  'nao_qualificado',
  'outro',
] as const;
export type MotivoPerda = (typeof MOTIVOS_PERDA)[number];

export const MOTIVO_PERDA: Readonly<Record<MotivoPerda, string>> = {
  preco: 'Preço',
  timing: 'Timing',
  concorrente: 'Concorrente',
  sem_orcamento: 'Sem orçamento',
  sem_decisor: 'Sem decisor',
  nao_qualificado: 'Não qualificado',
  outro: 'Outro',
};

/** Iguais à CHECK de `deals.moeda`. Sem câmbio: cada valor fica na sua moeda. */
export const MOEDAS = ['MZN', 'EUR', 'BRL', 'USD'] as const;
export type Moeda = (typeof MOEDAS)[number];

/** Os tipos que uma pessoa regista à mão (`registar_actividade`). */
export const TIPOS_ACTIVIDADE = ['nota', 'chamada', 'email', 'reuniao'] as const;
export type TipoActividade = (typeof TIPOS_ACTIVIDADE)[number];

export const TIPO_ACTIVIDADE: Readonly<Record<string, string>> = {
  nota: 'Nota',
  chamada: 'Chamada',
  email: 'Email',
  reuniao: 'Reunião',
  fase: 'Mudança de fase',
  atribuicao: 'Atribuição',
  proxima_accao: 'Próxima acção',
  dados: 'Valor e fecho',
  reuniao_marcada: 'Reunião marcada',
  reuniao_remarcada: 'Reunião remarcada',
  reuniao_cancelada: 'Reunião cancelada',
  reuniao_realizada: 'Reunião realizada',
};

export const FASES_FECHADAS = ['ganho', 'perdido'] as const;

/**
 * Sem actividade há mais de 14 dias, uma oportunidade aberta está parada.
 * É o mesmo critério do Espaço CEnO — um critério interno, não uma regra
 * de mercado; muda-se aqui e vale para todos os ecrãs.
 */
export const PARADA_DIAS = 14;

const DIA_MS = 86_400_000;

/** O dia civil (AAAA-MM-DD) em Maputo, onde a equipa trabalha. */
export function diaDeMaputo(d: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Maputo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

function diasEntreDias(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / DIA_MS);
}

export function diasNaFase(faseDesde: string | null, agora: Date): number | null {
  if (!faseDesde) return null;
  return Math.max(0, Math.floor((agora.getTime() - Date.parse(faseDesde)) / DIA_MS));
}

export type EstadoAccao = 'sem' | 'atrasada' | 'hoje' | 'semana' | 'futura';

/** Por dia civil de Maputo: o que era para ontem está atrasado, mesmo às 00:05. */
export function estadoProximaAccao(quando: string | null, agora: Date): EstadoAccao {
  if (!quando) return 'sem';
  const diff = diasEntreDias(diaDeMaputo(agora), diaDeMaputo(new Date(quando)));
  if (diff < 0) return 'atrasada';
  if (diff === 0) return 'hoje';
  if (diff <= 7) return 'semana';
  return 'futura';
}

export function estaParada(ultimaActividade: string | null, agora: Date): boolean {
  if (!ultimaActividade) return false;
  return agora.getTime() - Date.parse(ultimaActividade) > PARADA_DIAS * DIA_MS;
}

export interface OportunidadeFila {
  readonly id: string;
  readonly stage: string;
  readonly owner_id: string | null;
  readonly next_action_at: string | null;
  readonly ultima_actividade: string | null;
}

export interface Fila<T> {
  readonly atrasadas: T[];
  readonly hoje: T[];
  readonly semana: T[];
  readonly semDono: T[];
  readonly paradas: T[];
}

/**
 * O trabalho de uma pessoa: as suas próximas acções por urgência, as suas
 * oportunidades paradas, e — para toda a equipa — o que ainda não tem dono.
 * Uma oportunidade aparece num só balde (o mais urgente).
 */
export function filaDeHoje<T extends OportunidadeFila>(itens: readonly T[], eu: string, agora: Date): Fila<T> {
  const fila: Fila<T> = { atrasadas: [], hoje: [], semana: [], semDono: [], paradas: [] };
  for (const o of itens) {
    if ((FASES_FECHADAS as readonly string[]).includes(o.stage)) continue;
    if (o.owner_id === null) {
      fila.semDono.push(o);
      continue;
    }
    if (o.owner_id !== eu) continue;
    const e = estadoProximaAccao(o.next_action_at, agora);
    if (e === 'atrasada') fila.atrasadas.push(o);
    else if (e === 'hoje') fila.hoje.push(o);
    else if (e === 'semana') fila.semana.push(o);
    else if (estaParada(o.ultima_actividade, agora)) fila.paradas.push(o);
  }
  const porData = (a: T, b: T) => Date.parse(a.next_action_at ?? '') - Date.parse(b.next_action_at ?? '');
  fila.atrasadas.sort(porData);
  fila.hoje.sort(porData);
  fila.semana.sort(porData);
  return fila;
}

export function formatarValor(valor: number | null, moeda: string | null): string {
  if (valor === null || !moeda) return '—';
  return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: moeda, minimumFractionDigits: 2 }).format(valor);
}
