/** Condições únicas do projeto. Qualquer módulo de secção lê daqui. */
export const MM_CONDITIONS = {
  isDesktop: '(min-width: 1024px)',
  isMobile: '(max-width: 1023px)',
  reduce: '(prefers-reduced-motion: reduce)',
} as const;

export type MotionConditions = {
  isDesktop?: boolean;
  isMobile?: boolean;
  reduce?: boolean;
};
