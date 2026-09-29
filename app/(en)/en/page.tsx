import type { Metadata } from 'next';
import { Inicio } from '@/components/paginas/Inicio';
import { INICIO } from '@/content/i18n/inicio';
import { t } from '@/lib/i18n/texto';
import { buildMetadata } from '@/lib/seo/site';

const IDIOMA = 'en' as const;

export const metadata: Metadata = buildMetadata({
  title: t(INICIO.metaTitulo, IDIOMA),
  description: t(INICIO.metaDescricao, IDIOMA),
  path: '/en',
  tituloAbsoluto: true,
});

export default function HomeEnPage() {
  return <Inicio idioma={IDIOMA} />;
}
