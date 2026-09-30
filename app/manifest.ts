import type { MetadataRoute } from 'next';
import { SITE } from '@/content/site';

/**
 * Manifesto da aplicação web: o ícone ao instalar no telemóvel e a cor da
 * barra. Os ícones são o logo oficial sobre preto puro (`.qa/icones.mjs`).
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE.name,
    short_name: SITE.name,
    description: SITE.description,
    start_url: '/',
    display: 'browser',
    background_color: '#000000',
    // A mesma cor do `viewport.themeColor` em app/layout.tsx.
    theme_color: '#0A0A0B',
    icons: [
      { src: '/brand/logo-preto-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/brand/logo-preto-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    ],
  };
}
