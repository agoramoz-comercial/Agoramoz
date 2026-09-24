import { FOUNDERS, IDENTITY } from '@/content/site';
import { SITE_URL, absolute, OG_IMAGE_PADRAO } from '../site';
import { ORG_ID, SITE_ID, LOGO_ID, breadcrumbId, serviceId, faqId, articleId, webPageId } from './ids';
import { ref, type SchemaNode } from './types';

/**
 * Construtores puros. Devolvem objectos; não sabem nada de React, e por isso
 * testam-se em Node, que é o único ambiente que a `vitest.config.ts` tem.
 *
 * Regra transversal: **nenhum nó emite uma propriedade sem valor.** Um
 * `legalName: null` no JSON-LD não é «desconhecido», é uma afirmação de que a
 * empresa não tem nome legal. Omitir é a única forma honesta de dizer «não
 * sabemos», e é o que `semVazios` garante.
 */
function semVazios(o: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(o).filter(([, v]) => v !== undefined && v !== null && !(Array.isArray(v) && v.length === 0)),
  );
}

export function organizationNode(): SchemaNode {
  return semVazios({
    '@type': 'Organization',
    '@id': ORG_ID,
    name: IDENTITY.tradingName,
    legalName: IDENTITY.legalName ?? undefined,
    url: IDENTITY.url,
    email: IDENTITY.email,
    logo: ref(LOGO_ID),
    image: ref(LOGO_ID),
    /* Perfis oficiais: é o que liga a entidade às redes nos motores de busca. */
    sameAs: IDENTITY.socialProfiles.filter((s) => s.id !== 'whatsapp').map((s) => s.href),
    contactPoint: [
      {
        '@type': 'ContactPoint',
        contactType: 'sales',
        email: IDENTITY.email,
        telephone: `+${IDENTITY.telephone.e164}`,
        availableLanguage: ['pt'],
        areaServed: IDENTITY.serviceAreas.map((a) => a.code),
      },
    ],
    areaServed: IDENTITY.serviceAreas.map((a) => ({ '@type': 'Country', name: a.name })),
    founder: FOUNDERS.people.map((p) => ({
      '@type': 'Person',
      name: p.name,
      jobTitle: p.role,
      sameAs: p.linkedin,
    })),
  }) as SchemaNode;
}

/** O logótipo como nó próprio, para que `Organization` e `WebSite` o partilhem. */
export function logoNode(): SchemaNode {
  return {
    '@type': 'ImageObject',
    '@id': LOGO_ID,
    url: IDENTITY.logo.url,
    width: IDENTITY.logo.width,
    height: IDENTITY.logo.height,
    caption: IDENTITY.tradingName,
  };
}

export function webSiteNode(): SchemaNode {
  return {
    '@type': 'WebSite',
    '@id': SITE_ID,
    name: IDENTITY.tradingName,
    url: SITE_URL,
    inLanguage: 'pt',
    publisher: ref(ORG_ID),
  };
}

export function webPageNode(input: {
  path: string;
  name: string;
  description: string;
  temBreadcrumb?: boolean;
}): SchemaNode {
  return semVazios({
    '@type': 'WebPage',
    '@id': webPageId(input.path),
    url: absolute(input.path),
    name: input.name,
    description: input.description,
    isPartOf: ref(SITE_ID),
    about: ref(ORG_ID),
    inLanguage: 'pt',
    primaryImageOfPage: { '@type': 'ImageObject', url: OG_IMAGE_PADRAO.url },
    breadcrumb: input.temBreadcrumb ? ref(breadcrumbId(input.path)) : undefined,
  }) as SchemaNode;
}

export function breadcrumbNode(path: string, items: readonly { name: string; path: string }[]): SchemaNode {
  return {
    '@type': 'BreadcrumbList',
    '@id': breadcrumbId(path),
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: absolute(item.path),
    })),
  };
}

export function serviceNode(input: {
  path: string;
  name: string;
  description: string;
  areaServed?: string;
}): SchemaNode {
  return semVazios({
    '@type': 'Service',
    '@id': serviceId(input.path),
    name: input.name,
    description: input.description,
    url: absolute(input.path),
    /**
     * Referência, não redeclaração. Antes, cada `Service` inventava uma
     * segunda `Organization` com apenas `name` e `url` — duas entidades a
     * descrever a mesma empresa, com propriedades diferentes, na mesma página.
     */
    provider: ref(ORG_ID),
    areaServed: input.areaServed ? { '@type': 'Country', name: input.areaServed } : undefined,
  }) as SchemaNode;
}

export function faqNode(path: string, items: readonly { q: string; a: string }[]): SchemaNode {
  return {
    '@type': 'FAQPage',
    '@id': faqId(path),
    mainEntity: items.map((i) => ({
      '@type': 'Question',
      name: i.q,
      acceptedAnswer: { '@type': 'Answer', text: i.a },
    })),
  };
}

export function articleNode(input: {
  path: string;
  headline: string;
  description: string;
  datePublished: string;
  dateModified: string;
  author: { name: string; url: string };
}): SchemaNode {
  return {
    '@type': 'Article',
    '@id': articleId(input.path),
    headline: input.headline,
    description: input.description,
    datePublished: input.datePublished,
    dateModified: input.dateModified,
    /**
     * O autor tem de ser uma pessoa com perfil público — é o que torna a
     * autoria verificável por quem lê, em vez de uma assinatura de marca.
     */
    author: { '@type': 'Person', name: input.author.name, sameAs: input.author.url },
    publisher: ref(ORG_ID),
    isPartOf: ref(webPageId(input.path)),
    mainEntityOfPage: ref(webPageId(input.path)),
  };
}
