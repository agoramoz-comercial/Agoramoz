import Link from 'next/link';
import { AdminHeading, DataHora } from '@/components/admin/primitives';
import { Feedback } from '@/components/admin/Feedback';
import { podeEscrever, requireStaff } from '@/lib/auth/session';
import { listarCursos, PASSO_0022, ROTULO_ESTADO_CURSO } from '@/lib/cursos/leitura';
import { motorCursosLigado } from '@/lib/cursos/motor';

export const metadata = { title: 'Cursos' };

/**
 * Cursos AGORAMOZ (AEOS, bloco 3 — Unidade E: Academia). Gerados das fontes
 * carregadas, verificados afirmação a afirmação, publicados em /cursos.
 */
export default async function CursosPage({ searchParams }: { searchParams: Promise<{ erro?: string; ok?: string }> }) {
  const sessao = await requireStaff();
  const { erro, ok } = await searchParams;
  const lista = await listarCursos();
  const ligado = motorCursosLigado();
  const escreve = podeEscrever(sessao.papel);

  return (
    <>
      <AdminHeading
        titulo="Cursos"
        descricao="Carregue as fontes, diga o tema e o público: o motor escreve, o verificador confirma cada afirmação contra as fontes e retira o que não tem apoio. O curso descarrega-se em PDF e publica-se em /cursos."
        accao={
          escreve ? (
            <Link
              href="/admin/cursos/novo"
              className="inline-flex min-h-11 items-center rounded-[--radius-xs] bg-[color:var(--color-signal-600)] px-4 text-sm font-medium text-white"
            >
              Criar curso
            </Link>
          ) : undefined
        }
      />
      <Feedback erro={erro} ok={ok} textos={{}} />
      <dl className="mb-6 grid gap-2 border border-[color:var(--border)] p-4 text-sm sm:grid-cols-2">
        <div>
          <dt className="font-medium">Motor (ZabaEdu)</dt>
          <dd className="text-[color:var(--muted)]">
            {ligado ? 'Ligado.' : 'Por ligar: ver docs/CURSOS.md (função agoramoz_llm e três variáveis na Vercel).'}
          </dd>
        </div>
        <div>
          <dt className="font-medium">Guardar e publicar</dt>
          <dd className="text-[color:var(--muted)]">
            {lista.estado === 'por-activar'
              ? `Por activar. ${PASSO_0022}`
              : lista.estado === 'erro'
                ? 'Não foi possível ler a base.'
                : 'Activo.'}
          </dd>
        </div>
      </dl>
      {lista.estado === 'ok' &&
        (lista.dados.length === 0 ? (
          <p className="text-sm text-[color:var(--muted)]">Ainda não há cursos guardados.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[color:var(--border)]">
                <th className="py-2 font-medium">Curso</th>
                <th className="py-2 font-medium">Estado</th>
                <th className="py-2 font-medium">Actualizado</th>
              </tr>
            </thead>
            <tbody>
              {lista.dados.map((c) => (
                <tr key={c.id} className="border-b border-[color:var(--border)]">
                  <td className="py-2">
                    <Link href={`/admin/cursos/${c.id}`} className="underline">
                      {c.titulo}
                    </Link>
                    <span className="block text-xs text-[color:var(--muted)]">/cursos/{c.slug}</span>
                  </td>
                  <td className="py-2">{ROTULO_ESTADO_CURSO[c.estado]}</td>
                  <td className="py-2">
                    <DataHora valor={c.actualizado} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ))}
    </>
  );
}
