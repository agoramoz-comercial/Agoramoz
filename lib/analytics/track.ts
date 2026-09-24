'use client';

import { derivarCanal } from '@/lib/attribution/channel';
import { sanitizarCaminho } from '@/lib/attribution/sanitize';
import { lerAtribuicao } from '@/lib/attribution/storage';
import { EVENTOS_DE_BROWSER, type AnalyticsEvent } from './events';

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
  }
}

const DE_BROWSER = new Set<string>(EVENTOS_DE_BROWSER);

/**
 * Um único ponto de saída, agora com destino.
 *
 * Até aqui isto escrevia em `window.dataLayer` e **nada o lia** — não havia
 * GTM instalado nem qualquer outro consumidor. Os eventos morriam com o
 * separador.
 *
 * O destino é de primeira parte: `POST /api/eventos`, uma tabela na nossa
 * base. A alternativa era GA4 por GTM, e foi recusada por três razões
 * concretas, não por preferência:
 *
 *  · o CSP tem `connect-src 'self'` e `script-src` sem terceiros, e está a
 *    caminho de deixar de ser só relatório. GA4 obrigava a reabri-lo.
 *  · `/privacidade` promete hoje que a medição «é agregada e não identifica
 *    visitantes individualmente». GA4 traz cookies e obrigava a reescrever
 *    essa frase e a pôr um banner.
 *  · e a decisiva: o pedido é um painel que ligue perfil, website, diagnóstico
 *    e CRM. Isso é uma junção, e uma junção precisa dos dois lados na mesma
 *    base. O GA4 nunca saberia se o negócio fechou.
 *
 * `window.dataLayer` mantém-se: custa uma linha e deixa a porta do GTM aberta
 * se um dia esses custos forem aceitáveis.
 *
 * **Não existe identificador de visitante.** Sem cookie, sem `visitor_id`, sem
 * identificador de sessão. A junção ao CRM faz-se por CANAL, que já está na
 * `response_attribution` e na `deals`. É menos granular — não se segue uma
 * pessoa — e é a única leitura que mantém verdadeira a frase já publicada.
 */
export function track(event: AnalyticsEvent) {
  if (typeof window === 'undefined') return;

  const { name, ...params } = event;
  window.dataLayer = window.dataLayer ?? [];
  window.dataLayer.push({ event: name, ...params });

  if (process.env.NODE_ENV !== 'production') {
    console.debug('[analytics]', name, params);
  }

  // Os eventos de servidor nascem em gatilhos da base. Se um chegasse aqui,
  // seria um erro de programação — e enviá-lo criaria uma contagem dupla.
  if (!DE_BROWSER.has(name)) return;

  // O Global Privacy Control é um pedido explícito de quem visita. Uma linha.
  if ((navigator as { globalPrivacyControl?: boolean }).globalPrivacyControl === true) return;

  try {
    const atribuicao = lerAtribuicao();
    const corpo = JSON.stringify({
      evento: event,
      channel: derivarCanal(atribuicao),
      campaign: atribuicao?.utm_campaign ?? null,
      path: sanitizarCaminho(window.location.pathname),
    });

    /**
     * `sendBeacon` e não `fetch`: sobrevive à navegação. Um
     * `gbp_landing_view` seguido de um clique imediato perder-se-ia com um
     * `fetch` normal, e é precisamente a visita mais interessante de medir.
     */
    const blob = new Blob([corpo], { type: 'application/json' });
    if (!navigator.sendBeacon?.('/api/eventos', blob)) {
      void fetch('/api/eventos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: corpo,
        keepalive: true,
      }).catch(() => {
        /* A medição nunca estraga a experiência de quem está a usar o site. */
      });
    }
  } catch {
    /* idem */
  }
}
