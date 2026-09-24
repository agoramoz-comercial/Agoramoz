import type { GeoFact, OpeningHoursFact, PostalAddressFact } from '@/content/types';

/**
 * A rede que apanha um facto inventado antes de ele ser publicado.
 *
 * O risco não é hipotético. Daqui a uns meses alguém vai querer ver se o
 * `LocalBusiness` melhora a posição na pesquisa local, vai preencher os três
 * campos com o que tiver à mão, e o tipo — que torna o gerador inalcançável
 * enquanto forem `'unknown'` — deixa de proteger no momento exacto em que
 * alguém escreve `status: 'confirmed'`. O tipo garante que os campos existem;
 * não garante que sejam verdadeiros.
 *
 * O caso concreto que motivou a lista: a página de empresa da AGORAMOZ no
 * LinkedIn lista hoje duas localizações, e a segunda é
 * «Avellino Way, Mountain View, California 94043» — o endereço de exemplo do
 * próprio LinkedIn, que ficou por apagar. É exactamente o tipo de valor que
 * alguém copiaria de boa fé de um perfil «oficial».
 *
 * Nenhuma destas regras impede o trabalho legítimo: uma morada real em Maputo,
 * com código postal de quatro dígitos e coordenadas do pino do Perfil de
 * Empresa, passa todas.
 */

const VOCABULARIO_DE_RASCUNHO =
  /\b(exemplo|example|teste|test|sample|lorem|ipsum|placeholder|tbd|todo|xxx|foo|bar|dummy|n\/?a)\b/i;

/** O endereço-marcador do próprio LinkedIn. */
const MARCADOR_LINKEDIN = /avellino way/i;
const MOUNTAIN_VIEW = /mountain view/i;

const CODIGO_POSTAL: Record<'MZ' | 'PT' | 'BR', RegExp | null> = {
  // Moçambique não usa código postal generalizado; ausente é o normal.
  MZ: /^\d{4}$/,
  PT: /^\d{4}-\d{3}$/,
  BR: /^\d{5}-\d{3}$/,
};

/** Caixas envolventes aproximadas. Servem para apanhar o país trocado. */
const CAIXA: Record<'MZ' | 'PT' | 'BR', { lat: [number, number]; lon: [number, number] }> = {
  MZ: { lat: [-27.0, -10.0], lon: [30.0, 41.0] },
  PT: { lat: [32.0, 42.2], lon: [-31.5, -6.1] },
  BR: { lat: [-34.0, 5.5], lon: [-74.0, -34.0] },
};

/**
 * Centróides. Um geocodificador a quem se dá apenas o nome do país devolve
 * isto — e quem colar o resultado fica com uma coordenada que parece precisa
 * e aponta para o meio do mapa.
 */
const CENTROIDE: Record<'MZ' | 'PT' | 'BR', [number, number]> = {
  MZ: [-18.665695, 35.529562],
  PT: [39.399872, -8.224454],
  BR: [-14.235004, -51.92528],
};

function textoSuspeito(valor: string | undefined, campo: string): string | null {
  if (valor === undefined) return null;
  if (valor.trim().length === 0) return `${campo} está vazio`;
  if (VOCABULARIO_DE_RASCUNHO.test(valor)) return `${campo} contém vocabulário de rascunho: «${valor}»`;
  return null;
}

function proveniencia(p: { confirmedBy: string; confirmedAt: string; source: string }, campo: string): string | null {
  if (p.confirmedBy.trim().length === 0) return `${campo}: falta quem confirmou`;
  if (p.source.trim().length === 0) return `${campo}: falta a fonte`;
  const quando = Date.parse(p.confirmedAt);
  if (Number.isNaN(quando)) return `${campo}: data de confirmação ilegível`;
  if (quando > Date.now() + 86_400_000) return `${campo}: data de confirmação no futuro`;
  if (quando < Date.parse('2024-01-01')) return `${campo}: data de confirmação anterior a 2024`;
  return null;
}

/**
 * Devolve a primeira razão pela qual estes factos não são publicáveis, ou
 * `null` se passarem todos.
 */
export function motivoDePlaceholder(factos: {
  address: Extract<PostalAddressFact, { status: 'confirmed' }>;
  geo: Extract<GeoFact, { status: 'confirmed' }>;
  openingHours: Extract<OpeningHoursFact, { status: 'confirmed' }>;
}): string | null {
  const { address: m, geo: g, openingHours: h } = factos;

  /* ------------------------------------------------------------- morada */
  if (MARCADOR_LINKEDIN.test(m.streetAddress)) {
    return 'morada: «Avellino Way» é o endereço de exemplo do LinkedIn';
  }
  if (MOUNTAIN_VIEW.test(m.addressLocality) && m.postalCode === '94043') {
    return 'morada: Mountain View 94043 é um endereço de exemplo';
  }
  for (const [campo, valor] of [
    ['morada (rua)', m.streetAddress],
    ['morada (localidade)', m.addressLocality],
    ['morada (região)', m.addressRegion],
  ] as const) {
    const r = textoSuspeito(valor, campo);
    if (r) return r;
  }
  if (m.postalCode !== undefined) {
    const forma = CODIGO_POSTAL[m.addressCountry];
    if (forma && !forma.test(m.postalCode)) {
      return `morada: código postal «${m.postalCode}» não tem a forma de ${m.addressCountry}`;
    }
  }
  const pm = proveniencia(m.provenance, 'morada');
  if (pm) return pm;

  /* -------------------------------------------------------- coordenadas */
  if (g.latitude === 0 && g.longitude === 0) return 'geo: 0,0 é o Golfo da Guiné, não uma morada';

  const caixa = CAIXA[m.addressCountry];
  if (g.latitude < caixa.lat[0] || g.latitude > caixa.lat[1] || g.longitude < caixa.lon[0] || g.longitude > caixa.lon[1]) {
    return `geo: ${g.latitude},${g.longitude} está fora de ${m.addressCountry}`;
  }

  const [clat, clon] = CENTROIDE[m.addressCountry];
  if (Math.abs(g.latitude - clat) < 0.01 && Math.abs(g.longitude - clon) < 0.01) {
    return `geo: é o centróide de ${m.addressCountry} — o que um geocodificador devolve quando só recebe o nome do país`;
  }

  // Menos de três casas decimais é precisão de ~100 m ou pior: não é o pino
  // de um edifício, é um valor arredondado à mão.
  const casas = (n: number) => (String(n).split('.')[1] ?? '').length;
  if (casas(g.latitude) < 3 || casas(g.longitude) < 3) {
    return 'geo: menos de três casas decimais — não identifica um edifício';
  }
  const pg = proveniencia(g.provenance, 'geo');
  if (pg) return pg;

  /* ------------------------------------------------------------ horário */
  if (h.specification.length === 0) return 'horário: sem nenhuma especificação';
  for (const e of h.specification) {
    if (e.dayOfWeek.length === 0) return 'horário: uma entrada sem dias';
    if (e.opens === e.closes) return `horário: abre e fecha à mesma hora (${e.opens})`;
    if (e.dayOfWeek.length === 7 && e.opens === '00:00' && e.closes === '23:59') {
      return 'horário: sete dias das 00:00 às 23:59 é o valor por omissão de um formulário';
    }
  }
  if (h.timeZone.trim().length === 0) return 'horário: sem fuso';
  const ph = proveniencia(h.provenance, 'horário');
  if (ph) return ph;

  return null;
}
