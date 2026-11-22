import type { Metadata } from 'next';
import { Breadcrumbs } from '@/components/layout/Breadcrumbs';
import { Marcar } from '@/components/paginas/Marcar';
import { MARCAR } from '@/content/i18n/marcar';
import { t } from '@/lib/i18n/texto';
import { buildMetadata } from '@/lib/seo/site';

const IDIOMA = 'pt' as const;

/** Lê CAL_LINK no servidor em cada pedido: a variável muda sem novo build. */
export const dynamic = 'force-dynamic';

export const metadata: Metadata = buildMetadata({
  title: t(MARCAR.metaTitulo, IDIOMA),
  description: t(MARCAR.metaDescricao, IDIOMA),
  path: '/marcar',
});

export default function MarcarPage() {
  return (
    <Marcar
      idioma={IDIOMA}
      trilho={
        <Breadcrumbs
          items={[
            { name: t(MARCAR.inicio, IDIOMA), path: '/' },
            { name: t(MARCAR.trilho, IDIOMA), path: '/marcar' },
          ]}
          className="mb-10"
        />
      }
    />
  );
}
