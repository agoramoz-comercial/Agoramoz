import type { Metadata } from 'next';
import { CascaV3 } from '@/components/v3/CascaV3';
import { PaginaV3 } from '@/components/v3/PaginaV3';
import type { Lingua } from '@/content/types';
import { alternativasV3, INICIO_DA_LINGUA, textosV3 } from '@/lib/i18n/v3';
import { buildMetadata } from '@/lib/seo/site';

/** Os metadados da página inicial numa língua (com hreflang para as seis). */
export function metadadosV3(lingua: Lingua): Metadata {
  const x = textosV3(lingua);
  return buildMetadata({
    title: x.meta.titulo,
    description: x.meta.descricao,
    path: INICIO_DA_LINGUA[lingua],
    languages: alternativasV3(),
    bilingue: false,
    tituloAbsoluto: true,
  });
}

/** A página inicial numa língua: casca v3 + secções. */
export function InicioV3({ lingua }: { lingua: Lingua }) {
  return (
    <CascaV3 lingua={lingua}>
      <PaginaV3 lingua={lingua} />
    </CascaV3>
  );
}
