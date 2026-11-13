import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CascaAdmin } from '@/components/admin/CascaAdmin';
import { AdminHeading } from '@/components/admin/primitives';
import { FilaFacturacao } from '@/components/admin/facturacao/Fila';
import { lerFiltro, type LinhaFacturacao } from '@/lib/erp/facturacao';

/**
 * Pré-visualização da fila «A facturar» para o QA visual, sem sessão nem
 * base. Só com `ADMIN_PREVIEW=on` e fora da Vercel. TUDO É DE EXEMPLO.
 * `?estado=por-facturar|facturadas|todas`, `?registo=off` (0021 por aplicar).
 */

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Pré-visualização da facturação', robots: { index: false, follow: false, nocache: true } };

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const LINHAS: LinhaFacturacao[] = [
  {
    dealId: id(1),
    cliente: 'Organização de exemplo A',
    contacto: 'Pessoa de exemplo',
    responsavel: 'Responsável de exemplo',
    ganhaEm: '2026-11-11T09:00:00Z',
    valor: 1735000,
    moeda: 'MZN',
    factura: null,
  },
  {
    dealId: id(2),
    cliente: 'Organização de exemplo B',
    contacto: null,
    responsavel: null,
    ganhaEm: '2026-10-20T09:00:00Z',
    valor: 5000,
    moeda: 'USD',
    factura: null,
  },
  {
    dealId: id(3),
    cliente: 'Organização de exemplo C',
    contacto: null,
    responsavel: null,
    ganhaEm: '2026-11-01T09:00:00Z',
    valor: null,
    moeda: null,
    factura: {
      estado: 'anulada',
      numero: 'FT 2026/007',
      data: '2026-11-05',
      valor: 10,
      moeda: 'MZN',
      nota: null,
      motivoAnulacao: 'Exemplo: valor errado',
      revisao: 2,
    },
  },
  {
    dealId: id(4),
    cliente: 'Organização de exemplo D',
    contacto: null,
    responsavel: null,
    ganhaEm: '2026-11-02T09:00:00Z',
    valor: 450000,
    moeda: 'MZN',
    factura: {
      estado: 'facturada',
      numero: 'FT 2026/008',
      data: '2026-11-06',
      valor: 450000,
      moeda: 'MZN',
      nota: 'Exemplo',
      motivoAnulacao: null,
      revisao: 1,
    },
  },
];

export default async function PreVisualizacaoFacturacao({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string; registo?: string }>;
}) {
  if (process.env.ADMIN_PREVIEW !== 'on' || process.env.VERCEL_ENV === 'production') notFound();
  const sp = await searchParams;
  return (
    <div data-surface="light" className="min-h-screen bg-[color:var(--surface)] text-[color:var(--on-surface)]">
      <p role="note" className="bg-[color:var(--on-surface)] px-4 py-2 text-center text-xs text-[color:var(--surface)]">
        Pré-visualização de QA — todas as oportunidades e facturas são de exemplo.
      </p>
      <CascaAdmin sessao={{ nome: 'Pré-visualização', email: 'qa@exemplo.test', papel: 'admin' }} inqueritos news>
        <AdminHeading titulo="Facturação" />
        <FilaFacturacao
          linhas={LINHAS}
          filtro={lerFiltro(sp.estado)}
          agora={new Date('2026-11-13T12:00:00Z')}
          podeEscrever
          registoActivo={sp.registo !== 'off'}
          passo="Aplicar supabase/aplicar-0021.sql no SQL Editor; a linha 33 do verificar-estado deve dizer «ok»."
          truncado={false}
        />
      </CascaAdmin>
    </div>
  );
}
