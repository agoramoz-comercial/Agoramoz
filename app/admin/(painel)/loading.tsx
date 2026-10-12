/**
 * Enquanto o servidor lê a próxima página do admin, a área de trabalho mostra
 * um esqueleto em vez de ficar parada no ecrã anterior. Anunciado uma vez a
 * leitores de ecrã; o desenho é decorativo.
 */
export default function AACarregar() {
  return (
    <div role="status" aria-live="polite" className="animate-pulse">
      <span className="sr-only">A carregar…</span>
      <div aria-hidden className="h-8 w-64 max-w-full rounded-[--radius-sm] bg-[color:var(--border)]" />
      <div aria-hidden className="mt-3 h-4 w-96 max-w-full rounded-[--radius-sm] bg-[color:var(--border)] opacity-70" />
      <div aria-hidden className="mt-10 grid gap-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="h-12 rounded-[--radius-sm] bg-[color:var(--surface-raised)]" />
        ))}
      </div>
    </div>
  );
}
