import type { Metadata } from 'next';
import { SITE } from '@/content/site';

export const SITE_URL = SITE.url.replace(/\/$/, '');

export function absolute(path: string) {
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

/**
 * hreflang recíproco. Só emitimos alternates para páginas que existem de
 * facto — um hreflang para uma página inexistente é, na melhor das hipóteses,
 * ignorado pelos motores de busca.
 */
export function buildMetadata({
  title,
  description,
  path,
  languages,
  noindex,
}: {
  title: string;
  description: string;
  path: string;
  languages?: Record<string, string>;
  noindex?: boolean;
}): Metadata {
  return {
    title,
    description,
    alternates: {
      canonical: absolute(path),
      ...(languages ? { languages } : {}),
    },
    openGraph: {
      title,
      description,
      url: absolute(path),
      siteName: 'AGORAMOZ',
      locale: 'pt_PT',
      type: 'website',
    },
    twitter: { card: 'summary_large_image', title, description },
    ...(noindex ? { robots: { index: false, follow: false } } : {}),
  };
}
