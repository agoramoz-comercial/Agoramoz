import { FOUNDERS, SITE, SOCIAL } from '@/content/site';
import { SITE_URL, absolute } from '@/lib/seo/site';

function Script({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      // Conteúdo próprio, estático e conhecido em build.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export function OrganizationJsonLd() {
  return (
    <Script
      data={{
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: SITE.name,
        url: SITE_URL,
        description: SITE.description,
        email: SITE.email,
        logo: absolute('/brand/logo-light-bg.png'),
        /* Perfis oficiais: é o que liga a entidade às redes nos motores de busca. */
        sameAs: SOCIAL.filter((s) => s.id !== 'whatsapp').map((s) => s.href),
        contactPoint: [
          {
            '@type': 'ContactPoint',
            contactType: 'sales',
            email: SITE.email,
            telephone: `+${SITE.whatsapp.e164}`,
            availableLanguage: ['pt'],
            areaServed: ['MZ', 'PT', 'BR'],
          },
        ],
        areaServed: [
          { '@type': 'Country', name: 'Moçambique' },
          { '@type': 'Country', name: 'Portugal' },
          { '@type': 'Country', name: 'Brasil' },
        ],
        founder: FOUNDERS.people.map((p) => ({
          '@type': 'Person',
          name: p.name,
          jobTitle: p.role,
          sameAs: p.linkedin,
        })),
      }}
    />
  );
}

export function WebSiteJsonLd() {
  return (
    <Script
      data={{ '@context': 'https://schema.org', '@type': 'WebSite', name: SITE.name, url: SITE_URL, inLanguage: 'pt' }}
    />
  );
}

export function FaqJsonLd({ items }: { items: { q: string; a: string }[] }) {
  return (
    <Script
      data={{
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: items.map((i) => ({
          '@type': 'Question',
          name: i.q,
          acceptedAnswer: { '@type': 'Answer', text: i.a },
        })),
      }}
    />
  );
}

export function ServiceJsonLd({
  name,
  description,
  path,
  areaServed,
}: {
  name: string;
  description: string;
  path: string;
  areaServed?: string;
}) {
  return (
    <Script
      data={{
        '@context': 'https://schema.org',
        '@type': 'Service',
        name,
        description,
        url: absolute(path),
        provider: { '@type': 'Organization', name: SITE.name, url: SITE_URL },
        ...(areaServed ? { areaServed: { '@type': 'Country', name: areaServed } } : {}),
      }}
    />
  );
}

export function BreadcrumbJsonLd({ items }: { items: { name: string; path: string }[] }) {
  return (
    <Script
      data={{
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: items.map((item, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: item.name,
          item: absolute(item.path),
        })),
      }}
    />
  );
}
