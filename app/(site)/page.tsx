import type { Metadata } from 'next';
import { Inicio } from '@/components/paginas/Inicio';
import { SITE } from '@/content/site';
import { buildMetadata } from '@/lib/seo/site';

/** «O que estamos a ver» lê os artigos mais recentes do Moz News: renova a cada 10 min. */
export const revalidate = 600;

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
