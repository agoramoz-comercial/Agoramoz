import type { Metadata } from 'next';
import { Breadcrumbs } from '@/components/layout/Breadcrumbs';
import { notFound } from 'next/navigation';
import { Solucao } from '@/components/paginas/Solucao';
import { INDICE_SOLUCOES } from '@/content/i18n/paginas';
import { getAllSolutionParams, getSolucao } from '@/content/registry';
import { ligacao } from '@/lib/i18n/rotas';
import { caminhoNoIdioma, t } from '@/lib/i18n/texto';
import { buildMetadata } from '@/lib/seo/site';

const IDIOMA = 'en' as const;

export const dynamicParams = false;

export function generateStaticParams() {
  return getAllSolutionParams();
}

type Props = { params: Promise<{ solucao: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { solucao } = await params;
  const s = getSolucao(solucao, IDIOMA);
  if (!s) return {};
  return buildMetadata({
    title: s.seo.title,
    description: s.seo.description,
    path: caminhoNoIdioma(`/solucoes/${s.slug}`, IDIOMA),
    imagemPropria: true,
  });
}

export default async function SolutionEnPage({ params }: Props) {
  const { solucao } = await params;
  const s = getSolucao(solucao, IDIOMA);
  if (!s) notFound();

  return (
    <Solucao
      s={s}
      idioma={IDIOMA}
      trilho={
        <Breadcrumbs
          idioma={IDIOMA}
          items={[
            // Pela lista de rotas bilingues: `/` enquanto a home inglesa não existir, `/en` quando existir.
            { name: t(INDICE_SOLUCOES.inicio, IDIOMA), path: ligacao('/', IDIOMA).href },
            { name: t(INDICE_SOLUCOES.trilho, IDIOMA), path: caminhoNoIdioma('/solucoes', IDIOMA) },
            { name: s.label, path: caminhoNoIdioma(`/solucoes/${s.slug}`, IDIOMA) },
          ]}
          className="mb-10"
        />
      }
    />
  );
}
