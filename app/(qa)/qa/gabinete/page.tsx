import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CascaAdmin } from '@/components/admin/CascaAdmin';
import { ManualGabinete } from '@/components/admin/gabinete/Manual';
import { PainelCeoVista, PainelCtoVista } from '@/components/admin/gabinete/Paineis';
import { GabineteNav } from '@/components/admin/gabinete/partes';
import {
  CapacidadeVista,
  DecisoesVista,
  FichaProjeto,
  FormDecisao,
  PrioridadesVista,
  ProjetosVista,
  TesourariaVista,
} from '@/components/admin/gabinete/Registos';
import { AdminHeading } from '@/components/admin/primitives';
import { painelCeo, painelCto, type Alocacao, type Decisao, type Movimento, type Pessoa, type Prioridade, type Projeto } from '@/lib/gabinete/modelo';

/**
 * Pré-visualização do Gabinete do Fundador para o QA visual (Playwright +
 * axe), sem sessão nem base. Só existe com `ADMIN_PREVIEW=on` e fora da
 * Vercel: em produção é 404.
 *
 * TUDO AQUI É DE EXEMPLO — projectos, valores e pessoas inventados para a
 * captura, e a página di-lo no topo.
 * `?vista=ceo|cto|vazio|decisoes|decisao|prioridades|projetos|projeto|tesouraria|capacidade|manual`.
 */

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Pré-visualização do Gabinete',
  robots: { index: false, follow: false, nocache: true },
};

/** Dia fixo: as capturas e os atrasos são sempre os mesmos. */
const HOJE = '2026-10-11';

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

const PRONTO = {
  pronto_contrato: true,
  pronto_escopo: true,
  pronto_responsavel: true,
  pronto_capacidade: true,
  pronto_aceitacao: true,
  pronto_dependencias: true,
  pronto_pagamento: true,
} as const;

const PROJETOS: Projeto[] = [
  {
    id: id(1),
    nome: 'Exemplo — portal de pedidos',
    cliente: 'Cliente de exemplo A',
    fase: 'implementacao',
    responsavel: 'Responsável de exemplo',
    sponsor: 'Sponsor de exemplo',
    resultado: 'Exemplo de resultado contratado.',
    escopo: 'Exemplo de escopo.',
    moeda: 'MZN',
    receita_contratada: 900000,
    receita_faturada: 450000,
    receita_recebida: 300000,
    custos_variaveis: 520000,
    margem_bruta: 380000,
    prontidao: PRONTO,
    risco: 'medio',
    proxima_accao: 'Exemplo: validar critérios de aceitação com o sponsor',
    proxima_data: '2026-10-14',
    ligacao: 'https://exemplo.test/pasta',
    revisao: 2,
    updated_at: '2026-10-10T10:00:00.000Z',
  },
  {
    id: id(2),
    nome: 'Exemplo — automação de propostas',
    cliente: 'Cliente de exemplo B',
    fase: 'prototipo',
    responsavel: null,
    sponsor: null,
    resultado: null,
    escopo: null,
    moeda: 'USD',
    receita_contratada: 12000,
    receita_faturada: null,
    receita_recebida: null,
    custos_variaveis: 14000,
    margem_bruta: -2000,
    prontidao: { ...PRONTO, pronto_contrato: false, pronto_pagamento: false, pronto_aceitacao: false },
    risco: 'alto',
    proxima_accao: 'Exemplo: rever escopo',
    proxima_data: '2026-10-02',
    ligacao: null,
    revisao: 1,
    updated_at: '2026-10-01T10:00:00.000Z',
  },
];

const DECISOES: Decisao[] = [
  {
    id: id(11),
    titulo: 'Exemplo — preço do diagnóstico pago',
    contexto: 'Exemplo de contexto.',
    chapeu: 'ceo',
    estado: 'exige_minha',
    decisao: null,
    responsavel: 'Fundador',
    consultados: 'Cofundadora',
    indicador: 'Conversão diagnóstico → contrato',
    data_revisao: '2026-10-08',
    recorrente: false,
    quem_decidiu: null,
    decidida_em: null,
    revisao: 1,
    updated_at: '2026-10-01T10:00:00.000Z',
  },
  {
    id: id(12),
    titulo: 'Exemplo — padrão de ambientes de staging',
    contexto: null,
    chapeu: 'cto',
    estado: 'delegavel',
    decisao: null,
    responsavel: 'Tech lead de exemplo',
    consultados: null,
    indicador: null,
    data_revisao: '2026-10-20',
    recorrente: false,
    quem_decidiu: null,
    decidida_em: null,
    revisao: 1,
    updated_at: '2026-10-05T10:00:00.000Z',
  },
  {
    id: id(13),
    titulo: 'Exemplo — aprovação de despesas abaixo do limite',
    contexto: null,
    chapeu: 'ceo',
    estado: 'decidida',
    decisao: 'Exemplo: delegada a operações com limite.',
    responsavel: null,
    consultados: null,
    indicador: null,
    data_revisao: null,
    recorrente: true,
    quem_decidiu: 'delegada',
    decidida_em: '2026-10-06',
    revisao: 2,
    updated_at: '2026-10-06T10:00:00.000Z',
  },
  {
    id: id(14),
    titulo: 'Exemplo — agenda da reunião semanal',
    contexto: null,
    chapeu: 'ceo',
    estado: 'decidida',
    decisao: 'Exemplo.',
    responsavel: null,
    consultados: null,
    indicador: null,
    data_revisao: null,
    recorrente: true,
    quem_decidiu: 'fundador',
    decidida_em: '2026-10-07',
    revisao: 2,
    updated_at: '2026-10-07T10:00:00.000Z',
  },
];

const PRIORIDADES: Prioridade[] = [
  { id: id(21), trimestre: '2026-T4', tipo: 'comercial', resultado: 'Exemplo: três diagnósticos pagos', indicador: 'Diagnósticos aceites', meta: '3', estado: 'em_curso', nota: null, revisao: 1 },
  { id: id(22), trimestre: '2026-T4', tipo: 'tecnologica', resultado: 'Exemplo: ambiente de staging para todos os projectos', indicador: null, meta: null, estado: 'em_risco', nota: null, revisao: 1 },
];

const MOVIMENTOS: Movimento[] = [
  { id: id(31), tipo: 'saldo', descricao: 'Exemplo — saldo bancário', projeto_id: null, valor: 1200000, moeda: 'MZN', data_prevista: '2026-10-01', data_efectiva: '2026-10-01', revisao: 1, created_at: '2026-10-01T08:00:00.000Z' },
  { id: id(32), tipo: 'recebimento', descricao: 'Exemplo — 2.ª prestação', projeto_id: id(1), valor: 150000, moeda: 'MZN', data_prevista: '2026-10-05', data_efectiva: null, revisao: 1, created_at: '2026-10-01T08:00:00.000Z' },
  { id: id(33), tipo: 'pagamento', descricao: 'Exemplo — alojamento', projeto_id: null, valor: 40000, moeda: 'MZN', data_prevista: '2026-10-20', data_efectiva: null, revisao: 1, created_at: '2026-10-01T08:00:00.000Z' },
  { id: id(34), tipo: 'recebimento', descricao: 'Exemplo — adiantamento', projeto_id: id(1), valor: 300000, moeda: 'MZN', data_prevista: '2026-10-03', data_efectiva: '2026-10-03', revisao: 2, created_at: '2026-10-01T08:00:00.000Z' },
];

const PESSOAS: Pessoa[] = [
  { id: id(41), nome: 'Pessoa A', funcao: 'Desenvolvimento', area: 'tecnologia', horas_semana: 40, activa: true, revisao: 1 },
  { id: id(42), nome: 'Pessoa B', funcao: 'Operações', area: 'operacoes', horas_semana: 20, activa: true, revisao: 1 },
];

const ALOCACOES: Alocacao[] = [
  { pessoa_id: id(41), projeto_id: id(1), horas_semana: 30, ate: null },
  { pessoa_id: id(41), projeto_id: id(2), horas_semana: 16, ate: '2026-12-31' },
  { pessoa_id: id(42), projeto_id: id(1), horas_semana: 8, ate: null },
];

const TUDO = { decisoes: DECISOES, prioridades: PRIORIDADES, projetos: PROJETOS, movimentos: MOVIMENTOS, pessoas: PESSOAS, alocacoes: ALOCACOES };
const VAZIO = { decisoes: [], prioridades: [], projetos: [], movimentos: [], pessoas: [], alocacoes: [] };

const PIPELINE = [
  { chave: 'novo', rotulo: 'Novo', valor: 4 },
  { chave: 'qualificacao', rotulo: 'Qualificação', valor: 2 },
  { chave: 'proposta', rotulo: 'Proposta', valor: 1 },
  { chave: 'negociacao', rotulo: 'Negociação', valor: 0 },
  { chave: 'ganho', rotulo: 'Ganho', valor: 1 },
];

function Vista({ vista }: { vista?: string }) {
  switch (vista) {
    case 'cto':
      return <PainelCtoVista p={painelCto(TUDO, HOJE)} />;
    case 'vazio':
      return <PainelCeoVista p={painelCeo(VAZIO, HOJE)} hoje={HOJE} pipeline={PIPELINE.map((l) => ({ ...l, valor: 0 }))} />;
    case 'decisoes':
      return <DecisoesVista decisoes={DECISOES} hoje={HOJE} />;
    case 'decisao':
      return (
        <div className="max-w-3xl">
          <AdminHeading titulo={DECISOES[0]!.titulo} />
          <GabineteNav activo="decisoes" />
          <FormDecisao v={DECISOES[0]} />
        </div>
      );
    case 'prioridades':
      return <PrioridadesVista trimestre="2026-T4" prioridades={PRIORIDADES} />;
    case 'projetos':
      return <ProjetosVista projetos={PROJETOS} />;
    case 'projeto':
      return (
        <div className="max-w-3xl">
          <AdminHeading titulo={PROJETOS[1]!.nome} />
          <GabineteNav activo="projetos" />
          <FichaProjeto v={PROJETOS[1]} pessoas={PESSOAS} alocacoes={ALOCACOES} />
        </div>
      );
    case 'tesouraria':
      return <TesourariaVista movimentos={MOVIMENTOS} projetos={PROJETOS} hoje={HOJE} />;
    case 'capacidade':
      return <CapacidadeVista pessoas={PESSOAS} alocacoes={ALOCACOES} projetos={PROJETOS} hoje={HOJE} />;
    case 'manual':
      return <ManualGabinete />;
    default:
      return <PainelCeoVista p={painelCeo(TUDO, HOJE)} hoje={HOJE} pipeline={PIPELINE} />;
  }
}

export default async function PreVisualizacaoGabinete({ searchParams }: { searchParams: Promise<{ vista?: string }> }) {
  // Só fora da Vercel (pré-visualização incluída) e com a variável ligada.
  if (process.env.ADMIN_PREVIEW !== 'on' || process.env.VERCEL_ENV !== undefined) notFound();
  const { vista } = await searchParams;
  return (
    <div data-surface="light" className="min-h-screen bg-[color:var(--surface)] text-[color:var(--on-surface)]">
      <p role="note" className="bg-[color:var(--on-surface)] px-4 py-2 text-center text-xs text-[color:var(--surface)]">
        Pré-visualização de QA — todos os projectos, pessoas e valores são de exemplo.
      </p>
      <CascaAdmin sessao={{ nome: 'Pré-visualização', email: 'qa@exemplo.test', papel: 'admin' }} direcao>
        <Vista vista={vista} />
      </CascaAdmin>
    </div>
  );
}
