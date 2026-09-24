import type { Metadata, Viewport } from 'next';
import { Archivo, Chakra_Petch, Inter } from 'next/font/google';
import { SITE } from '@/content/site';
import { SITE_URL } from '@/lib/seo/site';
import './globals.css';

/**
 * Archivo tem eixo de peso variável e desenho neo-grotesco — aguenta os
 * tamanhos display deste sistema com tracking muito apertado sem desfazer.
 * Subset apenas `latin`: os diacríticos do português vivem todos no bloco
 * básico, pelo que `latin-ext` acrescentaria peso para nada.
 */
const archivo = Archivo({
  subsets: ['latin'],
  variable: '--font-archivo',
  display: 'swap',
});
const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });

/**
 * Chakra Petch é a voz techno do sistema: contadores quadrados, terminais
 * cortados na diagonal. Vive nos numerais, nos rótulos e no wordmark — nunca
 * no corpo de texto, onde a caixa quadrada cansa a leitura. Dois pesos
 * chegam: 500 para rótulos, 600 para numerais em escala de estatística.
 */
const chakra = Chakra_Petch({
  subsets: ['latin'],
  weight: ['500', '600'],
  variable: '--font-chakra',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: `AGORAMOZ — ${SITE.tagline}`, template: '%s | AGORAMOZ' },
  description: SITE.description,
  openGraph: { siteName: 'AGORAMOZ', locale: 'pt_PT', type: 'website' },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: '#0A0A0B',
  width: 'device-width',
  initialScale: 1,
};

/**
 * Layout raiz: `<html>`, `<body>`, as fontes e os metadados. Mais nada.
 *
 * A casca de marketing vive em `app/(site)/layout.tsx`, para que `/admin`
 * possa ter casca própria — sem GSAP, sem Lenis, sem cabeçalho de marketing.
 * Enquanto tudo isso esteve aqui, corria em cada rota do domínio.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt" className={`${archivo.variable} ${inter.variable} ${chakra.variable}`}>
      <head>
        {/* Sem JS, nada do que o GSAP revelaria fica escondido. */}
        <noscript>
          <style>{`[data-animate]{visibility:visible!important;opacity:1!important;transform:none!important}`}</style>
        </noscript>
      </head>
      <body>{children}</body>
    </html>
  );
}
