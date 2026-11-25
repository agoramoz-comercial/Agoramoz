'use client';

import { useEffect, useRef } from 'react';
import { PREFIXOS_RASCUNHO } from './GuardaRascunho';
import { PREFIXO_RASCUNHO_CURSO } from '@/lib/cursos/rascunho';

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
      // O rascunho do criador de cursos vive em localStorage (sobrevive a fechar o separador).
      try {
        for (const k of Object.keys(localStorage)) if (k.startsWith(PREFIXO_RASCUNHO_CURSO)) localStorage.removeItem(k);
      } catch {
        /* idem */
      }
    };
    form.addEventListener('submit', limpar);
    return () => form.removeEventListener('submit', limpar);
  }, []);
  return <span ref={marca} hidden />;
}
