'use client';

import { Heart } from 'lucide-react';
import { useState, useSyncExternalStore } from 'react';
import { gostosGuardados, guardarGosto, tokenDoLeitor } from '@/lib/news/leitor';

/**
 * Gosto num artigo: anónimo, um por browser. Optimista — o número sobe logo
 * e acerta com o valor do servidor; numa falha volta atrás e diz porquê.
 */
const semSubscricao = () => () => {};

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
  const [gostos, setGostos] = useState(inicial);
  const [marquei, setMarquei] = useState(false);
  const [aEnviar, setAEnviar] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  // O que este browser já marcou antes (localStorage), lido como loja externa:
  // no servidor e na hidratação é `false`; depois, o valor guardado.
  const guardado = useSyncExternalStore(
    semSubscricao,
    () => jaGostou(slug),
    () => false,
  );
  const gostei = marquei || guardado;

  async function gostar() {
    if (gostei || aEnviar) return;
    let armazem: Storage | null = null;
    try {
      armazem = window.localStorage;
    } catch {
      armazem = null;
    }
    const token = tokenDoLeitor(armazem);
    if (!token) {
      setErro(idioma === 'en' ? 'Your browser blocks site storage.' : 'O browser bloqueia o armazenamento do site.');
      return;
    }
    setErro(null);
    setAEnviar(true);
    setMarquei(true);
    setGostos((g) => g + 1);
    try {
      const r = await fetch('/api/news/gosto', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ slug, token }),
      });
      if (!r.ok) throw new Error(String(r.status));
      const corpo: unknown = await r.json();
      const total = (corpo as { gostos?: unknown }).gostos;
      if (typeof total === 'number') setGostos(total);
      guardarGosto(armazem, slug);
    } catch {
      setMarquei(false);
      setGostos((g) => Math.max(0, g - 1));
      setErro(idioma === 'en' ? 'Could not register. Try again.' : 'Não foi possível registar. Tente de novo.');
    } finally {
      setAEnviar(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={gostar}
        aria-pressed={gostei}
        aria-disabled={aEnviar || gostei}
        className={`inline-flex min-h-11 items-center gap-2 border px-4 font-display text-sm font-semibold transition-colors ${
          gostei
            ? 'border-[color:var(--color-signal-600)] bg-[color:var(--color-signal-600)] text-white'
            : 'border-[color:var(--border)] hover:border-[color:var(--on-surface)]'
        }`}
      >
        <Heart className={`size-4 ${gostei ? 'fill-current' : ''}`} aria-hidden="true" />
        {gostei ? (idioma === 'en' ? 'Liked' : 'Gostei') : idioma === 'en' ? 'Like' : 'Gostar'}
        <span className="font-techno tabular-nums">{gostos.toLocaleString(idioma === 'en' ? 'en-GB' : 'pt-PT')}</span>
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
