'use client';

import { useRef, useState } from 'react';
import { gsap, useGSAP, ScrollTrigger } from '@/lib/motion/register';

type Entry = { id: string };

/**
 * Rail de índice fixo. Lê as secções do próprio DOM (`[data-section-index]`)
 * em vez de duplicar a lista — assim não pode divergir da página.
 *
 * É decorativo: a navegação real está no header e no footer, e o conteúdo é
 * acessível sem ele. Por isso fica `aria-hidden` e só aparece em ecrãs largos,
 * onde há margem para o acomodar sem comprimir a coluna de texto.
 */
export function SectionIndex() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [active, setActive] = useState(0);
  const scope = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const mm = gsap.matchMedia();

    mm.add('(min-width: 1280px)', () => {
      const nodes = gsap.utils.toArray<HTMLElement>('[data-section-index]');
      const list: Entry[] = nodes.map((el, i) => ({ id: el.id || `sec-${i}` }));
      setEntries(list);

      const triggers = nodes.map((el, i) =>
        ScrollTrigger.create({
          trigger: el,
          start: 'top 45%',
          end: 'bottom 45%',
          onToggle: (self) => self.isActive && setActive(i),
        }),
      );

      return () => {
        triggers.forEach((t) => t.kill());
        setEntries([]);
      };
    });

    return () => mm.revert();
  }, []);

  if (!entries.length) return null;

  return (
    <div
      ref={scope}
      aria-hidden
      className="pointer-events-none fixed top-1/2 left-2.5 z-40 hidden -translate-y-1/2 xl:block"
    >
      <ul className="flex flex-col text-[color:var(--on-surface)] mix-blend-difference">
        {entries.map((e, i) => (
          <li key={e.id} className="flex h-2.5 items-center">
            <span
              className="block h-px transition-all duration-500 ease-out"
              style={{
                width: i === active ? 22 : 9,
                background: i === active ? 'var(--color-signal-500)' : 'currentColor',
                opacity: i === active ? 1 : 0.28,
              }}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
