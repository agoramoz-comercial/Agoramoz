'use client';

import { useId, useState } from 'react';
import { Check, Copy } from 'lucide-react';

/**
 * O endereço de um link, só de leitura, com um botão de copiar. Sem
 * permissão de área de transferência (ou num browser antigo), selecciona o
 * texto para a pessoa copiar à mão — e diz isso.
 */
export function CopiarLink({ url, rotulo }: { url: string; rotulo: string }) {
  const id = useId();
  const [estado, setEstado] = useState<'idle' | 'copiado' | 'manual'>('idle');

  async function copiar() {
    try {
      await navigator.clipboard.writeText(url);
      setEstado('copiado');
    } catch {
      const campo = document.getElementById(id) as HTMLInputElement | null;
      campo?.select();
      setEstado('manual');
    }
  }

  return (
    <div>
      <label htmlFor={id} className="block text-xs font-medium text-[color:var(--muted)]">
        Endereço — {rotulo}
      </label>
      <div className="mt-1.5 flex gap-2">
        <input
          id={id}
          readOnly
          value={url}
          onFocus={(e) => e.currentTarget.select()}
          className="min-h-11 w-full min-w-0 rounded-[--radius-sm] border border-[color:var(--border)] bg-[color:var(--surface)] px-3 font-mono text-xs"
        />
        <button
          type="button"
          onClick={copiar}
          className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-[--radius-sm] border border-[color:var(--border)] px-3 text-sm hover:border-[color:var(--on-surface)]"
        >
          {estado === 'copiado' ? (
            <Check aria-hidden className="size-4" />
          ) : (
            <Copy aria-hidden className="size-4" />
          )}
          Copiar
        </button>
      </div>
      <p aria-live="polite" className="mt-1 min-h-4 text-xs text-[color:var(--muted)]">
        {estado === 'copiado'
          ? 'Copiado.'
          : estado === 'manual'
            ? 'Texto seleccionado: copie com Ctrl+C ou ⌘C.'
            : ''}
      </p>
    </div>
  );
}
