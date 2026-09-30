import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';

/**
 * Cal.com — o que não precisa de rede nem de base, para ser testado.
 *
 * O caminho de uma marcação:
 *
 *  1. o diagnóstico é aceite; o servidor gera um `ref` aleatório, guarda SÓ o
 *     seu hash ligado à oportunidade, e devolve ao browser o link de marcação
 *     com `?metadata[ref]=…`;
 *  2. a pessoa marca no Cal; o Cal envia o webhook com `payload.metadata.ref`;
 *  3. o webhook verifica a assinatura, calcula o hash do `ref` e encontra a
 *     oportunidade — sem que o link alguma vez tenha levado um id nosso, um
 *     nome ou um email.
 *
 * O `ref` não é segredo de acesso — dá só para ligar uma marcação a uma
 * oportunidade —, mas guarda-se em hash pela regra do projecto: token público
 * nunca em claro. Quem ler a base não reconstrói links.
 */

/** 24 bytes em base64url: 32 caracteres, sem `+`, `/` nem `=`. */
export function gerarRef(): string {
  return randomBytes(24).toString('base64url');
}

export function hashRef(ref: string): string {
  return createHash('sha256').update(ref, 'utf8').digest('hex');
}

/** O formato que `gerarRef` produz. Tudo o resto é recusado antes de chegar à base. */
export const REF_VALIDO = /^[A-Za-z0-9_-]{32}$/;

/**
 * O link de marcação. Nada pessoal no URL: nem nome, nem email — o Cal
 * aceitaria pré-preenchê-los, e é precisamente por isso que não se faz.
 */
export function urlDeMarcacao(origem: string, link: string, ref: string): string {
  const url = new URL(`/${link}`, origem);
  url.searchParams.set('metadata[ref]', ref);
  return url.toString();
}

/**
 * `X-Cal-Signature-256`: HMAC-SHA256 do corpo em bruto, em hexadecimal
 * (documentação do Cal). Compara em tempo constante; um cabeçalho em falta,
 * com outro comprimento ou fora de hexadecimal é falso — nunca uma excepção.
 */
export function assinaturaValida(corpo: string, cabecalho: string | null, segredo: string): boolean {
  if (!cabecalho || !/^[0-9a-f]{64}$/i.test(cabecalho)) return false;
  const esperado = createHmac('sha256', segredo).update(corpo, 'utf8').digest();
  const recebido = Buffer.from(cabecalho, 'hex');
  return recebido.length === esperado.length && timingSafeEqual(recebido, esperado);
}

export const EVENTOS_CAL = ['BOOKING_CREATED', 'BOOKING_RESCHEDULED', 'BOOKING_CANCELLED', 'MEETING_ENDED'] as const;
export type EventoCal = (typeof EVENTOS_CAL)[number];

/** O que guardamos de uma entrega. Sem participantes, sem notas, sem link de vídeo. */
export interface Reuniao {
  readonly evento: EventoCal;
  readonly uid: string;
  readonly inicio: string | null;
  readonly fim: string | null;
  readonly tipo: string | null;
  readonly ref: string | null;
  /** Numa remarcação, o `uid` da marcação que esta substitui. */
  readonly uidAnterior: string | null;
}

const uid = z.string().min(1).max(200);
const data = z.string().datetime({ offset: true });

/**
 * Só os campos de que precisamos. `z.object` (não `strictObject`) de
 * propósito: o Cal manda dezenas de campos — participantes, respostas,
 * calendários — e deitá-los fora aqui é o que garante que nunca chegam à base
 * nem ao log. Um campo nosso com forma errada torna-o nulo em vez de recusar
 * a entrega inteira; o `uid` é o único sem o qual não há nada a fazer.
 */
const reserva = z.object({
  uid,
  startTime: data.optional().catch(undefined),
  endTime: data.optional().catch(undefined),
  type: z.string().max(120).optional().catch(undefined),
  rescheduleUid: uid.optional().catch(undefined),
  metadata: z
    .object({ ref: z.string().regex(REF_VALIDO).optional().catch(undefined) })
    .optional()
    .catch(undefined),
});

const entrega = z.object({
  triggerEvent: z.string(),
  payload: z.unknown().optional(),
});

export type Leitura =
  | { readonly tipo: 'reuniao'; readonly reuniao: Reuniao }
  | { readonly tipo: 'ignorada'; readonly motivo: 'evento' }
  /** `evento` só quando é um dos subscritos — nunca texto livre vindo de fora. */
  | { readonly tipo: 'ignorada'; readonly motivo: 'forma'; readonly evento?: EventoCal };

/**
 * Lê uma entrega já autenticada. As marcações vêm dentro de `payload`; o
 * `MEETING_ENDED` vem plano, na raiz (documentação do Cal) — aceitam-se as
 * duas formas. Um evento que não subscrevemos é «ignorado», não erro: o Cal
 * só deixa de reenviar quando recebe 2xx.
 */
export function lerEntrega(json: unknown): Leitura {
  const base = entrega.safeParse(json);
  if (!base.success) return { tipo: 'ignorada', motivo: 'forma' };

  const evento = base.data.triggerEvent;
  if (!(EVENTOS_CAL as readonly string[]).includes(evento)) return { tipo: 'ignorada', motivo: 'evento' };

  const corpo = base.data.payload ?? json;
  const r = reserva.safeParse(corpo);
  if (!r.success) return { tipo: 'ignorada', motivo: 'forma', evento: evento as EventoCal };

  return {
    tipo: 'reuniao',
    reuniao: {
      evento: evento as EventoCal,
      uid: r.data.uid,
      inicio: r.data.startTime ?? null,
      fim: r.data.endTime ?? null,
      tipo: r.data.type ?? null,
      ref: r.data.metadata?.ref ?? null,
      uidAnterior: r.data.rescheduleUid ?? null,
    },
  };
}

/** O estado que cada evento deixa na reunião. */
export const ESTADO_DO_EVENTO: Record<EventoCal, 'marcada' | 'remarcada' | 'cancelada' | 'realizada'> = {
  BOOKING_CREATED: 'marcada',
  BOOKING_RESCHEDULED: 'remarcada',
  BOOKING_CANCELLED: 'cancelada',
  MEETING_ENDED: 'realizada',
};
