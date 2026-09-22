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
    rules: { userAgent: '*', allow: '/', disallow: '/api/' },
    sitemap: absolute('/sitemap.xml'),
    host: SITE_URL,
  };
}
