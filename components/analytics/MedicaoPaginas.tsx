'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { lerAtribuicao } from '@/lib/attribution/storage';
import { track } from '@/lib/analytics/track';
import type { Ecra } from '@/lib/analytics/events';

/**
 * Vistas de página e leitura (D-47).
 *
 * Em cada página: uma `page_view` ao chegar e, ao sair (mudar de página,
 * esconder o separador, fechar), uma `page_engagement` com o tempo em que a
 * página esteve VISÍVEL e o ponto mais fundo a que se chegou (0–100 %). É o
 * que responde a «onde param» e «o que se lê de facto».
 *
 * Nada fica guardado no dispositivo e nada identifica quem lê: a visita é um
 * resumo diário que o servidor calcula (`lib/analytics/visita.ts`). O GPC
 * (Global Privacy Control) é respeitado em `track()`.
 */

/** Abaixo disto não houve leitura: um clique de passagem. */
const MINIMO_MS = 1_000;

function ecra(): Ecra {
  const w = window.innerWidth;
  return w < 640 ? 'telemovel' : w < 1024 ? 'tablet' : 'computador';
}

function profundidade(): number {
  const doc = document.documentElement;
  const total = doc.scrollHeight - window.innerHeight;
  if (total <= 0) return 100;
  return Math.max(0, Math.min(100, Math.round((window.scrollY / total) * 100)));
}

// O referenciador só vale para a página de entrada: na navegação interna do
// Next, `document.referrer` continua a ser o da chegada.
let primeiraVista = true;

export function MedicaoPaginas() {
  const caminho = usePathname();

  useEffect(() => {
    // A consola interna e as pré-visualizações de QA não são o website.
    if (!caminho || /^\/(admin|qa|api)(\/|$)/.test(caminho)) return;
    const ref = primeiraVista ? (lerAtribuicao()?.referrer ?? null) : null;
    primeiraVista = false;
    track({ name: 'page_view', ref, ecra: ecra() });

    let visivelDesde: number | null = document.visibilityState === 'visible' ? performance.now() : null;
    let acumulado = 0;
    let fundo = profundidade();

    const aoRolar = () => {
      fundo = Math.max(fundo, profundidade());
    };
    const enviar = () => {
      if (visivelDesde !== null) acumulado += performance.now() - visivelDesde;
      visivelDesde = null;
      const ms = Math.min(1_800_000, Math.round(acumulado));
      if (ms >= MINIMO_MS) track({ name: 'page_engagement', ms, scroll: fundo }, { path: caminho });
      acumulado = 0;
    };
    const aoMudarVisibilidade = () => {
      if (document.visibilityState === 'hidden') enviar();
      else visivelDesde = performance.now();
    };

    window.addEventListener('scroll', aoRolar, { passive: true });
    document.addEventListener('visibilitychange', aoMudarVisibilidade);
    window.addEventListener('pagehide', enviar);
    return () => {
      window.removeEventListener('scroll', aoRolar);
      document.removeEventListener('visibilitychange', aoMudarVisibilidade);
      window.removeEventListener('pagehide', enviar);
      enviar();
    };
  }, [caminho]);

  return null;
}
