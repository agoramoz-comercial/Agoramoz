'use client';

import { useCallback, useSyncExternalStore } from 'react';

const KEY = 'agoramoz:motion';
const EVENT = 'agoramoz:motion-change';

function read(): boolean {
  try {
    return localStorage.getItem(KEY) === 'reduced';
  } catch {
    // Janela privada ou dados de site bloqueados.
    return false;
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  window.addEventListener('storage', onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener('storage', onChange);
  };
}

/**
 * A maioria das pessoas não sabe que a preferência de sistema existe. Este
 * interruptor escreve data-motion="reduced" na raiz, que o CSS e o GSAP leem
 * como equivalente a prefers-reduced-motion.
 *
 * useSyncExternalStore em vez de useEffect + setState: o localStorage é uma
 * fonte externa, e este hook lê-a sem provocar um render em cascata depois da
 * hidratação. O snapshot do servidor é sempre `false`, que é o valor com que
 * o HTML é gerado.
 */
export function MotionToggle() {
  const reduced = useSyncExternalStore(subscribe, read, () => false);

  const toggle = useCallback(() => {
    const next = !read();
    try {
      if (next) localStorage.setItem(KEY, 'reduced');
      else localStorage.removeItem(KEY);
    } catch {
      // A preferência não persiste, mas a sessão atual respeita-a na mesma.
    }
    if (next) document.documentElement.dataset.motion = 'reduced';
    else delete document.documentElement.dataset.motion;
    window.dispatchEvent(new Event(EVENT));
  }, []);

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={reduced}
      className="inline-flex min-h-11 items-center gap-2 rounded-xs text-[length:var(--text-micro)] text-[color:var(--muted)] transition-colors hover:text-[color:var(--on-surface)]"
    >
      <span
        aria-hidden
        data-on={reduced}
        className="relative inline-block h-4 w-7 rounded-full border border-[color:var(--border)] transition-colors data-[on=true]:bg-[color:var(--accent)]"
      >
        <span
          data-on={reduced}
          className="absolute top-0.5 left-0.5 size-2.5 rounded-full bg-current transition-transform data-[on=true]:translate-x-3"
        />
      </span>
      Reduzir movimento
    </button>
  );
}
