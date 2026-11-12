import { AdminHeading } from '@/components/admin/primitives';
import { Feedback } from '@/components/admin/Feedback';
import { EditorProposta } from '@/components/admin/propostas/EditorProposta';
import { ListaPropostas } from '@/components/admin/propostas/ListaPropostas';
import { createSessionClient } from '@/lib/auth/client';
import { podeEscrever, requireStaff } from '@/lib/auth/session';
import { listarPropostas, PASSO_0020 } from '@/lib/propostas/leitura';

export const metadata = { title: 'Propostas' };

/** O dia de hoje, fora do corpo do componente (o compilador do React recusa ler a hora a desenhar). */
async function hoje(): Promise<string> {
  return new Date(Date.now()).toISOString().slice(0, 10);
}

/**
 * Gestão de Propostas (AEOS, bloco 2). Com a 0020 aplicada: a lista das
 * propostas guardadas. Sem ela: o editor a trabalhar só no separador, e o
 * passo que falta para guardar na base — nunca uma lista vazia a fingir.
 */
export default async function PropostasPage({ searchParams }: { searchParams: Promise<{ erro?: string; ok?: string }> }) {
  const sessao = await requireStaff();
  const { erro, ok } = await searchParams;
  const supabase = await createSessionClient();
  const lista = await listarPropostas(supabase);

  return (
    <>
      <div className="print:hidden">
        <AdminHeading
          titulo="Propostas"
          descricao="Cole o texto de uma proposta ou escreva-a campo a campo; as folhas A4 saem no estilo editorial AGORAMOZ e descarregam-se em PDF. O total, as semanas e a validade são calculados."
        />
        <Feedback erro={erro} ok={ok} textos={{}} />
      </div>
      {lista.estado === 'ok' ? (
        <ListaPropostas itens={lista.dados.itens} truncado={lista.dados.truncado} podeCriar={podeEscrever(sessao.papel)} />
      ) : (
        <>
          <p role="status" className="mb-6 border border-[color:var(--border)] px-4 py-3 text-sm print:hidden">
            {lista.estado === 'por-activar'
              ? `Guardar propostas na base está por activar. ${PASSO_0020} Até lá, o editor funciona neste separador: exporte o rascunho para o guardar.`
              : 'Não foi possível ler as propostas guardadas. O editor funciona neste separador.'}
          </p>
          <EditorProposta hoje={await hoje()} />
        </>
      )}
    </>
  );
}
