import { agrupar } from '@/lib/propostas/modelo';
import type { Exercicio, Grafico } from '@/lib/cursos/modelo';
import s from './curso.module.css';

/**
 * Os visuais do curso (D-49), em SVG desenhado a partir dos dados — nada de
 * imagens de banco nem fotografias que não se possam verificar.
 *
 * - `GraficoColunas`: colunas no estilo da referência (azul, lavanda), com o
 *   valor grande por cima. Os valores já passaram o verificador.
 * - `Esquema`: um fluxo de passos em caixas, rotulado como esquema.
 * - `ExercicioDoc`: o exercício prático, com os dados, as contas e o entregável.
 */

/** Número à portuguesa, sem casas a mais: 32 → «32», 30,9 → «30,9», 1735000 → «1 735 000». */
export function numeroPt(v: number): string {
  const t = agrupar(v);
  return t.replace(/,00$/, '').replace(/(,\d)0$/, '$1');
}

export function GraficoColunas({ g, escuro = false }: { g: Grafico; escuro?: boolean }) {
  const W = 600;
  const H = 230;
  const topo = 34;
  const base = H - 30;
  const max = Math.max(...g.series.map((x) => Math.abs(x.valor)), 1e-9);
  const n = g.series.length;
  const passo = W / n;
  const larg = Math.min(110, passo * 0.72);
  const tinta = escuro ? '#ffffff' : '#0b0b0c';
  return (
    <figure className={s.figura}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${g.titulo} (${g.unidade})`} className={s.svg}>
        <line x1={0} x2={W} y1={base} y2={base} stroke={tinta} strokeOpacity={0.25} strokeWidth={1} />
        {g.series.map((x, i) => {
          const h = Math.max(4, ((base - topo) * Math.abs(x.valor)) / max);
          const cx = passo * i + passo / 2;
          const ultima = i === n - 1;
          return (
            <g key={i}>
              <rect x={cx - larg / 2} y={base - h} width={larg} height={h} rx={8} fill={ultima ? '#2340e0' : '#8f93e8'} />
              <text x={cx} y={base - h - 8} textAnchor="middle" fontSize={20} fontWeight={600} fill={tinta} letterSpacing="-0.5">
                {numeroPt(x.valor)}
              </text>
              <text x={cx} y={base + 18} textAnchor="middle" fontSize={12} fill={tinta} fillOpacity={0.75}>
                {x.rotulo}
              </text>
            </g>
          );
        })}
      </svg>
      <figcaption className={s.legenda}>
        <span>{g.titulo}</span>
        <span>{g.unidade}</span>
      </figcaption>
    </figure>
  );
}

/** Parte um rótulo em linhas de até `max` caracteres, sem cortar palavras. */
function linhas(t: string, max: number): string[] {
  const out: string[] = [];
  let l = '';
  for (const p of t.split(/\s+/)) {
    if ((l + ' ' + p).trim().length > max && l) {
      out.push(l);
      l = p;
    } else l = `${l} ${p}`.trim();
  }
  if (l) out.push(l);
  return out.slice(0, 4);
}

export function Esquema({ itens, titulo }: { itens: readonly string[]; titulo: string }) {
  const n = itens.length;
  const W = 600;
  const gap = 18;
  const larg = (W - gap * (n - 1)) / n;
  const H = 150;
  const chars = Math.max(10, Math.floor(larg / 7.2));
  return (
    <figure className={s.figura}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Esquema: ${titulo}`} className={s.svg}>
        {itens.map((t, i) => {
          const x = i * (larg + gap);
          const ls = linhas(t, chars);
          return (
            <g key={i}>
              <rect x={x} y={20} width={larg} height={H - 40} rx={10} fill={i % 2 ? '#dcdefb' : '#2340e0'} />
              <text x={x + 12} y={42} fontSize={11} fontWeight={700} fill={i % 2 ? '#2340e0' : '#ffffff'} letterSpacing="1">
                {String(i + 1).padStart(2, '0')}
              </text>
              {ls.map((l, k) => (
                <text key={k} x={x + 12} y={64 + k * 15} fontSize={12} fill={i % 2 ? '#0b0b0c' : '#ffffff'}>
                  {l}
                </text>
              ))}
              {i < n - 1 && (
                <path d={`M ${x + larg + 3} ${H / 2} l ${gap - 8} 0 m -5 -5 l 5 5 l -5 5`} stroke="#0b0b0c" strokeWidth={1.6} fill="none" />
              )}
            </g>
          );
        })}
      </svg>
      <figcaption className={s.legenda}>
        <span>Esquema · {titulo}</span>
        <span>Ilustrativo</span>
      </figcaption>
    </figure>
  );
}

export function ExercicioDoc({ e, rotulo }: { e: Exercicio; rotulo: string }) {
  return (
    <div className={s.exercicio}>
      <p className={s.lab} style={{ color: '#ffffff' }}>
        Prática · {rotulo}
      </p>
      <h4 className={`${s.disp} ${s.md} ${s.mt1}`}>{e.titulo}</h4>
      <p className={`${s.corpo} ${s.mt1}`}>{e.contexto}</p>
      {e.dados && (
        <div className={s.mt2}>
          <p className={s.lab} style={{ color: '#dcdefb' }}>
            {e.dados.origem === 'treino' ? 'Dados de treino — inventados para praticar' : 'Dados das fontes'} · {e.dados.nota}
          </p>
          <table className={s.tabela}>
            <thead>
              <tr>
                {e.dados.colunas.map((c) => (
                  <th key={c} scope="col">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {e.dados.linhas.map((l, i) => (
                <tr key={i}>
                  {l.map((c, k) => (
                    <td key={k}>{c}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <ol className={`${s.passos} ${s.mt2}`}>
        {e.passos.map((p, i) => (
          <li key={i} className={s.corpo}>
            <span>{p}</span>
          </li>
        ))}
      </ol>
      <p className={`${s.corpo} ${s.mt2}`}>
        <strong>Entregável:</strong> {e.entregavel}
      </p>
      <p className={`${s.fontes}`}>
        {e.fontes.map((id) => (
          <span key={id} className={s.tag} style={{ borderColor: '#dcdefb', color: '#dcdefb' }}>
            {id}
          </span>
        ))}
      </p>
    </div>
  );
}
