/* ===========================================================================
   AGORAMOZ — contratos de conteúdo.

   A regra de integridade do documento estratégico está codificada aqui, não
   apenas prometida: sem clientes inventados, sem depoimentos, sem números sem
   fonte, sem garantias de venda, sem urgência ou escassez artificial.
   O que é proibido é irrepresentável — não compila.
   =========================================================================== */

export type CountryCode = 'mz' | 'pt' | 'br';
export type Locale = 'pt-MZ' | 'pt-PT' | 'pt-BR';
export type Currency = 'MZN' | 'EUR' | 'BRL';

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
  whatsapp: { e164: string; display: string } | null;
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
