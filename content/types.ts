/* ===========================================================================
   AGORAMOZ — contratos de conteúdo.

   A regra de integridade do documento estratégico está codificada aqui, não
   apenas prometida: sem clientes inventados, sem depoimentos, sem números sem
   fonte, sem garantias de venda, sem urgência ou escassez artificial.
   O que é proibido é irrepresentável — não compila.
   =========================================================================== */

export type CountryCode = 'mz' | 'pt' | 'br';
export type Locale = 'pt-MZ' | 'pt-PT' | 'pt-BR';

/**
 * Idioma da INTERFACE, que é coisa diferente de `Locale`.
 *
 * `Locale` é a localidade de conteúdo de um mercado — `pt-MZ` não é `pt-BR`,
 * e é por isso que existem três ficheiros de país em vez de um traduzido. O
 * `Idioma` é a língua em que a página é servida. Um visitante suíço lê `en`
 * numa página cuja localidade continua a ser a do mercado que descreve.
 *
 * Confundir os dois levaria ao erro clássico: traduzir `pt-BR` para `pt-PT` e
 * chamar-lhe internacionalização.
 */
export type Idioma = 'pt' | 'en';

/**
 * Um texto que existe nas duas línguas. Não é `string | { pt, en }`: a união
 * permitiria acrescentar conteúdo só em português e adiar o inglês para
 * sempre. Aqui, um campo bilingue sem inglês **não compila** — e o
 * teste-guarda em `lib/i18n/texto.test.ts` apanha o resto, que é o inglês que
 * existe mas é português copiado.
 */
export type Texto = { readonly pt: string; readonly en: string };
export type Currency =
  | 'MZN' | 'EUR' | 'BRL'
  // Moedas dos mercados do nível global. Cada uma existe porque um país a usa;
  // um país sem moeda declarada não compila. NUNCA convertidas entre si — uma
  // taxa de câmbio escrita no repositório envelhece e passa a mentir.
  | 'CHF' | 'SGD' | 'USD' | 'GBP' | 'AED' | 'SAR' | 'ZAR' | 'CAD';

/**
 * Mercados de EXPANSÃO, distintos dos três onde operamos.
 *
 * A separação não é cosmética: `/mz`, `/pt` e `/br` afirmam operação — têm
 * consentimento redigido, faixas de investimento ligadas ao formulário e uma
 * linha de contacto. Estes afirmam intenção e competência, e não podem afirmar
 * mais do que isso sem inventar um cliente. A estrutura de URLs guarda a
 * diferença: `/global/<pais>`.
 */
export type GlobalCountryCode =
  | 'ch' | 'sg' | 'us' | 'uk' | 'de' | 'fr' | 'ae' | 'sa' | 'za' | 'ca';

/**
 * Um setor dentro de um mercado global.
 *
 * Os três campos são obrigatórios de propósito. Uma entrada sem `dor` é uma
 * lista de palavras; sem `resultado` é uma queixa. É a regra que impede a
 * repetição do que hoje se vê em quatro dos cinco setores de Moçambique —
 * «Página em preparação», que o diagnóstico de conversão descreve como «sinal
 * de empresa incompleta no momento de decisão».
 */
export interface GlobalSector {
  /** ASCII, sem acentos. Usado no `?setor=` do diagnóstico. */
  readonly slug: string;
  readonly name: Texto;
  /** O dia mau de quem lá trabalha, em linguagem do cliente. */
  readonly pain: Texto;
  /** O que passa a ser verdade quando o problema deixa de existir. */
  readonly outcome: Texto;
}

export interface GlobalMarket {
  readonly code: GlobalCountryCode;
  readonly name: Texto;
  readonly currency: Currency;
  /** Indicativo telefónico, para o exemplo do campo de telefone. */
  readonly dialCode: string;
  /**
   * Porque este mercado, dito a partir da evidência e não da vontade. O texto
   * cita o que a pesquisa mede; não promete presença nem cliente.
   */
  readonly why: Texto;
  /**
   * O regime de proteção de dados que se aplica a um cliente deste mercado.
   * É o NOME do regime, não uma declaração de conformidade — essa exige
   * revisão qualificada e não é feita aqui.
   */
  readonly dataRegime: string;
  /** Exactamente dez. Verificado em teste. */
  readonly sectors: readonly GlobalSector[];
  /**
   * Faixas NA MOEDA NATIVA, escritas como constantes — nunca calculadas por
   * taxa de câmbio. Os pesos seguem a escala dos mercados de operação
   * (6/14/20/25/4), para que a pontuação signifique o mesmo em todo o lado. Os
   * valores são uma decisão comercial por validar: ver GAPS.md.
   */
  readonly investmentBands: readonly InvestmentBand[];
  /**
   * O texto que a pessoa aceita no formulário. Nomeia o regime; não declara
   * conformidade, que exige revisão qualificada.
   */
  readonly consent: { readonly text: Texto; readonly policyHref: string };
  readonly seo: { readonly title: Texto; readonly description: Texto };
}

export type SectorSlug =
  | 'agronegocio'
  | 'energia-mineracao'
  | 'logistica'
  | 'construcao-imobiliario'
  | 'comercio-servicos'
  | 'turismo-hotelaria'
  | 'industria'
  | 'servicos-profissionais'
  | 'logistica-comercio'
  | 'financas-seguros'
  | 'tecnologia-saas'
  | 'industria-energia-construcao';

export type SolutionSlug =
  | 'websites-avancados'
  | 'software-empresarial'
  | 'automacao-de-processos'
  | 'agentes-ia'
  | 'infraestrutura-digital';

/* --------------------------------------------------------------------------
   CTA — os rótulos são tipos literais. O documento exige um CTA primário
   consistente em todo o site; alternar entre "fale connosco", "peça orçamento"
   e "saiba mais" dispersa a intenção. Aqui, tentar escrever outra coisa é um
   erro de compilação.
   Não existem campos de urgência, escassez ou contagem decrescente.
   -------------------------------------------------------------------------- */
export const CTA_PRIMARY = 'Solicitar Diagnóstico Estratégico' as const;
export const CTA_SECONDARY = 'Ver Demonstração' as const;

export interface CtaBlock {
  primary: { label: typeof CTA_PRIMARY; href: string };
  secondary?: { label: typeof CTA_SECONDARY; href: string };
  /** Microcopy honesta. Nunca uma promessa de resultado. */
  note?: string;
}

/* --------------------------------------------------------------------------
   Prova. Não existe variante que aceite um depoimento em texto livre nem um
   nome de cliente. Enquanto não houver clientes, só há metodologia,
   capacidade e demonstrações conceptuais — e estas exigem o disclaimer.
   -------------------------------------------------------------------------- */
export const DEMO_DISCLAIMER =
  'Demonstração conceptual criada pela AGORAMOZ. Os dados e a organização apresentados são fictícios e não representam resultados de clientes.' as const;

export type ProofItem =
  | { kind: 'methodology'; title: string; body: string }
  | { kind: 'capability'; title: string; body: string; evidence: string }
  | {
      kind: 'conceptual-demo';
      title: string;
      body: string;
      /** Literal: uma demonstração não pode ser publicada sem se identificar. */
      disclaimer: typeof DEMO_DISCLAIMER;
    }
  | {
      kind: 'public-reference';
      title: string;
      body: string;
      /** Ambos obrigatórios — uma referência não pode ser afirmada sem fonte. */
      sourceUrl: string;
      consentRef: string;
    };

/** Um número só pode ser publicado com fonte citável. */
export interface SourcedStat {
  value: string;
  label: string;
  source: { name: string; url: string };
}

/* -------------------------------------------------------------------------- */

export interface SeoMeta {
  title: string;
  description: string;
}

export interface FaqItem {
  q: string;
  a: string;
}

export interface Problem {
  title: string;
  body: string;
}

export interface InvestmentBand {
  id: string;
  label: string;
  /** Faixas nativas da moeda do país. Nunca convertidas de outra. */
  scoreWeight: number;
}

/** Impede tradução mecânica: cada país tem de declarar o seu próprio ângulo. */
export interface CountryVoice {
  emphasis: string[];
  proofLanguage: string;
}

export interface Country {
  code: CountryCode;
  name: string;
  demonym: string;
  locale: Locale;
  currency: Currency;
  dialCode: string;
  /**
   * Linha local, quando existir. `null` NÃO significa sem WhatsApp: a UI cai
   * para `SITE.whatsapp`, o número único da empresa. Este campo existe só para
   * o dia em que houver uma linha própria em Portugal ou no Brasil — copiar o
   * mesmo número para os três ficheiros de país criaria a fonte dupla de
   * verdade que já produziu quatro ligações mortas neste projeto.
   */
  whatsapp: PhoneNumber | null;
  privacyRegime: 'MZ' | 'RGPD' | 'LGPD';
  consent: { text: string; policyHref: string };
  investmentBands: InvestmentBand[];
  sectors: SectorSlug[];
  voice: CountryVoice;
  hero: { eyebrow: string; headline: string; lead: string };
  /** Porque é que este mercado é diferente. Texto próprio, não traduzido. */
  positioning: string;
  problems: Problem[];
  seo: SeoMeta;
  updatedAt: string;
}

export interface SectorPage {
  country: CountryCode;
  sector: SectorSlug;
  label: string;
  /** A fórmula do documento, guardada estruturada para ser auditável. */
  formula: {
    audience: string;
    result: string;
    mechanism: string;
    obstacle: string;
  };
  hero: {
    /** Título curto e orientado ao resultado. A fórmula completa é longa
        demais para servir de H1 — entra como declaração de posicionamento. */
    headline: string;
    lead: string;
  };
  problems: Problem[];
  costOfInaction: { intro: string; items: string[]; caveat: string };
  system: { name: string; promise: string; steps: { title: string; body: string }[] };
  components: { title: string; body: string }[];
  useCases: string[];
  integrations: string[];
  security: string[];
  proof: ProofItem[];
  faq: FaqItem[];
  seo: SeoMeta;
  updatedAt: string;
}

export interface SolutionPage {
  slug: SolutionSlug;
  label: string;
  short: string;
  hero: { eyebrow: string; h1: string; lead: string };
  result: string;
  problems: Problem[];
  useCases: string[];
  components: { title: string; body: string }[];
  integrations: string[];
  process: { title: string; body: string }[];
  security: string[];
  faq: FaqItem[];
  seo: SeoMeta;
  updatedAt: string;
}

/* --------------------------------------------------------- contacto e perfil */

/**
 * Uma certificação SEM entidade emissora não é uma certificação — é uma
 * afirmação. `issuer` é obrigatório pela mesma razão que este ficheiro torna
 * impossível representar um cliente inventado: uma credencial que ninguém
 * emitiu não é verificável por quem lê.
 */
export interface Certification {
  name: string;
  /** Quem emitiu. Obrigatório. */
  issuer: string;
  /** Ano de emissão, quando conhecido. */
  year?: string;
}

/** Canal público da empresa. O `handle` é o que se mostra; o `href` é onde vai. */
export interface SocialLink {
  id: 'linkedin' | 'instagram' | 'whatsapp' | 'facebook' | 'youtube' | 'x' | 'tiktok';
  label: string;
  handle: string;
  href: string;
}

/** Um número de telefone em duas formas: a que se marca e a que se lê. */
export interface PhoneNumber {
  /** E.164 sem `+` nem espaços — é o formato que o wa.me exige. */
  e164: string;
  display: string;
}

/* ========================================================================== */
/* IDENTIDADE                                                                 */
/* ========================================================================== */

/**
 * O nome comercial é um tipo literal, pela mesma razão que `CTA_PRIMARY` é:
 * a regra passa a ser do compilador em vez de ser da disciplina de quem edita.
 *
 * A regra aqui é «não acrescentar palavras-chave ao nome da empresa». Não é
 * uma preferência de estilo — é motivo de suspensão de um Perfil de Empresa no
 * Google, e é a tentação óbvia quando alguém quiser subir na pesquisa local.
 * `'AGORAMOZ — Software em Maputo'` não compila.
 */
export const BRAND_NAME = 'AGORAMOZ' as const;

/**
 * Quem confirmou o facto, quando, e com base em quê.
 *
 * Um facto sobre a empresa sem responsável não é um facto — é uma suposição
 * que ninguém se lembra de ter feito. É a mesma exigência que `Certification`
 * faz ao `issuer` e que `SourcedStat` faz à `source`.
 */
export interface FactProvenance {
  readonly confirmedBy: string;
  /** ISO, ao dia. */
  readonly confirmedAt: string;
  readonly source: string;
}

export type AddressCountry = 'MZ' | 'PT' | 'BR';

/**
 * Morada, coordenadas e horário como factos com estado explícito.
 *
 * `'unknown'` não é ausência de dados — é uma afirmação: procurámos e não
 * temos. A diferença importa porque o gerador de `LocalBusiness` aceita
 * apenas a variante `'confirmed'`, e portanto, enquanto estes três forem
 * desconhecidos, **emitir um LocalBusiness não compila**. É assim que «apenas
 * se elegível» deixa de ser um comentário.
 */
export type PostalAddressFact =
  | { readonly status: 'unknown' }
  | {
      readonly status: 'confirmed';
      readonly streetAddress: string;
      readonly addressLocality: string;
      readonly addressRegion?: string;
      readonly postalCode?: string;
      readonly addressCountry: AddressCountry;
      readonly provenance: FactProvenance;
    };

export type GeoFact =
  | { readonly status: 'unknown' }
  | {
      readonly status: 'confirmed';
      readonly latitude: number;
      readonly longitude: number;
      readonly provenance: FactProvenance;
    };

export type DayOfWeek =
  | 'Monday'
  | 'Tuesday'
  | 'Wednesday'
  | 'Thursday'
  | 'Friday'
  | 'Saturday'
  | 'Sunday';

export interface OpeningHoursSpec {
  readonly dayOfWeek: readonly DayOfWeek[];
  readonly opens: string;
  readonly closes: string;
}

export type OpeningHoursFact =
  | { readonly status: 'unknown' }
  | {
      readonly status: 'confirmed';
      readonly specification: readonly OpeningHoursSpec[];
      readonly timeZone: string;
      readonly provenance: FactProvenance;
    };

/** Onde a empresa presta serviço. Derivado do registry, nunca escrito à mão. */
export interface ServiceArea {
  readonly code: AddressCountry;
  readonly name: string;
}

export interface Identity {
  /** Nome registado. `null` enquanto ninguém o fornecer. Nunca inventado. */
  readonly legalName: string | null;
  readonly tradingName: typeof BRAND_NAME;
  readonly url: string;
  readonly logo: { readonly url: string; readonly width: number; readonly height: number };
  readonly telephone: PhoneNumber;
  readonly email: string;
  readonly address: PostalAddressFact;
  readonly geo: GeoFact;
  readonly openingHours: OpeningHoursFact;
  readonly serviceAreas: readonly ServiceArea[];
  readonly socialProfiles: readonly SocialLink[];
}
