'use client';

import { useId, useMemo } from 'react';
import {
  balancoAgua,
  CENARIOS_AGRO,
  DIAS_BOMBAGEM,
  FATORES_AGRO,
  fracaoCheiaTalhao,
  riscoClimatico,
  simularCultura,
} from '@/lib/terrabuild/agro';
import { mzn, num, percentagem } from '@/lib/terrabuild/formato';
import { hectaresPorTalhao } from '@/lib/terrabuild/obra';
import { cn } from '@/lib/utils/cn';
import { useGemeo } from './estado';
import { useRastreio } from './rastreio';
import { Alternar, Ficticio, Indicador, ROTULO } from './ui';

/**
 * Motor agrícola: escolher uma cultura e uma área mostra a cadeia inteira —
 * produção, receita, custos, margem, preço de equilíbrio, água e risco.
 * Coeficientes fictícios; o mecanismo é o que se demonstra.
 */

const NIVEL = { baixo: 'Baixo', medio: 'Médio', alto: 'Alto' } as const;

export function PainelAgricola() {
  const { projeto: p, estado, despachar } = useGemeo();
  const rastrear = useRastreio(p.slug);
  const idCultura = useId();
  const idHa = useId();

  const cultura = p.culturas.find((c) => c.id === estado.cultura) ?? p.culturas[0]!;
  const porTalhao = useMemo(() => hectaresPorTalhao(p), [p]);
  const maximo = cultura.talhoes.reduce((s, t) => s + (porTalhao[t] ?? 0), 0);
  const ha = Math.min(estado.hectares, maximo);

  const r = simularCultura(cultura, ha, estado.cenarioAgro);
  const cenarios = CENARIOS_AGRO.map((k) => ({ k, r: simularCultura(cultura, ha, k) }));
  const maxReceita = Math.max(...cenarios.map((x) => x.r.receita), 1);
  const agua = balancoAgua(p, r.aguaM3);
  // Milhares de amostras do terreno: só dependem da cultura, não de cada deslizador.
  const cheiaPior = useMemo(
    () => Math.max(...cultura.talhoes.map((t) => fracaoCheiaTalhao(p, t))),
    [p, cultura],
  );
  const risco = riscoClimatico(cultura, agua.cobertura, cheiaPior);

  const mudar = (cul: string) => {
    rastrear('agro');
    const nova = p.culturas.find((c) => c.id === cul)!;
    const max = nova.talhoes.reduce((s, t) => s + (porTalhao[t] ?? 0), 0);
    despachar({ tipo: 'cultura', cultura: cul, hectares: Math.min(estado.hectares, Math.round(max * 10) / 10) });
  };

  return (
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
      <div className="flex flex-col gap-6 lg:col-span-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor={idCultura} className="text-sm">
            Cultura
          </label>
          <select
            id={idCultura}
            value={cultura.id}
            onChange={(e) => mudar(e.target.value)}
            className="min-h-11 border border-[color:var(--border)] bg-[color:var(--surface)] px-3 text-sm"
          >
            {p.culturas.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1">
          <label htmlFor={idHa} className="text-sm">
            Área cultivada
          </label>
          <output htmlFor={idHa} className="text-sm tabular-nums">
            {num(ha, 2)} ha
          </output>
          <input
            id={idHa}
            type="range"
            min={0.1}
            max={Math.max(0.1, Math.floor(maximo * 100) / 100)}
            step={0.05}
            value={ha}
            aria-valuetext={`${num(ha, 2)} hectares`}
            onChange={(e) => {
              rastrear('agro');
              despachar({ tipo: 'hectares', hectares: Number(e.target.value) });
            }}
            className="col-span-2 min-h-8 w-full accent-[color:var(--color-signal-500)]"
          />
          <p className="col-span-2 text-xs text-[color:var(--muted)]">
            Até {num(maximo, 2)} ha nos talhões onde esta cultura cabe ({cultura.talhoes.join(', ').replace(/t(\d)/g, 'T$1')}).
          </p>
        </div>
        <fieldset className="flex flex-wrap gap-2">
          <legend className={cn(ROTULO, 'mb-2 w-full')}>Cenário de mercado</legend>
          {CENARIOS_AGRO.map((k) => (
            <Alternar key={k} ativo={estado.cenarioAgro === k} onClick={() => despachar({ tipo: 'cenario-agro', cenario: k })}>
              {FATORES_AGRO[k].nome}
            </Alternar>
          ))}
        </fieldset>
        <p className="text-xs text-[color:var(--muted)]">
          Rendimentos, preços, custos e água por cultura são fictícios. Numa versão real vêm da análise de solo, do histórico climático, de
          dados de mercado e do agrónomo; o estado da cultura chegaria por imagem de satélite ou de drone.
        </p>
      </div>

      <div className="flex flex-col gap-8 lg:col-span-8">
        <dl className="grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-3" data-testid="painel-agricola">
          <Indicador rotulo="Produção por ano" valor={<>{num(r.producaoT, 1)} t<Ficticio /></>} nota={`${cultura.ciclosAno} ciclo(s) de ${cultura.cicloMeses} meses`} />
          <Indicador rotulo="Receita por ano" valor={<>{mzn(r.receita)}<Ficticio /></>} nota={`${num(cultura.preco)} MZN/kg × ${FATORES_AGRO[estado.cenarioAgro].preco}`} />
          <Indicador rotulo="Custos por ano" valor={<>{mzn(r.custoAnual)}<Ficticio /></>} nota={`Instalação única: ${mzn(r.instalacao)}`} />
          <Indicador rotulo="Margem por ano" valor={<>{mzn(r.margem)}<Ficticio /></>} />
          <Indicador
            rotulo="Preço de equilíbrio"
            valor={r.precoEquilibrio === null ? '—' : `${num(r.precoEquilibrio, 1)} MZN/kg`}
            nota="Abaixo deste preço a cultura não paga os custos do ano"
          />
          <Indicador
            rotulo="Risco climático"
            valor={NIVEL[risco.nivel]}
            nota={`Seca ${num(risco.seca * 100)} % · cheia ${num(risco.cheia * 100)} % (talhão mais baixo)`}
          />
        </dl>

        <div>
          <h3 className={ROTULO}>Água: necessidade contra disponibilidade</h3>
          <p className="mt-2 text-sm">
            A cultura pede cerca de <strong className="font-semibold tabular-nums">{num(agua.necessidade)} m³</strong> por ano. O furo dá{' '}
            <strong className="font-semibold tabular-nums">{num(agua.oferta)} m³</strong> ({p.agua.furoM3Dia} m³/dia em {DIAS_BOMBAGEM} dias):{' '}
            <strong className="font-semibold">{percentagem(agua.cobertura)}</strong> do que é preciso. O reservatório de {num(p.agua.reservatorioM3)} m³ guarda
            cerca de {num(Math.min(agua.autonomiaDias, 999))} dias de rega sem bombagem.
          </p>
        </div>

        <div>
          <h3 className={ROTULO}>Receita por cenário de mercado</h3>
          <ul className="mt-3 flex flex-col gap-2 text-sm">
            {cenarios.map(({ k, r: x }) => (
              <li key={k} className="grid grid-cols-[6.5rem_1fr_auto] items-center gap-3">
                <span>{FATORES_AGRO[k].nome}</span>
                <span aria-hidden className="h-2 bg-[color:var(--hairline)]">
                  <span className="block h-full bg-[color:var(--on-surface)]" style={{ width: `${(x.receita / maxReceita) * 100}%` }} />
                </span>
                <span className="tabular-nums">{mzn(x.receita)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
