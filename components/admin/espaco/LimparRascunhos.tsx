'use client';

import { useEffect, useRef } from 'react';
import { PREFIXOS_RASCUNHO } from './GuardaRascunho';

/**
 * Dentro do formulário «Terminar sessão»: ao sair, apaga os rascunhos dos
 * espaços privados deste separador. Num computador partilhado, quem vier a
 * seguir não encontra valores nem textos por gravar.
 */
export function LimparRascunhos() {
  const marca = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const form = marca.current?.closest('form');
    if (!form) return;
    const limpar = () => {
      try {
        for (const k of Object.keys(sessionStorage))
          if (PREFIXOS_RASCUNHO.some((p) => k.startsWith(p))) sessionStorage.removeItem(k);
      } catch {
        /* sem armazenamento: nada a limpar */
      }
    };
    form.addEventListener('submit', limpar);
    return () => form.removeEventListener('submit', limpar);
  }, []);
  return <span ref={marca} hidden />;
}
