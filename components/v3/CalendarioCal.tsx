'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { preconnect, preload } from 'react-dom';
import type { Idioma } from '@/content/types';

/**
 * O calendário do Cal.com (embed inline oficial) dentro de um painel de vidro
 * líquido. Não há dependência npm: é o carregador oficial do Cal
 * (`/embed/embed.js`), o mesmo que o snippet «Embed → Inline» gera.
 *
 * - Tema escuro e cores AGORAMOZ por `cssVarsPerTheme` (âmbar como cor da
 *   marca, fundo transparente para o vidro se ler, texto papel).
 * - Nome e e-mail vêm do FRAGMENTO do URL (`#name=…&email=…`, o botão do
 *   e-mail do enquadramento): o fragmento não chega a servidor nenhum. São
 *   validados e cortados aqui e nunca registados.
 * - Enquanto o Cal não responde, um esqueleto; se não responder em 15 s (rede
 *   bloqueada, bloqueador de anúncios), a ligação directa para o Cal.com.
 */

type CalApi = ((...args: unknown[]) => void) & {
  loaded?: boolean;
  ns: Record<string, (...args: unknown[]) => void>;
  q?: unknown[];
};

declare global {
  interface Window {
    Cal?: CalApi;
  }
}

/** O carregador oficial do Cal (snippet «Inline embed»), em TypeScript. */
function carregarCal(scriptUrl: string): CalApi {
  const w = window as Window & { Cal?: CalApi };
  if (!w.Cal) {
    const fila = (alvo: { q: unknown[] }, args: unknown) => void alvo.q.push(args);
    const cal = function (this: unknown, ...args: unknown[]) {
      const c = w.Cal as CalApi & { q: unknown[] };
      if (!c.loaded) {
        c.ns = {};
        c.q = c.q || [];
        const s = document.createElement('script');
        s.src = scriptUrl;
        s.async = true;
        document.head.appendChild(s);
        c.loaded = true;
      }
      if (args[0] === 'init') {
        const api = function (...a: unknown[]) {
          fila(api as unknown as { q: unknown[] }, a);
        } as unknown as ((...a: unknown[]) => void) & { q: unknown[] };
        api.q = api.q || [];
        const ns = args[1];
        if (typeof ns === 'string') {
          c.ns[ns] = c.ns[ns] || api;
          fila(c.ns[ns] as unknown as { q: unknown[] }, args);
          fila(c, ['initNamespace', ns]);
        } else fila(c, args);
        return;
      }
      fila(c, args);
    } as unknown as CalApi;
    w.Cal = cal;
  }
  return w.Cal;
}

const EMAIL = /^[^\s@<>]{1,64}@[^\s@<>]{1,190}\.[A-Za-z]{2,24}$/;

/** Nome e e-mail do fragmento, limpos. Nada sai daqui se não for plausível. */
function prefill(): { name?: string; email?: string } {
  try {
    const f = new URLSearchParams(window.location.hash.slice(1));
    const name = (f.get('name') ?? '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 80);
    const email = (f.get('email') ?? '').trim().slice(0, 254);
    return { ...(name ? { name } : {}), ...(EMAIL.test(email) ? { email } : {}) };
  } catch {
    return {};
  }
}

const CORES = {
  dark: {
    'cal-brand': '#e9a35c',
    'cal-brand-emphasis': '#f0b97f',
    'cal-brand-text': '#0b0a09',
    'cal-text': '#efe8da',
    'cal-text-emphasis': '#ffffff',
    'cal-text-subtle': '#a8a092',
    'cal-text-muted': '#a8a092',
    'cal-bg': 'transparent',
    'cal-bg-emphasis': 'rgba(239,232,218,0.10)',
    'cal-bg-subtle': 'rgba(239,232,218,0.06)',
    'cal-bg-muted': 'rgba(239,232,218,0.04)',
    'cal-border': 'rgba(239,232,218,0.14)',
    'cal-border-subtle': 'rgba(239,232,218,0.10)',
    'cal-border-booker': 'rgba(239,232,218,0.14)',
  },
  light: {
    'cal-brand': '#0b0a09',
    'cal-brand-text': '#efe8da',
    'cal-text': '#0b0a09',
    'cal-text-subtle': '#5f584d',
    'cal-bg': 'transparent',
    'cal-border': 'rgba(11,10,9,0.12)',
  },
};

export function CalendarioCal({
  idioma,
  calLink,
  embedOrigin,
  ligacaoDirecta,
  textos,
}: {
  idioma: Idioma;
  calLink: string;
  embedOrigin: string;
  ligacaoDirecta: string;
  textos: { calendario: string; carregando: string; alternativa: string; abrirCal: string };
}) {
  preconnect(embedOrigin);
  preload(`${embedOrigin}/embed/embed.js`, { as: 'script' });
  const id = `cal-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const ns = 'agoramoz';
  const [estado, setEstado] = useState<'a-carregar' | 'pronto' | 'falhou'>('a-carregar');
  const iniciado = useRef(false);

  useEffect(() => {
    if (iniciado.current) return;
    iniciado.current = true;
    let vivo = true;
    const limite = window.setTimeout(() => vivo && setEstado((e) => (e === 'pronto' ? e : 'falhou')), 20000);

    try {
      const Cal = carregarCal(`${embedOrigin}/embed/embed.js`);
      Cal('init', ns, { origin: embedOrigin });
      const api = Cal.ns[ns]!;
      api('inline', {
        elementOrSelector: `#${id}`,
        calLink,
        config: { layout: 'month_view', theme: 'dark', locale: idioma, ...prefill() },
      });
      api('ui', {
        theme: 'dark',
        layout: 'month_view',
        hideEventTypeDetails: false,
        cssVarsPerTheme: CORES,
        styles: { branding: { brandColor: '#e9a35c' } },
      });
      api('on', {
        action: 'linkReady',
        callback: () => vivo && setEstado('pronto'),
      });
      api('on', {
        action: 'linkFailed',
        callback: () => vivo && setEstado('falhou'),
      });
    } catch {
      queueMicrotask(() => vivo && setEstado('falhou'));
    }
    return () => {
      vivo = false;
      window.clearTimeout(limite);
    };
  }, [calLink, embedOrigin, id, idioma]);

  return (
    <div className="relative">
      {/* Luz ambiente por trás, para o vidro se ler como vidro. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-16 -z-10 bg-[radial-gradient(closest-side_at_28%_22%,rgb(233_163_92/0.22),transparent),radial-gradient(closest-side_at_76%_82%,rgb(120_96_200/0.16),transparent)]"
      />
      {/* Vidro CSS (leve): o LiquidGlass recalculava a refracção por cima do
          iframe do Cal a cada repintura e tornava o calendário lento. */}
      <div className="v3-vidro v3-vidro-escuro overflow-hidden rounded-[1.75rem] p-2 sm:p-3">
        <div role="region" aria-label={textos.calendario} className="relative min-h-[38rem] sm:min-h-[44rem]">
          {estado !== 'pronto' && (
            <div aria-hidden={estado === 'falhou'} className="absolute inset-0 grid gap-4 p-5 sm:p-8">
              <p role="status" className="v3-etiqueta text-[var(--v3-cinza)]">
                {estado === 'a-carregar' ? textos.carregando : textos.alternativa}
              </p>
              {estado === 'a-carregar' && (
                <div className="grid animate-pulse grid-cols-7 gap-2 motion-reduce:animate-none">
                  {Array.from({ length: 35 }, (_, i) => (
                    <span key={i} className="aspect-square rounded-xl bg-[rgb(239_232_218/0.06)]" />
                  ))}
                </div>
              )}
            </div>
          )}
          <div id={id} className="relative h-full w-full overflow-auto" />
        </div>
      </div>

      {estado === 'falhou' && (
        <p className="mt-5 text-sm text-[var(--v3-cinza)]">
          {textos.alternativa}{' '}
          <a href={ligacaoDirecta} className="text-[var(--v3-papel)] underline underline-offset-4">
            {textos.abrirCal}
          </a>
        </p>
      )}
    </div>
  );
}
