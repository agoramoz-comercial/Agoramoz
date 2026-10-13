'use client';

import { useMemo } from 'react';
import { avaliarCenarios, KG_CO2_POR_KWH_GASOLEO, KWH_POR_KWP } from '@/lib/terrabuild/cenarios';
import { milhoes, mzn, num } from '@/lib/terrabuild/formato';
import { useGemeo } from './estado';
import { ROTULO } from './ui';

/**
 * Os três cenários lado a lado, recalculados com a casa que está no
 * construtor. Uma tabela e não um gráfico: são grandezas diferentes, e o que
 * se compara são valores exatos — o gráfico só esconderia isso.
 */

const RISCO = { baixo: 'Baixo', medio: 'Médio', alto: 'Alto' } as const;

export function Cenarios() {
  const { projeto: p, estado } = useGemeo();
  const r = useMemo(() => avaliarCenarios(p, estado.casa, estado.classe), [p, estado.casa, estado.classe]);
  const linhas: { rotulo: string; valor: (i: number) => React.ReactNode }[] = [
    { rotulo: 'Capital necessário', valor: (i) => milhoes(r[i]!.investimento) },
    { rotulo: 'Custos anuais', valor: (i) => mzn(r[i]!.custosAnuais) },
    { rotulo: 'Produção', valor: (i) => `${num(r[i]!.producaoT, 1)} t/ano` },
    { rotulo: 'Receita potencial', valor: (i) => `${mzn(r[i]!.receita)}/ano` },
    { rotulo: 'Margem anual', valor: (i) => mzn(r[i]!.margemAnual) },
    {
      rotulo: 'Recuperação simples do capital',
      valor: (i) => (r[i]!.retornoAnos === null ? 'Não recupera o capital' : `${num(r[i]!.retornoAnos!, 1)} anos`),
    },
    { rotulo: 'Risco', valor: (i) => RISCO[r[i]!.risco] },
    { rotulo: 'Empregos', valor: (i) => num(r[i]!.empregos) },
    { rotulo: 'Água do furo / necessidade', valor: (i) => `${Math.round(r[i]!.coberturaAgua)} %` },
    { rotulo: 'Água consumida', valor: (i) => `${num(r[i]!.aguaM3)} m³/ano` },
    { rotulo: 'Energia solar', valor: (i) => (r[i]!.energiaKwh ? `${num(r[i]!.energiaKwh)} kWh/ano` : '—') },
    { rotulo: 'Emissões evitadas (estimativa)', valor: (i) => (r[i]!.emissoesEvitadasT ? `${num(r[i]!.emissoesEvitadasT, 1)} t CO₂/ano` : '—') },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div role="region" aria-label="Tabela dos cenários A, B e C" tabIndex={0} className="relative overflow-x-auto focus-visible:outline-2">
        <table className="w-full min-w-[40rem] text-sm" data-testid="cenarios">
          <caption className="sr-only">Cenários A, B e C da Fazenda Inteligente 001, com valores fictícios</caption>
          <thead>
            <tr className="align-bottom">
              <th scope="col">
                <span className="sr-only">Indicador</span>
              </th>
              {p.cenarios.map((c) => (
                <th key={c.id} scope="col" className="pb-4 pl-4 text-left font-normal">
                  <span className="numeral block text-[length:var(--text-h2)]">{c.id}</span>
                  <span className="mt-1 block font-display text-base font-semibold">
                    {c.nome}
                  </span>
                  <span className="mt-1 block text-xs text-[color:var(--muted)]">{c.resumo}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {linhas.map((l) => (
              <tr key={l.rotulo} className="border-t border-[color:var(--hairline)]">
                <th scope="row" className={`${ROTULO} py-2.5 pr-4 text-left font-normal`}>
                  {l.rotulo}
                </th>
                {p.cenarios.map((c, i) => (
                  <td key={c.id} className="py-2.5 pl-4 tabular-nums">
                    {l.valor(i)}
                  </td>
                ))}
              </tr>
            ))}
            <tr className="border-t border-[color:var(--hairline)] align-top">
              <th scope="row" className={`${ROTULO} py-2.5 pr-4 text-left font-normal`}>
                Inclui
              </th>
              {p.cenarios.map((c) => (
                <td key={c.id} className="py-2.5 pl-4">
                  <ul className="flex flex-col gap-0.5 text-xs">
                    {c.inclui.map((x) => (
                      <li key={x}>{x}</li>
                    ))}
                  </ul>
                </td>
              ))}
            </tr>
            <tr className="border-t border-[color:var(--hairline)] align-top">
              <th scope="row" className={`${ROTULO} py-2.5 pr-4 text-left font-normal`}>
                Expansibilidade
              </th>
              {p.cenarios.map((c) => (
                <td key={c.id} className="py-2.5 pl-4 text-xs">
                  {c.expansibilidade}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
      <p className="text-xs text-[color:var(--muted)]">
        Todos os valores são fictícios, sem desconto nem inflação. O investimento soma os elementos do terreno, os extras e a instalação das
        culturas, com a casa como está no construtor. Energia: {num(KWH_POR_KWP)} kWh por kWp por ano; emissões evitadas face a gerador a
        gasóleo: {num(KG_CO2_POR_KWH_GASOLEO, 1)} kg CO₂/kWh — ambos fatores da demo. Receitas de processamento e conservação estão
        incluídas nos cenários B e C.
      </p>
    </div>
  );
}
