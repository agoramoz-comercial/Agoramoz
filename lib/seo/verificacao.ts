import type { Metadata } from 'next';

/**
 * Verificação de propriedade no Google Search Console e no Bing Webmaster
 * Tools, pela meta-tag.
 *
 * Os tokens vêm de variáveis de ambiente da Vercel, nunca do código: não são
 * segredos (ficam públicos no HTML), mas são da conta de quem verifica, e um
 * token escrito aqui à mão seria um token inventado. Sem variável, nada é
 * emitido — e a alternativa, mais robusta, é o registo TXT na zona DNS
 * (ver `docs/SEO_ACTIVACAO.md` §3).
 *
 * Um valor com forma impossível é ignorado em vez de publicado: uma meta-tag
 * errada não verifica nada e faz crer que a verificação está feita.
 */
const FORMA = /^[A-Za-z0-9_-]{10,100}$/;

function token(nome: string, env: Record<string, string | undefined>): string | undefined {
  const valor = env[nome]?.trim();
  if (!valor) return undefined;
  if (!FORMA.test(valor)) {
    console.warn(`[seo] ${nome} ignorado: não tem a forma de um token de verificação`);
    return undefined;
  }
  return valor;
}

export function verificacaoDosMotores(
  env: Record<string, string | undefined> = process.env,
): Metadata['verification'] | undefined {
  const google = token('GOOGLE_SITE_VERIFICATION', env);
  const bing = token('BING_SITE_VERIFICATION', env);
  if (!google && !bing) return undefined;
  return {
    ...(google ? { google } : {}),
    ...(bing ? { other: { 'msvalidate.01': bing } } : {}),
  };
}
