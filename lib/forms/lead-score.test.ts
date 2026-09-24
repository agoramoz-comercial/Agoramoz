import { describe, expect, it } from 'vitest';
import { scoreLead } from './lead-score';
import type { LeadInput } from './lead-schema';

/**
 * Testes de CARACTERIZAÇÃO, não de especificação.
 *
 * Fixam o que `scoreLead` faz hoje, para que a próxima alteração — acrescentar
 * `scoring_version`, mudar pesos, extrair regras — tenha de declarar
 * explicitamente o que está a mudar em vez de o mudar sem ninguém dar por isso.
 * Se um destes falhar depois de uma alteração deliberada, actualiza-se o
 * esperado no mesmo commit que altera a regra; o que não pode é falhar sem
 * alguém ter decidido.
 *
 * Os pesos usados nas contas abaixo não são inventados: as faixas vêm de
 * `content/countries/mz.ts` e os restantes de `lead-score.ts`.
 */

/** Base válida e mínima. Cada teste sobrepõe só o que lhe interessa. */
function lead(overrides: Partial<LeadInput> = {}): LeadInput {
  return {
    country: 'mz',
    sector: 'energia-mineracao',
    company: 'Empresa Exemplo',
    companySize: '1-9',
    currentWebsite: '',
    processToImprove: ['comercial'],
    // 24 caracteres: acima do mínimo do schema (20), abaixo do primeiro
    // patamar de clareza (60), logo vale 2 pontos.
    problemImpact: 'Perdemos muito tempo.'.padEnd(24, '.'),
    decisionTimeframe: 'sem-data',
    investmentBand: 'mz-0',
    decisionRole: 'pesquisa',
    name: 'Nome Exemplo',
    workEmail: 'nome@exemplo.co.mz',
    phone: '+258840000000',
    consent: true,
    ...overrides,
  };
}

describe('scoreLead — extremos', () => {
  it('soma 100 e devolve A no cenário máximo', () => {
    const { score, tier } = scoreLead(
      lead({
        investmentBand: 'mz-4', //          25  (Acima de 2 000 000 MZN)
        companySize: '250+', //             20
        decisionTimeframe: 'imediato', //   20
        decisionRole: 'decisor', //         15
        problemImpact: 'x'.repeat(160), //  10  (>= 160 caracteres)
        processToImprove: ['a', 'b', 'c'], // 5  (min(3*2, 5))
        currentWebsite: 'https://exemplo.co.mz', // 5
      }),
    );

    expect(score).toBe(100);
    expect(tier).toBe('A');
  });

  it('soma 20 e devolve D no cenário mínimo', () => {
    const { score, tier } = scoreLead(lead());
    //  4 (mz-0) + 5 (1-9) + 3 (sem-data) + 2 (pesquisa)
    //  + 2 (impacto curto) + 2 (1 processo) + 2 (sem website) = 20
    expect(score).toBe(20);
    expect(tier).toBe('D');
  });
});

describe('scoreLead — fronteiras de tier', () => {
  it('70 é o primeiro valor de A, não de B', () => {
    const { score, tier } = scoreLead(
      lead({
        investmentBand: 'mz-4', //             25
        companySize: '250+', //                20
        decisionTimeframe: '3-6-meses', //      8
        decisionRole: 'co-decisor', //         11
        // +2 impacto +2 âmbito +2 maturidade = 70
      }),
    );

    expect(score).toBe(70);
    expect(tier).toBe('A');
  });

  it('50 é o primeiro valor de B, não de C', () => {
    const { score, tier } = scoreLead(
      lead({
        investmentBand: 'mz-1', //              6
        companySize: '50-249', //              17
        decisionTimeframe: '1-3-meses', //     15
        decisionRole: 'influenciador', //       6
        // +2 +2 +2 = 50
      }),
    );

    expect(score).toBe(50);
    expect(tier).toBe('B');
  });
});

describe('scoreLead — patamares de clareza do problema', () => {
  it.each([
    ['abaixo de 60', 59, 2],
    ['exactamente 60', 60, 6],
    ['abaixo de 160', 159, 6],
    ['exactamente 160', 160, 10],
  ])('impacto com %s caracteres vale %i → %i pontos', (_rotulo, comprimento, esperado) => {
    const base = scoreLead(lead({ problemImpact: 'x'.repeat(59) })).score;
    const obtido = scoreLead(lead({ problemImpact: 'x'.repeat(comprimento) })).score;
    expect(obtido - base).toBe(esperado - 2);
  });

  it('ignora espaço em branco nas pontas ao medir clareza', () => {
    const comEspacos = scoreLead(lead({ problemImpact: `   ${'x'.repeat(60)}   ` })).score;
    const semEspacos = scoreLead(lead({ problemImpact: 'x'.repeat(60) })).score;
    expect(comEspacos).toBe(semEspacos);
  });
});

describe('scoreLead — âmbito', () => {
  it.each([
    [1, 2],
    [2, 4],
    [3, 5],
    [9, 5],
  ])('%i processo(s) contribui(em) com %i pontos, com tecto em 5', (n, esperado) => {
    const base = scoreLead(lead({ processToImprove: ['a'] })).score;
    const obtido = scoreLead(lead({
      processToImprove: Array.from({ length: n }, (_, i) => `p${i}`),
    })).score;
    expect(obtido - base).toBe(esperado - 2);
  });
});

describe('scoreLead — robustez', () => {
  it('não contribui nem explica quando a faixa de investimento é desconhecida', () => {
    const { score, reasons } = scoreLead(lead({ investmentBand: 'faixa-que-nao-existe' }));

    // 20 do cenário mínimo, menos os 4 da faixa mz-0.
    expect(score).toBe(16);
    expect(reasons).toHaveLength(6);
    expect(reasons.some((r) => r.startsWith('Faixa de investimento'))).toBe(false);
  });

  it('é determinística: a mesma entrada produz sempre a mesma saída', () => {
    const entrada = lead({ investmentBand: 'mz-3', companySize: '50-249' });
    expect(scoreLead(entrada)).toEqual(scoreLead(entrada));
  });

  it('explica cada contribuição, uma razão por dimensão', () => {
    const { reasons } = scoreLead(lead());
    expect(reasons).toHaveLength(7);
    for (const r of reasons) expect(r).toMatch(/\(\+\d+\)$/);
  });

  /**
   * Esta é a razão de ser da função: separar seguimento imediato de
   * seguimento em lote. Se a ordem alguma vez inverter, o comercial certo
   * deixa de ser contactado primeiro — e nada no site o denunciaria.
   */
  it('ordena tiers de forma monótona com a pontuação', () => {
    const ordem = { A: 4, B: 3, C: 2, D: 1 } as const;
    const fraco = scoreLead(lead());
    const forte = scoreLead(
      lead({ investmentBand: 'mz-4', companySize: '250+', decisionTimeframe: 'imediato' }),
    );

    expect(forte.score).toBeGreaterThan(fraco.score);
    expect(ordem[forte.tier]).toBeGreaterThan(ordem[fraco.tier]);
  });
});
