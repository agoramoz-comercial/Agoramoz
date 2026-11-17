'use client';

import { Printer } from 'lucide-react';

/** «Descarregar PDF»: o diálogo de impressão do browser, com o título do curso como nome do ficheiro. */
export function BotaoImprimir({ titulo, rotulo = 'Descarregar PDF', className }: { titulo: string; rotulo?: string; className?: string }) {
  return (
    <button
      type="button"
      className={
        className ??
        'inline-flex min-h-11 items-center justify-center gap-2 rounded-[--radius-xs] bg-[color:var(--color-signal-600)] px-4 text-sm font-medium text-white'
      }
      onClick={() => {
        const antes = document.title;
        document.title = `Curso AGORAMOZ — ${titulo}`;
        window.addEventListener('afterprint', () => (document.title = antes), { once: true });
        window.print();
      }}
    >
      <Printer aria-hidden className="size-4" />
      {rotulo}
    </button>
  );
}
