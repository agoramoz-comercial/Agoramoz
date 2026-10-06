'use client';

import { Heart } from 'lucide-react';
import { useState, useSyncExternalStore } from 'react';
import { gostosGuardados, guardarGosto, tokenDoLeitor } from '@/lib/news/leitor';

/**
 * Gosto num artigo: anónimo, um por browser. Optimista — o número sobe logo
 * e acerta com o valor do servidor; numa falha volta atrás e diz porquê.
 *
 * O artigo tem o botão no topo e no fim: os dois lêem o MESMO estado (uma loja
 * por página, por artigo), para marcar um marcar os dois. O que o browser já
 * marcou noutra visita vem do localStorage.
 */

const ouvintes = new Set<() => void>();
/** Último total conhecido por artigo (do servidor, ou o optimista em curso). */
const totais = new Map<string, number>();
/** Gostos marcados nesta página (antes de o servidor confirmar). */
const marcados = new Set<string>();
const aEnviar = new Set<string>();

function avisar(): void {
  for (const f of ouvintes) f();
}

function subscrever(f: () => void): () => void {
  ouvintes.add(f);
  window.addEventListener('storage', f);
  return () => {
    ouvintes.delete(f);
    window.removeEventListener('storage', f);
  };
}

function jaGostou(slug: string): boolean {
  try {
    return gostosGuardados(window.localStorage).has(slug);
  } catch {
    return false;
  }
}

export function BotaoGosto({
  slug,
  inicial,
  idioma,
}: {
  slug: string;
  inicial: number;
  idioma: 'pt' | 'en';
}) {
  const [erro, setErro] = useState<string | null>(null);
  const gostei = useSyncExternalStore(
    subscrever,
    () => marcados.has(slug) || jaGostou(slug),
    () => false,
  );
  const gostos = useSyncExternalStore(
    subscrever,
    () => totais.get(slug) ?? inicial,
    () => inicial,
  );
  const ocupado = useSyncExternalStore(
    subscrever,
    () => aEnviar.has(slug),
    () => false,
  );

  async function gostar() {
    if (gostei || aEnviar.has(slug)) return;
    let armazem: Storage | null = null;
    try {
      armazem = window.localStorage;
    } catch {
      armazem = null;
    }
    const token = tokenDoLeitor(armazem);
    if (!token) {
      setErro(
        idioma === 'en' ? 'Your browser blocks site storage.' : 'O browser bloqueia o armazenamento do site.',
      );
      return;
    }
    setErro(null);
    aEnviar.add(slug);
    marcados.add(slug);
    totais.set(slug, (totais.get(slug) ?? inicial) + 1);
    avisar();
    try {
      const r = await fetch('/api/news/gosto', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ slug, token }),
      });
      if (!r.ok) throw new Error(String(r.status));
      const corpo: unknown = await r.json();
      const total = (corpo as { gostos?: unknown }).gostos;
      if (typeof total === 'number') totais.set(slug, total);
      guardarGosto(armazem, slug);
    } catch {
      marcados.delete(slug);
      totais.set(slug, Math.max(0, (totais.get(slug) ?? inicial + 1) - 1));
      setErro(
        idioma === 'en' ? 'Could not register. Try again.' : 'Não foi possível registar. Tente de novo.',
      );
    } finally {
      aEnviar.delete(slug);
      avisar();
    }
  }

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={gostar}
        aria-pressed={gostei}
        aria-disabled={ocupado || gostei}
        className={`inline-flex min-h-11 items-center gap-2 border px-4 font-display text-sm font-semibold transition-colors ${
          gostei
            ? 'border-[color:var(--color-signal-600)] bg-[color:var(--color-signal-600)] text-white'
            : 'border-[color:var(--border)] hover:border-[color:var(--on-surface)]'
        }`}
      >
        <Heart className={`size-4 ${gostei ? 'fill-current' : ''}`} aria-hidden="true" />
        {/* Nome fixo («Gostar, N gostos»); o estado diz-se com aria-pressed. */}
        <span aria-hidden="true">
          {gostei ? (idioma === 'en' ? 'Liked' : 'Gostei') : idioma === 'en' ? 'Like' : 'Gostar'}
        </span>
        <span className="sr-only">{idioma === 'en' ? 'Like' : 'Gostar'}</span>
        <span className="font-techno tabular-nums">
          {gostos.toLocaleString(idioma === 'en' ? 'en-GB' : 'pt-PT')}
        </span>
        <span className="sr-only">{idioma === 'en' ? 'likes' : 'gostos'}</span>
      </button>
      {erro && (
        <p role="alert" className="text-sm text-[color:var(--color-signal-700)]">
          {erro}
        </p>
      )}
    </div>
  );
}
