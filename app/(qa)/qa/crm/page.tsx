import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CascaAdmin } from '@/components/admin/CascaAdmin';
import { AdminHeading, StateBadge } from '@/components/admin/primitives';
import { FichaOportunidade, type DadosFicha } from '@/components/admin/crm/FichaOportunidade';
import { PipelineVista } from '@/components/admin/crm/PipelineVista';
import { FASE_OPORTUNIDADE } from '@/lib/admin/labels';
import { aplicarVista, lerFiltros, ordenar, VISTAS, type OportunidadePipeline, type Vista } from '@/lib/crm/pipeline';

/**
 * Pré-visualização do CRM operacional (pipeline e ficha) para o QA visual
 * (Playwright + axe), sem sessão nem base. Só existe com `ADMIN_PREVIEW=on`
 * e fora da Vercel: em produção é 404.
 *
 * TUDO AQUI É DE EXEMPLO — pessoas, empresas e valores inventados, e a página
 * di-lo no topo. `?ecra=pipeline|ficha|perdida|por-activar` mais os
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
  op(2, 'novo', 'Exemplo João Muianga', 'Exemplo Seguros SA', { owner_id: null }),
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

export default async function PreVisualizacaoCrm({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  if (process.env.ADMIN_PREVIEW !== 'on' || process.env.VERCEL_ENV !== undefined) notFound();
  const p = await searchParams;
  const ecra = p.ecra ?? 'pipeline';

  let corpo: React.ReactNode;
  if (ecra === 'ficha' || ecra === 'perdida' || ecra === 'ficha-por-activar') {
    const d = ecra === 'perdida' ? PERDIDA : FICHA;
    corpo = (
      <>
        <AdminHeading titulo={d.contacto?.nome ?? ''} descricao={d.organizacao?.nome} accao={<StateBadge rotulo={FASE_OPORTUNIDADE[d.stage as keyof typeof FASE_OPORTUNIDADE]} />} />
        <FichaOportunidade d={d} activo={ecra !== 'ficha-por-activar'} escreve eu={EU} equipa={EQUIPA} agora={AGORA} perder={p.perder === '1'} />
      </>
    );
  } else {
    const activo = ecra !== 'por-activar';
    const todas = activo ? ITENS : ITENS.map(semNovas);
    const filtros = lerFiltros(p);
    const base = filtros.fase ? todas.filter((o) => o.stage === filtros.fase) : todas;
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
      <CascaAdmin sessao={{ nome: 'Pré-visualização', email: 'qa@exemplo.test', papel: 'comercial' }}>{corpo}</CascaAdmin>
    </div>
  );
}
