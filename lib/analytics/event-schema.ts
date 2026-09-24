import { z } from 'zod';
import { COUNTRY_CODES } from '@/content/registry';
import { CANAIS } from '@/lib/attribution/types';
import { EVENTOS_DE_BROWSER } from './events';

/**
 * O que a rota de eventos aceita do browser.
 *
 * Uma união de `strictObject`, e não um `record` de propriedades livres.
 * A diferença importa: com propriedades livres, qualquer pessoa — ou qualquer
 * alteração distraída no cliente — pode anexar um campo «só para o analytics»,
 * e foi exactamente assim que a classificação do lead chegou ao browser uma
 * vez (D-15). Aqui, um campo a mais é `400`, não uma coluna nova na tabela.
 *
 * Os eventos de servidor (`deal_created`, `deal_won`,
 * `document_confirmed_view`) **não estão aqui de propósito**: nascem em
 * gatilhos da base. Um evento de negócio fechado que qualquer browser pudesse
 * enviar não serviria para medir coisa nenhuma.
 */

const texto = (max: number) => z.string().trim().min(1).max(max);

const nomes = z.enum(EVENTOS_DE_BROWSER);
const pais = z.enum(COUNTRY_CODES);
const superficie = texto(40);

const corpo = z.discriminatedUnion('name', [
  z.strictObject({ name: z.literal('country_selected'), country: pais, surface: superficie }),
  z.strictObject({
    name: z.literal('sector_selected'),
    country: pais,
    sector: texto(60),
    surface: superficie,
  }),
  z.strictObject({ name: z.literal('service_viewed'), solution: texto(60) }),
  z.strictObject({ name: z.literal('gbp_landing_view'), landing: texto(40) }),
  z.strictObject({
    name: z.literal('diagnostic_started'),
    formId: z.literal('diagnostic'),
    entryPath: texto(120),
  }),
  z.strictObject({
    name: z.literal('form_step_completed'),
    step: z.number().int().min(1).max(20),
    stepId: texto(60),
  }),
  z.strictObject({ name: z.literal('diagnostic_submitted') }),
  z.strictObject({ name: z.literal('meeting_requested'), surface: superficie }),
  z.strictObject({ name: z.literal('whatsapp_clicked'), country: pais.nullable(), surface: superficie }),
]);

export const eventoRecebido = z.strictObject({
  evento: corpo,
  /** O canal e a campanha vêm do cliente e são re-saneados no servidor. */
  channel: z.enum(CANAIS),
  campaign: z.string().max(64).nullable(),
  path: z.string().max(120).nullable(),
});

export type EventoRecebido = z.infer<typeof eventoRecebido>;

/** Para o teste que exige que a união cubra exactamente os eventos de browser. */
export const NOMES_ACEITES = nomes.options;
