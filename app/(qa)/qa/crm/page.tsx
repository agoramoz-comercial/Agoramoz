import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CascaAdmin } from '@/components/admin/CascaAdmin';
import { AdminHeading, StateBadge } from '@/components/admin/primitives';
import { FichaOportunidade, type DadosFicha } from '@/components/admin/crm/FichaOportunidade';
import { HojeVista } from '@/components/admin/crm/HojeVista';
import { PorResponsavel } from '@/components/admin/crm/PorResponsavel';
import { porResponsavel } from '@/lib/crm/responsaveis';
import { Consentimento, LinhaTemporal, OportunidadesLigadas, Resumo360 } from '@/components/admin/crm/Ficha360';
import { AuditoriaVista } from '@/components/admin/AuditoriaVista';
import type { LinhaAuditoria } from '@/lib/admin/auditoria';
import { estadoConsentimento, linhaTemporal, type OportunidadeLigada, type RegistoConsentimento } from '@/lib/crm/ficha360';
import { pesquisaExemplo } from './pesquisa-exemplo';
import { PipelineVista } from '@/components/admin/crm/PipelineVista';
import { FASE_OPORTUNIDADE } from '@/lib/admin/labels';
import { resumoHoje, triagem } from '@/lib/crm/hoje';
import type { PorRever, ReuniaoProxima } from '@/lib/crm/leitura';
import { filaDeHoje } from '@/lib/crm/modelo';
import { aplicarVista, filtrarDono, lerFiltros, ordenar, VISTAS, type OportunidadePipeline, type Vista } from '@/lib/crm/pipeline';

/**
 * Pré-visualização do CRM operacional (pipeline e ficha) para o QA visual
 * (Playwright + axe), sem sessão nem base. Só existe com `ADMIN_PREVIEW=on`
 * e fora da Vercel: em produção é 404.
 *
 * TUDO AQUI É DE EXEMPLO — pessoas, empresas e valores inventados, e a página
 * di-lo no topo. `?ecra=pipeline|ficha|perdida|por-activar|hoje|hoje-vazio|hoje-por-activar|contacto|organizacao|auditoria` mais os
 * parâmetros do pipeline (`vista`, `modo`, `ordem`, `sentido`, `fase`).
 */

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Pré-visualização do CRM',
  robots: { index: false, follow: false, nocache: true },
};

/** Instante fixo: atrasos, «hoje» e dias na fase são sempre os mesmos. */
const AGORA = new Date('2026-10-12T10:00:00+02:00');
const EU = '00000000-0000-4000-8000-0000000000a1';
const ANA = '00000000-0000-4000-8000-0000000000a2';
const EQUIPA = [
  { id: EU, nome: 'Exemplo Gerson', activo: true },
  { id: ANA, nome: 'Exemplo Ana', activo: true },
];
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const dias = (n: number, hora = '10:00') => {
  const d = new Date(AGORA.getTime() + n * 86_400_000);
  return `${d.toISOString().slice(0, 10)}T${hora}:00+02:00`;
};

function op(
  n: number,
  stage: string,
  nome: string,
  org: string,
  o: Partial<OportunidadePipeline> = {},
): OportunidadePipeline {
  return {
    id: id(n),
    stage,
    tier: 'B',
    score: 640,
    owner_id: EU,
    next_action_at: null,
    proxima_accao: null,
    fase_desde: dias(-5),
    valor: null,
    moeda: null,
    created_at: dias(-20 - n),
    canal: 'organico',
    campanha: null,
    contacto: { id: id(100 + n), nome },
    organizacao: { id: id(200 + n), nome: org },
    ultima_actividade: dias(-2),
    ...o,
  };
}

const ITENS: OportunidadePipeline[] = [
  op(1, 'novo', 'Exemplo Marta Sitoe', 'Exemplo Logística Lda', { owner_id: null, canal: 'campanha', campanha: 'gbp' }),
  op(2, 'novo', 'Exemplo João Muianga', 'Exemplo Seguros SA', { owner_id: null, tier: 'A', score: 820 }),
  op(3, 'qualificacao', 'Exemplo Carla Nhantumbo', 'Exemplo Banco Comercial', {
    next_action_at: dias(-2, '15:00'),
    proxima_accao: 'Enviar resumo do diagnóstico',
    valor: 350000,
    moeda: 'MZN',
  }),
  op(4, 'qualificacao', 'Exemplo Pedro Langa', 'Exemplo Energia do Norte', {
    next_action_at: dias(0, '16:30'),
    proxima_accao: 'Chamada de qualificação',
    owner_id: ANA,
  }),
  op(5, 'proposta', 'Exemplo Sofia Macuácua', 'Exemplo Mineração Centro', {
    next_action_at: dias(3),
    proxima_accao: 'Rever proposta com o CFO',
    valor: 42000,
    moeda: 'USD',
    fase_desde: dias(-12),
  }),
  op(6, 'proposta', 'Exemplo Rui Tembe', 'Exemplo Retalho Sul', {
    valor: 1200000,
    moeda: 'MZN',
    ultima_actividade: dias(-21),
    fase_desde: dias(-30),
  }),
  op(7, 'negociacao', 'Exemplo Lúcia Cossa', 'Exemplo Portos Lda', {
    next_action_at: dias(12),
    proxima_accao: 'Assinatura do contrato',
    valor: 18000,
    moeda: 'EUR',
  }),
  op(8, 'ganho', 'Exemplo Tomás Bila', 'Exemplo Saúde Mais', { valor: 900000, moeda: 'MZN' }),
  op(9, 'perdido', 'Exemplo Inês Mabunda', 'Exemplo Agro Vale', { owner_id: ANA }),
];

function semNovas(o: OportunidadePipeline): OportunidadePipeline {
  return { ...o, next_action_at: null, proxima_accao: null, fase_desde: null, valor: null, moeda: null, ultima_actividade: null };
}

const FICHA: DadosFicha = {
  id: id(3),
  stage: 'qualificacao',
  tier: 'B',
  score: 640,
  owner_id: EU,
  next_action_at: dias(-2, '15:00'),
  proxima_accao: 'Enviar resumo do diagnóstico',
  fase_desde: dias(-5),
  valor: 350000,
  moeda: 'MZN',
  data_prevista_fecho: dias(40).slice(0, 10),
  motivo_perda: null,
  motivo_perda_nota: null,
  revisao: 4,
  created_at: dias(-23),
  canal: 'campanha',
  campanha: 'gbp',
  contacto: { id: id(103), nome: 'Exemplo Carla Nhantumbo', email: 'carla@exemplo.test' },
  organizacao: { id: id(203), nome: 'Exemplo Banco Comercial' },
  atribuicao: { utm_source: 'google', utm_medium: 'cpc', utm_content: null, landing_page: '/diagnostico', referrer_host: 'google.com', first_touch_at: dias(-24), last_touch_at: dias(-23) },
  diagnostico: { id: id(303), estado: 'approved', tier: 'B', score: 640 },
  reunioes: [{ id: id(403), estado: 'marcada', tipo: 'Conversa de diagnóstico (30 min)', inicio: dias(2, '11:00') }],
  actividades: [
    { id: 6, activity_type: 'chamada', body: 'Confirmou interesse; pede o resumo por escrito antes da reunião.', occurred_at: dias(-2, '14:10'), actor_type: 'user', actor_id: EU, metadata: {} },
    { id: 5, activity_type: 'proxima_accao', body: 'Enviar resumo do diagnóstico', occurred_at: dias(-3, '09:00'), actor_type: 'user', actor_id: EU, metadata: { quando: dias(-2, '15:00') } },
    { id: 4, activity_type: 'dados', body: null, occurred_at: dias(-4, '17:20'), actor_type: 'user', actor_id: EU, metadata: { valor: 350000, moeda: 'MZN', data_prevista_fecho: dias(40).slice(0, 10) } },
    { id: 3, activity_type: 'fase', body: null, occurred_at: dias(-5, '10:00'), actor_type: 'user', actor_id: EU, metadata: { de: 'novo', para: 'qualificacao', origem: 'diagnostico_aprovado' } },
    { id: 2, activity_type: 'atribuicao', body: null, occurred_at: dias(-6, '08:30'), actor_type: 'user', actor_id: EU, metadata: { de: null, para: EU } },
    { id: 1, activity_type: 'reuniao_marcada', body: null, occurred_at: dias(-6, '08:00'), actor_type: 'system', actor_id: null, metadata: { inicio: dias(2, '11:00') } },
  ],
};

const PERDIDA: DadosFicha = {
  ...FICHA,
  id: id(9),
  stage: 'perdido',
  next_action_at: null,
  proxima_accao: null,
  motivo_perda: 'outro',
  motivo_perda_nota: 'Optaram por desenvolver internamente',
  contacto: { id: id(109), nome: 'Exemplo Inês Mabunda', email: 'ines@exemplo.test' },
  organizacao: { id: id(209), nome: 'Exemplo Agro Vale' },
};

const POR_REVER: PorRever[] = [
  { id: id(301), tier: 'A', score: 820, estado: 'computed', criado: dias(-1, '09:15'), contacto: 'Exemplo João Muianga' },
  { id: id(302), tier: 'C', score: 410, estado: 'pending_review', criado: dias(-3, '16:40'), contacto: 'Exemplo Marta Sitoe' },
];
const REUNIOES: ReuniaoProxima[] = [
  { id: id(401), inicio: dias(2, '11:00'), tipo: 'Conversa de diagnóstico (30 min)', oportunidade: { id: id(3), nome: 'Exemplo Carla Nhantumbo' } },
];

function hoje(variante: string) {
  const activo = variante !== 'hoje-por-activar';
  const vazio = variante === 'hoje-vazio';
  const abertas = vazio ? [] : (activo ? ITENS : ITENS.map(semNovas)).filter((o) => o.stage !== 'ganho' && o.stage !== 'perdido');
  const fila = filaDeHoje(abertas, EU, AGORA);
  const porRever = vazio ? { itens: [], total: 0 } : { itens: POR_REVER, total: POR_REVER.length };
  const reunioes = vazio ? [] : REUNIOES;
  return (
    <HojeVista
      nome="Exemplo Gerson"
      agora={AGORA}
      eu={EU}
      escreve
      activo={activo}
      fila={fila}
      triagem={triagem(fila.semDono)}
      porRever={porRever}
      reunioes={reunioes}
      resumo={resumoHoje(fila, porRever.total, reunioes.length)}
      falhou={false}
    />
  );
}

const AUDITORIA: LinhaAuditoria[] = [
  { id: 4, actor_id: EU, actor_type: 'user', action: 'crm.exportar', entity_type: 'crm_lista', entity_id: 'oportunidades', before: null, after: { linhas: 7, filtros: { vista: 'abertas' } }, occurred_at: dias(0, '09:30') },
  { id: 3, actor_id: EU, actor_type: 'user', action: 'oportunidade.dados', entity_type: 'deal', entity_id: id(3), before: { valor: null, moeda: null }, after: { valor: 350000, moeda: 'MZN' }, occurred_at: dias(-4, '17:20') },
  { id: 2, actor_id: EU, actor_type: 'user', action: 'oportunidade.mudar_fase', entity_type: 'deal', entity_id: id(3), before: { stage: 'novo' }, after: { stage: 'qualificacao' }, occurred_at: dias(-5, '10:00') },
  { id: 1, actor_id: null, actor_type: 'system', action: 'diagnostico.aprovar', entity_type: 'diagnostic', entity_id: id(303), before: { state: 'pending_review' }, after: { state: 'approved' }, occurred_at: dias(-5, '09:59') },
];

const LIGADAS: (OportunidadeLigada & { created_at: string })[] = [
  { id: id(3), stage: 'qualificacao', owner_id: EU, next_action_at: dias(-2, '15:00'), proxima_accao: 'Enviar resumo do diagnóstico', valor: 350000, moeda: 'MZN', created_at: dias(-23), contacto: 'Exemplo Carla Nhantumbo' },
  { id: id(10), stage: 'ganho', owner_id: ANA, next_action_at: null, proxima_accao: null, valor: 120000, moeda: 'MZN', created_at: dias(-200), contacto: 'Exemplo Paulo Chissano' },
];

const CONSENTIMENTOS: RegistoConsentimento[] = [
  { id: id(501), purpose: 'diagnostico-comercial', granted: true, consent_text: 'Aceito ser contactado pela AGORAMOZ sobre este pedido (exemplo).', consent_version: 'v2', captured_at: dias(-23), withdrawn_at: null },
  { id: id(502), purpose: 'inquerito', granted: true, consent_text: 'Aceito ser contactado sobre as minhas respostas (exemplo).', consent_version: 'v1', captured_at: dias(-23), withdrawn_at: dias(-3, '12:00') },
];

function ficha360(tipo: 'contacto' | 'organizacao') {
  const nomes = new Map(EQUIPA.map((e) => [e.id, e.nome]));
  const ligadas = tipo === 'contacto' ? LIGADAS.slice(0, 1).concat({ ...LIGADAS[1]!, contacto: 'Exemplo Carla Nhantumbo' }) : LIGADAS;
  const eventos = linhaTemporal(
    {
      actividades: FICHA.actividades.map((a) => ({ ...a, deal_id: id(3), contexto: tipo === 'organizacao' ? 'Exemplo Carla Nhantumbo' : undefined })),
      respostas: [{ id: id(601), submitted_at: dias(-23), diagnostico: { id: id(303), tier: 'B', score: 640 } }],
      consentimentos: tipo === 'contacto' ? CONSENTIMENTOS : [],
      oportunidades: ligadas.map((o) => ({ id: o.id, created_at: o.created_at })),
    },
    nomes,
  );
  return (
    <>
      <AdminHeading titulo={tipo === 'contacto' ? 'Exemplo Carla Nhantumbo' : 'Exemplo Banco Comercial'} descricao={tipo === 'contacto' ? 'Directora de operações · Exemplo Banco Comercial' : 'banco.exemplo.test'} />
      <Resumo360 oportunidades={ligadas} ultima={FICHA.actividades[0]!.occurred_at} activo />
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <aside aria-label="Propriedades" className="flex flex-col gap-4 lg:col-start-2 lg:row-start-1">
          {tipo === 'contacto' ? <Consentimento actuais={estadoConsentimento(CONSENTIMENTOS)} registos={CONSENTIMENTOS} /> : null}
        </aside>
        <div className="flex min-w-0 flex-col gap-8 lg:col-start-1 lg:row-start-1">
          <OportunidadesLigadas itens={ligadas} nomes={nomes} agora={AGORA} activo mostrarContacto={tipo === 'organizacao'} />
          <LinhaTemporal eventos={eventos} />
        </div>
      </div>
    </>
  );
}

export default async function PreVisualizacaoCrm({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  if (process.env.ADMIN_PREVIEW !== 'on' || process.env.VERCEL_ENV !== undefined) notFound();
  const p = await searchParams;
  const ecra = p.ecra ?? 'pipeline';

  let corpo: React.ReactNode;
  if (ecra === 'responsaveis') {
    corpo = <PorResponsavel linhas={porResponsavel(ITENS, EQUIPA, AGORA, new Date(AGORA.getTime() - 29 * 86_400_000), true)} dias={30} />;
  } else if (ecra === 'contacto' || ecra === 'organizacao') {
    corpo = ficha360(ecra);
  } else if (ecra === 'auditoria') {
    corpo = (
      <>
        <AdminHeading titulo="Auditoria" descricao="Pré-visualização com registos de exemplo." />
        <AuditoriaVista linhas={AUDITORIA} nomes={new Map(EQUIPA.map((e) => [e.id, e.nome]))} equipa={EQUIPA} filtros={{}} pagina={1} haMais={false} />
      </>
    );
  } else if (ecra.startsWith('hoje')) {
    corpo = hoje(ecra);
  } else if (ecra === 'ficha' || ecra === 'perdida' || ecra === 'ficha-por-activar') {
    const d = ecra === 'perdida' ? PERDIDA : FICHA;
    corpo = (
      <>
        <AdminHeading titulo={d.contacto?.nome ?? ''} descricao={d.organizacao?.nome} accao={<StateBadge rotulo={FASE_OPORTUNIDADE[d.stage as keyof typeof FASE_OPORTUNIDADE]} />} />
        <FichaOportunidade
          d={d}
          activo={ecra !== 'ficha-por-activar'}
          escreve
          eu={EU}
          equipa={EQUIPA}
          agora={AGORA}
          perder={p.perder === '1'}
          historico={AUDITORIA.filter((a) => a.entity_type === 'deal' && a.entity_id === d.id)}
          admin
        />
      </>
    );
  } else {
    const activo = ecra !== 'por-activar';
    const todas = activo ? ITENS : ITENS.map(semNovas);
    const filtros = lerFiltros(p);
    const base = filtrarDono(filtros.fase ? todas.filter((o) => o.stage === filtros.fase) : todas, filtros.dono);
    const contagens = Object.fromEntries(VISTAS.map((v) => [v, aplicarVista(base, v, EU, AGORA).length])) as Record<Vista, number>;
    corpo = (
      <>
        <AdminHeading titulo="Pipeline" descricao="Pré-visualização com oportunidades de exemplo." />
        <PipelineVista
          filtros={filtros}
          itens={ordenar(aplicarVista(base, filtros.vista, EU, AGORA), filtros.ordem, filtros.sentido)}
          contagens={contagens}
          truncado={false}
          activo={activo}
          escreve
          eu={EU}
          nomes={new Map(EQUIPA.map((e) => [e.id, e.nome]))}
          agora={AGORA}
        />
      </>
    );
  }

  return (
    <div data-surface="light" className="min-h-screen bg-[color:var(--surface)] text-[color:var(--on-surface)]">
      <p role="note" className="bg-[color:var(--on-surface)] px-4 py-2 text-center text-xs text-[color:var(--surface)]">
        Pré-visualização de QA — pessoas, empresas e valores são de exemplo.
      </p>
      <CascaAdmin sessao={{ nome: 'Pré-visualização', email: 'qa@exemplo.test', papel: 'comercial' }} pesquisa={pesquisaExemplo}>{corpo}</CascaAdmin>
    </div>
  );
}
