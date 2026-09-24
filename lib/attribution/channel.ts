import type { Atribuicao, Canal } from './types';

/**
 * De onde veio esta pessoa, numa palavra.
 *
 * Vive em TypeScript e não em SQL por duas razões: é testável sem base de
 * dados, e muda com o negócio — um canal novo é uma alteração de código
 * revista, não um `update` numa tabela.
 *
 * A etiqueta `gbp` merece explicação. O URL que vai no campo «Website» do
 * Perfil de Empresa do Google é nosso, e é lá — e só lá — que pomos
 * `utm_campaign=gbp`. É isso que separa «veio do perfil» de «veio da pesquisa
 * normal do Google», que de outra forma seriam indistinguíveis: o Google envia
 * o mesmo referenciador nos dois casos.
 */

const SOCIAIS = new Set([
  'linkedin.com',
  'www.linkedin.com',
  'lnkd.in',
  'mz.linkedin.com',
  'instagram.com',
  'www.instagram.com',
  'l.instagram.com',
  'facebook.com',
  'www.facebook.com',
  'm.facebook.com',
  'l.facebook.com',
  't.co',
  'x.com',
]);

const PESQUISA = [
  /^(www\.)?google\.[a-z.]{2,7}$/,
  /^(www\.)?bing\.com$/,
  /^(www\.)?duckduckgo\.com$/,
  /^search\.yahoo\.com$/,
  /^(www\.)?ecosia\.org$/,
  /^(www\.)?brave\.com$/,
];

/** Primeira correspondência ganha. A ordem é a decisão. */
export function derivarCanal(a: Atribuicao | null): Canal {
  if (a === null) return 'desconhecido';

  if (a.utm_campaign === 'gbp') return 'gbp';

  if (a.utm_source || a.utm_medium || a.utm_campaign || a.utm_content) return 'campanha';

  if (a.referrer) {
    if (SOCIAIS.has(a.referrer)) return 'social';
    if (PESQUISA.some((r) => r.test(a.referrer!))) return 'organico';
    return 'referencia';
  }

  return 'directo';
}
