import type { GeoFact, Identity, OpeningHoursFact, PostalAddressFact } from '@/content/types';
import { ORG_ID } from './ids';
import { motivoDePlaceholder } from './placeholder';
import type { SchemaNode } from './types';

/**
 * `LocalBusiness`, apenas se elegível — imposto pelo compilador.
 *
 * A AGORAMOZ é uma empresa de área de serviço: presta serviço em Moçambique,
 * Portugal e Brasil, e não tem morada pública onde receba clientes. Foi o que
 * o fundador confirmou, e é a configuração normal para software B2B.
 *
 * Daí decorrem duas consequências que este ficheiro torna mecânicas:
 *
 * 1. `localBusinessNode` **não aceita `Identity`**. Aceita apenas os três
 *    factos já estreitados para `'confirmed'`. Enquanto `IDENTITY.address`,
 *    `.geo` e `.openingHours` forem `{ status: 'unknown' }`, não há forma de
 *    construir o argumento — a chamada não compila. «Apenas se elegível» não
 *    é um comentário nem um `if` que alguém possa apagar por distração.
 *
 * 2. Mesmo com os três presentes, `elegibilidade()` passa-os pela rede de
 *    `placeholder.ts` e **degrada para inelegível** se apanhar um valor de
 *    exemplo, em vez de levantar um erro. Publicar uma morada inventada é
 *    pior do que não publicar morada nenhuma; rebentar em produção é pior do
 *    que ambos.
 */

export interface FactosLocais {
  readonly address: Extract<PostalAddressFact, { status: 'confirmed' }>;
  readonly geo: Extract<GeoFact, { status: 'confirmed' }>;
  readonly openingHours: Extract<OpeningHoursFact, { status: 'confirmed' }>;
}

export type Elegibilidade =
  | { readonly elegivel: false; readonly emFalta: readonly string[]; readonly recusado?: string }
  | { readonly elegivel: true; readonly factos: FactosLocais };

export function elegibilidade(id: Identity): Elegibilidade {
  const emFalta: string[] = [];
  if (id.address.status !== 'confirmed') emFalta.push('address');
  if (id.geo.status !== 'confirmed') emFalta.push('geo');
  if (id.openingHours.status !== 'confirmed') emFalta.push('openingHours');
  if (emFalta.length > 0) return { elegivel: false, emFalta };

  const factos = {
    address: id.address,
    geo: id.geo,
    openingHours: id.openingHours,
  } as FactosLocais;

  const recusado = motivoDePlaceholder(factos);
  if (recusado) return { elegivel: false, emFalta: [], recusado };

  return { elegivel: true, factos };
}

export function localBusinessNode(id: Identity, factos: FactosLocais): SchemaNode {
  const { address: m, geo: g, openingHours: h } = factos;

  return {
    '@type': 'ProfessionalService',
    // O mesmo `@id` da organização: é a mesma entidade descrita com mais
    // propriedades, não uma segunda empresa.
    '@id': ORG_ID,
    name: id.tradingName,
    url: id.url,
    telephone: `+${id.telephone.e164}`,
    email: id.email,
    address: {
      '@type': 'PostalAddress',
      streetAddress: m.streetAddress,
      addressLocality: m.addressLocality,
      ...(m.addressRegion ? { addressRegion: m.addressRegion } : {}),
      ...(m.postalCode ? { postalCode: m.postalCode } : {}),
      addressCountry: m.addressCountry,
    },
    geo: { '@type': 'GeoCoordinates', latitude: g.latitude, longitude: g.longitude },
    openingHoursSpecification: h.specification.map((e) => ({
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: e.dayOfWeek,
      opens: e.opens,
      closes: e.closes,
    })),
  };
}
