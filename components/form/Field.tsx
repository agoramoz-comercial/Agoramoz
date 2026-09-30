'use client';

import { useId } from 'react';
import { cn } from '@/lib/utils/cn';
import { FORM } from '@/content/i18n/formulario';
import type { Idioma } from '@/content/types';
import { t } from '@/lib/i18n/texto';

/** Label real sempre — o placeholder nunca faz de label. */
export function Field({
  label,
  hint,
  error,
  required,
  children,
  className,
  idioma = 'pt',
}: {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: (props: { id: string; describedBy?: string; invalid: boolean }) => React.ReactNode;
  className?: string;
  /** Só muda a marca «(opcional)». */
  idioma?: Idioma;
}) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={cn('min-w-0', className)}>
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
        {required && <span className="ml-1 text-[color:var(--accent)]" aria-hidden>*</span>}
        {!required && <span className="ml-2 text-[color:var(--muted)]">{t(FORM.opcional, idioma)}</span>}
      </label>
      {hint && (
        <p id={hintId} className="mt-1 text-[length:var(--text-micro)] text-[color:var(--muted)]">
          {hint}
        </p>
      )}
      <div className="mt-2">{children({ id, describedBy, invalid: Boolean(error) })}</div>
      {error && (
        /* `--signal` e não `--color-signal-600`: o token segue a superfície. O
           600 fixo dava 4,13:1 sobre o fundo escuro do diagnóstico (axe). */
        <p id={errorId} className="mt-1.5 text-sm text-[color:var(--signal)]">
          {error}
        </p>
      )}
    </div>
  );
}

export const inputClass =
  'w-full min-h-11 rounded-[--radius-sm] border border-[color:var(--border)] bg-[color:var(--surface)] px-3.5 py-2.5 text-[0.9375rem] text-[color:var(--on-surface)] placeholder:text-[color:var(--muted)] aria-[invalid=true]:border-[color:var(--color-signal-600)]';
