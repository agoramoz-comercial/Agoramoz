import type { MetadataRoute } from 'next';
import { COUNTRIES, COUNTRY_CODES, SECTOR_PAGES, SOLUTIONS } from '@/content/registry';
import { PERFIL } from '@/content/landing/perfil';
import { absolute } from '@/lib/seo/site';

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

  return [...statics, ...countries, ...solutions, ...sectors];
}
