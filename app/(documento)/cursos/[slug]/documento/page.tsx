import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BotaoImprimir } from '@/components/cursos/BotaoImprimir';
import { caminhoCurso } from '@/components/cursos/PaginaCurso';
import { DocumentoCurso } from '@/components/cursos/DocumentoCurso';
import { cursoPublicado } from '@/lib/cursos/leitura';
import { buildMetadata } from '@/lib/seo/site';

export const revalidate = 600;

/**
 * O documento do curso para descarregar (D-49), fora do layout do site: só
 * as folhas A4, uma barra para voltar e imprimir. Fora do `SiteChrome` de
 * propósito — dentro dele, o Chrome acrescentava uma folha em branco no fim
 * do PDF. A página não é indexada; a canónica é a do curso.
 */

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const c = await cursoPublicado((await params).slug);
  if (!c) return {};
  return buildMetadata({
    title: 'Documento do curso',
    description: `O curso «${c.curso.titulo}» completo, em A4, para guardar em PDF: aulas, prática, respostas, fontes e verificação.`.slice(
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
    <div data-surface="light" className="min-h-screen bg-[#e9eaf3] text-[color:var(--on-surface)] print:bg-white">
      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-4 border-b border-black/10 bg-white px-4 py-3 print:hidden">
        <Link href={caminhoCurso(c.slug)} className="text-sm underline underline-offset-4">
          ← Voltar ao curso
        </Link>
        <BotaoImprimir titulo={c.curso.titulo} />
        <p className="text-sm text-[color:var(--muted)]">
          Escolha «Guardar como PDF», papel A4, margens «Nenhuma» e com gráficos de fundo.
        </p>
      </div>
      <main className="overflow-x-auto px-4 py-8 print:p-0">
        <DocumentoCurso curso={c.curso} />
      </main>
    </div>
  );
}
