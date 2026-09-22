import { gsap } from 'gsap';
import { DIST, DUR, EASE, STAGGER } from './tokens';

/**
 * Vocabulário partilhado. `registerReducedMotionEffects` regista os MESMOS
 * nomes sem deslocação, pelo que os módulos de secção não precisam de saber
 * em que modo estão — trocamos o vocabulário, não o código que o usa.
 */
export function registerMotionEffects() {
  gsap.registerEffect({
    name: 'revealUp',
    extendTimeline: true,
    defaults: { duration: DUR.md, distance: DIST.md, stagger: STAGGER.base },
    effect: (targets: gsap.TweenTarget, cfg: { duration: number; distance: number; stagger: number }) =>
      gsap.from(targets, {
        autoAlpha: 0,
        y: cfg.distance,
        duration: cfg.duration,
        stagger: cfg.stagger,
        ease: EASE.out,
      }),
  });

  gsap.registerEffect({
    name: 'fadeIn',
    extendTimeline: true,
    defaults: { duration: DUR.sm, stagger: 0 },
    effect: (targets: gsap.TweenTarget, cfg: { duration: number; stagger: number }) =>
      gsap.from(targets, { autoAlpha: 0, duration: cfg.duration, stagger: cfg.stagger, ease: EASE.out }),
  });

  gsap.registerEffect({
    name: 'wipeIn',
    extendTimeline: true,
    defaults: { duration: DUR.lg, stagger: STAGGER.base },
    effect: (targets: gsap.TweenTarget, cfg: { duration: number; stagger: number }) =>
      gsap.from(targets, {
        autoAlpha: 0,
        clipPath: 'inset(0% 0% 100% 0%)',
        duration: cfg.duration,
        stagger: cfg.stagger,
        ease: EASE.inOut,
      }),
  });
}

/** Mesmos nomes, sem deslocação: o movimento narrativo desaparece, o conteúdo não. */
export function registerReducedMotionEffects() {
  const fade = {
    extendTimeline: true,
    defaults: { duration: DUR.xs, stagger: 0 },
    effect: (targets: gsap.TweenTarget) => gsap.from(targets, { autoAlpha: 0, duration: DUR.xs }),
  };
  gsap.registerEffect({ name: 'revealUp', ...fade });
  gsap.registerEffect({ name: 'fadeIn', ...fade });
  gsap.registerEffect({ name: 'wipeIn', ...fade });
}
