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
