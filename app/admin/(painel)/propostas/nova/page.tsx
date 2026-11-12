import { redirect } from 'next/navigation';
import { AdminHeading } from '@/components/admin/primitives';
import { EditorProposta } from '@/components/admin/propostas/EditorProposta';
import { createSessionClient } from '@/lib/auth/client';
import { podeEscrever, requireStaff } from '@/lib/auth/session';
import { listarPropostas, oportunidadesParaLigar } from '@/lib/propostas/leitura';

export const metadata = { title: 'Nova proposta' };

async function hoje(): Promise<string> {
  return new Date(Date.now()).toISOString().slice(0, 10);
}

/** Uma proposta nova, para guardar na base. Sem a 0020 (ou sem escrita), volta à lista, que explica porquê. */
export default async function NovaPropostaPage({ searchParams }: { searchParams: Promise<{ oportunidade?: string }> }) {
  const sessao = await requireStaff();
  if (!podeEscrever(sessao.papel)) redirect('/admin/propostas');
  const supabase = await createSessionClient();
  if ((await listarPropostas(supabase)).estado !== 'ok') redirect('/admin/propostas');
  const { oportunidade } = await searchParams;
  const oportunidades = await oportunidadesParaLigar(supabase);
  const dealId = oportunidade && oportunidades.some((o) => o.id === oportunidade) ? oportunidade : null;

  return (
    <>
      <div className="print:hidden">
        <AdminHeading titulo="Nova proposta" descricao="Cole o texto ou preencha os campos. «Guardar proposta» grava a versão 1." />
      </div>
      <EditorProposta
        hoje={await hoje()}
        base={{ id: null, revisao: null, versao: null, dealId, oportunidades, textoColado: null, fechada: false }}
      />
    </>
  );
}
