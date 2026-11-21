import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CascaAdmin } from '@/components/admin/CascaAdmin';
import { AdminHeading } from '@/components/admin/primitives';
import { CriadorCurso } from '@/components/admin/cursos/CriadorCurso';
import { DocumentoCurso } from '@/components/cursos/DocumentoCurso';
import { PaginaCurso } from '@/components/cursos/PaginaCurso';
import { motorCursosLigado } from '@/lib/cursos/motor';
import { aulaQa, planearQa, temaQa } from './acoes';
import { cursoExemplo } from './exemplo';

/**
 * Pré-visualização dos cursos para o QA visual, sem sessão nem base. Só com
 * `ADMIN_PREVIEW=on` e fora da produção. TUDO É DE EXEMPLO.
 * `?vista=criador` (omissão) · `?vista=documento` · `?vista=publica`.
 */

export const dynamic = 'force-dynamic';
export const maxDuration = 300;
export const metadata: Metadata = { title: 'Pré-visualização dos cursos', robots: { index: false, follow: false, nocache: true } };

export default async function QaCursos({ searchParams }: { searchParams: Promise<{ vista?: string }> }) {
  if (process.env.ADMIN_PREVIEW !== 'on' || process.env.VERCEL_ENV === 'production') notFound();
  const { vista = 'criador' } = await searchParams;

  if (vista === 'publica') {
    const { curso } = await cursoExemplo();
    return (
      <div data-surface="light" className="min-h-screen bg-[color:var(--surface)] text-[color:var(--on-surface)]">
        <p className="bg-black px-4 py-2 text-center text-xs text-white">Pré-visualização de QA — curso e fontes de EXEMPLO.</p>
        <PaginaCurso
          curso={curso}
          slug={curso.slug}
          trilho={
            <nav aria-label="Trilho (exemplo)" className="mb-10 text-sm">
              Início / Cursos / {curso.titulo}
            </nav>
          }
        />
      </div>
    );
  }

  return (
    <div data-surface="light" className="min-h-screen bg-[color:var(--surface)] text-[color:var(--on-surface)]">
      <CascaAdmin sessao={{ nome: 'Pré-visualização', email: 'qa@exemplo.test', papel: 'admin' }}>
        <div className="print:hidden">
          <AdminHeading
            titulo={vista === 'documento' ? 'Documento do curso (exemplo)' : 'Criar curso (pré-visualização)'}
            descricao="Pré-visualização de QA — curso, fontes e motor de EXEMPLO."
          />
        </div>
        {vista === 'documento' ? (
          <div className="overflow-x-auto">
            <DocumentoCurso curso={(await cursoExemplo()).curso} />
          </div>
        ) : (
          <CriadorCurso accoes={{ sugerirTema: temaQa, planear: planearQa, escreverAula: aulaQa }} motorLigado={motorCursosLigado()} podeGuardar={false} />
        )}
      </CascaAdmin>
    </div>
  );
}
