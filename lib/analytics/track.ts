'use client';

import type { AnalyticsEvent } from './events';

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
  }
}

/**
 * Um único ponto de saída. Sem provider instalado nesta fase: escreve em
 * window.dataLayer (que o GTM consome, se e quando for adicionado) e, em
 * desenvolvimento, na consola. Trocar para GA4/Plausible é editar esta função.
 */
export function track(event: AnalyticsEvent) {
  if (typeof window === 'undefined') return;

  const { name, ...params } = event;
  window.dataLayer = window.dataLayer ?? [];
  window.dataLayer.push({ event: name, ...params });

  if (process.env.NODE_ENV !== 'production') {
    console.debug('[analytics]', name, params);
  }
}
