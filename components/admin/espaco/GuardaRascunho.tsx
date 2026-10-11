'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

/**
 * Não perder o que se escreveu.
 *
 * As acções do espaço respondem com um redireccionamento (`?erro=` ou `?ok=`)
 * — funciona sem JavaScript, mas a página volta a desenhar os formulários com
 * os valores gravados: um erro de validação apagava o memo inteiro, e gravar
 * um bloco apagava o que estava por gravar nos outros.
 *
 * Com JavaScript, isto guarda o formulário no `sessionStorage` (deste
 * separador, apagado ao fechá-lo) enquanto se escreve, e repõe-no logo a
 * seguir a uma acção: depois de um erro, todos; depois de um sucesso, todos
 * menos o que acabou de ser gravado (esse limpa-se). Campos escondidos
 * (`id`, `revisao`) nunca se guardam: vêm sempre do servidor.
 */

/** Cada espaço tem o seu prefixo: rascunhos de um nunca aparecem no outro. */
export type EspacoRascunho = 'ceno' | 'gabinete';

type Valores = Record<string, string | boolean>;

/**
 * Um rascunho vale 30 minutos: depois disso é lixo, e num computador
 * partilhado não deve ficar à espera (o terminar sessão também os apaga).
 */
export const VALIDADE_RASCUNHO_MS = 30 * 60 * 1000;

/** Os prefixos dos espaços privados, para os apagar todos ao terminar a sessão. */
export const PREFIXOS_RASCUNHO = ['ceno:', 'gabinete:'] as const;

function ler(prefixo: string, chave: string): Valores | null {
  try {
    const t = sessionStorage.getItem(prefixo + chave);
    if (!t) return null;
    const guardado = JSON.parse(t) as { em?: unknown; valores?: unknown };
    if (typeof guardado.em !== 'number' || Date.now() - guardado.em > VALIDADE_RASCUNHO_MS || !guardado.valores) {
      sessionStorage.removeItem(prefixo + chave);
      return null;
    }
    return guardado.valores as Valores;
  } catch {
    return null;
  }
}

function campos(form: HTMLFormElement) {
  return Array.from(form.elements).filter(
    (e): e is HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement =>
      (e instanceof HTMLInputElement || e instanceof HTMLTextAreaElement || e instanceof HTMLSelectElement) &&
      Boolean(e.name) &&
      !(e instanceof HTMLInputElement && ['hidden', 'submit', 'button', 'file', 'password'].includes(e.type)),
  );
}

function valoresDe(form: HTMLFormElement): Valores {
  const v: Valores = {};
  for (const c of campos(form)) v[c.name] = c instanceof HTMLInputElement && c.type === 'checkbox' ? c.checked : c.value;
  return v;
}

export function GuardaRascunho({ chave, espaco = 'ceno' }: { chave: string; espaco?: EspacoRascunho }) {
  const PREFIXO = `${espaco}:rascunho:`;
  const ENVIADO = `${espaco}:enviado`;
  const marca = useRef<HTMLSpanElement>(null);
  const [reposto, setReposto] = useState(false);
  // Depois de uma acção, o redireccionamento volta à mesma página com outros
  // parâmetros: o componente pode não ser montado de novo, por isso o efeito
  // depende deles.
  const pesquisa = useSearchParams().toString();

  useEffect(() => {
    const form = marca.current?.closest('form');
    if (!form) return;

    const params = new URLSearchParams(pesquisa);
    const depoisDeAccao = params.has('erro') || params.has('ok');
    let enviado: string | null = null;
    try {
      enviado = sessionStorage.getItem(ENVIADO);
    } catch {
      /* sem armazenamento: só não se repõe */
    }

    let temporizador: number | undefined;
    if (params.has('ok') && enviado === chave) {
      // Este é o que acabou de ser gravado: o rascunho já não serve.
      try {
        sessionStorage.removeItem(PREFIXO + chave);
        sessionStorage.removeItem(ENVIADO);
      } catch {
        /* nada */
      }
      setReposto(false);
    } else if (depoisDeAccao) {
      const guardado = ler(PREFIXO, chave);
      if (guardado) {
        // Depois do reinício do formulário que o React faz no fim da acção.
        temporizador = window.setTimeout(() => {
          const actual = valoresDe(form);
          let mudou = false;
          for (const c of campos(form)) {
            const g = guardado[c.name];
            if (g === undefined || g === actual[c.name]) continue;
            if (c instanceof HTMLInputElement && c.type === 'checkbox') c.checked = g === true;
            else c.value = String(g);
            mudou = true;
          }
          setReposto(mudou);
        }, 0);
      }
    }

    const guardar = () => {
      try {
        sessionStorage.setItem(PREFIXO + chave, JSON.stringify({ em: Date.now(), valores: valoresDe(form) }));
      } catch {
        /* cheio ou bloqueado: não guardar não pode impedir de escrever */
      }
    };
    const aoEnviar = () => {
      guardar();
      try {
        sessionStorage.setItem(ENVIADO, chave);
      } catch {
        /* nada */
      }
    };
    form.addEventListener('input', guardar);
    form.addEventListener('change', guardar);
    form.addEventListener('submit', aoEnviar);
    return () => {
      window.clearTimeout(temporizador);
      form.removeEventListener('input', guardar);
      form.removeEventListener('change', guardar);
      form.removeEventListener('submit', aoEnviar);
    };
  }, [chave, pesquisa, PREFIXO, ENVIADO]);

  return (
    <span ref={marca} role="status" className={reposto ? 'text-sm text-[color:var(--muted)]' : 'sr-only'}>
      {reposto ? 'Repusemos o que tinha escrito e ainda não estava gravado.' : ''}
    </span>
  );
}
