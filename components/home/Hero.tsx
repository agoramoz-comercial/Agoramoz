'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { gsap, useGSAP, SplitText } from '@/lib/motion/register';
import { DUR, EASE, STAGGER } from '@/lib/motion/tokens';
import { Button } from '@/components/ui/Button';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { CTA } from '@/content/site';

/**
 * Guarda de LCP: a timeline do H1 arranca em t=0, sem delay, e NÃO espera por
 * document.fonts.ready — o `autoSplit` do SplitText volta a dividir sozinho
 * quando a fonte assenta, e as métricas de fallback do next/font seguram a
 * caixa. A primeira linha fica legível em ~0,4 s.
 */
export function Hero() {
  const scope = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add('(prefers-reduced-motion: reduce)', () => {
        gsap.set(scope.current!.querySelectorAll('[data-animate]'), { autoAlpha: 1 });
      });

      mm.add('(prefers-reduced-motion: no-preference)', () => {
        const heading = scope.current!.querySelector<HTMLHeadingElement>('[data-hero-title]')!;

        const split = SplitText.create(heading, {
          type: 'lines',
          mask: 'lines',
          autoSplit: true,
          linesClass: 'hero-line',
          onSplit(self) {
            const tl = gsap.timeline();
            tl.set(heading, { autoAlpha: 1 })
              .from(self.lines, {
                yPercent: 110,
                duration: DUR.sm + 0.15,
                stagger: STAGGER.base,
                ease: EASE.out,
              })
              .from(
                scope.current!.querySelectorAll('[data-animate]'),
                { autoAlpha: 0, y: 24, duration: DUR.md, stagger: STAGGER.base, ease: EASE.out },
                '-=0.25',
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
      <Eyebrow data-animate className="mb-6">
        Infraestrutura digital para crescimento e produtividade
      </Eyebrow>

      <h1
        data-hero-title
        className="text-[length:var(--text-display)] leading-[var(--leading-display)] tracking-[var(--tracking-display)] opacity-0"
      >
        Transformamos processos lentos e oportunidades perdidas em sistemas digitais.
      </h1>

      <p data-animate className="mt-6 max-w-[40rem] text-[length:var(--text-lead)] text-[color:var(--muted)]">
        A AGORAMOZ desenvolve websites avançados, software, automações e agentes de IA adaptados aos
        processos da sua empresa — desde o primeiro contacto comercial até à operação e à análise de
        resultados.
      </p>

      <div data-animate className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Button asChild size="lg">
          <Link href="/diagnostico">{CTA.primary}</Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href="#setores">Explorar soluções por setor</Link>
        </Button>
      </div>

      <p data-animate className="mt-6 font-mono text-[length:var(--text-micro)] text-[color:var(--muted)]">
        Conversa objetiva. Problema definido. Próximos passos claros.
      </p>
    </div>
  );
}
