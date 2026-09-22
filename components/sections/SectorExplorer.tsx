'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { gsap, useGSAP, Flip } from '@/lib/motion/register';
import { DUR, EASE } from '@/lib/motion/tokens';
import { COUNTRIES, COUNTRY_CODES, getSectorsForCountry } from '@/content/registry';
import type { CountryCode } from '@/content/types';
import { track } from '@/lib/analytics/track';
import { cn } from '@/lib/utils/cn';

/** Filtro por país em vez dos 15 setores em simultâneo (§7 do documento). */
export function SectorExplorer({ initial = 'mz' }: { initial?: CountryCode }) {
  const [active, setActive] = useState<CountryCode>(initial);
  const grid = useRef<HTMLUListElement>(null);

  const { contextSafe } = useGSAP({ scope: grid });

  // Falso positivo do React Compiler. `contextSafe` é o padrão documentado do
  // @gsap/react: é chamado durante o render, mas o callback que devolve só
  // corre em resposta a um evento do utilizador — nunca durante o render. A
  // alternativa (guardar o handler num ref) capturaria estado obsoleto, o que
  // seria um bug a sério em troca de silenciar um aviso.
  // eslint-disable-next-line react-hooks/refs
  const select = contextSafe((code: CountryCode) => {
    if (code === active) return;
    const cards = grid.current?.querySelectorAll('[data-sector-card]');
    const state = cards ? Flip.getState(cards) : null;
    setActive(code);
    track({ name: 'country_selected', country: code, surface: 'sector-explorer' });

    requestAnimationFrame(() => {
      if (state) Flip.from(state, { duration: DUR.sm, ease: EASE.inOut, absolute: true, nested: true });
      gsap.fromTo(
        grid.current!.querySelectorAll('[data-sector-card]'),
        { autoAlpha: 0, y: 14 },
        { autoAlpha: 1, y: 0, duration: DUR.sm, stagger: 0.04, ease: EASE.out },
      );
    });
  }) as (code: CountryCode) => void;

  return (
    <div className="mt-10">
      <div role="tablist" aria-label="Filtrar setores por país" className="flex flex-wrap gap-2">
        {COUNTRY_CODES.map((code) => (
          <button
            key={code}
            role="tab"
            type="button"
            aria-selected={active === code}
            onClick={() => select(code)}
            className={cn(
              'min-h-11 rounded-full border px-5 text-[0.9375rem] transition-colors',
              active === code
                ? 'border-[color:var(--accent)] bg-[color:var(--color-cta)] text-white'
                : 'border-[color:var(--border)] hover:border-[color:var(--accent)]',
            )}
          >
            {COUNTRIES[code].name}
          </button>
        ))}
      </div>

      <ul ref={grid} className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {getSectorsForCountry(active).map((s) => (
          <li key={s.sector} data-sector-card>
            <Link
              href={s.href}
              className="group flex h-full flex-col justify-between rounded-[--radius-lg] border border-[color:var(--border)] bg-[color:var(--surface-raised)] p-6 transition-colors hover:border-[color:var(--accent)]"
            >
              <div>
                <h3 className="font-display text-[1.0625rem] font-semibold">{s.label}</h3>
                {!s.published && (
                  <p className="mt-2 text-sm text-[color:var(--muted)]">
                    Página em preparação. O diagnóstico cobre este setor na mesma.
                  </p>
                )}
              </div>
              <span className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-[color:var(--accent)]">
                {s.published ? 'Ver solução' : 'Solicitar diagnóstico'}
                <ArrowRight aria-hidden className="size-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
