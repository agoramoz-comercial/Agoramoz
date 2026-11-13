import { Feedback } from '@/components/admin/Feedback';
import { AdminHeading } from '@/components/admin/primitives';
import { FilaFacturacao } from '@/components/admin/facturacao/Fila';
import { createSessionClient } from '@/lib/auth/client';
import { podeEscrever, requireStaff } from '@/lib/auth/session';
import { PASSO_0019 } from '@/lib/crm/activacao';
import { lerFiltro } from '@/lib/erp/facturacao';
import { lerFacturacao, PASSO_0021 } from '@/lib/erp/facturacao-leitura';

export const metadata = { title: 'Facturação' };

async function agora(): Promise<Date> {
  return new Date(Date.now());
}

const OK = {
  facturada: 'Factura registada. A oportunidade saiu da fila «Por facturar».',
  anulada: 'Registo anulado. A oportunidade voltou a «Por facturar».',
};

/** A fila «A facturar» (D-48): as oportunidades ganhas, até serem facturadas. Sem ERP. */
export default async function FacturacaoPage({ searchParams }: { searchParams: Promise<{ estado?: string; ok?: string; erro?: string }> }) {
  const sessao = await requireStaff();
  const sp = await searchParams;
  const lido = await lerFacturacao(await createSessionClient());
  return (
    <>
      <AdminHeading
        titulo="Facturação"
        descricao="As oportunidades ganhas no Pipeline, até serem facturadas. Emita a factura no seu programa de facturação ou com o contabilista e registe-a aqui; a exportação em CSV leva tudo para o contabilista. Quando houver ERP, liga-se a esta mesma fila."
      />
      <Feedback erro={sp.erro} ok={sp.ok} textos={OK} />
      {lido.estado === 'ok' ? (
        <FilaFacturacao
          linhas={lido.linhas}
          filtro={lerFiltro(sp.estado)}
          agora={await agora()}
          podeEscrever={podeEscrever(sessao.papel)}
          registoActivo={lido.registoActivo}
          passo={PASSO_0021}
          truncado={lido.truncado}
        />
      ) : (
        <p role="status" className="border border-[color:var(--border)] px-4 py-3 text-sm">
          {lido.estado === 'por-activar-0019'
            ? `A facturação precisa do CRM operacional. ${PASSO_0019}`
            : 'Não foi possível ler as oportunidades ganhas agora.'}
        </p>
      )}
    </>
  );
}
