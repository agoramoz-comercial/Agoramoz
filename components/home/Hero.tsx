'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { gsap, useGSAP, SplitText } from '@/lib/motion/register';
import { DUR, EASE, STAGGER } from '@/lib/motion/tokens';
import { Button } from '@/components/ui/Button';
import { MagneticButton } from '@/components/motion/MagneticButton';
import { ContourField } from '@/components/ui/ContourField';
import { DitherMark } from '@/components/ui/DitherMark';
import { CTA } from '@/content/site';

/**
 * Declaração a toda a largura sobre malha de contorno. O título ocupa a linha
 * inteira em vez de uma coluna estreita — é o que permite corpo display grande
 * sem gastar seis linhas e empurrar o CTA para fora do primeiro ecrã.
 *
 * Guarda de LCP: a timeline do H1 arranca em t=0, sem delay, e NÃO espera por
 * document.fonts.ready — o `autoSplit` volta a dividir sozinho quando a fonte
 * assenta, e as métricas de fallback do next/font seguram a caixa. O crómio do
 * H1 é CSS puro, pelo que não acrescenta um único milissegundo ao LCP.
 */
export function Hero() {
  const scope = useRef<HTMLDivElement>(null);
  const field = useRef<HTMLDivElement>(null);

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
            /**
             * O crómio tem de viajar para as linhas.
             * `background-clip: text` recorta ao texto pintado no próprio
             * elemento; quando o SplitText mete cada linha dentro de um
             * wrapper transformado, essa linha passa a ser composta à parte e
             * o recorte do H1 deixa de a alcançar — o título desaparece. Com
             * a classe em cada linha, cada uma traz o seu gradiente, e a
             * rampa reinicia por linha, o que dá o efeito de bandas de metal
             * escovado da referência.
             */
            const lines = self.lines as HTMLElement[];
            lines.forEach((line) => line.classList.add('chrome-text'));

            /**
             * Sem varrimento no título, por medição.
             * Animar `--chrome-pos` num gradiente recortado ao texto repinta a
             * máscara a cada frame. No título — três linhas a ocupar meio ecrã
             * — isso custava ~155 ms de LCP quando corria na janela crítica e,
             * depois de adiado, duas a seis tarefas longas durante o scroll. O
             * gradiente estático já dá o metal escovado; o brilho a mexer fica
             * reservado ao wordmark, que tem cem por vinte píxeis e não custa
             * nada.
             */
            const tl = gsap.timeline();
            tl.set(heading, { autoAlpha: 1 })
              .from(self.lines, {
                yPercent: 115,
                duration: DUR.sm + 0.2,
                stagger: STAGGER.base,
                ease: 'power4.out',
              })
              /**
               * O parágrafo de entrada é o elemento de LCP desta página, e só
               * pinta quando esta revelação começa. Esperar pelo fim do
               * stagger do título atrasava-o ~250 ms sem nada ganhar: entra
               * agora quase em paralelo, com o título apenas um passo à
               * frente. A camada de leitura mantém-se, o tempo até ao
               * conteúdo maior não.
               */
              .from(
                scope.current!.querySelectorAll('[data-animate]'),
                { autoAlpha: 0, y: 22, duration: DUR.md, stagger: STAGGER.base, ease: EASE.out },
                '-=0.55',
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

      /**
       * Parallax de ponteiro sobre a malha. `quickTo` reutiliza um único tween
       * em vez de criar um por evento, e só liga onde há rato mesmo — num
       * ecrã tátil isto seria peso morto. A deriva contínua da malha vive no
       * `<g>` interior, em CSS: cada transformação tem o seu elemento, para
       * que nunca se pisem.
       */
      mm.add(
        '(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)',
        () => {
          const el = field.current;
          if (!el) return;

          const xTo = gsap.quickTo(el, 'x', { duration: 0.9, ease: EASE.soft });
          const yTo = gsap.quickTo(el, 'y', { duration: 0.9, ease: EASE.soft });

          const onMove = (e: PointerEvent) => {
            xTo((e.clientX / window.innerWidth - 0.5) * -38);
            yTo((e.clientY / window.innerHeight - 0.5) * -22);
          };

          window.addEventListener('pointermove', onMove, { passive: true });
          return () => {
            window.removeEventListener('pointermove', onMove);
            gsap.set(el, { x: 0, y: 0 });
          };
        },
      );

      return () => mm.revert();
    },
    { scope },
  );

  return (
    <div ref={scope} className="relative">
      <div ref={field} className="pointer-events-none absolute -inset-x-[4%] -inset-y-[14%] -z-10 overflow-hidden">
        <ContourField rows={7} />
      </div>

      <div data-animate className="flex items-baseline gap-4">
        <span className="rule-label text-[color:var(--muted)]">01</span>
        <DitherMark size="sm" className="self-center" />
        <span className="rule-label text-[color:var(--accent)]">
          Infraestrutura digital para crescimento e produtividade
        </span>
      </div>

      <div data-hero-rule className="mt-6 h-px w-full bg-[color:var(--hairline)]" />

      <h1
        data-hero-title
        data-split
        className="chrome-text mt-10 max-w-[23ch] text-[length:var(--text-display)] leading-[var(--leading-display)] font-bold tracking-[var(--tracking-display)] opacity-0"
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
          {/* Envolve em vez de transbordar: os dois CTA lado a lado não cabem
              em cinco colunas a nenhuma largura, e antes desbordavam para
              cima do parágrafo à esquerda. */}
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap md:justify-end">
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
              <Link href="#setores">Explorar soluções por setor</Link>
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
