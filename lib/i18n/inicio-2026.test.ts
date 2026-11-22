import { describe, expect, it } from 'vitest';
import { getSolutionSummaries } from '@/content/registry';
import { HOME_PROBLEMS } from '@/content/site';
import { HOME_PROBLEMS_EN } from '@/content/en/home';
import * as N from '@/content/i18n/inicio-2026';

/** Todos os { pt, en } de um objecto, a qualquer profundidade. */
function textos(v: unknown, out: { pt: string; en: string }[] = []) {
  if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>;
    if (typeof o.pt === 'string' && typeof o.en === 'string') out.push(o as { pt: string; en: string });
    else for (const x of Object.values(o)) textos(x, out);
  }
  return out;
}

describe('página inicial 2026', () => {
  it('os três caminhos contêm as sete capacidades, cada uma uma só vez', () => {
    const nos = N.CAMINHOS.flatMap((c) => c.capacidades).sort();
    const todas = getSolutionSummaries().map((s) => s.slug).sort();
    expect(nos).toEqual(todas);
  });

  it('cada problema aponta para um caminho que existe', () => {
    expect(N.CAMINHO_DO_PROBLEMA).toHaveLength(HOME_PROBLEMS.length);
    expect(HOME_PROBLEMS_EN).toHaveLength(HOME_PROBLEMS.length);
    for (const n of N.CAMINHO_DO_PROBLEMA) expect(N.CAMINHOS.some((c) => c.numero === n)).toBe(true);
  });

  it('todo o texto novo existe nos dois idiomas', () => {
    const todos = textos(N);
    expect(todos.length).toBeGreaterThan(20);
    for (const x of todos) {
      expect(x.pt.trim()).not.toBe('');
      expect(x.en.trim()).not.toBe('');
    }
  });

  it('as frases dos caminhos são frases que o site já publica', async () => {
    const site = JSON.stringify(await import('@/content/site'));
    for (const c of N.CAMINHOS) expect(site.includes(c.frase.pt) || JSON.stringify(await import('@/content/i18n/chrome')).includes(c.frase.pt)).toBe(true);
  });

  it('a prova só leva a páginas públicas que existem', () => {
    expect(N.PRODUTOS.map((p) => p.href)).toEqual(['/news', '/civico', '/cursos', '/projetos']);
  });
});
