import { afterEach, describe, expect, it, vi } from 'vitest';
import sitemap from './sitemap';

afterEach(() => vi.useRealTimers());

describe('lastmod do sitemap', () => {
  /**
   * O defeito que o lote G corrige: páginas com a hora do build como
   * `lastmod`. Com o relógio posto em 2030, qualquer data «agora» apareceria
   * como 2030 — e nenhuma pode.
   */
  it('nenhuma entrada usa a hora do build', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2030-06-15T12:34:56Z'));
    const comData = sitemap().filter((e) => e.lastModified);
    expect(comData.length).toBeGreaterThan(40);
    const doBuild = comData.filter((e) => new Date(e.lastModified!).getUTCFullYear() === 2030).map((e) => e.url);
    expect(doBuild).toEqual([]);
  });

  it('dois builds seguidos dão o mesmo sitemap', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2030-01-01T00:00:00Z'));
    const a = JSON.stringify(sitemap());
    vi.setSystemTime(new Date('2031-01-01T00:00:00Z'));
    expect(JSON.stringify(sitemap())).toBe(a);
  });

  it('todas as datas são datas de calendário válidas, sem hora, e não futuras', () => {
    const hoje = Date.now();
    for (const e of sitemap()) {
      const d = new Date(e.lastModified!);
      expect(Number.isNaN(d.getTime()), e.url).toBe(false);
      expect(d.getUTCHours() + d.getUTCMinutes(), e.url).toBe(0);
      expect(d.getTime(), e.url).toBeLessThanOrEqual(hoje);
    }
  });
});

describe('hreflang no sitemap', () => {
  const entradas = sitemap();
  const urls = new Set(entradas.map((e) => e.url));
  const de = (url: string) => entradas.find((e) => e.url === url);
  const idiomas = (url: string) => (de(url)?.alternates?.languages ?? {}) as Record<string, string>;
  const SITE = new URL(entradas[0]!.url).origin;

  it('cada par PT/EN declara o mesmo conjunto, recíproco, com x-default em português', () => {
    const pares = entradas.filter((e) => new URL(e.url).pathname.startsWith('/en'));
    expect(pares.length).toBeGreaterThan(10);
    for (const en of pares) {
      const l = idiomas(en.url);
      expect(l.en, en.url).toBe(en.url);
      expect(l['x-default'], en.url).toBe(l.pt);
      const pt = idiomas(l.pt!);
      expect(pt.pt, l.pt).toBe(l.pt);
      expect(pt.en, l.pt).toBe(en.url);
    }
  });

  it('nenhum alternate aponta para uma URL fora do sitemap', () => {
    for (const e of entradas) {
      for (const alvo of Object.values(idiomas(e.url))) expect(urls.has(alvo), `${e.url} → ${alvo}`).toBe(true);
    }
  });

  it('a home e os países mantêm os mercados pt-MZ, pt-PT e pt-BR', () => {
    for (const rota of ['/', '/mz', '/pt', '/br']) {
      const l = idiomas(`${SITE}${rota}`);
      expect(l['pt-MZ'], rota).toBe(`${SITE}/mz`);
      expect(l['pt-PT'], rota).toBe(`${SITE}/pt`);
      expect(l['pt-BR'], rota).toBe(`${SITE}/br`);
    }
  });
});
