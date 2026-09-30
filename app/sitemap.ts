import type { MetadataRoute } from 'next';
import { COUNTRIES, COUNTRY_CODES, GLOBAL_CODES, SECTOR_PAGES, SOLUTIONS } from '@/content/registry';
import { PERFIL } from '@/content/landing/perfil';
import { SOLUTIONS_EN } from '@/content/en/solutions';
import { absolute, alternativasDeIdioma } from '@/lib/seo/site';
import { caminhoNoIdioma } from '@/lib/i18n/texto';
import { ROTAS_BILINGUES } from '@/lib/i18n/rotas';

/**
 * A data da última alteração de CONTEÚDO de cada página sem data própria no
 * registry. Actualizar à mão quando o texto da página muda.
 *
 * Até ao lote G estas páginas levavam a hora do build: cada deploy declarava
 * todas como alteradas. O Google só confia no `lastmod` quando ele é
 * verídico — um que mente sempre ensina-o a ignorá-lo em todas as URL,
 * incluindo as que têm datas certas. Datas medidas no histórico do git.
 */
const REVISTO_EM = {
  '/': '2026-09-29',
  '/diagnostico': '2026-09-29',
  '/solucoes': '2026-09-29',
  '/como-trabalhamos': '2026-09-29',
  '/sobre': '2026-09-29',
  '/contactos': '2026-09-29',
  '/privacidade': '2026-09-24',
  '/global': '2026-09-29',
  '/news': '2026-09-30',
} as const;

const em = (rota: keyof typeof REVISTO_EM) => new Date(REVISTO_EM[rota]);

/** Gerado a partir do registry: uma nova vertical entra aqui sozinha. */
export default function sitemap(): MetadataRoute.Sitemap {
  const statics: MetadataRoute.Sitemap = [
    { url: absolute('/'), lastModified: em('/'), priority: 1 },
    { url: absolute('/diagnostico'), lastModified: em('/diagnostico'), priority: 0.9 },
    { url: absolute('/perfil'), lastModified: new Date(PERFIL.updatedAt), priority: 0.8 },
    { url: absolute('/solucoes'), lastModified: em('/solucoes'), priority: 0.8 },
    { url: absolute('/como-trabalhamos'), lastModified: em('/como-trabalhamos'), priority: 0.6 },
    { url: absolute('/sobre'), lastModified: em('/sobre'), priority: 0.5 },
    { url: absolute('/contactos'), lastModified: em('/contactos'), priority: 0.5 },
    { url: absolute('/privacidade'), lastModified: em('/privacidade'), priority: 0.2 },
    { url: absolute('/news'), lastModified: em('/news'), priority: 0.6 },
  ];

  /**
   * Nível de expansão: índice e dez mercados. Prioridade abaixo dos mercados de
   * operação de propósito — estas páginas afirmam intenção, aquelas afirmam
   * operação.
   */
  const globais: MetadataRoute.Sitemap = [
    { url: absolute('/global'), lastModified: em('/global'), priority: 0.6 },
    ...GLOBAL_CODES.map((code) => ({ url: absolute(`/global/${code}`), lastModified: em('/global'), priority: 0.5 })),
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
    // As soluções inglesas têm data própria (foram escritas depois das portuguesas).
    const solucaoEn = rota.startsWith('/solucoes/')
      ? SOLUTIONS_EN[rota.slice('/solucoes/'.length) as keyof typeof SOLUTIONS_EN]
      : undefined;
    return {
      url: absolute(caminhoNoIdioma(rota, 'en')),
      lastModified: solucaoEn ? new Date(solucaoEn.updatedAt) : (par?.lastModified ?? em('/')),
      priority: par?.priority ?? 0.5,
    };
  });

  /**
   * hreflang no sitemap: o MESMO conjunto que cada página declara no `<head>`
   * (`buildMetadata`), para que as duas fontes nunca se contradigam — o par
   * PT/EN com `x-default` em português, e os mercados na home e nos países.
   */
  const MERCADOS = { 'pt-MZ': '/mz', 'pt-PT': '/pt', 'pt-BR': '/br', 'x-default': '/' } as const;
  const comMercados = new Set(['/', ...COUNTRY_CODES.map((c) => `/${c}`)]);
  const absolutos = (l: Record<string, string>) =>
    Object.fromEntries(Object.entries(l).map(([k, v]) => [k, absolute(v)]));
  const bilingues = new Set(ROTAS_BILINGUES);

  const hreflang = (rota: string, emIngles: boolean) => {
    const l: Record<string, string> = {};
    if (bilingues.has(rota)) Object.assign(l, alternativasDeIdioma(rota));
    if (!emIngles && comMercados.has(rota)) Object.assign(l, MERCADOS);
    return Object.keys(l).length ? { alternates: { languages: absolutos(l) } } : {};
  };

  const caminho = (url: string) => new URL(url).pathname;
  return [
    ...portugues.map((e) => ({ ...e, ...hreflang(caminho(e.url), false) })),
    ...ingles.map((e, i) => ({ ...e, ...hreflang(ROTAS_BILINGUES[i]!, true) })),
  ];
}
