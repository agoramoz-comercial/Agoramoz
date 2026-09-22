import type { Metadata, Viewport } from 'next';
import { Archivo, Inter, JetBrains_Mono } from 'next/font/google';
import { MotionProvider } from '@/components/motion/MotionProvider';
import { ScrollProgress } from '@/components/motion/ScrollProgress';
import { CustomCursor } from '@/components/motion/CustomCursor';
import { SectionIndex } from '@/components/layout/SectionIndex';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { TopBar } from '@/components/layout/TopBar';
import { SkipLink } from '@/components/ui/SkipLink';
import { OrganizationJsonLd, WebSiteJsonLd } from '@/components/seo/JsonLd';
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
const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-jetbrains-mono',
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
  themeColor: '#08090B',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt" className={`${archivo.variable} ${inter.variable} ${jetbrains.variable}`}>
      <head>
        {/* Sem JS, nada do que o GSAP revelaria fica escondido. */}
        <noscript>
          <style>{`[data-animate]{visibility:visible!important;opacity:1!important;transform:none!important}`}</style>
        </noscript>
      </head>
      <body className="grain">
        <SkipLink />
        <OrganizationJsonLd />
        <WebSiteJsonLd />
        <MotionProvider>
          <ScrollProgress />
          <CustomCursor />
          <SectionIndex />
          <TopBar />
          <SiteHeader />
          <main id="conteudo">{children}</main>
          <SiteFooter />
        </MotionProvider>
      </body>
    </html>
  );
}
