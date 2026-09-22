import type { Country, CountryCode, SectorPage, SectorSlug, SolutionPage, SolutionSlug } from './types';
import { mz } from './countries/mz';
import { pt } from './countries/pt';
import { br } from './countries/br';
import { mzEnergiaMineracao } from './sectors/mz/energia-mineracao';
import { automacaoDeProcessos } from './solutions/automacao-de-processos';

/** Rótulos legíveis dos setores. Os slugs são sempre ASCII sem acentos. */
export const SECTOR_LABELS: Record<SectorSlug, string> = {
  agronegocio: 'Agricultura e agronegócio',
  'energia-mineracao': 'Energia, mineração e serviços industriais',
  logistica: 'Logística e transportes',
  'construcao-imobiliario': 'Construção e imobiliário',
  'comercio-servicos': 'Comércio e serviços B2B',
  'turismo-hotelaria': 'Turismo, hotelaria e alojamento',
  industria: 'Indústria e fabricação',
  'servicos-profissionais': 'Serviços profissionais B2B',
  'logistica-comercio': 'Logística, transportes e comércio',
  'financas-seguros': 'Serviços financeiros, seguros e fintech',
  'tecnologia-saas': 'Tecnologia e SaaS',
  'industria-energia-construcao': 'Indústria, energia e construção',
};

export const COUNTRIES: Record<CountryCode, Country> = { mz, pt, br };
export const COUNTRY_CODES = ['mz', 'pt', 'br'] as const satisfies readonly CountryCode[];

/**
 * Segmentos estáticos de topo. Um código de país nunca pode colidir com um
 * destes — o segmento estático ganharia silenciosamente. Verificado em teste.
 */
export const RESERVED_TOP_LEVEL_SLUGS = [
  'solucoes', 'sobre', 'contactos', 'diagnostico', 'como-trabalhamos',
  'privacidade', 'termos', 'obrigado', 'api', 'setores',
] as const;

/**
 * Páginas setoriais publicadas. Fase 1 publica uma; acrescentar uma vertical
 * é criar o ficheiro de conteúdo e adicionar uma linha aqui. As rotas, o
 * sitemap, o hreflang, o seletor do hero e a navegação leem daqui.
 */
export const SECTOR_PAGES: Record<string, SectorPage> = {
  'mz/energia-mineracao': mzEnergiaMineracao,
};

export const SOLUTIONS: Record<string, SolutionPage> = {
  'automacao-de-processos': automacaoDeProcessos,
};

/* -------------------------------------------------------------------- lookups */

export function isCountryCode(value: string): value is CountryCode {
  return (COUNTRY_CODES as readonly string[]).includes(value);
}

export function getCountry(code: string): Country | null {
  return isCountryCode(code) ? COUNTRIES[code] : null;
}

export function getSectorPage(country: string, sector: string): SectorPage | null {
  return SECTOR_PAGES[`${country}/${sector}`] ?? null;
}

export function getSolution(slug: string): SolutionPage | null {
  return SOLUTIONS[slug] ?? null;
}

export function hasSectorPage(country: CountryCode, sector: SectorSlug): boolean {
  return `${country}/${sector}` in SECTOR_PAGES;
}

/** Todos os setores de um país, com indicação de quais já têm página. */
export function getSectorsForCountry(code: CountryCode) {
  return COUNTRIES[code].sectors.map((sector) => ({
    sector,
    label: SECTOR_LABELS[sector],
    published: hasSectorPage(code, sector),
    href: hasSectorPage(code, sector) ? `/${code}/${sector}` : `/diagnostico?pais=${code}&setor=${sector}`,
  }));
}

/** Países que publicam este setor — base do hreflang recíproco. */
export function getCountriesForSector(sector: SectorSlug): CountryCode[] {
  return COUNTRY_CODES.filter((code) => hasSectorPage(code, sector));
}

export function getAllSectorParams(): { pais: CountryCode; setor: SectorSlug }[] {
  return Object.values(SECTOR_PAGES).map((p) => ({ pais: p.country, setor: p.sector }));
}

export function getAllSolutionParams(): { solucao: SolutionSlug }[] {
  return Object.values(SOLUTIONS).map((s) => ({ solucao: s.slug }));
}

/** Preenche a fórmula do hero setorial a partir dos campos estruturados. */
export function renderSectorFormula(page: SectorPage): string {
  const country = COUNTRIES[page.country].name;
  const { audience, result, mechanism, obstacle } = page.formula;
  return `Ajudamos ${audience} em ${country} a ${result} através de ${mechanism}, sem ${obstacle}.`;
}
