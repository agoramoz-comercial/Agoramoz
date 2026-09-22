'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MessageCircle } from 'lucide-react';
import { CTA, SITE } from '@/content/site';

/**
 * Barra de conversão em telemóvel e tablet.
 *
 * Porque existe: um teste de ligações por ecrã mostrou que abaixo de 640px não
 * havia UM único CTA visível — logótipo, hambúrguer, e mais nada. Num site cuja
 * estratégia impõe um CTA primário único, essa era a maior fuga que o site
 * tinha.
 *
 * Três regras de desenho:
 *
 * 1. **Não aparece por cima do hero.** No primeiro ecrã o CTA já lá está, em
 *    tamanho grande; repeti-lo seria ruído. Entra quando o hero sai.
 * 2. **Sai ao chegar ao rodapé**, onde vive o CTA final — duas cópias do mesmo
 *    botão no mesmo ecrã distraem em vez de converter.
 * 3. **Nunca na própria página de diagnóstico**, onde taparia o formulário e
 *    apontaria para onde já se está.
 *
 * Porquê CSS e não GSAP: isto tem dois estados e nada entre eles. Tentei-o
 * primeiro com `quickTo` e depois com `gsap.to` dentro de `useGSAP`, e nos dois
 * casos o contexto revertia a escrita — a barra ficava presa em baixo,
 * confirmado no browser e não suposto. Uma transição de `transform` ligada a um
 * atributo não tem ciclo de vida para correr mal, é composta na GPU na mesma, e
 * continua a funcionar se o GSAP falhar a carregar.
 */
export function MobileCtaBar() {
  const bar = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const hidden = pathname === '/diagnostico';

  useEffect(() => {
    if (hidden) return;
    const el = bar.current;
    if (!el) return;
    if (!window.matchMedia('(max-width: 1023px)').matches) return;

    let shown = false;
    let ticking = false;

    const evaluate = () => {
      ticking = false;
      const y = window.scrollY;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      // Depois do primeiro ecrã, e antes de chegar ao CTA final do rodapé.
      const next = y > window.innerHeight * 0.9 && y < max - window.innerHeight * 0.75;
      if (next === shown) return;
      shown = next;
      el.dataset.shown = String(next);
    };

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(evaluate);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    evaluate();

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [hidden]);

  if (hidden) return null;

  return (
    <div
      ref={bar}
      data-surface="deep"
      data-mobile-cta
      data-shown="false"
      className="fixed inset-x-0 bottom-0 z-[55] border-t border-[color:var(--hairline)] bg-[color:var(--surface)]/95 backdrop-blur-xl lg:hidden"
    >
      <div className="flex items-center gap-2.5 px-4 py-3">
        <Link
          href="/diagnostico"
          className="flex min-h-12 flex-1 items-center justify-center bg-[color:var(--color-signal-600)] px-4 text-center font-display text-[0.9375rem] font-semibold text-white"
        >
          {CTA.primary}
        </Link>
        <a
          href={`https://wa.me/${SITE.whatsapp.e164}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex size-12 shrink-0 items-center justify-center border border-[color:var(--border)] text-[color:var(--on-surface)]"
        >
          <MessageCircle aria-hidden className="size-5" />
          <span className="sr-only">WhatsApp {SITE.whatsapp.display} (abre noutro separador)</span>
        </a>
      </div>
    </div>
  );
}
