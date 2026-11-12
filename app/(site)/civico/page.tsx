import type { Metadata } from 'next';
import { Breadcrumbs } from '@/components/layout/Breadcrumbs';
import { Civico } from '@/components/paginas/Civico';
import { CIVICO } from '@/content/civico';
import { motorCivicoLigado } from '@/lib/civico/servidor';
import { buildMetadata } from '@/lib/seo/site';

export const metadata: Metadata = buildMetadata({
  title: CIVICO.metaTitulo,
  description: CIVICO.metaDescricao,
  path: '/civico',
  imagemPropria: true,
});

/**
 * AGORAMOZ Cívico (D-43). Com `CIVICO_ENGINE=lovable`, a consulta; com `off`,
 * a mesma página com o campo desligado. O interruptor é lido no build — como
 * as outras variáveis, só entra num deploy novo.
 */
export default function CivicoPage() {
  return (
    <Civico
      activo={motorCivicoLigado()}
      trilho={
        <Breadcrumbs
          items={[
            { name: CIVICO.inicio, path: '/' },
            { name: CIVICO.trilho, path: '/civico' },
          ]}
          className="mb-10"
        />
      }
    />
  );
}
