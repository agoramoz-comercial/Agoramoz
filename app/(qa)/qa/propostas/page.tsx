import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CascaAdmin } from '@/components/admin/CascaAdmin';
import { AdminHeading } from '@/components/admin/primitives';
import { EditorProposta } from '@/components/admin/propostas/EditorProposta';
import type { Proposta } from '@/lib/propostas/modelo';

/**
 * Pré-visualização do criador de propostas para o QA visual (Playwright +
 * axe), sem sessão nem base. Só existe com `ADMIN_PREVIEW=on` e fora da
 * Vercel. TUDO AQUI É DE EXEMPLO — cliente, valores e textos inventados para
 * a captura, e a página di-lo no topo. `?vazia=1` abre o editor vazio.
 */

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Pré-visualização das propostas',
  robots: { index: false, follow: false, nocache: true },
};

const EXEMPLO: Proposta = {
  versao: 1,
  projeto: 'Exemplo — Portal de pedidos',
  titulo: 'Portal de pedidos',
  cliente: 'Cliente de exemplo',
  destinatario: 'Pessoa de exemplo, Direcção',
  preparadaPor: 'AGORAMOZ',
  data: '2026-11-12',
  validadeDias: 30,
  moeda: 'MZN',
  assunto: 'Exemplo de proposta para captura de QA',
  carta:
    'Texto de exemplo da carta. Serve apenas para verificar o desenho da página e não descreve nenhum cliente real.\n\nSegundo parágrafo de exemplo, para ver o espaçamento entre parágrafos.',
  decisao: 'Exemplo: aprovar a opção B e a fase 1 até ao fim do mês.',
  contexto: [
    {
      titulo: 'Situação de exemplo',
      texto: 'Texto de exemplo sobre o ponto de partida.',
    },
    {
      titulo: 'Desafio de exemplo',
      texto: 'Texto de exemplo sobre o problema a resolver.',
    },
  ],
  objectivos: ['Objectivo de exemplo um', 'Objectivo de exemplo dois', 'Objectivo de exemplo três'],
  solucao: [
    { titulo: 'Módulo de exemplo A', texto: 'Descrição de exemplo.' },
    { titulo: 'Módulo de exemplo B', texto: 'Descrição de exemplo.' },
    { titulo: 'Módulo de exemplo C', texto: 'Descrição de exemplo.' },
  ],
  fases: [
    {
      nome: 'Diagnóstico',
      entregaveis: 'Entregável de exemplo',
      semanasMin: 2,
      semanasMax: 3,
      valor: 285000,
      custo: 190000,
    },
    {
      nome: 'Desenho',
      entregaveis: 'Entregável de exemplo',
      semanasMin: 3,
      semanasMax: 4,
      valor: 450000,
      custo: 300000,
    },
    {
      nome: 'Implementação',
      entregaveis: 'Entregável de exemplo',
      semanasMin: 6,
      semanasMax: 8,
      valor: 1000000,
      custo: 700000,
    },
  ],
  opcoes: [
    {
      nome: 'Essencial',
      descricao: 'Opção de exemplo.',
      valor: 735000,
      recomendada: false,
    },
    {
      nome: 'Completa',
      descricao: 'Opção de exemplo.',
      valor: 1735000,
      recomendada: true,
    },
  ],
  condicoes: ['Condição de exemplo: pagamento por marco de aceitação.', 'Condição de exemplo: valores sem IVA.'],
  riscos: [{ risco: 'Risco de exemplo', mitigacao: 'Mitigação de exemplo.' }],
  passos: ['Passo de exemplo um', 'Passo de exemplo dois'],
};

export default async function PreVisualizacaoPropostas({ searchParams }: { searchParams: Promise<{ vazia?: string }> }) {
  if (process.env.ADMIN_PREVIEW !== 'on' || process.env.VERCEL_ENV === 'production') notFound();
  const { vazia } = await searchParams;
  return (
    <div data-surface="light" className="min-h-screen bg-[color:var(--surface)] text-[color:var(--on-surface)]">
      <p role="note" className="bg-[color:var(--on-surface)] px-4 py-2 text-center text-xs text-[color:var(--surface)] print:hidden">
        Pré-visualização de QA — tudo nesta proposta é de exemplo.
      </p>
      <CascaAdmin
        sessao={{
          nome: 'Pré-visualização',
          email: 'qa@exemplo.test',
          papel: 'admin',
        }}
        inqueritos
        news
      >
        <div className="print:hidden">
          <AdminHeading titulo="Propostas" />
        </div>
        <EditorProposta hoje="2026-11-12" inicial={vazia ? undefined : EXEMPLO} />
      </CascaAdmin>
    </div>
  );
}
