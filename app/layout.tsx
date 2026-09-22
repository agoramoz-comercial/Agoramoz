import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono, Space_Grotesk } from 'next/font/google';
import { MotionProvider } from '@/components/motion/MotionProvider';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { TopBar } from '@/components/layout/TopBar';
import { SkipLink } from '@/components/ui/SkipLink';
import { OrganizationJsonLd, WebSiteJsonLd } from '@/components/seo/JsonLd';
import { SITE } from '@/content/site';
import { SITE_URL } from '@/lib/seo/site';
import './globals.css';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
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
  themeColor: '#050D1A',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt" className={`${spaceGrotesk.variable} ${inter.variable} ${jetbrains.variable}`}>
      <head>
        {/* Sem JS, nada do que o GSAP revelaria fica escondido. */}
        <noscript>
          <style>{`[data-animate]{visibility:visible!important;opacity:1!important;transform:none!important}`}</style>
        </noscript>
      </head>
      <body>
        <SkipLink />
        <OrganizationJsonLd />
        <WebSiteJsonLd />
        <MotionProvider>
          <TopBar />
          <SiteHeader />
          <main id="conteudo">{children}</main>
          <SiteFooter />
        </MotionProvider>
      </body>
    </html>
  );
}
