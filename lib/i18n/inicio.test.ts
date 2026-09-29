import { describe, expect, it } from 'vitest';
import { DEMO_DISCLAIMER, DEMO_DISCLAIMER_EN } from '@/content/types';
import { FOUNDERS } from '@/content/site';
import { conteudoDoInicio } from '@/content/i18n/inicio';

/**
 * A página inicial inglesa é a portuguesa traduzida: as mesmas secções, o
 * mesmo número de itens, nenhuma frase por traduzir — e o aviso de
 * demonstração em todas as demonstrações, que é a obrigação de integridade
 * da secção de prova.
 */
const pt = conteudoDoInicio('pt');
const en = conteudoDoInicio('en');

function frases(c: ReturnType<typeof conteudoDoInicio>): string[] {
  return [
    c.fluxo.eyebrow,
    c.fluxo.title,
    c.fluxo.lead,
    ...c.fluxo.steps.flatMap((s) => [s.title, s.body]),
    c.processo.eyebrow,
    c.processo.title,
    c.processo.lead,
    ...c.processo.steps.flatMap((s) => [s.title, s.body]),
    ...c.problemas.flatMap((p) => [p.title, p.body]),
    c.risco.eyebrow,
    c.risco.title,
    c.risco.body,
    ...c.risco.points,
    ...c.prova.flatMap((p) => [p.title, p.body]),
    c.provaSecao.eyebrow,
    c.provaSecao.title,
    c.provaSecao.lead,
    c.fundadores.eyebrow,
    c.fundadores.title,
    ...FOUNDERS.people.map((p) => c.fundadores.corpo(p.photo)),
    ...c.faq.flatMap((f) => [f.q, f.a]),
  ];
}

describe('página inicial em inglês', () => {
  it('tem o mesmo número de itens em cada lista', () => {
    const contagem = (c: typeof pt) => ({
      fluxo: c.fluxo.steps.length,
      processo: c.processo.steps.length,
      problemas: c.problemas.length,
      risco: c.risco.points.length,
      prova: c.prova.length,
      faq: c.faq.length,
    });
    expect(contagem(en)).toEqual(contagem(pt));
  });

  it('as chaves do fluxo e os tipos de prova coincidem, pela mesma ordem', () => {
    expect(en.fluxo.steps.map((s) => s.key)).toEqual(pt.fluxo.steps.map((s) => s.key));
    expect(en.prova.map((p) => p.kind)).toEqual(pt.prova.map((p) => p.kind));
  });

  it('nenhuma frase ficou por traduzir', () => {
    const a = frases(pt);
    const b = frases(en);
    expect(b).toHaveLength(a.length);
    expect(b.filter((texto, i) => texto === a[i])).toEqual([]);
  });

  it('cada demonstração leva o aviso no seu idioma', () => {
    for (const [c, aviso] of [
      [pt, DEMO_DISCLAIMER],
      [en, DEMO_DISCLAIMER_EN],
    ] as const) {
      const demos = c.prova.filter((p) => p.kind === 'conceptual-demo');
      expect(demos.length).toBeGreaterThan(0);
      for (const d of demos) expect(d.kind === 'conceptual-demo' && d.disclaimer).toBe(aviso);
    }
  });
});
