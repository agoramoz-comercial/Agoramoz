import { MotionProvider } from '@/components/motion/MotionProvider';
import { ScrollProgress } from '@/components/motion/ScrollProgress';
import { CustomCursor } from '@/components/motion/CustomCursor';
import { PageTransition } from '@/components/motion/PageTransition';
import { SectionIndex } from '@/components/layout/SectionIndex';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { TopBar } from '@/components/layout/TopBar';
import { MobileCtaBar } from '@/components/layout/MobileCtaBar';
import { SkipLink } from '@/components/ui/SkipLink';
import { AttributionBoot } from '@/components/analytics/AttributionBoot';
import { OutboundTracker } from '@/components/analytics/OutboundTracker';
import { SiteJsonLd } from '@/components/seo/JsonLd';

/**
 * A casca do site público.
 *
 * Estava no layout raiz, o que significava que corria em TODAS as rotas. Isso
 * não era um problema enquanto só existiam páginas de marketing; passou a ser
 * um quando apareceu a área administrativa, porque um layout aninhado não
 * consegue desligar o que o layout de cima montou — os layouts compõem-se, não
 * se substituem.
 *
 * O que vive aqui e não pode viver no admin: o Lenis (scroll suave), o GSAP e
 * os seus plugins, o cursor personalizado, a transição de página e o índice
 * lateral. Numa tabela de leads, scroll suave e uma transição a cada clique
 * são o contrário de uma ferramenta de trabalho.
 *
 * A classe `grain` mudou de `<body>` para aqui. O pseudo-elemento é
 * `position: fixed` e continua a cobrir o ecrã todo; o que muda é que deixa de
 * cobrir o admin.
 */
export function SiteChrome({ children }: { children: React.ReactNode }) {
  return (
    <div className="grain">
      <SkipLink />
      <SiteJsonLd />
      <AttributionBoot />
      <OutboundTracker />
      <MotionProvider>
        <ScrollProgress />
        <PageTransition />
        <CustomCursor />
        <SectionIndex />
        <TopBar />
        <SiteHeader />
        <main id="conteudo">{children}</main>
        <SiteFooter />
        <MobileCtaBar />
      </MotionProvider>
    </div>
  );
}
