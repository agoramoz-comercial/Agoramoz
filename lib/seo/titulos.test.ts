import { describe, expect, it } from 'vitest';
import { SOLUTIONS } from '@/content/registry';
import { SOLUTIONS_EN } from '@/content/en/solutions';

/**
 * Os títulos e descrições das soluções (P5, docs/SEO_PALAVRAS.md).
 *
 * Medido nas SERP de Moçambique a 2026-09-30: as páginas no top 10 para
 * «desenvolvimento de software», «criação de sites», «automação de processos»
 * e «agentes de IA» levam a frase pesquisada e o país no título. Estas regras
 * impedem que uma edição futura volte a um título sem intenção de pesquisa ou
 * cortado no resultado.
 */

const MARCA = ' | AGORAMOZ';
const casos = [
  ...Object.values(SOLUTIONS).map((s) => ({ idioma: 'pt', local: 'Moçambique', s })),
  ...Object.values(SOLUTIONS_EN).map((s) => ({ idioma: 'en', local: 'Mozambique', s })),
];

describe('títulos das soluções', () => {
  it('há cinco soluções em cada idioma', () => {
    expect(casos.filter((c) => c.idioma === 'pt')).toHaveLength(5);
    expect(casos.filter((c) => c.idioma === 'en')).toHaveLength(5);
  });

  it.each(casos)('$idioma $s.slug: título com a marca cabe em 60 caracteres e nomeia o país', ({ s, local }) => {
    expect((s.seo.title + MARCA).length).toBeLessThanOrEqual(60);
    expect(s.seo.title).toContain(local);
    expect(s.seo.title).not.toContain('AGORAMOZ');
  });

  it.each(casos)('$idioma $s.slug: descrição entre 120 e 160 caracteres', ({ s }) => {
    expect(s.seo.description.length).toBeGreaterThanOrEqual(120);
    expect(s.seo.description.length).toBeLessThanOrEqual(160);
  });

  it('nenhum título se repete entre soluções', () => {
    const titulos = casos.map((c) => c.s.seo.title);
    expect(new Set(titulos).size).toBe(titulos.length);
  });
});
