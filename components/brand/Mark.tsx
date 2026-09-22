/**
 * A marca AGORAMOZ redesenhada em SVG a partir dos originais fornecidos.
 *
 * O letterform (barras + O) usa `currentColor`, pelo que herda `--on-surface`
 * e fica correto em fundo claro ou escuro sem duplicar o ficheiro. As três
 * cores da marca — verde, vermelho-laranja e amarelo — são fixas: são a
 * identidade, não um tema.
 */
export function Mark({ className, title }: { className?: string; title?: string }) {
  return (
    <svg
      viewBox="0 0 1070 550"
      className={className}
      role={title ? 'img' : 'presentation'}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Ondas: verde (crescimento), neutro, amarelo (processo) */}
      <g strokeWidth="56" strokeLinecap="round">
        <path d="M80 70 L268 180" stroke="var(--ok)" />
        <path d="M22 267 L246 267" stroke="currentColor" />
        <path d="M80 462 L268 352" stroke="var(--color-energy-500)" />
      </g>

      {/* Meia-disco: a cor de energia da marca */}
      <path d="M414 150 A 136 136 0 0 0 414 422 Z" fill="var(--color-signal-500)" />

      {/* Letterform */}
      <rect x="448" y="8" width="15" height="534" fill="currentColor" />
      <rect x="515" y="8" width="76" height="534" fill="currentColor" />
      <circle cx="782" cy="275" r="230" stroke="currentColor" strokeWidth="112" />
    </svg>
  );
}
