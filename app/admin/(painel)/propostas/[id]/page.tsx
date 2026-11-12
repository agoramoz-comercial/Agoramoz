import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { AdminHeading, DataHora } from '@/components/admin/primitives';
import { Feedback } from '@/components/admin/Feedback';
import { EditorProposta } from '@/components/admin/propostas/EditorProposta';
import { mudarEstadoProposta } from '@/lib/admin/propostas-actions';
import { createSessionClient } from '@/lib/auth/client';
import { podeEscrever, requireStaff } from '@/lib/auth/session';
import { valor, type Moeda } from '@/lib/propostas/modelo';
import { abrirProposta, oportunidadesParaLigar, ROTULO_ESTADO, type EstadoProposta } from '@/lib/propostas/leitura';
import { cn } from '@/lib/utils/cn';

export const metadata = { title: 'Proposta' };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function hoje(): Promise<string> {
  return new Date(Date.now()).toISOString().slice(0, 10);
}

/** Para onde cada estado pode ir, como a base o permite (0020). */
const SEGUINTES: Readonly<Record<EstadoProposta, readonly { estado: EstadoProposta; texto: string }[]>> = {
  rascunho: [
    { estado: 'enviada', texto: 'Marcar como enviada' },
    { estado: 'arquivada', texto: 'Arquivar' },
  ],
  enviada: [
    { estado: 'aceite', texto: 'Aceite pelo cliente' },
    { estado: 'recusada', texto: 'Recusada pelo cliente' },
    { estado: 'rascunho', texto: 'Voltar a rascunho' },
    { estado: 'arquivada', texto: 'Arquivar' },
  ],
  aceite: [{ estado: 'rascunho', texto: 'Voltar a rascunho' }],
  recusada: [{ estado: 'rascunho', texto: 'Voltar a rascunho' }],
  arquivada: [{ estado: 'rascunho', texto: 'Voltar a rascunho' }],
};

const OK: Readonly<Record<string, string>> = {
  rascunho: 'A proposta voltou a rascunho.',
  enviada: 'Proposta marcada como enviada.',
  aceite: 'Proposta marcada como aceite.',
  recusada: 'Proposta marcada como recusada.',
  arquivada: 'Proposta arquivada.',
};

const BOTAO =
  'inline-flex min-h-11 items-center rounded-[--radius-xs] border border-[color:var(--border)] px-3 text-sm hover:bg-[color:var(--surface-raised)]';

export default async function PropostaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ versao?: string; erro?: string; ok?: string }>;
}) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const { versao: v, erro, ok } = await searchParams;
  const sessao = await requireStaff();
  const supabase = await createSessionClient();
  const aberta = await abrirProposta(supabase, id, v ? Number(v) : undefined);
  if (aberta.estado === 'por-activar') redirect('/admin/propostas');
  if (aberta.estado === 'erro') throw new Error('Leitura da proposta falhou.');
  if (!aberta.dados) notFound();

  const { linha, versoes, versao, conteudo, textoColado } = aberta.dados;
  const escreve = podeEscrever(sessao.papel);
  const fechada = !escreve || ['aceite', 'recusada', 'arquivada'].includes(linha.estado);
  const oportunidades = escreve ? await oportunidadesParaLigar(supabase, linha.dealId) : [];
  const antiga = versao !== linha.versao;

  return (
    <>
      <div className="print:hidden">
        <AdminHeading
          titulo={linha.projeto}
          descricao={`${linha.cliente} · ${ROTULO_ESTADO[linha.estado]} · ${valor(linha.total, linha.moeda as Moeda)} · versão ${linha.versao}`}
          accao={
            <Link href="/admin/propostas" className="text-sm underline">
              Todas as propostas
            </Link>
          }
        />
        <Feedback erro={erro} ok={ok} textos={OK} />

        <div className="mb-8 grid gap-6 lg:grid-cols-2">
          <section
            aria-labelledby="proposta-estado"
            className="grid content-start gap-3 border border-[color:var(--border)] bg-[color:var(--surface)] p-4"
          >
            <h2 id="proposta-estado" className="text-base font-medium">
              Estado: {ROTULO_ESTADO[linha.estado]}
            </h2>
            {linha.dealId && (
              <p className="text-sm">
                <Link href={`/admin/oportunidades/${linha.dealId}`} className="underline">
                  Ver a oportunidade no Pipeline
                </Link>
              </p>
            )}
            {escreve && (
              <div className="flex flex-wrap gap-2">
                {SEGUINTES[linha.estado].map((s) => (
                  <form key={s.estado} action={mudarEstadoProposta}>
                    <input type="hidden" name="id" value={linha.id} />
                    <input type="hidden" name="revisao" value={linha.revisao} />
                    <input type="hidden" name="estado" value={s.estado} />
                    <button type="submit" className={BOTAO}>
                      {s.texto}
                    </button>
                  </form>
                ))}
              </div>
            )}
          </section>

          <section
            aria-labelledby="proposta-versoes"
            className="grid content-start gap-3 border border-[color:var(--border)] bg-[color:var(--surface)] p-4"
          >
            <h2 id="proposta-versoes" className="text-base font-medium">
              Versões ({versoes.length})
            </h2>
            <ol role="list" className="grid max-h-56 gap-1 overflow-y-auto text-sm">
              {versoes.map((x) => (
                <li
                  key={x.versao}
                  className={cn('flex flex-wrap items-baseline gap-x-3 gap-y-0.5 py-1', x.versao === versao && 'font-medium')}
                >
                  <Link
                    href={`/admin/propostas/${linha.id}?versao=${x.versao}`}
                    aria-current={x.versao === versao ? 'page' : undefined}
                    className="underline-offset-4 hover:underline"
                  >
                    Versão {x.versao}
                    {x.versao === linha.versao ? ' (actual)' : ''}
                  </Link>
                  <span className="tabular-nums text-[color:var(--muted)]">{valor(x.total, x.moeda as Moeda)}</span>
                  <span className="text-[color:var(--muted)]">
                    <DataHora valor={x.criada} />
                    {x.autor ? ` · ${x.autor}` : ''}
                    {x.comTexto ? ' · do texto colado' : ''}
                  </span>
                  {x.nota && <span className="basis-full text-[color:var(--muted)]">{x.nota}</span>}
                </li>
              ))}
            </ol>
          </section>
        </div>

        {antiga && (
          <p role="status" className="mb-6 border border-[color:var(--border)] px-4 py-3 text-sm">
            Está a ver a versão {versao}.{' '}
            {fechada ? '' : `Guardar cria a versão ${linha.versao + 1} com este conteúdo — é assim que se repõe uma versão antiga.`}
          </p>
        )}
        {!conteudo && (
          <p role="alert" className="mb-6 border border-[color:var(--color-signal-600)] px-4 py-3 text-sm">
            O conteúdo desta versão não passou a validação ao ler. Abra outra versão.
          </p>
        )}
      </div>

      {conteudo && (
        <EditorProposta
          key={`${linha.id}:${versao}:${linha.revisao}`}
          hoje={await hoje()}
          inicial={conteudo}
          base={{ id: linha.id, revisao: linha.revisao, versao: linha.versao, dealId: linha.dealId, oportunidades, textoColado, fechada }}
        />
      )}
    </>
  );
}
