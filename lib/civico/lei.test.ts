import { describe, expect, it } from 'vitest';
import sitemap from '@/app/sitemap';
import { tamanhoDoCorpus } from './corpus';
import {
  artigo,
  caminhoArtigo,
  descricaoDoArtigo,
  descricaoDoDiploma,
  diploma,
  diplomas,
  numeroDoParametro,
  relacionados,
  tituloDoArtigo,
  tituloDoDiploma,
} from './lei';

/**
 * As páginas da lei (D-47) cumprem as mesmas regras de SEO das outras páginas
 * indexáveis (`lib/seo/titulos.test.ts`): título com a marca em 60 caracteres,
 * descrição entre 120 e 160, sem títulos repetidos.
 */
const MARCA = ' | AGORAMOZ';

describe('as três leis, todos os artigos do corpus', () => {
  it('cada lei tem página, e cada artigo do corpus tem a sua', () => {
    const t = tamanhoDoCorpus();
    expect(diplomas().map((d) => [d.slug, d.artigos.length])).toEqual([
      ['trabalho', t.trabalho],
      ['sucessoes', t.sucessoes],
      ['familia', t.familia],
    ]);
    expect(diploma('codigo-penal')).toBeNull();
    // Os artigos que faltam são ditos: os que há mais os que faltam dá o último número.
    for (const d of diplomas()) expect(d.artigos.length + d.emFalta.length).toBe(Math.max(...d.artigos.map((a) => a.n)));
    expect(diploma('trabalho')!.emFalta).toContain(16);
  });

  it.each(diplomas().map((d) => [d.slug, d] as const))('%s: títulos cabem em 60 com a marca, nomeiam o artigo e não se repetem', (_, d) => {
    const titulos = d.artigos.map((a) => tituloDoArtigo(d, a));
    for (const [i, t] of titulos.entries()) {
      expect((t + MARCA).length, t).toBeLessThanOrEqual(60);
      expect(t, t).toContain(`art. ${d.artigos[i]!.n}.º`);
    }
    expect(new Set(titulos).size).toBe(titulos.length);
    expect((tituloDoDiploma(d) + MARCA).length).toBeLessThanOrEqual(60);
  });

  it.each(diplomas().map((d) => [d.slug, d] as const))('%s: descrições entre 120 e 160 caracteres, com a lei e o país', (_, d) => {
    for (const a of d.artigos) {
      const desc = descricaoDoArtigo(d, a);
      expect(desc.length, desc).toBeGreaterThanOrEqual(120);
      expect(desc.length, desc).toBeLessThanOrEqual(160);
      expect(desc).toContain('Moçambique');
    }
    expect(descricaoDoDiploma(d).length).toBeGreaterThanOrEqual(120);
    expect(descricaoDoDiploma(d).length).toBeLessThanOrEqual(160);
  });

  it('o artigo 15 da Lei do Trabalho é a licença por paternidade, com vizinhos e relacionados da mesma lei', () => {
    const d = diploma('trabalho')!;
    const r = artigo(d, 15)!;
    expect(r.artigo.epigrafe).toBe('Licença por paternidade');
    expect(r.anterior?.n).toBe(14);
    // O 16 não entrou no corpus (extracção de falha fechada): o seguinte é o próximo que entrou.
    expect(r.seguinte?.n).toBe(d.artigos[d.artigos.indexOf(r.artigo) + 1]!.n);
    const rel = relacionados(d, r.artigo);
    expect(rel.length).toBeGreaterThan(0);
    expect(rel.every((x) => x.n !== 15 && d.artigos.includes(x))).toBe(true);
    expect(d.revogou).toMatch(/23\/2007/);
  });

  it('o parâmetro do URL só aceita «artigo-N»', () => {
    expect(numeroDoParametro('artigo-15')).toBe(15);
    for (const p of ['15', 'artigo-', 'artigo-15a', 'Artigo-15', 'artigo-99999']) expect(numeroDoParametro(p)).toBeNull();
    expect(artigo(diploma('trabalho')!, 99_999)).toBeNull();
  });

  it('o sitemap tem o índice, as três leis e todos os artigos', async () => {
    const urls = new Set((await sitemap()).map((e) => new URL(e.url).pathname));
    expect(urls.has('/civico/lei')).toBe(true);
    for (const d of diplomas()) {
      expect(urls.has(`/civico/lei/${d.slug}`)).toBe(true);
      for (const a of d.artigos) expect(urls.has(caminhoArtigo(d.slug, a.n)), caminhoArtigo(d.slug, a.n)).toBe(true);
    }
  });

  it('os caminhos cabem no que a medição aceita (minúsculas, dígitos, hífen, barra)', () => {
    for (const d of diplomas()) for (const a of d.artigos) expect(caminhoArtigo(d.slug, a.n)).toMatch(/^\/[a-z0-9/_-]{1,119}$/);
  });
});
