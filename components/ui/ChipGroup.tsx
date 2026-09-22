'use client';

import { useId, useRef } from 'react';
import { cn } from '@/lib/utils/cn';

export type ChipOption = { value: string; label: string; hint?: string };

/**
 * Radiogroup com roving tabindex. Não avança sozinho ao selecionar
 * (WCAG 3.2.2 On Input) — o utilizador carrega em "Continuar".
 */
export function ChipGroup({
  legend,
  options,
  value,
  onChange,
  columns = 2,
  className,
}: {
  legend: string;
  options: ChipOption[];
  value: string | null;
  onChange: (value: string) => void;
  columns?: 1 | 2 | 3;
  className?: string;
}) {
  const name = useId();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  function onKeyDown(e: React.KeyboardEvent, index: number) {
    const keys = ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'Home', 'End'];
    if (!keys.includes(e.key)) return;
    e.preventDefault();

    let next = index;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (index + 1) % options.length;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (index - 1 + options.length) % options.length;
    if (e.key === 'Home') next = 0;
    if (e.key === 'End') next = options.length - 1;

    refs.current[next]?.focus();
    const opt = options[next];
    if (opt) onChange(opt.value);
  }

  const activeIndex = Math.max(0, options.findIndex((o) => o.value === value));

  return (
    <fieldset className={cn('min-w-0 border-0 p-0', className)}>
      <legend className="sr-only">{legend}</legend>
      <div
        role="radiogroup"
        aria-label={legend}
        className={cn(
          'grid gap-2.5',
          columns === 1 && 'grid-cols-1',
          columns === 2 && 'grid-cols-1 sm:grid-cols-2',
          columns === 3 && 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
        )}
      >
        {options.map((opt, i) => {
          const checked = value === opt.value;
          return (
            <button
              key={opt.value}
              ref={(el) => {
                refs.current[i] = el;
              }}
              type="button"
              role="radio"
              aria-checked={checked}
              tabIndex={i === activeIndex ? 0 : -1}
              name={name}
              onClick={() => onChange(opt.value)}
              onKeyDown={(e) => onKeyDown(e, i)}
              className={cn(
                'min-h-12 border px-4 py-3 text-left text-[0.9375rem] transition-colors duration-300',
                checked
                  ? 'border-[color:var(--color-signal-600)] bg-[color:var(--color-signal-600)] text-white'
                  : 'border-[color:var(--border)] bg-transparent hover:border-[color:var(--on-surface)]',
              )}
            >
              <span className="block font-medium">{opt.label}</span>
              {opt.hint && (
                <span className={cn('mt-0.5 block text-sm', checked ? 'text-white/80' : 'text-[color:var(--muted)]')}>
                  {opt.hint}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
