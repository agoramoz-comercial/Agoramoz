import { describe, expect, it } from 'vitest';
import { COUNTRY_CODES } from '@/content/registry';
import { BRAND_NAME, type GeoFact, type OpeningHoursFact, type PostalAddressFact } from '@/content/types';
import { IDENTITY } from '@/content/site';
import { elegibilidade } from './schema/local-business';
import { organizationNode, webSiteNode } from './schema/nodes';
import { motivoDePlaceholder } from './schema/placeholder';

/**
 * A AGORAMOZ é uma empresa de área de serviço: presta serviço em Moçambique,
 * Portugal e Brasil e não tem morada pública onde receba clientes. Confirmado
 * pelo fundador, e é a configuração normal para software B2B.
 *
 * Estes testes guardam duas coisas diferentes:
 *
 * 1. Que hoje não se emite `LocalBusiness` — o tipo já o garante, e o teste
 *    documenta-o.
 * 2. **Que no dia em que alguém preencher os campos, o lixo não passa.** É
 *    aqui que está o valor real: o tipo protege enquanto os factos forem
 *    `'unknown'`, e deixa de proteger no instante em que alguém escreve
 *    `status: 'confirmed'` com o que tiver à mão.
 *
 * As moradas abaixo são apenas material de teste do guarda. Nenhuma é
 * publicada em lado nenhum — o primeiro teste deste ficheiro prova-o.
 */

const PROVENIENCIA = {
  confirmedBy: 'Gerson Samussene',
  confirmedAt: '2026-09-24',
  source: 'documento de registo',
};

/** Estruturalmente válido: é o conjunto que TEM de passar. */
const VALIDO = {
  address: {
    status: 'confirmed',
    streetAddress: 'Avenida Julius Nyerere, 1234',
    addressLocality: 'Maputo',
    postalCode: '1104',
    addressCountry: 'MZ',
    provenance: PROVENIENCIA,
  } as Extract<PostalAddressFact, { status: 'confirmed' }>,
  geo: {
    status: 'confirmed',
    latitude: -25.9692,
    longitude: 32.5732,
    provenance: PROVENIENCIA,
  } as Extract<GeoFact, { status: 'confirmed' }>,
  openingHours: {
    status: 'confirmed',
    specification: [
      { dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], opens: '08:00', closes: '17:00' },
    ],
    timeZone: 'Africa/Maputo',
    provenance: PROVENIENCIA,
  } as Extract<OpeningHoursFact, { status: 'confirmed' }>,
};

const com = <K extends keyof typeof VALIDO>(chave: K, valor: (typeof VALIDO)[K]) => ({ ...VALIDO, [chave]: valor });

describe('elegibilidade para LocalBusiness', () => {
  it('não é elegível: morada, coordenadas e horário são desconhecidos', () => {
    expect(IDENTITY.address.status).toBe('unknown');
    expect(IDENTITY.geo.status).toBe('unknown');
    expect(IDENTITY.openingHours.status).toBe('unknown');
  });

  it('nomeia exactamente os três factos em falta', () => {
    const r = elegibilidade(IDENTITY);
    expect(r.elegivel).toBe(false);
    if (!r.elegivel) expect(r.emFalta).toEqual(['address', 'geo', 'openingHours']);
  });

  it('com os três factos bem formados, é elegível', () => {
    // Sem isto, o guarda podia ser um `return false` e os testes acima
    // passariam na mesma. É a prova de que não é um recusador universal.
    const r = elegibilidade({ ...IDENTITY, ...VALIDO });
    expect(r.elegivel).toBe(true);
  });
});

describe('a rede que apanha factos inventados', () => {
  it('aceita um conjunto bem formado', () => {
    expect(motivoDePlaceholder(VALIDO)).toBeNull();
  });

  it('recusa «Avellino Way» — o endereço de exemplo do LinkedIn', () => {
    // Não é hipotético: está hoje na página de empresa da AGORAMOZ no
    // LinkedIn, como segunda localização, por apagar.
    const r = motivoDePlaceholder(
      com('address', { ...VALIDO.address, streetAddress: 'Avellino Way' }),
    );
    expect(r).toMatch(/Avellino Way/);
  });

  it.each([
    ['rua de exemplo', { ...VALIDO.address, streetAddress: 'Rua Exemplo, 1' }],
    ['localidade vazia', { ...VALIDO.address, addressLocality: '   ' }],
    ['TODO na rua', { ...VALIDO.address, streetAddress: 'TODO' }],
    ['código postal com forma de PT', { ...VALIDO.address, postalCode: '1234-567' }],
    ['confirmado por ninguém', { ...VALIDO.address, provenance: { ...PROVENIENCIA, confirmedBy: '' } }],
    ['confirmado sem fonte', { ...VALIDO.address, provenance: { ...PROVENIENCIA, source: '' } }],
    ['confirmado em 2019', { ...VALIDO.address, provenance: { ...PROVENIENCIA, confirmedAt: '2019-01-01' } }],
  ])('recusa a morada: %s', (_, morada) => {
    expect(motivoDePlaceholder(com('address', morada as typeof VALIDO.address))).not.toBeNull();
  });

  it.each([
    ['null island', { ...VALIDO.geo, latitude: 0, longitude: 0 }],
    ['fora de Moçambique (Lisboa)', { ...VALIDO.geo, latitude: 38.7223, longitude: -9.1393 }],
    ['centróide do país', { ...VALIDO.geo, latitude: -18.665695, longitude: 35.529562 }],
    ['arredondado à mão', { ...VALIDO.geo, latitude: -25.96, longitude: 32.57 }],
  ])('recusa a coordenada: %s', (_, geo) => {
    expect(motivoDePlaceholder(com('geo', geo as typeof VALIDO.geo))).not.toBeNull();
  });

  it.each([
    ['sem especificação', { ...VALIDO.openingHours, specification: [] }],
    [
      'sete dias 00:00–23:59',
      {
        ...VALIDO.openingHours,
        specification: [
          {
            dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
            opens: '00:00',
            closes: '23:59',
          },
        ],
      },
    ],
    [
      'abre e fecha à mesma hora',
      { ...VALIDO.openingHours, specification: [{ dayOfWeek: ['Monday'], opens: '09:00', closes: '09:00' }] },
    ],
    ['sem fuso', { ...VALIDO.openingHours, timeZone: '' }],
  ])('recusa o horário: %s', (_, horario) => {
    expect(motivoDePlaceholder(com('openingHours', horario as typeof VALIDO.openingHours))).not.toBeNull();
  });

  it('um facto recusado torna a identidade inelegível, sem levantar erro', () => {
    // Degradar, não rebentar: publicar uma morada inventada é pior do que não
    // publicar morada nenhuma, e rebentar em produção é pior do que ambos.
    const r = elegibilidade({
      ...IDENTITY,
      ...com('address', { ...VALIDO.address, streetAddress: 'Avellino Way' }),
    });
    expect(r.elegivel).toBe(false);
    if (!r.elegivel) expect(r.recusado).toMatch(/Avellino Way/);
  });
});

describe('o nome da empresa', () => {
  it('é exactamente AGORAMOZ', () => {
    expect(IDENTITY.tradingName).toBe('AGORAMOZ');
    expect(BRAND_NAME).toBe('AGORAMOZ');
  });

  it('nenhum nó nomeia a organização com localidade, serviço ou separador', () => {
    /**
     * Meter palavras-chave no nome da empresa é motivo de suspensão de um
     * Perfil de Empresa no Google — e é a tentação óbvia de quem quiser subir
     * na pesquisa local. `'AGORAMOZ — Software em Maputo'` falha aqui.
     */
    for (const no of [organizationNode(), webSiteNode()]) {
      expect(no.name, JSON.stringify(no['@type'])).toBe('AGORAMOZ');
    }
  });
});

describe('o que não sabemos fica omitido, não nulo', () => {
  it('o nome legal não existe e não é emitido', () => {
    expect(IDENTITY.legalName).toBeNull();
    expect(organizationNode()).not.toHaveProperty('legalName');
  });

  it('nenhum nó emite propriedades nulas ou indefinidas', () => {
    // `legalName: null` no JSON-LD não diz «desconhecido» — diz «a empresa não
    // tem nome legal», que é uma afirmação falsa.
    const json = JSON.stringify(organizationNode());
    expect(json).not.toContain(':null');
  });
});

describe('áreas servidas', () => {
  it('são exactamente os países publicados, nem mais nem menos', () => {
    // O guarda contra «servimos toda a África Austral»: as áreas não são
    // escritas, são derivadas do registry.
    expect(IDENTITY.serviceAreas.map((a) => a.code)).toEqual(
      COUNTRY_CODES.map((c) => c.toUpperCase()),
    );
  });
});
