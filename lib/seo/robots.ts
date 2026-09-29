import type { MetadataRoute } from 'next';
import { SITE_URL, absolute } from './site';

/**
 * Só o domínio canónico é rastreável. Tudo o resto — deploys de preview,
 * `agoramoz.vercel.app`, qualquer outro alias — recebe `Disallow: /`.
 *
 * Decidido pelo host do PEDIDO, e não por `VERCEL_ENV` no build. Com a
 * variável de build, um deploy de preview promovido a produção (a Vercel
 * promove sem reconstruir) servia `Disallow: /` em agoramoz.com — que é
 * exactamente o que o Google tem hoje em cache: uma única URL com «No
 * information is available for this page». Com o host, esse estado deixa de
 * ser possível.
 *
 * Sem `host:`: a directiva é só do Yandex, e o Google ignora-a.
 */
export function regrasPara(host: string | null): MetadataRoute.Robots {
  const canonico = new URL(SITE_URL).host.toLowerCase();
  const pedido = (host ?? '').trim().toLowerCase().split(':')[0];
  if (pedido !== canonico) {
    return { rules: { userAgent: '*', disallow: '/' } };
  }
  return {
    /**
     * `/admin/` além do cabeçalho `X-Robots-Tag`, e não em vez dele.
     *
     * Os dois atuam em momentos diferentes: o cabeçalho só existe numa resposta
     * já servida — o rastreador tem de pedir a página para o ler. A recusa aqui
     * evita o pedido. Para uma área cuja própria existência não interessa
     * anunciar, poupar o pedido é o ponto.
     */
    rules: { userAgent: '*', allow: '/', disallow: ['/api/', '/admin/'] },
    sitemap: absolute('/sitemap.xml'),
  };
}
