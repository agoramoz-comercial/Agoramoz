'use client';

/** Lê a direcção real do texto (o atributo `dir` pode vir de um antepassado). */
export function ehRtl(el: Element | null): boolean {
  if (!el || typeof window === 'undefined') return false;
  return window.getComputedStyle(el).direction === 'rtl';
}

export const SEM_MOVIMENTO = '(prefers-reduced-motion: reduce)';
export const COM_MOVIMENTO = '(prefers-reduced-motion: no-preference)';
export const PONTEIRO_FINO = '(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)';
