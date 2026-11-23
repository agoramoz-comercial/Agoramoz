'use client';

import { useEffect } from 'react';
import { carregarCal } from '@/components/v3/CalendarioCal';

/**
 * Aquece o calendário do Cal.com antes de a pessoa chegar a /marcar.
 *
 * Ao primeiro sinal de intenção — rato por cima, foco ou toque numa ligação
 * para /marcar — liga-se ao Cal.com e pede-lhe o «preload» do evento: o Cal
 * carrega o calendário num iframe escondido e o browser guarda os ficheiros.
 * Na página de marcação, o calendário abre a partir da cache.
 *
 * Em /diagnostico (quem acaba o diagnóstico é quem marca) aquece quando o
 * browser fica livre. Uma vez por visita; nunca com «poupança de dados».
 */
export function PreCarregarCal({ calLink, embedOrigin }: { calLink: string; embedOrigin: string }) {
  useEffect(() => {
    const ligacao = navigator as Navigator & { connection?: { saveData?: boolean } };
    if (ligacao.connection?.saveData) return;
    let feito = false;
    const aquecer = () => {
      if (feito || (window as Window & { __calAquecido?: boolean }).__calAquecido) return;
      feito = true;
      (window as Window & { __calAquecido?: boolean }).__calAquecido = true;
      try {
        const Cal = carregarCal(`${embedOrigin}/embed/embed.js`);
        Cal('init', { origin: embedOrigin });
        Cal('preload', { calLink });
      } catch {
        /* aquecer é opcional: a página de marcação funciona sem isto */
      }
    };
    const eMarcar = (e: Event) => {
      const a = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
      if (a && /\/marcar\/?$/.test(new URL(a.href, location.href).pathname)) aquecer();
    };
    document.addEventListener('pointerover', eMarcar, { passive: true });
    document.addEventListener('focusin', eMarcar);
    document.addEventListener('touchstart', eMarcar, { passive: true });
    let idle = 0;
    if (/\/diagnostico\/?$/.test(location.pathname)) {
      const ric = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
      idle = ric ? ric(aquecer, { timeout: 4000 }) : window.setTimeout(aquecer, 2500);
    }
    return () => {
      document.removeEventListener('pointerover', eMarcar);
      document.removeEventListener('focusin', eMarcar);
      document.removeEventListener('touchstart', eMarcar);
      if (idle) {
        const cic = (window as Window & { cancelIdleCallback?: (id: number) => void }).cancelIdleCallback;
        if (cic) cic(idle);
        else window.clearTimeout(idle);
      }
    };
  }, [calLink, embedOrigin]);
  return null;
}
