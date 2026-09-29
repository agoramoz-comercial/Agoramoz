import type { Metadata } from 'next';
import { Inicio } from '@/components/paginas/Inicio';
import { SITE } from '@/content/site';
import { buildMetadata } from '@/lib/seo/site';

export const metadata: Metadata = buildMetadata({
  title: `AGORAMOZ — ${SITE.tagline}`,
  description: SITE.description,
  path: '/',
  languages: { 'pt-MZ': '/mz', 'pt-PT': '/pt', 'pt-BR': '/br', 'x-default': '/' },
  tituloAbsoluto: true,
});

export default function HomePage() {
  return <Inicio idioma="pt" />;
}
