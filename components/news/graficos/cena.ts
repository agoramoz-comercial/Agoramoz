'use client';

import { useEffect, useState, type RefObject } from 'react';

/**
 * As regras das cenas WebGL do News (as mesmas do carrossel da página
 * inicial, commit ac96c4c): a cena só existe perto do ecrã; nos ecrãs tácteis
 * desmonta-se quando fica longe, para devolver a memória da GPU; resolução
 * mais baixa no telemóvel; com movimento reduzido, não há cena.
 */

export function ecraTactil(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;
}

/** `true` quando o elemento está a ~1 ecrã de distância (e, no táctil, `false` de novo a ~2,5 ecrãs). */
export function usePerto(ref: RefObject<HTMLElement | null>): boolean {
  const [perto, setPerto] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      queueMicrotask(() => setPerto(true));
      return;
    }
    const entrar = new IntersectionObserver((e) => e.some((x) => x.isIntersecting) && setPerto(true), {
      rootMargin: '100% 0px',
    });
    const sair = ecraTactil()
      ? new IntersectionObserver((e) => e.every((x) => !x.isIntersecting) && setPerto(false), {
          rootMargin: '250% 0px',
        })
      : null;
    entrar.observe(el);
    sair?.observe(el);
    return () => {
      entrar.disconnect();
      sair?.disconnect();
    };
  }, [ref]);
  return perto;
}

/** `null` até se saber (no servidor e no primeiro desenho), depois o valor real. */
export function useMovimentoReduzido(): boolean | null {
  const [reduzido, setReduzido] = useState<boolean | null>(null);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const ler = () => setReduzido(mq.matches || document.documentElement.dataset.motion === 'reduced');
    queueMicrotask(ler);
    mq.addEventListener('change', ler);
    return () => mq.removeEventListener('change', ler);
  }, []);
  return reduzido;
}

/** Há WebGL? (Sem ele, fica a alternativa estática.) */
export function temWebGL(): boolean {
  try {
    const c = document.createElement('canvas');
    return Boolean(c.getContext('webgl2') ?? c.getContext('webgl'));
  } catch {
    return false;
  }
}

/** Pára o desenho quando o separador está escondido ou o canvas fora do ecrã. */
export function observarVisivel(el: Element, aoMudar: (visivel: boolean) => void): () => void {
  let noEcra = true;
  const avisar = () => aoMudar(noEcra && document.visibilityState === 'visible');
  const io = new IntersectionObserver((e) => {
    noEcra = e.some((x) => x.isIntersecting);
    avisar();
  });
  io.observe(el);
  document.addEventListener('visibilitychange', avisar);
  return () => {
    io.disconnect();
    document.removeEventListener('visibilitychange', avisar);
  };
}
