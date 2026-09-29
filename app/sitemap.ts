import type { MetadataRoute } from 'next';
import { COUNTRIES, COUNTRY_CODES, GLOBAL_CODES, SECTOR_PAGES, SOLUTIONS } from '@/content/registry';
import { PERFIL } from '@/content/landing/perfil';
import { absolute } from '@/lib/seo/site';
import { caminhoNoIdioma } from '@/lib/i18n/texto';
import { ROTAS_BILINGUES } from '@/lib/i18n/rotas';

/** Gerado a partir do registry: uma nova vertical entra aqui sozinha. */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const statics: MetadataRoute.Sitemap = [
    { url: absolute('/'), lastModified: now, priority: 1 },
    { url: absolute('/diagnostico'), lastModified: now, priority: 0.9 },
    { url: absolute('/perfil'), lastModified: new Date(PERFIL.updatedAt), priority: 0.8 },
    { url: absolute('/solucoes'), lastModified: now, priority: 0.8 },
    { url: absolute('/como-trabalhamos'), lastModified: now, priority: 0.6 },
    { url: absolute('/sobre'), lastModified: now, priority: 0.5 },
    { url: absolute('/contactos'), lastModified: now, priority: 0.5 },
    { url: absolute('/privacidade'), lastModified: now, priority: 0.2 },
  ];

  /**
   * Nível de expansão: índice e dez mercados. Prioridade abaixo dos mercados de
   * operação de propósito — estas páginas afirmam intenção, aquelas afirmam
   * operação.
   */
  const globais: MetadataRoute.Sitemap = [
    { url: absolute('/global'), lastModified: now, priority: 0.6 },
    ...GLOBAL_CODES.map((code) => ({ url: absolute(`/global/${code}`), lastModified: now, priority: 0.5 })),
  ];

  const countries: MetadataRoute.Sitemap = COUNTRY_CODES.map((code) => ({
    url: absolute(`/${code}`),
    lastModified: new Date(COUNTRIES[code].updatedAt),
    priority: 0.8,
  }));

  const solutions: MetadataRoute.Sitemap = Object.values(SOLUTIONS).map((s) => ({
    url: absolute(`/solucoes/${s.slug}`),
    lastModified: new Date(s.updatedAt),
    priority: 0.7,
  }));

  const sectors: MetadataRoute.Sitemap = Object.values(SECTOR_PAGES).map((p) => ({
    url: absolute(`/${p.country}/${p.sector}`),
    lastModified: new Date(p.updatedAt),
    priority: 0.9,
  }));

  const portugues = [...statics, ...countries, ...solutions, ...sectors, ...globais];

  /**
   * As versões inglesas saem de `ROTAS_BILINGUES` — a lista que o seletor de
   * idioma e o hreflang também leem. Uma rota traduzida entra aqui sozinha, e
   * uma que não o esteja não pode entrar por engano. Cada uma herda a
   * prioridade e a data do seu par português.
   */
  const porUrl = new Map(portugues.map((e) => [e.url, e]));
  const ingles: MetadataRoute.Sitemap = ROTAS_BILINGUES.map((rota) => {
    const par = porUrl.get(absolute(rota));
    return {
      url: absolute(caminhoNoIdioma(rota, 'en')),
      lastModified: par?.lastModified ?? now,
      priority: par?.priority ?? 0.5,
    };
  });

  return [...portugues, ...ingles];
}
