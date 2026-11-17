import type { Metadata } from 'next';
import { Breadcrumbs } from '@/components/layout/Breadcrumbs';
import { IndiceCursos } from '@/components/cursos/PaginaCurso';
import { cursosPublicados } from '@/lib/cursos/leitura';
import { buildMetadata } from '@/lib/seo/site';

export const revalidate = 600;

export const metadata: Metadata = buildMetadata({
  title: 'Cursos verificados nas fontes',
  description:
    'Cursos AGORAMOZ escritos a partir de fontes escolhidas, com cada afirmação verificada contra essas fontes. Leia o que vai aprender e descarregue em PDF.',
  path: '/cursos',
});

export default async function CursosPage() {
  const cursos = await cursosPublicados();
  return (
    <IndiceCursos
      cursos={cursos}
      trilho={
        <Breadcrumbs
          items={[
            { name: 'Início', path: '/' },
            { name: 'Cursos', path: '/cursos' },
          ]}
          className="mb-10"
        />
      }
    />
  );
}
