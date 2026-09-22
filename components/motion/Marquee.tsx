'use client';

import { useRef } from 'react';
import { gsap, useGSAP, ScrollTrigger } from '@/lib/motion/register';
import { cn } from '@/lib/utils/cn';

/**
 * Marquee infinito. O conteúdo é duplicado no markup e a translação é
 * envolvida com `gsap.utils.wrap` via `modifiers` — sem isto haveria um salto
 * visível a cada volta.
 *
 * A velocidade reage à direção e à velocidade do scroll. A cópia é
 * `aria-hidden`: para um leitor de ecrã a lista existe uma única vez.
 */
export function Marquee({
  items,
  className,
  speed = 28,
}: {
  items: string[];
  className?: string;
  speed?: number;
}) {
  const scope = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add('(prefers-reduced-motion: no-preference)', () => {
        const tracks = gsap.utils.toArray<HTMLElement>('[data-marquee-track]', scope.current);
        if (!tracks.length) return;

        const loop = gsap.to(tracks, {
          xPercent: -100,
          repeat: -1,
          duration: speed,
          ease: 'none',
          modifiers: { xPercent: gsap.utils.wrap(-100, 0) },
        });

        const st = ScrollTrigger.create({
          onUpdate: (self) => {
            const v = gsap.utils.clamp(-4, 4, self.getVelocity() / 500);
            gsap.to(loop, { timeScale: 1 + Math.abs(v), duration: 0.4, overwrite: true });
          },
        });

        return () => {
          st.kill();
          loop.kill();
        };
      });

      return () => mm.revert();
    },
    { scope },
  );

  return (
    <div
      ref={scope}
      className={cn('relative flex overflow-hidden select-none', className)}
      style={{
        maskImage: 'linear-gradient(to right, transparent, #000 8%, #000 92%, transparent)',
      }}
    >
      {[0, 1].map((copy) => (
        <ul
          key={copy}
          data-marquee-track
          aria-hidden={copy === 1 || undefined}
          className="flex shrink-0 items-center gap-10 pr-10 will-change-transform"
        >
          {items.map((item) => (
            <li
              key={item}
              className="rule-label flex shrink-0 items-center gap-10 text-[color:var(--muted)]"
            >
              {item}
              <span aria-hidden className="size-1 bg-[color:var(--accent)]" />
            </li>
          ))}
        </ul>
      ))}
    </div>
  );
}
