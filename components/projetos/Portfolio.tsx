'use client';

import Link from 'next/link';
import { useId, useMemo, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { MAPA_MZ_VIEWBOX, PROVINCIAS_MZ } from '@/content/projetos/mapa-mz';
import { FAIXAS_CAPITAL, NOME_ESTADO, PORTFOLIO, type CartaoProjeto, type EstadoProjeto } from '@/content/projetos/portfolio';
import { milhoes } from '@/lib/terrabuild/formato';
import { cn } from '@/lib/utils/cn';
import { Badge } from '@/components/ui/Badge';
import { Progresso, ROTULO } from './ui';
import { Render } from './Render';

/**
 * Mapa de Moçambique com o portefólio fictício e filtros. Os filtros vivem
 * na página (nada no URL nem guardado). O mapa repete o que a lista diz —
 * por isso é uma imagem com descrição, e a navegação faz-se pela lista.
 */

const SETORES = [...new Set(PORTFOLIO.map((p) => p.setor))];

export function Portfolio() {
  const [provincia, setProvincia] = useState('todas');
  const [setor, setSetor] = useState('todos');
  const [estado, setEstado] = useState<'todos' | EstadoProjeto>('todos');
  const [faixa, setFaixa] = useState('todas');
  const [realce, setRealce] = useState<string | null>(null);
  const ids = { p: useId(), s: useId(), e: useId(), c: useId() };

  const visiveis = useMemo(
    () =>
      PORTFOLIO.filter((x) => {
        const f = FAIXAS_CAPITAL.find((k) => k.id === faixa);
        return (
          (provincia === 'todas' || x.provincia === provincia) &&
          (setor === 'todos' || x.setor === setor) &&
          (estado === 'todos' || x.estado === estado) &&
          (!f || (x.capital >= f.min && x.capital < f.max))
        );
      }),
    [provincia, setor, estado, faixa],
  );
  const comProjeto = new Set(visiveis.map((x) => x.provincia));

  return (
    <div className="flex flex-col gap-10">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" role="group" aria-label="Filtrar projetos">
        <Filtro id={ids.p} rotulo="Província" valor={provincia} onChange={setProvincia} opcoes={[['todas', 'Todas'], ...PROVINCIAS_MZ.map((p) => [p.id, p.nome] as const)]} />
        <Filtro id={ids.s} rotulo="Setor" valor={setor} onChange={setSetor} opcoes={[['todos', 'Todos'], ...SETORES.map((s) => [s, s] as const)]} />
        <Filtro
          id={ids.e}
          rotulo="Estado"
          valor={estado}
          onChange={(v) => setEstado(v as typeof estado)}
          opcoes={[['todos', 'Todos'], ...(Object.keys(NOME_ESTADO) as EstadoProjeto[]).map((k) => [k, NOME_ESTADO[k]] as const)]}
        />
        <Filtro id={ids.c} rotulo="Capital" valor={faixa} onChange={setFaixa} opcoes={[['todas', 'Todas'], ...FAIXAS_CAPITAL.map((f) => [f.id, f.nome] as const)]} />
      </div>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
        <figure className="lg:col-span-5">
          <svg
            viewBox={`0 0 ${MAPA_MZ_VIEWBOX.largura} ${MAPA_MZ_VIEWBOX.altura}`}
            className="mx-auto block h-auto w-full max-w-[24rem]"
            role="img"
            aria-label={`Mapa de Moçambique com ${visiveis.length} projeto(s) fictício(s) visível(eis): ${visiveis.map((v) => `${v.nome} (${v.provinciaNome})`).join('; ') || 'nenhum com estes filtros'}.`}
            data-testid="mapa-mz"
          >
            {PROVINCIAS_MZ.map((p) => (
              <path
                key={p.id}
                d={p.d}
                fill={comProjeto.has(p.id) ? 'var(--on-surface)' : 'var(--surface-raised)'}
                fillOpacity={comProjeto.has(p.id) ? 0.16 : 1}
                stroke="var(--muted)"
                strokeWidth="0.8"
                strokeLinejoin="round"
                className={cn(provincia === p.id && 'stroke-[color:var(--on-surface)]')}
              />
            ))}
            {visiveis.map((v) => {
              const pr = PROVINCIAS_MZ.find((p) => p.id === v.provincia)!;
              const [x, y] = pr.rotulo;
              const ativo = realce === v.id;
              return (
                <g key={v.id} transform={`translate(${x} ${y})`} data-pino={v.id}>
                  <circle r={ativo ? 15 : 11} fill="var(--color-signal-500)" fillOpacity="0.18" />
                  <circle r="6" fill="var(--color-signal-600)" stroke="var(--surface)" strokeWidth="2" />
                  <text x="12" y="4" fontSize="15" fill="var(--on-surface)" className="font-[family-name:var(--font-chakra)]">
                    {v.id}
                  </text>
                </g>
              );
            })}
          </svg>
          <figcaption className="mt-3 text-center text-xs text-[color:var(--muted)]">
            Localização aproximada, por província. Limites: Natural Earth (domínio público).
          </figcaption>
        </figure>

        <div className="flex flex-col gap-4 lg:col-span-7">
          <p className={ROTULO} aria-live="polite" data-testid="contagem-projetos">
            {visiveis.length === 1 ? '1 projeto' : `${visiveis.length} projetos`} · todos fictícios
          </p>
          {visiveis.length === 0 ? (
            <p className="text-sm text-[color:var(--muted)]">Nenhum projeto com estes filtros.</p>
          ) : (
            <ul className="flex flex-col gap-4">
              {visiveis.map((v) => (
                <li key={v.id} onMouseEnter={() => setRealce(v.id)} onMouseLeave={() => setRealce(null)} onFocus={() => setRealce(v.id)}>
                  <Cartao v={v} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function Cartao({ v }: { v: CartaoProjeto }) {
  return (
    <article className="flex flex-col gap-3 border border-[color:var(--hairline)] p-5" aria-labelledby={`cartao-${v.id}`}>
      {v.slug === 'fazenda-inteligente-001' ? <Render qual="patio" legenda="curta" sizes="(min-width: 1024px) 420px, 100vw" /> : null}
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="conceptual">Demonstração</Badge>
        <Badge>{NOME_ESTADO[v.estado]}</Badge>
        <span className="text-xs text-[color:var(--muted)]">
          {v.provinciaNome} · {v.setor}
        </span>
      </div>
      <h3 id={`cartao-${v.id}`} className="font-display text-[length:var(--text-h3)] font-semibold tracking-[var(--tracking-heading)]">
        <span className="numeral mr-2 text-[color:var(--muted)]">{v.id}</span>
        {v.nome}
      </h3>
      <p className="text-sm text-[color:var(--muted)]">{v.resumo}</p>
      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className={ROTULO}>Capital necessário (fictício)</dt>
          <dd className="mt-1 tabular-nums">{milhoes(v.capital)}</dd>
        </div>
        <div>
          <dt className={ROTULO}>Progresso</dt>
          <dd className="mt-2">
            <Progresso valor={v.progresso} rotulo={`Progresso de ${v.nome}`} />
          </dd>
        </div>
      </dl>
      {v.slug ? (
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          <Link href={`/projetos/${v.slug}#gemeo-3d`} className="group inline-flex min-h-11 items-center gap-2 text-sm font-medium">
            Explorar em 3D
            <ArrowRight aria-hidden className="size-4 transition-transform duration-300 group-hover:translate-x-0.5" />
          </Link>
          <Link href={`/projetos/${v.slug}#marcos`} className="inline-flex min-h-11 items-center text-sm underline-offset-4 hover:underline">
            Ver plano de capital
          </Link>
          <Link href={`/projetos/${v.slug}#assistente`} className="inline-flex min-h-11 items-center text-sm underline-offset-4 hover:underline">
            Perguntar ao assistente
          </Link>
        </div>
      ) : (
        <p className="text-xs text-[color:var(--muted)]">Cartão ilustrativo: sem gémeo digital nesta demonstração.</p>
      )}
    </article>
  );
}

function Filtro({
  id,
  rotulo,
  valor,
  onChange,
  opcoes,
}: {
  id: string;
  rotulo: string;
  valor: string;
  onChange: (v: string) => void;
  opcoes: readonly (readonly [string, string])[];
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm">
        {rotulo}
      </label>
      <select
        id={id}
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-11 border border-[color:var(--border)] bg-[color:var(--surface)] px-3 text-sm"
      >
        {opcoes.map(([v, n]) => (
          <option key={v} value={v}>
            {n}
          </option>
        ))}
      </select>
    </div>
  );
}
