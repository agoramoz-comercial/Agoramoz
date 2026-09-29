import type { Idioma, Texto } from '@/content/types';

/**
 * Leitura de texto bilingue e construção de caminhos por idioma.
 *
 * O português fica na RAIZ e o inglês em `/en`. Não é simetria — é uma decisão
 * medida: as 17 rotas públicas já estão indexadas, e movê-las para `/pt` para
 * ficar bonito trocaria posições reais por arrumação. O custo é esta assimetria
 * de uma linha em `caminhoNoIdioma`; o benefício é não perder o que existe.
 */

export const IDIOMAS = ['pt', 'en'] as const satisfies readonly Idioma[];

/** A raiz é portuguesa. Tudo o que não declarar idioma é isto. */
export const IDIOMA_PADRAO: Idioma = 'pt';

export function t(texto: Texto, idioma: Idioma): string {
  return texto[idioma];
}

export function ehIdioma(valor: string): valor is Idioma {
  return (IDIOMAS as readonly string[]).includes(valor);
}

/**
 * O caminho português de uma rota, venha ela de que lado vier.
 *
 *   caminhoBase('/perfil')    === '/perfil'
 *   caminhoBase('/en/perfil') === '/perfil'
 *   caminhoBase('/en')        === '/'
 *
 * Existe para que quem constrói hreflang não precise de saber em que idioma
 * está: sem isto, `paresDeIdioma('/en/perfil')` devolveria `/en/en/perfil`.
 */
export function caminhoBase(caminho: string): string {
  if (caminho === '/en') return '/';
  return caminho.startsWith('/en/') ? caminho.slice(3) : caminho;
}

/**
 * O caminho de uma rota noutro idioma.
 *
 *   caminhoNoIdioma('/perfil', 'pt') === '/perfil'
 *   caminhoNoIdioma('/perfil', 'en') === '/en/perfil'
 *   caminhoNoIdioma('/',       'en') === '/en'
 *
 * O caso da raiz é o que parte se for esquecido: `/en` + `/` daria `/en/`, e
 * `/en/` e `/en` são URLs diferentes para o Google — duas versões da mesma
 * página a competir uma com a outra.
 */
export function caminhoNoIdioma(caminho: string, idioma: Idioma): string {
  // Normaliza ANTES de prefixar. Sem isto, chamar esta função com um caminho
  // que já está em inglês — o que um seletor de idioma faz naturalmente, com o
  // `pathname` actual — produziria `/en/en/perfil`. É idempotente de
  // propósito: `caminhoNoIdioma(caminhoNoIdioma(x, 'en'), 'en') === `
  // `caminhoNoIdioma(x, 'en')`.
  const base = caminhoBase(caminho);
  if (idioma === 'pt') return base;
  return base === '/' ? '/en' : `/en${base}`;
}

/** O par de caminhos de uma rota, para hreflang recíproco. */
export function paresDeIdioma(caminho: string): Record<Idioma, string> {
  return { pt: caminhoNoIdioma(caminho, 'pt'), en: caminhoNoIdioma(caminho, 'en') };
}
