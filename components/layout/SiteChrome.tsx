import { MotionProvider } from '@/components/motion/MotionProvider';
import { ScrollProgress } from '@/components/motion/ScrollProgress';
import { PageTransition } from '@/components/motion/PageTransition';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { TopBar } from '@/components/layout/TopBar';
import { MobileCtaBar } from '@/components/layout/MobileCtaBar';
import { SkipLink } from '@/components/ui/SkipLink';
import { AttributionBoot } from '@/components/analytics/AttributionBoot';
import { MedicaoPaginas } from '@/components/analytics/MedicaoPaginas';
import { OutboundTracker } from '@/components/analytics/OutboundTracker';
import { SiteJsonLd } from '@/components/seo/JsonLd';
import type { Idioma } from '@/content/types';

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
 *
 * `idioma` vem do layout do grupo — `(site)` passa `pt`, `(en)` passa `en` — e
 * marca o `lang` de tudo o que está dentro. O `<html lang="pt">` do documento
 * fica: trocá-lo exigiria um layout-raiz por idioma, o que parte o
 * `not-found`/`global-error` da raiz e obriga a recarregar a página a cada
 * troca. O WCAG 3.1.2 (idioma das partes) é cumprido aqui, e o hreflang diz
 * aos motores de busca o que cada URL é.
 *
 * Website v2 (D-50, D-51): `data-v2` liga as cores do logótipo (tokens em
 * `globals.css`); a letra é a Archivo do layout raiz. Saem o cursor
 * próprio, o índice lateral, o grão e o scroll suave: eram da linguagem escura
 * anterior, e o scroll suave ficou fora da escolha de movimento.
 */
export function SiteChrome({ children, idioma }: { children: React.ReactNode; idioma: Idioma }) {
  return (
    <div data-v2 lang={idioma === 'en' ? 'en' : undefined}>
      <SkipLink idioma={idioma} />
      <SiteJsonLd />
      <AttributionBoot />
      <MedicaoPaginas />
      <OutboundTracker />
      <MotionProvider suave={false}>
        <ScrollProgress />
        <PageTransition />
        <TopBar idioma={idioma} />
        <SiteHeader idioma={idioma} />
        <main id="conteudo">{children}</main>
        <SiteFooter idioma={idioma} />
        <MobileCtaBar idioma={idioma} />
      </MotionProvider>
    </div>
  );
}
