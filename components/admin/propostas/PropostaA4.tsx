import type { ReactNode } from 'react';
import { Mark } from '@/components/brand/Mark';
import { SITE } from '@/content/site';
import { cn } from '@/lib/utils/cn';
import { CONTACTOS, compacto, dataPorExtenso, paragrafos, totais, validaAte, valor, type Proposta } from '@/lib/propostas/modelo';
import s from './proposta.module.css';

/**
 * As folhas A4 da proposta, no estilo editorial AGORAMOZ.
 *
 * Só desenha o que foi escrito: uma secção sem conteúdo não tem página (o
 * índice e a numeração acompanham). Os visuais — esfera, onda, Gantt, barras
 * de peso — são gerados a partir dos dados ou são abstractos; nenhum finge
 * ser um ecrã, um mapa ou uma fotografia. O logótipo é o `Mark` do site, o
 * mesmo SVG do cabeçalho: nunca redesenhado aqui.
 *
 * Sem estado e sem efeitos: o editor passa a proposta e isto desenha.
 */

type Fundo = 'white' | 'paper' | 'dark' | 'grad';

interface Folha {
  readonly chave: string;
  readonly fundo: Fundo;
  readonly semRodape?: boolean;
  /** Entrada no índice. */
  readonly toc?: string;
  readonly corpo: (n: string) => ReactNode;
}

const doisDigitos = (i: number) => String(i).padStart(2, '0');

/** O que ainda não foi escrito aparece entre parêntesis rectos, a cinza — nunca inventado. */
function T({ v, falta }: { v: string; falta: string }) {
  return v.trim() ? <>{v}</> : <span className={s.vazio}>[{falta}]</span>;
}

function Topo({ a, b, c }: { a: string; b: string; c: string }) {
  return (
    <div className={s.topbar}>
      <span className={s.lab}>{a}</span>
      <span className={s.lab}>{b}</span>
      <span className={s.lab}>{c}</span>
    </div>
  );
}

function Contactos({ claro = false }: { claro?: boolean }) {
  return (
    <div
      className={s.row}
      style={{
        gridTemplateColumns: '1fr 1fr 1fr',
        gap: '5mm',
        borderBottom: 0,
      }}
    >
      {[
        ['Email', CONTACTOS.email],
        ['Telefone', CONTACTOS.telefone],
        ['Localização', CONTACTOS.local],
      ].map(([r, v]) => (
        <div key={r}>
          <p className={s.lab}>{r}</p>
          <p className={cn(s.small, s.nb, s.mt1)} style={claro ? { color: '#E8ECEF' } : undefined}>
            {v}
          </p>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------- visuais */

/** Esfera em arame com núcleo e órbitas — o motivo da capa e da contracapa. */
function Esfera({
  id,
  cx,
  cy,
  r,
  inclinacao = -16,
  op = 0.33,
}: {
  id: string;
  cx: number;
  cy: number;
  r: number;
  inclinacao?: number;
  op?: number;
}) {
  const latitudes = Array.from({ length: 11 }, (_, k) => {
    const ph = -Math.PI / 2 + (Math.PI * (k + 1)) / 12;
    const rx = r * Math.cos(ph);
    return <ellipse key={`la${k}`} cx={cx} cy={cy + r * Math.sin(ph)} rx={rx} ry={rx * 0.26} opacity={op} />;
  });
  const meridianos = Array.from({ length: 12 }, (_, k) => (
    <ellipse key={`me${k}`} cx={cx} cy={cy} rx={Math.abs(r * Math.cos((Math.PI * k) / 12)) + 0.01} ry={r} opacity={op * 0.9} />
  ));
  const nucleo = Array.from({ length: 26 }, (_, k) => (
    <ellipse
      key={`nu${k}`}
      cx={cx}
      cy={cy}
      rx={r * 0.34}
      ry={r * 0.34 * Math.abs(Math.cos((k * Math.PI) / 26))}
      fill="none"
      stroke="#fff"
      strokeWidth={0.35}
      opacity={0.35}
      transform={`rotate(${k * 7} ${cx} ${cy})`}
    />
  ));
  const orbitas = (
    [
      [1.55, 0.28, -8],
      [1.3, 0.42, 22],
      [1.75, 0.18, 4],
    ] as const
  ).map(([a, b, rot], j) => (
    <g key={`or${j}`} transform={`rotate(${rot} ${cx} ${cy})`}>
      <ellipse
        cx={cx}
        cy={cy}
        rx={r * a}
        ry={r * b}
        fill="none"
        stroke="#fff"
        strokeWidth={0.6}
        opacity={0.45}
        strokeDasharray={j === 1 ? '2 4' : undefined}
      />
      {[0.3, 1.4, 2.6, 3.9, 5.1].map((t, i) =>
        (i + j) % 2 ? null : <circle key={i} cx={cx + r * a * Math.cos(t)} cy={cy + r * b * Math.sin(t)} r={3.2} fill="#fff" />,
      )}
    </g>
  ));
  return (
    <>
      <defs>
        <linearGradient id={`sg-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity={0.9} />
          <stop offset="1" stopColor="#9CC3E0" stopOpacity={0.15} />
        </linearGradient>
        <linearGradient id={`cg-${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#E8F2FB" />
          <stop offset="0.55" stopColor="#5E8AA3" />
          <stop offset="1" stopColor="#0B1B2E" />
        </linearGradient>
      </defs>
      <g transform={`rotate(${inclinacao} ${cx} ${cy})`} fill="none" stroke={`url(#sg-${id})`} strokeWidth={0.7}>
        {latitudes}
        {meridianos}
      </g>
      <circle cx={cx} cy={cy} r={r * 0.34} fill={`url(#cg-${id})`} />
      {nucleo}
      {orbitas}
    </>
  );
}

/** Onda de linhas verticais (índice). */
function Onda({ w, h, n, escuro = false }: { w: number; h: number; n: number; escuro?: boolean }) {
  return (
    <>
      {Array.from({ length: n }, (_, i) => {
        const x = i * (w / (n - 1));
        const e = Math.pow(Math.sin((Math.PI * i) / n), 1.2);
        const v = 0.25 + 0.75 * Math.abs(Math.sin(i * 0.19) * Math.cos(i * 0.047)) * e + 0.1 * e;
        return (
          <line
            key={i}
            x1={x}
            x2={x}
            y1={h}
            y2={h - h * Math.min(v, 1)}
            stroke={escuro ? '#fff' : '#0B0B0C'}
            strokeWidth={0.8}
            opacity={0.18 + 0.4 * e}
          />
        );
      })}
    </>
  );
}

/** Gantt por semanas: barra = mínimo, extensão clara = margem até ao máximo, losango = gate no fim do mínimo. */
function Gantt({ p }: { p: Proposta }) {
  const L = 150;
  const W = 680;
  const linha = 34;
  const totalMax = Math.max(
    1,
    p.fases.reduce((acc, f) => acc + f.semanasMax, 0),
  );
  const passo = (W - L - 10) / totalMax;
  // Cada fase começa quando a anterior acaba no mínimo (somas acumuladas, sem reatribuir durante o desenho).
  const inicios = p.fases.map((_, i) => p.fases.slice(0, i).reduce((acc, f) => acc + f.semanasMin, 0));
  const altura = 30 + p.fases.length * linha + 30;
  const marcas = Array.from({ length: totalMax }, (_, i) => i).filter((i) => totalMax <= 24 || i % Math.ceil(totalMax / 24) === 0);
  return (
    <svg className={s.svg} viewBox={`0 0 ${W} ${altura}`} width="100%" role="img" aria-label="Calendário das fases, em semanas">
      <defs>
        <linearGradient id="gantt-barra" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#0B0B0C" />
          <stop offset="0.6" stopColor="#1C3A57" />
          <stop offset="1" stopColor="#7FA5BE" />
        </linearGradient>
      </defs>
      {marcas.map((i) => (
        <g key={i}>
          <line x1={L + i * passo} x2={L + i * passo} y1={22} y2={altura - 26} stroke="#000" strokeOpacity={0.06} strokeDasharray="2 3" />
          <text x={L + i * passo + 2} y={14} fontSize={8} fill="#666666">
            S{i + 1}
          </text>
        </g>
      ))}
      {p.fases.map((f, i) => {
        const y = 30 + i * linha;
        const x = L + inicios[i]! * passo;
        return (
          <g key={i}>
            <text x={0} y={y + 14} fontSize={9.5} fill="#0B0B0C">
              {`${doisDigitos(i + 1)}  ${f.nome.length > 22 ? `${f.nome.slice(0, 21)}…` : f.nome}`}
            </text>
            {f.semanasMax > f.semanasMin && (
              <rect
                x={x + f.semanasMin * passo}
                y={y}
                width={(f.semanasMax - f.semanasMin) * passo}
                height={20}
                fill="#4F7A93"
                opacity={0.25}
                rx={2}
              />
            )}
            <rect x={x} y={y} width={Math.max(2, f.semanasMin * passo)} height={20} fill="url(#gantt-barra)" rx={2} />
            <rect
              x={x + f.semanasMin * passo - 5}
              y={y + 5}
              width={10}
              height={10}
              fill="#FFD21F"
              transform={`rotate(45 ${x + f.semanasMin * passo} ${y + 10})`}
            />
          </g>
        );
      })}
      <g transform={`translate(0 ${altura - 12})`} fontSize={8} fill="#4A4A4A">
        <rect x={0} y={-8} width={18} height={8} fill="url(#gantt-barra)" rx={1} />
        <text x={24} y={0}>
          Duração mínima
        </text>
        <rect x={120} y={-8} width={18} height={8} fill="#4F7A93" opacity={0.25} rx={1} />
        <text x={144} y={0}>
          Margem até ao máximo
        </text>
        <rect x={262} y={-8} width={8} height={8} fill="#FFD21F" transform="rotate(45 266 -4)" />
        <text x={278} y={0}>
          Gate de aceitação
        </text>
      </g>
    </svg>
  );
}

/** Barras de peso de cada fase no investimento. */
function Pesos({ p }: { p: Proposta }) {
  const { total } = totais(p);
  const max = Math.max(1, ...p.fases.map((f) => f.valor));
  const W = 680;
  const H = 150;
  const largura = Math.min(60, (W - 40) / Math.max(1, p.fases.length) - 18);
  return (
    <svg className={s.svg} viewBox={`0 0 ${W} ${H + 34}`} width="100%" role="img" aria-label="Peso de cada fase no investimento">
      <defs>
        <linearGradient id="pesos-barra" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#0B0B0C" />
          <stop offset="0.6" stopColor="#1C3A57" />
          <stop offset="1" stopColor="#7FA5BE" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75, 1].map((g) => (
        <line key={g} x1={0} x2={W} y1={H - H * g * 0.85} y2={H - H * g * 0.85} stroke="#000" strokeOpacity={0.06} strokeDasharray="2 3" />
      ))}
      {p.fases.map((f, i) => {
        const h = (f.valor / max) * H * 0.85;
        const x = 20 + i * ((W - 40) / p.fases.length);
        const pct = total > 0 ? Math.round((f.valor / total) * 100) : 0;
        return (
          <g key={i}>
            <rect x={x} y={H - h} width={largura} height={h} fill="url(#pesos-barra)" rx={1.5} />
            <text x={x} y={H - h - 6} fontSize={9} fill="#0B0B0C">
              {compacto(f.valor)}
            </text>
            <text x={x} y={H + 14} fontSize={8} fill="#666666">
              {`${doisDigitos(i + 1)} · ${pct}%`}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/* --------------------------------------------------------------- folhas */

export function PropostaA4({ p, transbordam = [] }: { p: Proposta; transbordam?: readonly number[] }) {
  const t = totais(p);
  const ate = validaAte(p.data, p.validadeDias);
  const projecto = p.projeto.trim() || 'Projecto';
  const titulo = p.titulo.trim() || p.projeto.trim();
  const [tituloA, ...tituloB] = titulo.split(' ');
  const recomendada = p.opcoes.find((o) => o.recomendada);

  const folhas: Folha[] = [];

  folhas.push({
    chave: 'capa',
    fundo: 'grad',
    semRodape: true,
    corpo: () => (
      <>
        <div className={s.topbar}>
          <span className={s.brandline}>
            <Mark className={s.marca} />
            <b>AGORAMOZ</b>
          </span>
          <span className={s.lab}>Proposta comercial</span>
          <span>
            <span className={s.pill}>Confidencial</span>
          </span>
        </div>
        <svg className={s.svg} viewBox="0 0 600 330" style={{ marginTop: '6mm' }} aria-hidden>
          <Esfera id="capa" cx={300} cy={165} r={120} />
        </svg>
        <div className={s.grow} />
        <p className={s.lab}>{p.cliente.trim() ? `Para ${p.cliente}` : 'Proposta'}</p>
        <h1 className={cn(s.disp, s.xxl, s.light, s.mt2)}>
          {titulo ? (
            <>
              {tituloA}
              {tituloB.length > 0 && (
                <>
                  <br />
                  {tituloB.join(' ')}
                </>
              )}
            </>
          ) : (
            <span className={s.vazio}>[Título]</span>
          )}
        </h1>
        <div className={cn(s.row, s.mt4)} style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: '5mm' }}>
          {[
            ['Preparada para', <T key="c" v={p.cliente} falta="Cliente" />],
            ['Preparada por', <T key="pp" v={p.preparadaPor} falta="Autor" />],
            ['Data', dataPorExtenso(p.data)],
            ['Validade', ate ? `${p.validadeDias} dias · até ${dataPorExtenso(ate)}` : '—'],
          ].map(([r, v], i) => (
            <div key={i}>
              <p className={s.lab}>{r}</p>
              <p className={cn(s.small, s.mt1)}>{v}</p>
            </div>
          ))}
        </div>
        <div className={s.mt2}>
          <Contactos claro />
        </div>
      </>
    ),
  });

  if (p.carta.trim() || p.decisao.trim()) {
    folhas.push({
      chave: 'carta',
      fundo: 'white',
      corpo: () => (
        <>
          <Topo a="Carta de apresentação" b={projecto} c={dataPorExtenso(p.data)} />
          <h2 className={cn(s.disp, s.xl, s.mt4)}>
            Uma proposta
            <br />
            <span className={s.cinza}>para decidir bem</span>
          </h2>
          <div
            className={s.mt4}
            style={{
              display: 'grid',
              gridTemplateColumns: '38mm 1fr',
              gap: '10mm',
            }}
          >
            <div style={{ display: 'grid', gap: '4mm', alignContent: 'start' }}>
              {[
                ['Para', p.destinatario.trim() ? `${p.destinatario} · ${p.cliente}` : p.cliente],
                ['De', p.preparadaPor],
                ['Assunto', p.assunto || projecto],
              ].map(([r, v]) => (
                <div key={r}>
                  <p className={s.lab}>{r}</p>
                  <p className={cn(s.small, s.mt1)}>{v || '—'}</p>
                </div>
              ))}
            </div>
            <div style={{ display: 'grid', gap: '3.2mm', alignContent: 'start' }}>
              {paragrafos(p.carta).map((x, i) => (
                <p key={i} className={s.corpo}>
                  {x}
                </p>
              ))}
            </div>
          </div>
          <div className={s.grow} />
          {p.decisao.trim() && (
            <div className={s.callout}>
              <span className={s.ticks} aria-hidden />
              <p className={s.lab}>Decisão recomendada</p>
              <p className={s.mt1}>{p.decisao}</p>
            </div>
          )}
          <div className={s.mt3}>
            <p className={s.lab}>Com os melhores cumprimentos</p>
            <p className={cn(s.disp, s.sm, s.mt1)}>{p.preparadaPor || 'AGORAMOZ'}</p>
          </div>
          <div className={s.mt2}>
            <Contactos />
          </div>
        </>
      ),
    });
  }

  // O índice entra depois de se saber que secções há; guarda-se o lugar.
  const posicaoIndice = folhas.length;

  if (p.contexto.length > 0) {
    folhas.push({
      chave: 'contexto',
      fundo: 'white',
      toc: 'Contexto',
      corpo: (n) => (
        <>
          <Topo a={`${n} — Contexto`} b="Situação" c="Desafio" />
          <div
            className={s.mt4}
            style={{
              display: 'grid',
              gridTemplateColumns: '1.15fr 1fr',
              gap: '10mm',
            }}
          >
            <h2 className={cn(s.disp, s.xl)}>Contexto</h2>
            <p className={s.corpo} style={{ alignSelf: 'end' }}>
              O ponto de partida, como o entendemos. É sobre ele que a proposta assenta.
            </p>
          </div>
          <div className={s.grow} />
          <div>
            {p.contexto.map((l, i) => (
              <div
                key={i}
                className={s.row}
                style={{
                  gridTemplateColumns: '12mm 1fr 1.4fr',
                  gap: '5mm',
                  padding: '5mm 0',
                }}
              >
                <span className={s.idx}>[{doisDigitos(i + 1)}]</span>
                <div className={cn(s.disp, s.sm)}>
                  <T v={l.titulo} falta="Título" />
                </div>
                <p className={s.small}>{l.texto}</p>
              </div>
            ))}
          </div>
        </>
      ),
    });
  }

  if (p.objectivos.length > 0) {
    folhas.push({
      chave: 'objectivos',
      fundo: 'grad',
      toc: 'Objectivos',
      corpo: (n) => (
        <>
          <Topo a={`${n} — Objectivos`} b={projecto} c="Resultado" />
          <h2 className={cn(s.disp, s.xl, s.mt4)}>
            O que esta proposta
            <br />
            tem de alcançar
          </h2>
          <div className={s.grow} />
          <div>
            {p.objectivos.map((o, i) => (
              <div
                key={i}
                className={s.row}
                style={{
                  gridTemplateColumns: '16mm 1fr',
                  gap: '5mm',
                  padding: '4.5mm 0',
                }}
              >
                <span className={cn(s.disp, s.md, s.light)}>{doisDigitos(i + 1)}</span>
                <p className={cn(s.disp, s.sm)} style={{ alignSelf: 'center' }}>
                  {o}
                </p>
              </div>
            ))}
          </div>
        </>
      ),
    });
  }

  if (p.solucao.length > 0) {
    folhas.push({
      chave: 'solucao',
      fundo: 'dark',
      toc: 'Solução',
      corpo: (n) => (
        <>
          <Topo a={`${n} — Solução`} b="Módulos" c={`${p.solucao.length} componentes`} />
          <h2 className={cn(s.disp, s.xl, s.mt4)}>
            A solução,
            <br />
            <span style={{ color: '#B9BFC6' }}>parte a parte</span>
          </h2>
          <div className={s.grow} />
          <div>
            {p.solucao.map((l, i) => (
              <div
                key={i}
                className={s.row}
                style={{
                  gridTemplateColumns: '12mm 1fr 1.5fr',
                  gap: '5mm',
                  padding: '4.2mm 0',
                }}
              >
                <span className={s.idx}>[{doisDigitos(i + 1)}]</span>
                <div className={cn(s.disp, s.sm)}>
                  <T v={l.titulo} falta="Módulo" />
                </div>
                <p className={s.small}>{l.texto}</p>
              </div>
            ))}
          </div>
        </>
      ),
    });
  }

  if (p.fases.length > 0) {
    folhas.push({
      chave: 'plano',
      fundo: 'white',
      toc: 'Plano de trabalho',
      corpo: (n) => (
        <>
          <Topo a={`${n} — Plano de trabalho`} b={`${p.fases.length} fases`} c={`${t.semanasMin}–${t.semanasMax} semanas`} />
          <h2 className={cn(s.disp, s.xl, s.mt4)}>
            Plano de
            <br />
            trabalho
          </h2>
          <div className={s.mt4}>
            <Gantt p={p} />
          </div>
          <div className={s.grow} />
          <div>
            <div
              className={s.row}
              style={{
                gridTemplateColumns: '12mm 1.1fr 1.6fr 22mm',
                gap: '5mm',
              }}
            >
              <span className={s.lab}>#</span>
              <span className={s.lab}>Fase</span>
              <span className={s.lab}>Entregáveis</span>
              <span className={s.lab} style={{ textAlign: 'right' }}>
                Semanas
              </span>
            </div>
            {p.fases.map((f, i) => (
              <div
                key={i}
                className={s.row}
                style={{
                  gridTemplateColumns: '12mm 1.1fr 1.6fr 22mm',
                  gap: '5mm',
                }}
              >
                <span className={s.idx}>[{doisDigitos(i + 1)}]</span>
                <span className={cn(s.disp, s.sm)}>{f.nome}</span>
                <span className={s.small}>{f.entregaveis}</span>
                <span className={cn(s.small, s.tnum)} style={{ textAlign: 'right' }}>
                  {f.semanasMin === f.semanasMax ? f.semanasMin : `${f.semanasMin}–${f.semanasMax}`}
                </span>
              </div>
            ))}
          </div>
        </>
      ),
    });

    folhas.push({
      chave: 'investimento',
      fundo: 'paper',
      toc: 'Investimento e condições',
      corpo: (n) => (
        <>
          <Topo a={`${n} — Investimento`} b={p.moeda} c={`Validade: ${p.validadeDias} dias`} />
          <div
            className={s.mt4}
            style={{
              display: 'grid',
              gridTemplateColumns: '1.15fr 1fr',
              gap: '10mm',
              alignItems: 'end',
            }}
          >
            <h2 className={cn(s.disp, s.xl)}>Investimento</h2>
            <div>
              <p className={s.lab}>Total</p>
              <p className={cn(s.disp, s.lg, s.light, s.tnum, s.nb, s.mt1)}>{valor(t.total, p.moeda)}</p>
            </div>
          </div>
          <div className={s.mt3}>
            <Pesos p={p} />
          </div>
          <div className={s.mt2}>
            {p.fases.map((f, i) => (
              <div
                key={i}
                className={s.row}
                style={{
                  gridTemplateColumns: '12mm 1fr 40mm',
                  gap: '5mm',
                  padding: '2.6mm 0',
                }}
              >
                <span className={s.idx}>[{doisDigitos(i + 1)}]</span>
                <span className={s.small}>{f.nome}</span>
                <span className={cn(s.small, s.tnum, s.nb)} style={{ textAlign: 'right' }}>
                  {valor(f.valor, p.moeda)}
                </span>
              </div>
            ))}
            <div
              className={cn(s.row, s.total)}
              style={{
                gridTemplateColumns: '12mm 1fr 40mm',
                gap: '5mm',
                padding: '2.6mm 2mm',
              }}
            >
              <span className={s.idx}>Σ</span>
              <span className={s.small}>Total</span>
              <span className={cn(s.small, s.tnum, s.nb)} style={{ textAlign: 'right', fontWeight: 600 }}>
                {valor(t.total, p.moeda)}
              </span>
            </div>
          </div>
          <div className={s.grow} />
          {p.condicoes.length > 0 && (
            <div>
              <p className={s.lab}>Condições comerciais</p>
              <div className={s.mt1}>
                {p.condicoes.map((c, i) => (
                  <div
                    key={i}
                    className={s.row}
                    style={{
                      gridTemplateColumns: '12mm 1fr',
                      gap: '5mm',
                      padding: '2.2mm 0',
                    }}
                  >
                    <span className={s.idx}>[{doisDigitos(i + 1)}]</span>
                    <span className={s.small}>{c}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className={s.mt2}>
            <Contactos />
          </div>
        </>
      ),
    });
  }

  if (p.opcoes.length > 0) {
    folhas.push({
      chave: 'opcoes',
      fundo: 'dark',
      toc: 'Opções',
      corpo: (n) => (
        <>
          <Topo
            a={`${n} — Opções`}
            b={`${p.opcoes.length} caminhos`}
            c={recomendada ? `Recomendada: ${recomendada.nome}` : 'Para decidir'}
          />
          <h2 className={cn(s.disp, s.xl, s.mt4)}>
            Opções
            <br />
            <span style={{ color: '#B9BFC6' }}>para decidir</span>
          </h2>
          <div className={s.grow} />
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${p.opcoes.length}, 1fr)`,
              gap: '5mm',
            }}
          >
            {p.opcoes.map((o, i) => (
              <div key={i} className={cn(s.cartao, o.recomendada && s.cartaoRecomendado)} style={{ minHeight: '120mm' }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span className={cn(s.disp, s.lg, s.light)}>{String.fromCharCode(65 + i)}</span>
                  {o.recomendada && <span className={cn(s.pill, s.solid)}>Recomendada</span>}
                </div>
                <p className={cn(s.disp, s.sm)}>
                  <T v={o.nome} falta="Nome" />
                </p>
                <p className={s.small}>{o.descricao}</p>
                <div className={s.grow} />
                <p className={s.lab}>Investimento</p>
                <p className={cn(s.disp, s.md, s.tnum, s.nb)}>{valor(o.valor, p.moeda)}</p>
              </div>
            ))}
          </div>
        </>
      ),
    });
  }

  if (p.riscos.length > 0) {
    const fundo: Fundo = p.opcoes.length > 0 ? 'white' : 'dark';
    folhas.push({
      chave: 'riscos',
      fundo,
      toc: 'Riscos e mitigação',
      corpo: (n) => (
        <>
          <Topo a={`${n} — Riscos`} b="Mitigação" c={`${p.riscos.length} identificados`} />
          <h2 className={cn(s.disp, s.xl, s.mt4)}>
            Riscos e<br />
            mitigação
          </h2>
          <div className={s.grow} />
          <div>
            {p.riscos.map((r, i) => (
              <div
                key={i}
                className={s.row}
                style={{
                  gridTemplateColumns: '12mm 1fr 1.3fr',
                  gap: '5mm',
                  padding: '4.5mm 0',
                }}
              >
                <span className={s.idx}>[{doisDigitos(i + 1)}]</span>
                <span className={cn(s.disp, s.sm)}>
                  <T v={r.risco} falta="Risco" />
                </span>
                <span className={s.small}>
                  <span aria-hidden style={{ color: '#00BE64' }}>
                    ●{' '}
                  </span>
                  {r.mitigacao}
                </span>
              </div>
            ))}
          </div>
        </>
      ),
    });
  }

  folhas.push({
    chave: 'passos',
    fundo: 'white',
    toc: 'Próximos passos',
    corpo: (n) => (
      <>
        <Topo a={`${n} — Próximos passos`} b={projecto} c="Aceitação" />
        <h2 className={cn(s.disp, s.xl, s.mt4)}>
          Próximos
          <br />
          passos
        </h2>
        <div className={s.mt3}>
          {p.passos.length > 0 ? (
            p.passos.map((x, i) => (
              <div
                key={i}
                className={s.row}
                style={{
                  gridTemplateColumns: '12mm 1fr',
                  gap: '5mm',
                  padding: '3.4mm 0',
                }}
              >
                <span className={s.idx}>[{doisDigitos(i + 1)}]</span>
                <span className={cn(s.disp, s.sm)}>{x}</span>
              </div>
            ))
          ) : (
            <p className={s.vazio}>[Próximos passos]</p>
          )}
        </div>
        <div className={s.grow} />
        <div className={cn(s.callout, s.grad)}>
          <span className={s.ticks} aria-hidden />
          <p className={s.lab}>Fale connosco</p>
          <p className={s.mt1}>
            {CONTACTOS.email} · {CONTACTOS.telefone} · {CONTACTOS.local}
          </p>
        </div>
        <div
          className={s.mt3}
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '10mm',
          }}
        >
          {[p.cliente.trim() || 'Cliente', 'AGORAMOZ'].map((quem) => (
            <div key={quem}>
              <p className={s.lab}>
                Pelo {quem === 'AGORAMOZ' ? 'prestador' : 'cliente'} · {quem}
              </p>
              {['Nome', 'Função', 'Assinatura', 'Data'].map((c) => (
                <div
                  key={c}
                  className={s.row}
                  style={{
                    gridTemplateColumns: '22mm 1fr',
                    padding: '3.6mm 0',
                  }}
                >
                  <span className={s.lab}>{c}</span>
                  <span />
                </div>
              ))}
            </div>
          ))}
        </div>
      </>
    ),
  });

  folhas.push({
    chave: 'contracapa',
    fundo: 'dark',
    semRodape: true,
    corpo: () => (
      <>
        <svg
          className={s.svg}
          viewBox="0 0 600 420"
          style={{
            position: 'absolute',
            right: '-40mm',
            top: '-30mm',
            width: '170mm',
          }}
          aria-hidden
        >
          <Esfera id="contracapa" cx={300} cy={210} r={150} inclinacao={12} op={0.28} />
        </svg>
        <div className={s.grow} />
        <Mark className={s.marca} />
        <p className={cn(s.disp, s.lg, s.light, s.mt3)}>
          {/* A tagline do site (documento mestre §2): a frase de fecho não se inventa. */}
          {SITE.tagline}.
        </p>
        <div className={s.mt4}>
          <Contactos claro />
        </div>
      </>
    ),
  });

  // O índice só vale a pena com três secções ou mais.
  const comToc = folhas.filter((f) => f.toc);
  if (comToc.length >= 3) {
    folhas.splice(posicaoIndice, 0, {
      chave: 'indice',
      fundo: 'paper',
      corpo: () => (
        <>
          <Topo a="Índice" b={projecto} c={`${comToc.length} secções`} />
          <h2 className={cn(s.disp, s.xl, s.mt4)}>Índice</h2>
          <div className={s.mt4}>
            {entradasIndice.map(([k, texto, pagina]) => (
              <div
                key={k}
                className={s.row}
                style={{
                  gridTemplateColumns: '14mm 1fr 20mm',
                  alignItems: 'baseline',
                  padding: '2.9mm 0',
                }}
              >
                <span className={s.idx}>[{k}]</span>
                <span className={cn(s.disp, s.sm)}>{texto}</span>
                <span className={s.idx} style={{ textAlign: 'right' }}>
                  Pág. {pagina}
                </span>
              </div>
            ))}
          </div>
          <div className={s.grow} />
          <svg className={s.svg} viewBox="0 0 600 120" preserveAspectRatio="none" style={{ height: '34mm', width: '100%' }} aria-hidden>
            <Onda w={600} h={120} n={120} />
          </svg>
        </>
      ),
    });
  }

  // Número de secção (para o topo de cada página) e entradas do índice, depois de a ordem estar fechada.
  const numeroDaSeccao = new Map<string, string>();
  const entradasIndice: [string, string, string][] = [];
  let k = 0;
  folhas.forEach((f, i) => {
    if (!f.toc) return;
    k += 1;
    numeroDaSeccao.set(f.chave, doisDigitos(k));
    entradasIndice.push([doisDigitos(k), f.toc, doisDigitos(i + 1)]);
  });

  return (
    <div className={s.folhas} data-proposta-folhas>
      {folhas.map((f, i) => (
        <section
          key={f.chave}
          aria-label={`Página ${i + 1}${f.toc ? ` — ${f.toc}` : ''}`}
          data-pagina={i + 1}
          className={cn(s.pagina, s[f.fundo], transbordam.includes(i + 1) && s.transborda)}
        >
          <div data-conteudo style={{ display: 'contents' }}>
            {f.corpo(numeroDaSeccao.get(f.chave) ?? '')}
          </div>
          {!f.semRodape && (
            <div className={s.foot}>
              <span className={s.brandline}>
                <Mark className={s.marca} />
                <span className={s.lab}>{projecto} · Proposta comercial</span>
              </span>
              <span className={cn(s.lab, s.tnum)}>[ Pág. {doisDigitos(i + 1)} ]</span>
            </div>
          )}
        </section>
      ))}
    </div>
  );
}
