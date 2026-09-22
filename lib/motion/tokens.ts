import { gsap } from 'gsap';

/** Escala de movimento do projeto. Nenhum valor arbitrário fora daqui. */
export const DUR = { xs: 0.2, sm: 0.35, md: 0.6, lg: 0.9, xl: 1.4 } as const;

export const EASE = {
  out: 'power2.out',
  in: 'power2.in',
  inOut: 'power3.inOut',
  soft: 'sine.inOut',
  pop: 'back.out(1.7)',
  /** Obrigatório em scrub e containerAnimation. */
  none: 'none',
} as const;

export const DIST = { sm: 16, md: 32, lg: 64, xl: 120 } as const;
export const STAGGER = { tight: 0.04, base: 0.08, loose: 0.14 } as const;

export const DEV = process.env.NODE_ENV !== 'production';

export function applyMotionDefaults() {
  gsap.defaults({ duration: DUR.md, ease: EASE.out });
}
