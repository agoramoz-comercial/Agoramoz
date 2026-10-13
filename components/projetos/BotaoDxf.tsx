'use client';

import { useState } from 'react';

/**
 * Descarrega um DXF gerado no próprio browser: o ficheiro nasce de um Blob
 * local e nada é enviado. A biblioteca de DXF só é carregada no clique.
 */
export function BotaoDxf({ rotulo, ficheiro, gerar }: { rotulo: string; ficheiro: string; gerar: () => Promise<string> }) {
  const [estado, setEstado] = useState<'pronto' | 'a-gerar' | 'feito' | 'erro'>('pronto');
  const descarregar = async () => {
    if (estado === 'a-gerar') return; // aria-disabled não bloqueia o clique
    setEstado('a-gerar');
    try {
      const texto = await gerar();
      const url = URL.createObjectURL(new Blob([texto], { type: 'application/dxf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = ficheiro;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      setEstado('feito');
    } catch {
      setEstado('erro');
    }
  };
  return (
    <div className="flex flex-col items-start gap-1.5">
      <button
        type="button"
        onClick={descarregar}
        aria-disabled={estado === 'a-gerar'}
        className="inline-flex min-h-11 items-center gap-2 border border-[color:var(--border)] px-4 text-sm font-medium hover:border-[color:var(--on-surface)] aria-disabled:opacity-60"
      >
        <span aria-hidden className="numeral text-xs text-[color:var(--muted)]">
          DXF
        </span>
        {estado === 'a-gerar' ? 'A gerar…' : rotulo}
      </button>
      <p role="status" className="text-xs text-[color:var(--muted)]">
        {estado === 'feito'
          ? `${ficheiro} descarregado. Abre no AutoCAD, BricsCAD, LibreCAD ou QCAD (metros).`
          : estado === 'erro'
            ? 'Não foi possível gerar o ficheiro neste navegador.'
            : 'Gerado no seu navegador; nada é enviado.'}
      </p>
    </div>
  );
}
