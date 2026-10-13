'use client';

import dynamic from 'next/dynamic';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { Elemento, FaseId } from '@/content/projetos/tipos';
import { mzn } from '@/lib/terrabuild/formato';
import { contarNaFase, custoElemento, estadoNaFase } from '@/lib/terrabuild/obra';
import { cn } from '@/lib/utils/cn';
import { CAMADAS, useGemeo, type Base, type Camada } from './estado';
import { COR_CAMADA, Planta2D } from './Planta2D';
import { useRastreio } from './rastreio';
import { Alternar, ROTULO } from './ui';

/**
 * O gémeo digital: planta 2D sempre, vista 3D a pedido. O three.js (centenas
 * de KB) só se descarrega quando a pessoa carrega em «Vista 3D» — nunca no
 * primeiro ecrã, nunca em quem só quer ler.
 */
const Cena3D = dynamic(() => import('./Cena3D').then((m) => m.Cena3D), {
  ssr: false,
  loading: () => <Aviso>A preparar a vista 3D…</Aviso>,
});

const NOME_CAMADA: Readonly<Record<Camada, string>> = {
  infraestruturas: 'Infraestruturas',
  agua: 'Rede de água',
  eletrica: 'Rede elétrica',
  talhoes: 'Talhões agrícolas',
  risco: 'Mapa de risco',
  progresso: 'Progresso da obra',
};

const NOME_BASE: Readonly<Record<Base, string>> = {
  ortofoto: 'Satélite (simulado)',
  mapa: 'Mapa',
  relevo: 'Terreno',
};

const ESTADO_TEXTO = { ausente: 'Por iniciar', 'em-obra': 'Em obra', concluido: 'Concluído', futuro: 'Área futura' } as const;

function suportaWebGL(): boolean {
  try {
    const c = document.createElement('canvas');
    return Boolean(c.getContext('webgl2') ?? c.getContext('webgl'));
  } catch {
    return false;
  }
}

export function Visualizador() {
  const { projeto: p, estado, despachar } = useGemeo();
  const rastrear = useRastreio(p.slug);
  const [selecionado, setSelecionado] = useState<string | null>(null);
  const [semWebGL, setSemWebGL] = useState(false);
  const idFase = useId();
  const idResumo = useId();
  // Quem escolhe na lista vai para o cartão; ao fechar, volta ao botão de onde veio.
  const refCartao = useRef<HTMLDivElement>(null);
  const origem = useRef<HTMLButtonElement | null>(null);
  const escolherDaLista = (id: string, botao: HTMLButtonElement) => {
    origem.current = botao;
    setSelecionado(id);
    requestAnimationFrame(() => refCartao.current?.focus());
  };
  const fecharCartao = () => {
    setSelecionado(null);
    requestAnimationFrame(() => origem.current?.focus());
  };

  const abrir3D = () => {
    if (!suportaWebGL()) {
      setSemWebGL(true);
      return;
    }
    rastrear('3d_open');
    despachar({ tipo: 'vista', vista: '3d' });
  };

  // Quem chega pelo botão «Explorar projeto em 3D» do hub pediu o 3D.
  useEffect(() => {
    if (window.location.hash === '#gemeo-3d' && suportaWebGL()) despachar({ tipo: 'vista', vista: '3d' });
  }, [despachar]);

  const contagem = useMemo(() => contarNaFase(p, estado.fase), [p, estado.fase]);
  const fase = p.fases[estado.fase]!;
  const el = selecionado ? p.elementos.find((e) => e.id === selecionado) : null;
  const componente = el?.componente ? p.componentes.find((c) => c.id === el.componente) : null;

  const irPara = (f: FaseId) => {
    rastrear('timeline');
    despachar({ tipo: 'fase', fase: f });
  };

  return (
    <div className="flex scroll-mt-28 flex-col gap-5" id="gemeo-3d">
      {/* Barra de ferramentas */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <fieldset className="flex flex-wrap items-center gap-2">
            <legend className={cn(ROTULO, 'mb-2 w-full')}>Vista</legend>
            <Alternar ativo={estado.vista === '2d'} onClick={() => despachar({ tipo: 'vista', vista: '2d' })}>
              Planta 2D
            </Alternar>
            <Alternar ativo={estado.vista === '3d'} onClick={abrir3D}>
              Vista 3D
            </Alternar>
          </fieldset>
          <fieldset className="flex flex-wrap items-center gap-2">
            <legend className={cn(ROTULO, 'mb-2 w-full')}>Base</legend>
            {(Object.keys(NOME_BASE) as Base[]).map((b) => (
              <Alternar
                key={b}
                ativo={estado.base === b}
                onClick={() => {
                  rastrear('layer');
                  despachar({ tipo: 'base', base: b });
                }}
              >
                {NOME_BASE[b]}
              </Alternar>
            ))}
          </fieldset>
        </div>
        <fieldset className="flex flex-wrap items-center gap-2">
          <legend className={cn(ROTULO, 'mb-2 w-full')}>Camadas</legend>
          {CAMADAS.map((c) => (
            <Alternar
              key={c}
              ativo={estado.camadas.includes(c)}
              onClick={() => {
                rastrear('layer');
                despachar({ tipo: 'camada', camada: c });
              }}
            >
              <Amostra camada={c} />
              {NOME_CAMADA[c]}
            </Alternar>
          ))}
        </fieldset>
        {/* Sempre montado, para o aviso ser anunciado quando aparece. */}
        <div role="status">
          {semWebGL ? <Aviso>Este navegador não tem WebGL: a planta 2D mostra o mesmo gémeo, com todas as camadas.</Aviso> : null}
        </div>
      </div>

      {/* Palco */}
      <div className="relative overflow-hidden border border-[color:var(--hairline)] bg-[color:var(--color-ink-950)]">
        {estado.vista === '3d' ? (
          <Cena3D selecionado={selecionado} onSelecionar={setSelecionado} onFalha={() => despachar({ tipo: 'vista', vista: '2d' })} />
        ) : (
          <Planta2D selecionado={selecionado} onSelecionar={setSelecionado} />
        )}
        <span className="rule-label pointer-events-none absolute top-3 left-3 bg-[color:var(--color-energy-500)] px-2 py-1 text-[color:var(--color-ink-950)]">
          Demonstração · terreno fictício
        </span>
      </div>

      {/* Legenda */}
      <ul className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-[color:var(--muted)]" aria-label="Legenda">
        <li className="flex items-center gap-2"><Amostra camada="infraestruturas" />Construções e estradas</li>
        <li className="flex items-center gap-2"><Amostra camada="agua" />Água</li>
        <li className="flex items-center gap-2"><Amostra camada="eletrica" />Eletricidade (tracejado)</li>
        <li className="flex items-center gap-2"><Amostra camada="talhoes" />Talhões</li>
        <li className="flex items-center gap-2"><Amostra camada="risco" />Zona de cheia</li>
        <li className="flex items-center gap-2"><Amostra camada="progresso" />Em obra (contorno tracejado)</li>
        <li className="flex items-center gap-2">
          <span aria-hidden className="inline-block h-3 w-4 border-2 border-[color:var(--color-signal-500)]" />
          Interferência na implantação
        </li>
      </ul>

      {/* Linha temporal */}
      <div className="flex flex-col gap-3 border-t border-[color:var(--hairline)] pt-5">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <label htmlFor={idFase} className={ROTULO}>
            Linha temporal da obra
          </label>
          <div className="flex flex-wrap gap-2">
            <Alternar ativo={estado.fase === 0} onClick={() => irPara(0)}>
              Terreno atual
            </Alternar>
            <Alternar ativo={estado.fase === p.faseAtual} onClick={() => irPara(p.faseAtual)}>
              Hoje (simulado)
            </Alternar>
            <Alternar ativo={estado.fase === 9} onClick={() => irPara(9)}>
              Resultado final projetado
            </Alternar>
          </div>
        </div>
        <input
          id={idFase}
          type="range"
          min={0}
          max={9}
          step={1}
          value={estado.fase}
          onChange={(e) => irPara(Number(e.target.value) as FaseId)}
          aria-valuetext={`Fase ${estado.fase + 1} de 10: ${fase.nome}`}
          aria-describedby={idResumo}
          className="w-full accent-[color:var(--color-signal-500)]"
        />
        <ol className="hidden grid-cols-10 gap-1 text-[0.6875rem] leading-tight text-[color:var(--muted)] md:grid" aria-hidden>
          {p.fases.map((f) => (
            <li key={f.id} className={cn(f.id === estado.fase && 'text-[color:var(--on-surface)]')}>
              {f.nome}
            </li>
          ))}
        </ol>
        <p id={idResumo} className="text-sm" data-testid="resumo-fase" data-concluidos={contagem.concluidos} data-em-obra={contagem.emObra}>
          <strong className="font-semibold">
            Fase {estado.fase + 1} de 10 — {fase.nome}.
          </strong>{' '}
          {fase.resumo} {contagem.concluidos} elementos concluídos, {contagem.emObra} em obra e {contagem.ausentes} por iniciar.
        </p>
      </div>

      {/* Elemento escolhido */}
      {el ? (
        <div
          ref={refCartao}
          tabIndex={-1}
          role="group"
          aria-label={`Elemento escolhido: ${el.nome}`}
          className="border border-[color:var(--hairline)] p-4 text-sm"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="font-semibold">{el.nome}</p>
            <button type="button" className="min-h-11 text-xs underline" onClick={fecharCartao}>
              Fechar
            </button>
          </div>
          <dl className="mt-2 grid gap-x-6 gap-y-1 sm:grid-cols-2">
            <div>
              <dt className={ROTULO}>Estado nesta fase</dt>
              <dd>{ESTADO_TEXTO[estadoNaFase(el, estado.fase)]}</dd>
            </div>
            <div>
              <dt className={ROTULO}>Obra</dt>
              <dd>
                {p.fases[el.fases[0]]!.nome} → {p.fases[el.fases[1]]!.nome}
              </dd>
            </div>
            <div>
              <dt className={ROTULO}>Custo (fictício)</dt>
              <dd className="tabular-nums">{el.futuro ? 'Fora do capital necessário' : mzn(custoElemento(el, estado.casa))}</dd>
            </div>
            {componente ? (
              <div>
                <dt className={ROTULO}>Componente financiável</dt>
                <dd>{componente.nome}</dd>
              </div>
            ) : null}
          </dl>
          {el.nota ? <p className="mt-2 text-[color:var(--muted)]">{el.nota}</p> : null}
        </div>
      ) : null}

      {/* O mesmo em texto */}
      <details className="border-t border-[color:var(--hairline)] pt-4 text-sm">
        <summary className="min-h-11 cursor-pointer">Elementos do terreno em lista ({p.elementos.length})</summary>
        <div role="region" aria-label="Elementos do terreno" tabIndex={0} className="relative mt-3 overflow-x-auto focus-visible:outline-2">
          <table className="w-full min-w-[34rem] text-left">
            <thead className={ROTULO}>
              <tr>
                <th scope="col" className="py-2 pr-4 font-normal">Elemento</th>
                <th scope="col" className="py-2 pr-4 font-normal">Camada</th>
                <th scope="col" className="py-2 pr-4 font-normal">Posição (E, N)</th>
                <th scope="col" className="py-2 pr-4 font-normal">Estado</th>
                <th scope="col" className="py-2 text-right font-normal">Custo (fictício)</th>
              </tr>
            </thead>
            <tbody>
              {p.elementos.map((e) => (
                <tr key={e.id} className="border-t border-[color:var(--hairline)]">
                  <th scope="row" className="py-2 pr-4 font-normal">
                    <button
                      type="button"
                      aria-pressed={selecionado === e.id}
                      className="min-h-9 text-left underline-offset-4 hover:underline"
                      onClick={(ev) => escolherDaLista(e.id, ev.currentTarget)}
                    >
                      {e.nome}
                    </button>
                  </th>
                  <td className="py-2 pr-4 text-[color:var(--muted)]">{NOME_CAMADA[e.camada]}</td>
                  <td className="py-2 pr-4 whitespace-nowrap tabular-nums">{posicao(e)}</td>
                  <td className="py-2 pr-4">{ESTADO_TEXTO[estadoNaFase(e, estado.fase)]}</td>
                  <td className="py-2 text-right tabular-nums">{e.futuro ? '—' : mzn(custoElemento(e, estado.casa))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}

/** Onde fica o elemento na grelha local (m): o centro, ou o início e o fim de uma linha. */
function posicao(e: Elemento): string {
  const f = e.forma;
  if (f.tipo === 'linha') {
    const [a, b] = [f.pontos[0]!, f.pontos[f.pontos.length - 1]!];
    return `${Math.round(a[0])}, ${Math.round(a[1])} → ${Math.round(b[0])}, ${Math.round(b[1])}`;
  }
  const [x, y] = f.tipo === 'cilindro' ? [f.cx, f.cy] : [f.r.cx, f.r.cy];
  return `${Math.round(x)}, ${Math.round(y)}`;
}

function Aviso({ children }: { children: React.ReactNode }) {
  return <p className="border border-dashed border-[color:var(--border)] px-4 py-3 text-sm text-[color:var(--muted)]">{children}</p>;
}

/** Amostra da legenda: cor E padrão, nunca só cor. */
function Amostra({ camada }: { camada: Camada }) {
  if (camada === 'risco')
    return (
      <span
        aria-hidden
        className="inline-block size-3 border border-[color:var(--color-chalk)]"
        style={{ backgroundImage: 'repeating-linear-gradient(45deg, var(--color-chalk) 0 1px, transparent 1px 4px)' }}
      />
    );
  if (camada === 'progresso') return <span aria-hidden className="inline-block h-3 w-4 border border-dashed border-[color:var(--color-chalk)]" />;
  if (camada === 'eletrica')
    return <span aria-hidden className="inline-block w-4 border-t-2 border-dashed" style={{ borderColor: COR_CAMADA.eletrica }} />;
  if (camada === 'agua') return <span aria-hidden className="inline-block w-4 border-t-2" style={{ borderColor: COR_CAMADA.agua }} />;
  return <span aria-hidden className="inline-block size-3" style={{ background: COR_CAMADA[camada] }} />;
}
