import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AdminHeading } from '@/components/admin/primitives';
import { Feedback } from '@/components/admin/Feedback';
import { BotaoImprimir } from '@/components/cursos/BotaoImprimir';
import { DocumentoCurso } from '@/components/cursos/DocumentoCurso';
import { mudarEstadoCurso } from '@/lib/admin/cursos-actions';
import { podeEscrever, requireStaff } from '@/lib/auth/session';
import { lerCursoGuardado, PASSO_0022, ROTULO_ESTADO_CURSO, type EstadoCurso } from '@/lib/cursos/leitura';

export const metadata = { title: 'Curso' };

const BOTAO =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-[--radius-xs] border border-[color:var(--border)] px-3 text-sm hover:bg-[color:var(--surface-raised)]';

export default async function CursoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erro?: string; ok?: string }>;
}) {
  const sessao = await requireStaff();
  const { id } = await params;
  const { erro, ok } = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const r = await lerCursoGuardado(id);
  if (r.estado !== 'ok') {
    return (
      <p role="status" className="border border-[color:var(--border)] px-4 py-3 text-sm">
        {r.estado === 'por-activar' ? `Os cursos guardados estão por activar. ${PASSO_0022}` : 'Não foi possível ler este curso.'}
      </p>
    );
  }
  const c = r.dados;
  if (!c) notFound();
  const escreve = podeEscrever(sessao.papel);
  const acoes: { estado: EstadoCurso; rotulo: string }[] =
    c.estado === 'publicado'
      ? [
          { estado: 'rascunho', rotulo: 'Retirar do site' },
          { estado: 'arquivado', rotulo: 'Arquivar' },
        ]
      : c.estado === 'rascunho'
        ? [
            { estado: 'publicado', rotulo: 'Publicar em /cursos' },
            { estado: 'arquivado', rotulo: 'Arquivar' },
          ]
        : [{ estado: 'rascunho', rotulo: 'Voltar a rascunho' }];

  return (
    <>
      <div className="print:hidden">
        <AdminHeading
          titulo={c.titulo}
          descricao={`${ROTULO_ESTADO_CURSO[c.estado]} · /cursos/${c.slug} · ${c.curso.verificacao.aceites} afirmações aceites, ${c.curso.verificacao.retirados} retiradas · ${c.fontes.length} fonte(s)`}
          accao={
            <Link href="/admin/cursos" className="text-sm underline">
              Todos os cursos
            </Link>
          }
        />
        <Feedback erro={erro} ok={ok ? `Estado: ${ROTULO_ESTADO_CURSO[ok as EstadoCurso] ?? ok}.` : undefined} textos={{}} />
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <BotaoImprimir titulo={c.titulo} />
          {escreve &&
            acoes.map((a) => (
              <form key={a.estado} action={mudarEstadoCurso}>
                <input type="hidden" name="id" value={c.id} />
                <input type="hidden" name="revisao" value={c.revisao} />
                <input type="hidden" name="estado" value={a.estado} />
                <button type="submit" className={BOTAO}>
                  {a.rotulo}
                </button>
              </form>
            ))}
          {c.estado === 'publicado' && (
            <Link href={`/cursos/${c.slug}`} className="text-sm underline">
              Ver no site
            </Link>
          )}
        </div>
      </div>
      <div className="overflow-x-auto">
        <DocumentoCurso curso={c.curso} />
      </div>
    </>
  );
}
