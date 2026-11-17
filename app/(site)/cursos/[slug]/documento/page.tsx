import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Breadcrumbs } from '@/components/layout/Breadcrumbs';
import { BotaoImprimir } from '@/components/cursos/BotaoImprimir';
import { caminhoCurso } from '@/components/cursos/PaginaCurso';
import { DocumentoCurso } from '@/components/cursos/DocumentoCurso';
import { Section } from '@/components/ui/Section';
import { cursoPublicado } from '@/lib/cursos/leitura';
import { buildMetadata } from '@/lib/seo/site';

export const revalidate = 600;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const c = await cursoPublicado((await params).slug);
  if (!c) return {};
  // O documento repete a página do curso: fica fora do índice, a canónica é a página.
  return buildMetadata({
    title: 'Documento do curso',
    description:
      `O curso «${c.curso.titulo}» completo, em A4, para guardar em PDF: aulas, perguntas, respostas, fontes e o relatório de verificação.`.slice(
        0,
        160,
      ),
    path: `${caminhoCurso(c.slug)}/documento`,
    noindex: true,
  });
}

export default async function DocumentoPage({ params }: { params: Promise<{ slug: string }> }) {
  const c = await cursoPublicado((await params).slug);
  if (!c) notFound();
  return (
    <Section surface="light">
      <div className="print:hidden">
        <Breadcrumbs
          items={[
            { name: 'Início', path: '/' },
            { name: 'Cursos', path: '/cursos' },
            { name: c.curso.titulo, path: caminhoCurso(c.slug) },
            { name: 'Documento', path: `${caminhoCurso(c.slug)}/documento` },
          ]}
          className="mb-8"
        />
        <div className="mb-4 flex flex-wrap items-center gap-4">
          <BotaoImprimir titulo={c.curso.titulo} />
          <p className="text-sm text-[color:var(--muted)]">
            Escolha «Guardar como PDF», papel A4, margens «Nenhuma» e com gráficos de fundo.
          </p>
        </div>
      </div>
      <div className="overflow-x-auto">
        <DocumentoCurso curso={c.curso} />
      </div>
    </Section>
  );
}
