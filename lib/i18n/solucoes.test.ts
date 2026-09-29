import { describe, expect, it } from 'vitest';
import { SOLUTIONS, getSolucao } from '@/content/registry';
import { SOLUTIONS_EN } from '@/content/en/solutions';
import { RESUMO_SOLUCAO } from '@/content/i18n/chrome';
import type { SolutionPage } from '@/content/types';
import { ROTAS_BILINGUES } from './rotas';

/**
 * A página inglesa de uma solução é a portuguesa traduzida — não outra página.
 * Mesmo slug, mesmas listas com o mesmo comprimento: uma pergunta a mais ou um
 * passo a menos num dos lados é uma promessa que só um dos idiomas faz.
 */
const LISTAS = ['problems', 'useCases', 'components', 'integrations', 'process', 'security', 'faq'] as const;

describe('soluções em inglês', () => {
  const slugs = Object.keys(SOLUTIONS);

  it('há uma página inglesa por cada portuguesa, e nenhuma a mais', () => {
    expect(Object.keys(SOLUTIONS_EN).sort()).toEqual([...slugs].sort());
  });

  it.each(slugs)('%s: mesmo slug e listas com o mesmo comprimento', (slug) => {
    const pt = SOLUTIONS[slug];
    const en = SOLUTIONS_EN[pt.slug];
    expect(en.slug).toBe(pt.slug);
    for (const lista of LISTAS) {
      expect({ lista, n: (en[lista] as readonly unknown[]).length }).toEqual({
        lista,
        n: (pt[lista] as readonly unknown[]).length,
      });
    }
  });

  it.each(slugs)('%s: nenhum texto ficou por traduzir', (slug) => {
    const pt = SOLUTIONS[slug];
    const en = SOLUTIONS_EN[pt.slug];
    const textos = (s: SolutionPage) => [
      s.label,
      s.short,
      s.hero.eyebrow,
      s.hero.h1,
      s.hero.lead,
      s.result,
      s.seo.title,
      s.seo.description,
      ...s.problems.flatMap((p) => [p.title, p.body]),
      ...s.useCases,
      ...s.components.flatMap((c) => [c.title, c.body]),
      ...s.integrations,
      ...s.process.flatMap((p) => [p.title, p.body]),
      ...s.security,
      ...s.faq.flatMap((f) => [f.q, f.a]),
    ];
    const iguais = textos(en).filter((texto, i) => texto === textos(pt)[i]);
    expect(iguais).toEqual([]);
  });

  it.each(slugs)('%s: o nome inglês é o mesmo do menu e do rodapé', (slug) => {
    const en = SOLUTIONS_EN[SOLUTIONS[slug].slug];
    expect(en.label).toBe(RESUMO_SOLUCAO[en.slug].label.en);
  });

  it('o acessor devolve o idioma pedido e nada para um slug desconhecido', () => {
    expect(getSolucao('agentes-ia', 'pt')).toBe(SOLUTIONS['agentes-ia']);
    expect(getSolucao('agentes-ia', 'en')).toBe(SOLUTIONS_EN['agentes-ia']);
    expect(getSolucao('nao-existe', 'en')).toBeNull();
  });

  it('as cinco rotas estão na lista bilingue', () => {
    for (const slug of slugs) expect(ROTAS_BILINGUES).toContain(`/solucoes/${slug}`);
  });
});
