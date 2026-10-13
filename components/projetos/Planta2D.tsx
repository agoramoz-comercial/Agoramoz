'use client';

import { useMemo } from 'react';
import type { Elemento, FormaElemento } from '@/content/projetos/tipos';
import { interferencias } from '@/lib/terrabuild/interferencia';
import { estadoNaFase, type EstadoElemento } from '@/lib/terrabuild/obra';
import { num } from '@/lib/terrabuild/formato';
import { COTA_CHEIA, curvasDeNivel, grelha } from '@/lib/terrabuild/terreno';
import { useGemeo, type Camada } from './estado';

/**
 * Planta do terreno em SVG — o primeiro ecrã do gémeo, o fallback sem WebGL
 * e a vista que funciona em qualquer ligação. Desenha a partir dos mesmos
 * dados que o 3D: terreno por fórmula, elementos, fase e a casa do construtor.
 *
 * A grelha local tem y para norte; o SVG tem y para baixo — `Y()` inverte.
 */

export const COR_CAMADA: Readonly<Record<Elemento['camada'], string>> = {
  infraestruturas: 'var(--color-chalk)',
  agua: 'var(--color-gemeo-agua)',
  eletrica: 'var(--color-gemeo-eletrica)',
  talhoes: 'var(--color-gemeo-talhoes)',
};

export function camadaVisivel(e: Elemento, camadas: readonly Camada[]): boolean {
  return camadas.includes(e.camada);
}

export function Planta2D({ selecionado, onSelecionar }: { selecionado: string | null; onSelecionar: (id: string) => void }) {
  const { projeto: p, estado } = useGemeo();
  const L = p.terreno.largura;
  const H = p.terreno.profundidade;
  const Y = (y: number) => H - y;

  const g = useMemo(() => grelha(p.terreno, 10), [p.terreno]);
  const curvas = useMemo(() => curvasDeNivel(g, 1), [g]);
  const relevo = useMemo(() => {
    let baixo = Infinity;
    let alto = -Infinity;
    for (const h of g.alturas) {
      if (h < baixo) baixo = h;
      if (h > alto) alto = h;
    }
    return alto - baixo;
  }, [g]);
  const cheia = useMemo(() => {
    // Células abaixo da cota de cheia, juntas em faixas por linha.
    const faixas: { x: number; y: number; w: number }[] = [];
    for (let j = 0; j < g.ny; j++) {
      let inicio: number | null = null;
      for (let i = 0; i <= g.nx; i++) {
        const h = i < g.nx ? (g.alturas[j * (g.nx + 1) + i]! + g.alturas[j * (g.nx + 1) + i + 1]!) / 2 : Infinity;
        if (h < COTA_CHEIA && inicio === null) inicio = i;
        if (h >= COTA_CHEIA && inicio !== null) {
          faixas.push({
            x: inicio * g.passo,
            y: j * g.passo,
            w: (i - inicio) * g.passo,
          });
          inicio = null;
        }
      }
    }
    return faixas;
  }, [g]);

  const conflitos = useMemo(() => interferencias(p, estado.casa), [p, estado.casa]);
  const ver = (c: Camada) => estado.camadas.includes(c);

  const elementos = p.elementos.filter((e) => e.id !== 'casa-principal' && camadaVisivel(e, estado.camadas));
  const casaEstado = estadoNaFase(p.elementos.find((e) => e.id === 'casa-principal')!, estado.fase);

  return (
    <svg
      viewBox={`-12 -12 ${L + 24} ${H + 24}`}
      className="block h-auto w-full"
      role="img"
      aria-labelledby="planta-titulo planta-desc"
      data-testid="planta-2d"
    >
      <title id="planta-titulo">Planta do terreno da Fazenda Inteligente 001 (fictícia)</title>
      {/* Um só texto, como no <title>: vários filhos num elemento SVG arriscam a hidratação. */}
      <desc id="planta-desc">
        {`Terreno de ${L} por ${H} metros visto de cima, na fase «${p.fases[estado.fase]!.nome}». Relevo de cerca de ${num(relevo)} m, com zona de cheia no canto sudeste. A lista «Elementos do terreno em lista», por baixo, dá o nome, a camada, a posição, o estado e o custo de cada elemento.`}
      </desc>
      <defs>
        <pattern id="tb-cheia" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="6" stroke="var(--color-chalk)" strokeWidth="1.4" strokeOpacity="0.55" />
        </pattern>
        <pattern id="tb-linhas-cultivo" width="4" height="4" patternUnits="userSpaceOnUse">
          <line x1="0" y1="2" x2="4" y2="2" stroke="var(--color-gemeo-talhoes)" strokeWidth="0.6" strokeOpacity="0.7" />
        </pattern>
        <filter id="tb-ortofoto" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="3" seed="7" />
          <feColorMatrix values="0 0 0 0 0.36  0 0 0 0 0.33  0 0 0 0 0.27  0 0 0 0.9 -0.15" />
        </filter>
      </defs>

      {/* Base */}
      <rect x="0" y="0" width={L} height={H} fill="var(--color-ink-850)" />
      {estado.base === 'ortofoto' && <rect x="0" y="0" width={L} height={H} filter="url(#tb-ortofoto)" opacity="0.85" />}
      {estado.base === 'mapa' && (
        <g stroke="var(--color-steel-700)" strokeWidth="0.4">
          {Array.from({ length: L / 50 + 1 }, (_, i) => (
            <line key={`v${i}`} x1={i * 50} y1="0" x2={i * 50} y2={H} />
          ))}
          {Array.from({ length: H / 50 + 1 }, (_, i) => (
            <line key={`h${i}`} x1="0" y1={i * 50} x2={L} y2={i * 50} />
          ))}
        </g>
      )}
      {(estado.base === 'relevo' || estado.base === 'ortofoto') && (
        <g fill="none" transform={`translate(0 ${H}) scale(1 -1)`}>
          {curvas.map((c) => (
            <path
              key={c.cota}
              d={c.d}
              stroke="var(--color-chalk)"
              strokeOpacity={estado.base === 'relevo' ? (c.cota % 5 === 0 ? 0.75 : 0.35) : 0.18}
              strokeWidth={c.cota % 5 === 0 ? 0.9 : 0.5}
            />
          ))}
        </g>
      )}

      {/* Risco de cheia: textura, nunca só cor */}
      {ver('risco') && (
        <g data-camada="risco">
          {cheia.map((f, k) => (
            <rect key={k} x={f.x} y={Y(f.y + g.passo)} width={f.w} height={g.passo} fill="url(#tb-cheia)" />
          ))}
        </g>
      )}

      {/* Elementos */}
      {elementos.map((e) => (
        <Forma
          key={e.id}
          e={e}
          estado={estadoNaFase(e, estado.fase)}
          progresso={ver('progresso')}
          selecionado={selecionado === e.id}
          onSelecionar={onSelecionar}
          Y={Y}
        />
      ))}

      {/* Casa principal — do construtor */}
      {ver('infraestruturas') && casaEstado !== 'ausente' && (
        <g
          transform={`rotate(${-estado.casa.rotacao} ${estado.casa.x} ${Y(estado.casa.y)})`}
          onClick={() => onSelecionar('casa-principal')}
          className="cursor-pointer"
          data-elemento="casa-principal"
          data-conflito={conflitos.length ? 'sim' : 'nao'}
        >
          {/* Um só texto: um <title> com vários filhos sai vazio no HTML pré-renderizado e parte a hidratação. */}
          <title>{`Casa agrícola principal — ${casaEstado === 'em-obra' ? 'em obra' : 'concluída'}`}</title>
          <rect
            x={estado.casa.x - estado.casa.comprimento / 2}
            y={Y(estado.casa.y) - estado.casa.largura / 2}
            width={estado.casa.comprimento}
            height={estado.casa.largura}
            fill={casaEstado === 'concluido' ? 'var(--color-chalk)' : 'none'}
            fillOpacity="0.9"
            stroke={conflitos.length ? 'var(--color-signal-500)' : 'var(--color-chalk)'}
            strokeWidth={conflitos.length || selecionado === 'casa-principal' ? 1.6 : 0.8}
            strokeDasharray={casaEstado === 'em-obra' ? '2 1.4' : undefined}
          />
        </g>
      )}

      {/* Limite, norte e escala */}
      <rect x="0" y="0" width={L} height={H} fill="none" stroke="var(--color-steel-400)" strokeWidth="0.6" />
      <g transform={`translate(${L - 14} 14)`} aria-hidden>
        <path d="M0 -8 L4 4 L0 1.5 L-4 4 Z" fill="var(--color-chalk)" />
        <text y="13" textAnchor="middle" fontSize="7" fill="var(--color-chalk)" className="font-[family-name:var(--font-chakra)]">
          N
        </text>
      </g>
      <g transform={`translate(10 ${H - 10})`} aria-hidden>
        <rect x="0" y="-2" width="50" height="2" fill="var(--color-chalk)" />
        <text x="0" y="-5" fontSize="6.5" fill="var(--color-chalk)" className="font-[family-name:var(--font-chakra)]">
          50 m
        </text>
      </g>
    </svg>
  );
}

function Forma({
  e,
  estado,
  progresso,
  selecionado,
  onSelecionar,
  Y,
}: {
  e: Elemento;
  estado: EstadoElemento;
  progresso: boolean;
  selecionado: boolean;
  onSelecionar: (id: string) => void;
  Y: (y: number) => number;
}) {
  if (estado === 'ausente' && !progresso) return null;
  const planeado = estado === 'ausente';
  const traco = planeado ? '0.6 1.6' : estado === 'em-obra' ? '2 1.4' : estado === 'futuro' ? '4 2' : undefined;
  const rotulo = `${e.nome} — ${planeado ? 'planeado' : estado === 'em-obra' ? 'em obra' : estado === 'futuro' ? 'área futura' : 'concluído'}`;
  return (
    <g
      onClick={() => onSelecionar(e.id)}
      className="cursor-pointer"
      opacity={planeado ? 0.7 : 1}
      data-elemento={e.id}
      data-estado={estado}
    >
      <title>{rotulo}</title>
      {desenhar(
        e.forma,
        {
          cor: COR_CAMADA[e.camada],
          traco,
          preenche: estado === 'concluido',
          largura: selecionado ? 1.8 : 0.8,
          talhao: e.camada === 'talhoes',
        },
        Y,
      )}
    </g>
  );
}

function desenhar(
  f: FormaElemento,
  o: {
    cor: string;
    traco?: string;
    preenche: boolean;
    largura: number;
    talhao: boolean;
  },
  Y: (y: number) => number,
): React.ReactNode {
  switch (f.tipo) {
    case 'linha':
      return (
        <polyline
          points={f.pontos.map(([x, y]) => `${x},${Y(y)}`).join(' ')}
          fill="none"
          stroke={o.cor}
          strokeOpacity={f.largura > 1 ? 0.35 : 1}
          strokeWidth={Math.max(f.largura, 1.1)}
          strokeDasharray={f.largura > 1 ? undefined : (o.traco ?? (f.largura < 0.35 ? '3 1.5' : undefined))}
          strokeLinejoin="round"
        />
      );
    case 'cilindro':
      return (
        <circle
          cx={f.cx}
          cy={Y(f.cy)}
          r={Math.max(f.raio, 1.6)}
          fill={o.preenche ? o.cor : 'none'}
          fillOpacity="0.35"
          stroke={o.cor}
          strokeWidth={o.largura}
          strokeDasharray={o.traco}
        />
      );
    case 'caixa':
    case 'area':
    case 'painel': {
      const r = f.r;
      const transform = r.rot ? `rotate(${-r.rot} ${r.cx} ${Y(r.cy)})` : undefined;
      const area = f.tipo === 'area';
      return (
        <g transform={transform}>
          <rect
            x={r.cx - r.w / 2}
            y={Y(r.cy) - r.d / 2}
            width={r.w}
            height={r.d}
            fill={o.talhao && area ? 'url(#tb-linhas-cultivo)' : o.preenche ? o.cor : 'none'}
            fillOpacity={o.talhao && area ? 1 : area ? 0.15 : 0.85}
            stroke={o.cor}
            strokeWidth={o.largura}
            strokeDasharray={o.traco}
          />
          {f.tipo === 'painel' &&
            Array.from({ length: f.filas - 1 }, (_, i) => (
              <line
                key={i}
                x1={r.cx - r.w / 2}
                x2={r.cx + r.w / 2}
                y1={Y(r.cy) - r.d / 2 + ((i + 1) * r.d) / f.filas}
                y2={Y(r.cy) - r.d / 2 + ((i + 1) * r.d) / f.filas}
                stroke="var(--color-ink-950)"
                strokeWidth="0.8"
              />
            ))}
        </g>
      );
    }
  }
}
