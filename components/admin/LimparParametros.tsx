'use client';

import { useEffect } from 'react';

/**
 * Tira do URL os parâmetros de uma só utilização (`ok`, `erro`) depois de a
 * mensagem estar no ecrã. Usa `history.replaceState`, que o router do Next
 * acompanha: não recarrega, não acrescenta entrada ao histórico e não mexe
 * nos filtros que vivem no mesmo URL.
 */
export function LimparParametros({ chaves }: { chaves: readonly string[] }) {
  useEffect(() => {
    const url = new URL(window.location.href);
    let mudou = false;
    for (const c of chaves) {
      if (url.searchParams.has(c)) {
        url.searchParams.delete(c);
        mudou = true;
      }
    }
    if (mudou) window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
  }, [chaves]);
  return null;
}
