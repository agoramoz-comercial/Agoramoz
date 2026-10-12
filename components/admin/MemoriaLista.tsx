'use client';

import { Suspense, useEffect, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { destinoSeguro } from '@/lib/admin/navegacao';

/**
 * «Voltar à lista» com os filtros com que se saiu dela.
 *
 * A lista guarda o seu próprio endereço (caminho + filtros) em
 * `sessionStorage`; a ficha lê-o. Sem isto, cada acção na ficha faz um
 * redirect e o «voltar» do browser percorria versões antigas da mesma ficha
 * antes de chegar à lista — e chegava sem os filtros.
 *
 * Só guarda o URL da própria lista do admin (validado ao ler); nunca dados.
 */

const PREFIXO = 'admin:lista:';

/** Envolve a leitura dos parâmetros num `Suspense`, como o Next exige a `useSearchParams`. */
export function MemoriaLista({ chave }: { chave: string }) {
  return (
    <Suspense fallback={null}>
      <Memoria chave={chave} />
    </Suspense>
  );
}

function Memoria({ chave }: { chave: string }) {
  const caminho = usePathname();
  const params = useSearchParams();
  useEffect(() => {
    const p = new URLSearchParams(params.toString());
    p.delete('ok');
    p.delete('erro');
    const q = p.toString();
    try {
      sessionStorage.setItem(PREFIXO + chave, q ? `${caminho}?${q}` : caminho);
    } catch {
      // Modo privado ou armazenamento cheio: o «voltar» usa a lista sem filtros.
    }
  }, [chave, caminho, params]);
  return null;
}

function lerGuardado(chave: string): string | null {
  try {
    return sessionStorage.getItem(PREFIXO + chave);
  } catch {
    return null;
  }
}

const semSubscricao = () => () => {};

export function VoltarLista({ chave, lista, texto }: { chave: string; lista: string; texto: string }) {
  // O armazenamento lê-se como fonte externa: no servidor (e na primeira
  // pintura) a ligação é a lista sem filtros; no browser, a guardada.
  const guardado = useSyncExternalStore(
    semSubscricao,
    () => lerGuardado(chave),
    () => null,
  );
  const href = destinoSeguro(guardado, lista);
  return (
    <Link
      href={href}
      className="inline-flex min-h-11 items-center gap-2 text-sm text-[color:var(--muted)] hover:text-[color:var(--on-surface)]"
    >
      <ArrowLeft aria-hidden className="size-4" />
      {texto}
    </Link>
  );
}
