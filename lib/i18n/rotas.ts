import { GLOBAL_CODES } from '@/content/registry';
import type { Idioma } from '@/content/types';
import { caminhoBase, caminhoNoIdioma } from './texto';

/**
 * As rotas que existem nos DOIS idiomas, pelo caminho português.
 *
 * É a única lista. O seletor de idioma, o hreflang de `buildMetadata`, o
 * sitemap e as ligações do chrome leem daqui — e um teste exige que cada
 * entrada tenha página nas duas árvores (`app/(site)` e `app/(en)/en`). Sem
 * uma fonte única, cada um destes teria a sua ideia do que está traduzido, e o
 * primeiro a divergir mandava alguém para um 404 com hreflang a apontar-lhe.
 *
 * Cresce por lote: uma rota só entra quando a página inglesa existe.
 */
export const ROTAS_BILINGUES: readonly string[] = ['/global', ...GLOBAL_CODES.map((c) => `/global/${c}`)];

/** A rota existe nos dois idiomas. Aceita o caminho de qualquer lado. */
export function temPar(caminho: string): boolean {
  return ROTAS_BILINGUES.includes(caminhoBase(caminho));
}

/** O idioma de um caminho: `/en` e `/en/…` são inglês; tudo o resto, português. */
export function idiomaDoCaminho(caminho: string): Idioma {
  return caminhoBase(caminho) !== caminho ? 'en' : 'pt';
}

/**
 * Para onde apontar uma ligação a partir de uma página num idioma.
 *
 * Se a rota existe nesse idioma, o caminho desse idioma. Se não existe, o
 * português — e `soPortugues` diz a quem desenha a ligação que a marque
 * (`hrefLang="pt"` e «(PT)»), em vez de mandar alguém para um 404 ou para
 * português sem aviso.
 */
export function ligacao(caminho: string, idioma: Idioma): { href: string; soPortugues: boolean } {
  const base = caminhoBase(caminho);
  if (idioma === 'pt') return { href: base, soPortugues: false };
  return temPar(base) ? { href: caminhoNoIdioma(base, 'en'), soPortugues: false } : { href: base, soPortugues: true };
}

/**
 * A porta de entrada de cada idioma. Enquanto não houver home inglesa, a
 * entrada inglesa é o nível global — é o único sítio onde o inglês é o idioma
 * natural, e nunca é um 404.
 */
export function inicioDoIdioma(idioma: Idioma): string {
  if (idioma === 'pt') return '/';
  return temPar('/') ? '/en' : '/en/global';
}

/**
 * O destino do seletor de idioma a partir da página actual.
 *
 * `atual` é o idioma em que o chrome está a ser desenhado, quando se sabe. Não
 * se deduz só do URL porque os dois divergem numa página 404: `/en/global/zz`
 * é desenhado com o chrome português da raiz, e deduzir «inglês» do URL faria
 * o botão «EN» levar à home portuguesa.
 */
export function destinoNoOutroIdioma(caminho: string, atual: Idioma = idiomaDoCaminho(caminho)): {
  idioma: Idioma;
  href: string;
} {
  const outro: Idioma = atual === 'pt' ? 'en' : 'pt';
  return {
    idioma: outro,
    href: temPar(caminho) ? caminhoNoIdioma(caminho, outro) : inicioDoIdioma(outro),
  };
}
