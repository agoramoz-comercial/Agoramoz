import type { MetadataRoute } from 'next';
import { SITE_URL, absolute } from '@/lib/seo/site';

/**
 * Deploys de preview nunca são indexados. É o passo mais esquecido e o mais
 * caro de desfazer depois de o Google ter indexado um URL de preview.
 */
export default function robots(): MetadataRoute.Robots {
  const isProduction = process.env.VERCEL_ENV === 'production' || process.env.VERCEL_ENV === undefined;

  if (!isProduction) {
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
    host: SITE_URL,
  };
}
