import { describe, expect, it } from 'vitest';
import { regrasPara } from './robots';
import { SITE_URL } from './site';

const canonico = new URL(SITE_URL).host;

describe('robots.txt por host', () => {
  it('o domínio canónico é rastreável, com o sitemap e sem host:', () => {
    const r = regrasPara(canonico);
    expect(r.rules).toEqual({ userAgent: '*', allow: '/', disallow: ['/api/', '/admin/'] });
    expect(r.sitemap).toBe(`${SITE_URL}/sitemap.xml`);
    expect(r).not.toHaveProperty('host');
  });

  it('maiúsculas e porta não mudam a decisão', () => {
    expect(regrasPara(`${canonico.toUpperCase()}:443`).rules).toMatchObject({ allow: '/' });
  });

  it('previews, o alias .vercel.app e hosts desconhecidos não são rastreáveis', () => {
    for (const host of ['agoramoz-abc123-samussenes-projects.vercel.app', 'agoramoz.vercel.app', 'exemplo.com', '', null]) {
      expect(regrasPara(host), String(host)).toEqual({ rules: { userAgent: '*', disallow: '/' } });
    }
  });
});
