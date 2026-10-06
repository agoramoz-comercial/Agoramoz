import { notFound } from 'next/navigation';
import { FichaOportunidade } from '@/components/admin/energia/Ficha';
import { Mensagens } from '@/components/admin/energia/partes';
import { requireModulo } from '@/lib/auth/modulos';
import { createSessionClient } from '@/lib/auth/client';
import {
  COLUNAS_OPORTUNIDADE,
  COLUNAS_STAKEHOLDER,
  oportunidadeDe,
  stakeholderDe,
  type Documento,
  type Registo,
} from '@/lib/energia/leitura';

export const metadata = { title: 'Oportunidade — Espaço CEnO' };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const OK: Record<string, string> = {
  criada: 'Oportunidade registada na etapa 0 (sinal). Próximo passo: avaliar o score e ligar o decisor.',
  guardada: 'Dados guardados.',
  avaliada: 'Score gravado.',
  fase: 'Etapa mudada e registada.',
  memo: 'Opportunity Memo gravado.',
  ligado: 'Stakeholder ligado.',
  desligado: 'Stakeholder retirado.',
  registo: 'Registado.',
  documento: 'Pasta da sala actualizada.',
};

export default async function OportunidadeCenoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erro?: string; ok?: string }>;
}) {
  await requireModulo('energia');
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const { erro, ok } = await searchParams;

  const supabase = await createSessionClient();
  const [op, ligacoes, stakeholders, registos, documentos] = await Promise.all([
    supabase.from('ceno_oportunidades').select(COLUNAS_OPORTUNIDADE).eq('id', id).maybeSingle(),
    supabase.from('ceno_oportunidade_stakeholders').select('stakeholder_id, papel').eq('oportunidade_id', id),
    supabase.from('ceno_stakeholders').select(COLUNAS_STAKEHOLDER).order('organizacao').limit(500),
    supabase
      .from('ceno_registos')
      .select('id, tipo, decisao, corpo, metadata, ocorreu_em')
      .eq('oportunidade_id', id)
      .order('ocorreu_em', { ascending: false })
      .limit(100),
    supabase.from('ceno_documentos').select('pasta, estado, ligacao, nota').eq('oportunidade_id', id).order('pasta'),
  ]);

  // Não existe — ou não é dela, que para a RLS é o mesmo.
  if (!op.data) notFound();

  const todos = (stakeholders.data ?? []).map((r) => stakeholderDe(r as unknown as Record<string, unknown>));
  const ligados = (ligacoes.data ?? [])
    .map((l) => ({ stakeholder: todos.find((s) => s.id === l.stakeholder_id), papel: String(l.papel) }))
    .filter((l): l is { stakeholder: (typeof todos)[number]; papel: string } => Boolean(l.stakeholder));

  return (
    <>
      <Mensagens erro={erro} ok={ok} textos={OK} />
      <FichaOportunidade
        op={oportunidadeDe(op.data as unknown as Record<string, unknown>)}
        ligados={ligados}
        stakeholders={todos}
        registos={(registos.data ?? []) as unknown as Registo[]}
        documentos={(documentos.data ?? []) as unknown as Documento[]}
        agora={new Date().toISOString()}
      />
    </>
  );
}
