import Link from 'next/link';
import { AdminHeading } from '@/components/admin/primitives';
import { CriadorCurso } from '@/components/admin/cursos/CriadorCurso';
import {
  escreverAulaCurso,
  guardarCurso,
  pesquisarFontesCurso,
  planearCurso,
  sugerirTemaCurso,
  textoBaseCurso,
} from '@/lib/admin/cursos-actions';
import { requireRole } from '@/lib/auth/session';
import { motorCursosLigado } from '@/lib/cursos/motor';

export const metadata = { title: 'Criar curso' };

/** Cada peça (o plano, uma aula) faz até três chamadas ao motor: o tecto cobre-as com folga. */
export const maxDuration = 300;

export default async function NovoCursoPage() {
  const sessao = await requireRole(['admin', 'comercial']);
  return (
    <>
      <div className="print:hidden">
        <AdminHeading
          titulo="Criar curso"
          descricao="Das fontes que carregar, com cada afirmação verificada. Pode descarregar o PDF sem guardar."
          accao={
            <Link href="/admin/cursos" className="text-sm underline">
              Todos os cursos
            </Link>
          }
        />
      </div>
      <CriadorCurso
        accoes={{
          pesquisarFontes: pesquisarFontesCurso,
          textoBase: textoBaseCurso,
          sugerirTema: sugerirTemaCurso,
          planear: planearCurso,
          escreverAula: escreverAulaCurso,
          guardar: guardarCurso,
        }}
        motorLigado={motorCursosLigado()}
        podeGuardar
        utilizador={sessao.userId}
      />
    </>
  );
}
