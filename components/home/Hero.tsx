'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { gsap, useGSAP, SplitText } from '@/lib/motion/register';
import { DUR, EASE, STAGGER } from '@/lib/motion/tokens';
import { Button } from '@/components/ui/Button';
import { MagneticButton } from '@/components/motion/MagneticButton';
import { CTA } from '@/content/site';

/**
 * Declaração editorial a toda a largura. O título ocupa a linha inteira em
 * vez de uma coluna estreita — é o que permite corpo display grande sem
 * gastar seis linhas e empurrar o CTA para fora do primeiro ecrã.
 *
 * Guarda de LCP: a timeline do H1 arranca em t=0, sem delay, e NÃO espera por
 * document.fonts.ready — o `autoSplit` volta a dividir sozinho quando a fonte
 * assenta, e as métricas de fallback do next/font seguram a caixa.
 */
export function Hero() {
  const scope = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      /**
       * Guarda de LCP: em mobile e tablet o H1 — que É o elemento de LCP —
       * não é dividido. Pinta de imediato e só o resto entra em fade.
       */
      mm.add('(prefers-reduced-motion: reduce), (max-width: 1023px)', () => {
        gsap.set(scope.current!.querySelector('[data-hero-title]'), { autoAlpha: 1 });
        gsap.fromTo(
          scope.current!.querySelectorAll('[data-animate]'),
          { autoAlpha: 0 },
          { autoAlpha: 1, duration: DUR.sm, stagger: STAGGER.tight },
        );
        gsap.set(scope.current!.querySelectorAll('[data-hero-rule]'), { autoAlpha: 1 });
      });

      mm.add('(min-width: 1024px) and (prefers-reduced-motion: no-preference)', () => {
        const heading = scope.current!.querySelector<HTMLHeadingElement>('[data-hero-title]')!;

        const split = SplitText.create(heading, {
          type: 'lines',
          mask: 'lines',
          autoSplit: true,
          aria: 'auto',
          onSplit(self) {
            const tl = gsap.timeline();
            tl.set(heading, { autoAlpha: 1 })
              .from(self.lines, {
                yPercent: 115,
                duration: DUR.sm + 0.2,
                stagger: STAGGER.base,
                ease: 'power4.out',
              })
              .from(
                scope.current!.querySelectorAll('[data-animate]'),
                { autoAlpha: 0, y: 22, duration: DUR.md, stagger: STAGGER.base, ease: EASE.out },
                '-=0.3',
              )
              .from(
                scope.current!.querySelectorAll('[data-hero-rule]'),
                { scaleX: 0, transformOrigin: 'left center', duration: DUR.lg, ease: EASE.inOut },
                '-=0.5',
              );
            return tl;
          },
        });

        return () => split.revert();
      });

      return () => mm.revert();
    },
    { scope },
  );

  return (
    <div ref={scope}>
      <div data-animate className="flex items-baseline gap-4">
        <span className="rule-label text-[color:var(--muted)]">01</span>
        <span className="rule-label text-[color:var(--accent)]">
          Infraestrutura digital para crescimento e produtividade
        </span>
      </div>

      <div data-hero-rule className="mt-6 h-px w-full bg-[color:var(--hairline)]" />

      <h1
        data-hero-title
        data-split
        className="mt-10 max-w-[23ch] text-[length:var(--text-display)] leading-[var(--leading-display)] font-bold tracking-[var(--tracking-display)] opacity-0"
      >
        Transformamos processos lentos e oportunidades perdidas em sistemas digitais.
      </h1>

      <div className="mt-12 grid gap-10 md:grid-cols-12 md:gap-8">
        <p data-animate className="text-[length:var(--text-lead)] text-[color:var(--muted)] md:col-span-7">
          A AGORAMOZ desenvolve websites avançados, software, automações e agentes de IA adaptados
          aos processos da sua empresa — desde o primeiro contacto comercial até à operação e à
          análise de resultados.
        </p>

        <div data-animate className="flex flex-col gap-4 md:col-span-5 md:items-end">
          <div className="flex flex-col gap-3 sm:flex-row md:justify-end">
            <MagneticButton>
              <Button asChild size="lg">
                <Link href="/diagnostico">
                  {CTA.primary}
                  <span aria-hidden className="transition-transform duration-300 group-hover:translate-x-1">
                    →
                  </span>
                </Link>
              </Button>
            </MagneticButton>
            <Button asChild size="lg" variant="outline">
              <Link href="#setores">Explorar por setor</Link>
            </Button>
          </div>
          <p className="rule-label text-[color:var(--muted)] md:text-right">
            Conversa objetiva · Problema definido · Próximos passos claros
          </p>
        </div>
      </div>
    </div>
  );
}
