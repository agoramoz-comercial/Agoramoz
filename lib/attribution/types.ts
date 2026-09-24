/**
 * A origem de uma visita, na forma em que é gravada.
 *
 * Só campos saneados entram aqui: quem constrói um `Atribuicao` já passou
 * pelos filtros de `sanitize.ts`. `null` significa «não havia» ou «havia e foi
 * recusado» — e a distinção entre os dois fica no registo, não na coluna, para
 * que a tabela não passe a ter dois tipos de vazio.
 */
export interface Atribuicao {
  readonly utm_source: string | null;
  readonly utm_medium: string | null;
  readonly utm_campaign: string | null;
  readonly utm_content: string | null;
  /** Caminho, nunca URL completo, nunca query string. */
  readonly landing_page: string | null;
  /** Host, nunca URL completo. */
  readonly referrer: string | null;
  readonly first_touch_at: string | null;
  readonly last_touch_at: string;
}

export const CANAIS = [
  'gbp',
  'organico',
  'directo',
  'social',
  'referencia',
  'campanha',
  'desconhecido',
] as const;

export type Canal = (typeof CANAIS)[number];
