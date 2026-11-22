import type { Lingua } from '@/content/types';
import type { V3 } from '@/content/v3/tipo';
import { PT } from '@/content/v3/pt';
import { EN } from '@/content/v3/en';
import { FR } from '@/content/v3/fr';
import { ES } from '@/content/v3/es';
import { DE } from '@/content/v3/de';
import { AR } from '@/content/v3/ar';
import { ligacao } from '@/lib/i18n/rotas';
import { idiomaBase } from '@/lib/i18n/texto';

/**
 * A página inicial v3 existe em seis línguas: o português na raiz, as outras
 * num prefixo de duas letras. O resto do site continua em português e inglês;
 * a partir de fr/es/de/ar, as ligações levam à versão inglesa.
 */
const DICIONARIOS: Record<Lingua, V3> = { pt: PT, en: EN, fr: FR, es: ES, de: DE, ar: AR };

export function textosV3(lingua: Lingua): V3 {
  return DICIONARIOS[lingua];
}

export const INICIO_DA_LINGUA: Record<Lingua, string> = {
  pt: '/',
  en: '/en',
  fr: '/fr',
  es: '/es',
  de: '/de',
  ar: '/ar',
};

/** Nome de cada língua na própria língua, e a etiqueta curta do botão. */
export const NOME_DA_LINGUA: Record<Lingua, { nome: string; curto: string; hreflang: string }> = {
  pt: { nome: 'Português', curto: 'PT', hreflang: 'pt' },
  en: { nome: 'English', curto: 'EN', hreflang: 'en' },
  fr: { nome: 'Français', curto: 'FR', hreflang: 'fr' },
  es: { nome: 'Español', curto: 'ES', hreflang: 'es' },
  de: { nome: 'Deutsch', curto: 'DE', hreflang: 'de' },
  ar: { nome: 'العربية', curto: 'AR', hreflang: 'ar' },
};

/** Uma página do resto do site, na língua mais próxima que existe (pt ou en). */
export function paginaV3(caminho: string, lingua: Lingua): { href: string; hrefLang?: string } {
  const l = ligacao(caminho, idiomaBase(lingua));
  const real = l.soPortugues ? 'pt' : idiomaBase(lingua);
  return { href: l.href, hrefLang: real !== lingua ? real : undefined };
}

/** As alternativas hreflang da página inicial, para os metadados. */
export function alternativasV3(): Record<string, string> {
  return {
    'pt-MZ': '/mz',
    'pt-PT': '/pt',
    'pt-BR': '/br',
    pt: '/',
    en: '/en',
    fr: '/fr',
    es: '/es',
    de: '/de',
    ar: '/ar',
    'x-default': '/',
  };
}
