'use client';

import { useId, useMemo } from 'react';
import { CASA_REFERENCIA } from '@/content/projetos/fazenda-inteligente-001';
import { BASE_PRECOS, CLASSE, CLASSES, NOME_CATEGORIA, orcamento, type CategoriaCusto, type Classe } from '@/lib/terrabuild/custos';
import { mzn, num, variacao } from '@/lib/terrabuild/formato';
import { interferencias } from '@/lib/terrabuild/interferencia';
import { ACABAMENTOS, COBERTURAS, LIMITES_CASA, medidas, PAREDES, PAVIMENTOS, type CasaConfig } from '@/lib/terrabuild/quantidades';
import { compararVersoes } from '@/lib/terrabuild/variacao';
import { cn } from '@/lib/utils/cn';
import { useGemeo } from './estado';
import { useRastreio } from './rastreio';
import { Ficticio, ROTULO } from './ui';

/**
 * O construtor da casa principal: mudar uma medida ou um material recalcula
 * as quantidades, o custo, a variação e as interferências — os mesmos
 * cálculos que o assistente usa para explicar. Tudo no browser, nada guardado.
 */

const NOMES = {
  parede: { 'bloco-15': 'Bloco de cimento 15 cm', 'tijolo-macico': 'Tijolo maciço', 'bloco-solo-cimento': 'Bloco de solo-cimento' },
  cobertura: { 'chapa-zinco': 'Chapa de zinco', 'telha-ceramica': 'Telha cerâmica', 'painel-sanduiche': 'Painel sanduíche' },
  pavimento: { betonilha: 'Betonilha afagada', mosaico: 'Mosaico cerâmico' },
  acabamento: { basico: 'Básico', medio: 'Médio', superior: 'Superior' },
} as const;

const NOMES_CLASSE = Object.fromEntries(CLASSES.map((k) => [k, CLASSE[k].nome])) as Record<Classe, string>;

const BOTAO =
  'inline-flex min-h-11 items-center border border-[color:var(--border)] px-4 text-sm hover:border-[color:var(--on-surface)]';

export function Construtor() {
  const { projeto: p, estado, despachar } = useGemeo();
  const rastrear = useRastreio(p.slug);
  const c = estado.casa;
  const mudar = (m: Partial<CasaConfig>) => {
    rastrear('configurator');
    despachar({ tipo: 'casa', mudar: m });
  };

  const o = useMemo(() => orcamento(c, estado.classe), [c, estado.classe]);
  const v = useMemo(() => compararVersoes(CASA_REFERENCIA, c, estado.classe), [c, estado.classe]);
  const conflitos = useMemo(() => interferencias(p, c), [p, c]);
  const alt = useMemo(() => (estado.alternativa ? orcamento(estado.alternativa, estado.classe) : null), [estado.alternativa, estado.classe]);
  const m = medidas(c);

  return (
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
      {/* Controlos */}
      <form className="flex flex-col gap-7 lg:col-span-5" onSubmit={(e) => e.preventDefault()} aria-label="Configurar a casa principal">
        <fieldset className="flex flex-col gap-4">
          <legend className={cn(ROTULO, 'mb-3')}>Dimensões</legend>
          <Deslizar rotulo="Comprimento" unidade="m" valor={c.comprimento} min={LIMITES_CASA.comprimento[0]} max={LIMITES_CASA.comprimento[1]} passo={0.5} onChange={(x) => mudar({ comprimento: x })} />
          <Deslizar rotulo="Largura" unidade="m" valor={c.largura} min={LIMITES_CASA.largura[0]} max={LIMITES_CASA.largura[1]} passo={0.5} onChange={(x) => mudar({ largura: x })} />
          <Deslizar rotulo="Pé-direito" unidade="m" valor={c.peDireito} min={LIMITES_CASA.peDireito[0]} max={LIMITES_CASA.peDireito[1]} passo={0.1} onChange={(x) => mudar({ peDireito: x })} />
          <Deslizar rotulo="Divisões" valor={c.divisoes} min={LIMITES_CASA.divisoes[0]} max={LIMITES_CASA.divisoes[1]} passo={1} onChange={(x) => mudar({ divisoes: x })} />
          <Deslizar rotulo="Portas" valor={c.portas} min={LIMITES_CASA.portas[0]} max={LIMITES_CASA.portas[1]} passo={1} onChange={(x) => mudar({ portas: x })} />
          <Deslizar rotulo="Janelas" valor={c.janelas} min={LIMITES_CASA.janelas[0]} max={LIMITES_CASA.janelas[1]} passo={1} onChange={(x) => mudar({ janelas: x })} />
        </fieldset>

        <fieldset className="grid gap-4 sm:grid-cols-2">
          <legend className={cn(ROTULO, 'mb-3')}>Materiais e acabamentos</legend>
          <Escolher rotulo="Paredes" valor={c.parede} opcoes={PAREDES} nomes={NOMES.parede} onChange={(x) => mudar({ parede: x })} />
          <Escolher rotulo="Cobertura" valor={c.cobertura} opcoes={COBERTURAS} nomes={NOMES.cobertura} onChange={(x) => mudar({ cobertura: x })} />
          <Escolher rotulo="Pavimento" valor={c.pavimento} opcoes={PAVIMENTOS} nomes={NOMES.pavimento} onChange={(x) => mudar({ pavimento: x })} />
          <Escolher rotulo="Acabamento" valor={c.acabamento} opcoes={ACABAMENTOS} nomes={NOMES.acabamento} onChange={(x) => mudar({ acabamento: x })} />
        </fieldset>

        <fieldset className="flex flex-col gap-4">
          <legend className={cn(ROTULO, 'mb-3')}>Implantação no terreno</legend>
          <Deslizar rotulo="Posição este (E)" unidade="m" valor={c.x} min={10} max={390} passo={1} onChange={(x) => mudar({ x })} />
          <Deslizar rotulo="Posição norte (N)" unidade="m" valor={c.y} min={10} max={290} passo={1} onChange={(y) => mudar({ y })} />
          <Deslizar rotulo="Rotação" unidade="°" valor={c.rotacao} min={LIMITES_CASA.rotacao[0]} max={LIMITES_CASA.rotacao[1]} passo={1} onChange={(r) => mudar({ rotacao: r })} />
          <Deslizar
            rotulo="Sombras: hora do dia (vista 3D)"
            unidade="h"
            valor={estado.hora}
            min={6}
            max={18}
            passo={0.5}
            onChange={(h) => despachar({ tipo: 'hora', hora: h })}
          />
        </fieldset>

        <div className="flex flex-col gap-2">
          <Escolher rotulo="Classe da estimativa" valor={estado.classe} opcoes={CLASSES} nomes={NOMES_CLASSE} onChange={(k) => despachar({ tipo: 'classe', classe: k })} />
          <p className="text-xs text-[color:var(--muted)]">
            A classe muda a faixa de incerteza e a reserva de contingência. Um custo só deixa de ser «conceptual» com um medidor-orçamentista ou engenheiro.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button type="button" className={BOTAO} onClick={() => despachar({ tipo: 'repor-casa' })}>
            Repor o projeto de referência
          </button>
          {estado.alternativa ? (
            <button type="button" className={BOTAO} onClick={() => despachar({ tipo: 'limpar-alternativa' })}>
              Limpar a alternativa A
            </button>
          ) : (
            <button type="button" className={BOTAO} onClick={() => despachar({ tipo: 'guardar-alternativa' })}>
              Guardar esta versão como alternativa A
            </button>
          )}
        </div>
      </form>

      {/* Resultados */}
      <div className="flex flex-col gap-8 lg:col-span-7">
        <div className="border border-[color:var(--hairline)] p-5">
          <p className={ROTULO}>Custo preliminar da casa · classe {CLASSE[estado.classe].nome.toLowerCase()}</p>
          <p className="mt-2 font-display text-[length:var(--text-h2)] leading-none font-semibold tabular-nums" data-testid="custo-casa">
            {mzn(o.total)}
            <Ficticio />
          </p>
          <p className="mt-2 text-sm text-[color:var(--muted)]">
            Faixa: {mzn(o.faixa[0])} a {mzn(o.faixa[1])} · {num(m.area)} m² · {mzn(o.total / m.area)}/m²
          </p>
          <p className="mt-4 text-sm" aria-live="polite" data-testid="frase-variacao">
            {v.mudancas.length ? <strong className="font-semibold">{variacao(v.percentagem)} · </strong> : null}
            {v.frase}
          </p>
        </div>

        <div role="status" aria-live="polite" data-testid="interferencias" data-total={conflitos.length}>
          {conflitos.length === 0 ? (
            <p className="text-sm text-[color:var(--muted)]">Implantação sem interferências com estradas, construções, redes ou talhões.</p>
          ) : (
            <div className="border-l-2 border-[color:var(--color-signal-500)] pl-4">
              <p className="text-sm font-semibold">
                {conflitos.length === 1 ? '1 interferência' : `${conflitos.length} interferências`} na implantação
              </p>
              <ul className="mt-2 flex flex-col gap-1 text-sm">
                {conflitos.map((k) => (
                  <li key={`${k.tipo}-${k.elemento}`}>{k.mensagem}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {alt && estado.alternativa ? (
          <div>
            <h4 className={ROTULO}>Alternativa A ao lado da versão atual</h4>
            <div role="region" aria-label="Comparação com a alternativa A" tabIndex={0} className="relative mt-3 overflow-x-auto focus-visible:outline-2">
              <table className="w-full min-w-[28rem] text-sm" data-testid="comparacao">
                <thead className={ROTULO}>
                  <tr>
                    <th scope="col" className="py-2 pr-3 text-left font-normal">Categoria</th>
                    <th scope="col" className="py-2 pr-3 text-right font-normal">
                      A ({num(estado.alternativa.comprimento * estado.alternativa.largura)} m²)
                    </th>
                    <th scope="col" className="py-2 pr-3 text-right font-normal">Atual ({num(m.area)} m²)</th>
                    <th scope="col" className="py-2 text-right font-normal">Diferença</th>
                  </tr>
                </thead>
                <tbody>
                  {(Object.keys(o.porCategoria) as CategoriaCusto[]).map((k) => (
                    <tr key={k} className="border-t border-[color:var(--hairline)]">
                      <th scope="row" className="py-1.5 pr-3 text-left font-normal">{NOME_CATEGORIA[k]}</th>
                      <td className="py-1.5 pr-3 text-right tabular-nums">{mzn(alt.porCategoria[k])}</td>
                      <td className="py-1.5 pr-3 text-right tabular-nums">{mzn(o.porCategoria[k])}</td>
                      <td className="py-1.5 text-right tabular-nums">{mzn(o.porCategoria[k] - alt.porCategoria[k])}</td>
                    </tr>
                  ))}
                  <tr className="border-t border-[color:var(--on-surface)] font-semibold">
                    <th scope="row" className="py-2 pr-3 text-left">Total</th>
                    <td className="py-2 pr-3 text-right tabular-nums">{mzn(alt.total)}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{mzn(o.total)}</td>
                    <td className="py-2 text-right tabular-nums">{mzn(o.total - alt.total)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        <div>
          <h4 className={ROTULO}>Mapa preliminar de quantidades</h4>
          <div role="region" aria-label="Quantidades de materiais" tabIndex={0} className="relative mt-3 overflow-x-auto focus-visible:outline-2">
            <table className="w-full min-w-[34rem] text-sm" data-testid="quantidades">
              <thead className={ROTULO}>
                <tr>
                  <th scope="col" className="py-2 pr-3 text-left font-normal">Material e regra</th>
                  <th scope="col" className="py-2 pr-3 text-right font-normal">Quantidade</th>
                  <th scope="col" className="py-2 pr-3 text-right font-normal">Preço unitário</th>
                  <th scope="col" className="py-2 text-right font-normal">Total</th>
                </tr>
              </thead>
              <tbody>
                {o.linhas.map((l) => (
                  <tr key={l.id} className="border-t border-[color:var(--hairline)] align-top">
                    <th scope="row" className="py-2 pr-3 text-left font-normal">
                      {l.material}
                      <span className="block text-xs text-[color:var(--muted)]">{l.formula}</span>
                    </th>
                    <td className="py-2 pr-3 text-right whitespace-nowrap tabular-nums">
                      {num(l.quantidade, l.unidade === 'm³' ? 2 : 1)} {l.unidade}
                    </td>
                    <td className="py-2 pr-3 text-right whitespace-nowrap tabular-nums">{mzn(l.precoUnitario)}</td>
                    <td className="py-2 text-right whitespace-nowrap tabular-nums">{mzn(l.total)}</td>
                  </tr>
                ))}
                <tr className="border-t border-[color:var(--hairline)]">
                  <th scope="row" className="py-2 pr-3 text-left font-normal">Transporte (6 % dos materiais)</th>
                  <td colSpan={2} />
                  <td className="py-2 text-right tabular-nums">{mzn(o.transporte)}</td>
                </tr>
                <tr className="border-t border-[color:var(--hairline)]">
                  <th scope="row" className="py-2 pr-3 text-left font-normal">
                    Reserva de contingência ({Math.round(CLASSE[estado.classe].contingencia * 100)} %)
                  </th>
                  <td colSpan={2} />
                  <td className="py-2 text-right tabular-nums">{mzn(o.contingencia)}</td>
                </tr>
                <tr className="border-t border-[color:var(--on-surface)] font-semibold">
                  <th scope="row" className="py-2 pr-3 text-left">Total preliminar</th>
                  <td colSpan={2} />
                  <td className="py-2 text-right tabular-nums">{mzn(o.total)}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-[color:var(--muted)]">
            Regras demonstrativas e base de preços fictícia ({BASE_PRECOS.versao}, MZN sem IVA). Não é uma medição nem uma cotação: numa
            versão real, as quantidades saem do modelo BIM (IFC) e são aprovadas por um profissional qualificado.
          </p>
        </div>

        <PlantaCasa c={c} />
      </div>
    </div>
  );
}

function Deslizar({
  rotulo,
  unidade,
  valor,
  min,
  max,
  passo,
  onChange,
}: {
  rotulo: string;
  unidade?: string;
  valor: number;
  min: number;
  max: number;
  passo: number;
  onChange: (v: number) => void;
}) {
  const id = useId();
  const texto = `${num(valor, passo < 1 ? 1 : 0)}${unidade ? ` ${unidade}` : ''}`;
  return (
    <div className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1">
      <label htmlFor={id} className="text-sm">
        {rotulo}
      </label>
      <output htmlFor={id} className="text-sm tabular-nums">
        {texto}
      </output>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={passo}
        value={valor}
        aria-valuetext={texto}
        onChange={(e) => onChange(Number(e.target.value))}
        className="col-span-2 min-h-8 w-full accent-[color:var(--color-signal-500)]"
      />
    </div>
  );
}

function Escolher<T extends string>({
  rotulo,
  valor,
  opcoes,
  nomes,
  onChange,
}: {
  rotulo: string;
  valor: T;
  opcoes: readonly T[];
  nomes: Readonly<Record<T, string>>;
  onChange: (v: T) => void;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm">
        {rotulo}
      </label>
      <select
        id={id}
        value={valor}
        onChange={(e) => onChange(e.target.value as T)}
        className="min-h-11 border border-[color:var(--border)] bg-[color:var(--surface)] px-3 text-sm"
      >
        {opcoes.map((o) => (
          <option key={o} value={o}>
            {nomes[o]}
          </option>
        ))}
      </select>
    </div>
  );
}

/** Esquema da planta da casa: divisões, portas e janelas. Não é um projeto de arquitetura. */
function PlantaCasa({ c }: { c: CasaConfig }) {
  const esc = 18;
  const W = c.comprimento * esc;
  const H = c.largura * esc;
  const colunas = Math.ceil(c.divisoes / 2);
  const linhas = c.divisoes > 1 ? 2 : 1;
  const perimetro = 2 * (W + H);
  const ponto = (t: number): [number, number, boolean] => {
    // Posição ao longo do perímetro (0..1) e se a parede é horizontal.
    let d = t * perimetro;
    if (d < W) return [d, 0, true];
    d -= W;
    if (d < H) return [W, d, false];
    d -= H;
    if (d < W) return [W - d, H, true];
    d -= W;
    return [0, H - d, false];
  };
  return (
    <figure>
      <figcaption className={ROTULO}>Planta arquitetónica · esquema, não é projeto</figcaption>
      <svg
        viewBox={`-28 -24 ${W + 48} ${H + 44}`}
        className="mt-3 block h-auto w-full max-w-[34rem]"
        role="img"
        aria-label={`Esquema da casa: ${num(c.comprimento, 1)} por ${num(c.largura, 1)} metros, ${c.divisoes} divisões, ${c.portas} portas e ${c.janelas} janelas.`}
      >
        <rect x="0" y="0" width={W} height={H} fill="none" stroke="currentColor" strokeWidth="4" />
        {Array.from({ length: colunas - 1 }, (_, i) => (
          <line key={`c${i}`} x1={((i + 1) * W) / colunas} y1="0" x2={((i + 1) * W) / colunas} y2={H} stroke="currentColor" strokeWidth="2" />
        ))}
        {linhas === 2 ? <line x1="0" y1={H / 2} x2={W} y2={H / 2} stroke="currentColor" strokeWidth="2" /> : null}
        {Array.from({ length: c.janelas }, (_, i) => {
          const [x, y, horizontal] = ponto((i + 0.5) / c.janelas);
          return horizontal ? (
            <rect key={`j${i}`} x={x - 10} y={y - 3} width="20" height="6" fill="var(--surface)" stroke="currentColor" strokeWidth="1.2" />
          ) : (
            <rect key={`j${i}`} x={x - 3} y={y - 10} width="6" height="20" fill="var(--surface)" stroke="currentColor" strokeWidth="1.2" />
          );
        })}
        {Array.from({ length: Math.min(c.portas, colunas * linhas) }, (_, i) => {
          const x = (((i % colunas) + 0.5) * W) / colunas;
          const y = linhas === 2 ? H / 2 : H;
          return <path key={`p${i}`} d={`M${x - 8} ${y} A16 16 0 0 1 ${x + 8} ${y - 14}`} fill="none" stroke="var(--color-signal-500)" strokeWidth="1.4" />;
        })}
        <text x={W / 2} y={-8} textAnchor="middle" fontSize="11" fill="currentColor">
          {num(c.comprimento, 1)} m
        </text>
        <text x={-12} y={H / 2} textAnchor="middle" fontSize="11" fill="currentColor" transform={`rotate(-90 -12 ${H / 2})`}>
          {num(c.largura, 1)} m
        </text>
      </svg>
    </figure>
  );
}
