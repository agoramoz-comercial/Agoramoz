import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Breadcrumbs } from '@/components/layout/Breadcrumbs';
import { caminhoCurso, descricaoDoCurso, PaginaCurso } from '@/components/cursos/PaginaCurso';
import { cursoPublicado, cursosPublicados } from '@/lib/cursos/leitura';
import { buildMetadata } from '@/lib/seo/site';

export const revalidate = 600;

export async function generateStaticParams() {
  return (await cursosPublicados()).map((c) => ({ slug: c.slug }));
}

/** Título + « | AGORAMOZ» até 60 caracteres. */
const tituloCurto = (t: string) => (t.length <= 49 ? t : `${t.slice(0, 48).replace(/\s+\S*$/, '')}…`);

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const c = await cursoPublicado((await params).slug);
  if (!c) return {};
  return buildMetadata({ title: tituloCurto(c.curso.titulo), description: descricaoDoCurso(c.curso), path: caminhoCurso(c.slug) });
}

export default async function CursoPage({ params }: { params: Promise<{ slug: string }> }) {
  const c = await cursoPublicado((await params).slug);
  if (!c) notFound();
  return (
    <PaginaCurso
      curso={c.curso}
      slug={c.slug}
      trilho={
        <Breadcrumbs
          items={[
            { name: 'Início', path: '/' },
            { name: 'Cursos', path: '/cursos' },
            { name: c.curso.titulo, path: caminhoCurso(c.slug) },
          ]}
          className="mb-10"
        />
      }
    />
  );
}
