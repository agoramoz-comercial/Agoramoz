import { notFound } from 'next/navigation';
import { AdminHeading, StateBadge } from '@/components/admin/primitives';
import { Feedback } from '@/components/admin/Feedback';
import { VoltarLista } from '@/components/admin/MemoriaLista';
import { Trilho } from '@/components/admin/Trilho';
import { FichaOportunidade, type ActividadeFicha, type DadosFicha } from '@/components/admin/crm/FichaOportunidade';
import { TEXTOS_OK_CRM } from '@/components/admin/crm/partes';
import { FASE_OPORTUNIDADE, type FaseOportunidade } from '@/lib/admin/labels';
import { createSessionClient } from '@/lib/auth/client';
import { podeEscrever, requireStaff } from '@/lib/auth/session';
import { crmOperacional } from '@/lib/crm/activacao';
import { lerEquipa } from '@/lib/crm/leitura';
import type { LinhaAuditoria } from '@/lib/admin/auditoria';

export const metadata = { title: 'Oportunidade' };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const BASE =
  'id, stage, tier, score, owner_id, next_action_at, created_at, acquisition_channel, acquisition_campaign, source_response_id, contacts(id, name, email), organisations(id, name)';
const NOVAS = 'proxima_accao, fase_desde, valor, moeda, data_prevista_fecho, motivo_perda, motivo_perda_nota, revisao';

type Linha = Record<string, unknown> & {
  id: string;
  source_response_id: string | null;
  contacts: { id: string; name: string; email: string | null } | null;
  organisations: { id: string; name: string } | null;
};

export default async function OportunidadePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erro?: string; ok?: string; perder?: string }>;
}) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const { erro, ok, perder } = await searchParams;
  const sessao = await requireStaff();
  const supabase = await createSessionClient();
  const activo = (await crmOperacional(supabase)) === true;

  const [negocio, actividades, reunioes, equipa, historico] = await Promise.all([
    supabase
      .from('deals')
      .select(activo ? `${BASE}, ${NOVAS}` : BASE)
      .eq('id', id)
      .maybeSingle(),
    supabase
      .from('activities')
      .select('id, activity_type, body, occurred_at, actor_type, actor_id, metadata')
      .eq('deal_id', id)
      .order('occurred_at', { ascending: false })
      .limit(100),
    // Sem a 0012 a tabela não existe: lê-se como «nenhuma reunião».
    supabase.from('reunioes').select('id, estado, tipo, inicio').eq('deal_id', id).order('inicio', { ascending: false }).limit(10),
    lerEquipa(supabase),
    supabase
      .from('audit_log')
      .select('id, actor_id, actor_type, action, entity_type, entity_id, before, after, occurred_at')
      .eq('entity_type', 'deal')
      .eq('entity_id', id)
      .order('occurred_at', { ascending: false })
      .limit(50),
  ]);

  if (!negocio.data) notFound();
  const l = negocio.data as unknown as Linha;

  // Dependem do `source_response_id`, que só se conhece depois da primeira leitura.
  const [atribuicao, diagnostico] = l.source_response_id
    ? await Promise.all([
        supabase
          .from('response_attribution')
          .select('utm_source, utm_medium, utm_campaign, utm_content, landing_page, referrer_host, first_touch_at, last_touch_at')
          .eq('response_id', l.source_response_id)
          .maybeSingle(),
        supabase
          .from('diagnostics')
          .select('id, state, tier, score')
          .eq('response_id', l.source_response_id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ])
    : [null, null];

  const num = (v: unknown) => (v === null || v === undefined ? null : Number(v));
  const txt = (v: unknown) => (v === null || v === undefined ? null : String(v));
  const diag = diagnostico?.data as { id: string; state: string; tier: string; score: number } | null | undefined;

  const d: DadosFicha = {
    id: l.id,
    stage: String(l.stage),
    tier: txt(l.tier),
    score: num(l.score),
    owner_id: txt(l.owner_id),
    next_action_at: txt(l.next_action_at),
    proxima_accao: txt(l.proxima_accao),
    fase_desde: txt(l.fase_desde),
    valor: num(l.valor),
    moeda: txt(l.moeda),
    data_prevista_fecho: txt(l.data_prevista_fecho),
    motivo_perda: txt(l.motivo_perda),
    motivo_perda_nota: txt(l.motivo_perda_nota),
    revisao: num(l.revisao),
    created_at: String(l.created_at),
    canal: String(l.acquisition_channel),
    campanha: txt(l.acquisition_campaign),
    contacto: l.contacts ? { id: l.contacts.id, nome: l.contacts.name, email: l.contacts.email } : null,
    organizacao: l.organisations ? { id: l.organisations.id, nome: l.organisations.name } : null,
    atribuicao: (atribuicao?.data as Record<string, string | null> | null | undefined) ?? null,
    diagnostico: diag ? { id: diag.id, estado: diag.state, tier: diag.tier, score: diag.score } : null,
    reunioes: reunioes.error ? [] : ((reunioes.data ?? []) as DadosFicha['reunioes']),
    actividades: (actividades.data ?? []) as unknown as ActividadeFicha[],
  };
  const nome = d.contacto?.nome ?? 'Oportunidade';

  return (
    <>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <Trilho itens={[{ texto: 'Pipeline', href: '/admin/oportunidades' }, { texto: nome }]} />
        <VoltarLista chave="oportunidades" lista="/admin/oportunidades" texto="Voltar ao pipeline" />
      </div>
      <AdminHeading
        titulo={nome}
        descricao={d.organizacao?.nome}
        accao={<StateBadge rotulo={FASE_OPORTUNIDADE[d.stage as FaseOportunidade]} />}
      />
      <Feedback erro={erro} ok={ok} textos={TEXTOS_OK_CRM} />
      {actividades.error ? (
        <p role="alert" className="mb-6 text-sm">
          Não foi possível ler a cronologia. Recarregue a página.
        </p>
      ) : null}
      <FichaOportunidade
        d={d}
        activo={activo}
        escreve={podeEscrever(sessao.papel)}
        eu={sessao.userId}
        equipa={equipa ?? []}
        agora={new Date()}
        perder={perder === '1'}
        historico={(historico.data ?? []) as LinhaAuditoria[]}
        admin={sessao.papel === 'admin'}
      />
    </>
  );
}
