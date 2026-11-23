import { COUNTRY_CODES, GLOBAL_CODES } from '@/content/registry';

/**
 * Os países que uma notícia pode afectar directamente: os três mercados da
 * AGORAMOZ e os dez mercados globais de content/registry.ts. A mesma lista
 * está na restrição `news_artigos_pais_valido` (0023) — um teste garante-o.
 */
export const PAISES_NEWS = [...COUNTRY_CODES, ...GLOBAL_CODES] as const;
export type PaisNews = (typeof PAISES_NEWS)[number];

export const NOME_DO_PAIS: Record<PaisNews, { pt: string; en: string }> = {
  mz: { pt: 'Moçambique', en: 'Mozambique' },
  pt: { pt: 'Portugal', en: 'Portugal' },
  br: { pt: 'Brasil', en: 'Brazil' },
  ch: { pt: 'Suíça', en: 'Switzerland' },
  sg: { pt: 'Singapura', en: 'Singapore' },
  us: { pt: 'Estados Unidos', en: 'United States' },
  uk: { pt: 'Reino Unido', en: 'United Kingdom' },
  de: { pt: 'Alemanha', en: 'Germany' },
  fr: { pt: 'França', en: 'France' },
  ae: { pt: 'Emirados Árabes Unidos', en: 'United Arab Emirates' },
  sa: { pt: 'Arábia Saudita', en: 'Saudi Arabia' },
  za: { pt: 'África do Sul', en: 'South Africa' },
  ca: { pt: 'Canadá', en: 'Canada' },
};

export function ePaisNews(v: unknown): v is PaisNews {
  return typeof v === 'string' && (PAISES_NEWS as readonly string[]).includes(v);
}
