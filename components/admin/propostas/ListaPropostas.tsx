import Link from 'next/link';
import { Plus } from 'lucide-react';
import { DataHora, EmptyState } from '@/components/admin/primitives';
import { valor, type Moeda } from '@/lib/propostas/modelo';
import { ROTULO_ESTADO, type PropostaLinha } from '@/lib/propostas/leitura';

/**
 * A lista das propostas guardadas (0020). Componente de servidor; cada linha
 * é uma ligação. O total é o que a base calculou a partir das fases.
 */

const TH = 'border-b border-[color:var(--border)] px-3 py-2 text-left font-medium';
const TD = 'border-b border-[color:var(--border)] px-3 py-2.5 align-top';

export function ListaPropostas({ itens, truncado, podeCriar }: { itens: readonly PropostaLinha[]; truncado: boolean; podeCriar: boolean }) {
  return (
    <section aria-labelledby="propostas-lista" className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="propostas-lista" className="text-[length:var(--text-h3)] tracking-[-0.02em]">
          Propostas guardadas
        </h2>
        {podeCriar && (
          <Link
            href="/admin/propostas/nova"
            className="inline-flex min-h-11 items-center gap-2 rounded-[--radius-xs] bg-[color:var(--color-signal-600)] px-4 text-sm font-medium text-white"
          >
            <Plus aria-hidden className="size-4" />
            Nova proposta
          </Link>
        )}
      </div>
      {itens.length === 0 ? (
        <EmptyState
          titulo="Ainda não há propostas guardadas."
          descricao="Crie uma nova, ou cole o texto de uma proposta que já tenha escrita."
        />
      ) : (
        <div className="overflow-x-auto border border-[color:var(--border)] bg-[color:var(--surface)]">
          <table className="w-full min-w-[48rem] border-collapse text-sm">
            <thead>
              <tr>
                <th scope="col" className={TH}>
                  Projecto
                </th>
                <th scope="col" className={TH}>
                  Cliente
                </th>
                <th scope="col" className={TH}>
                  Estado
                </th>
                <th scope="col" className={`${TH} text-right`}>
                  Total
                </th>
                <th scope="col" className={`${TH} text-right`}>
                  Versão
                </th>
                <th scope="col" className={TH}>
                  Actualizada
                </th>
              </tr>
            </thead>
            <tbody>
              {itens.map((p) => (
                <tr key={p.id}>
                  <td className={TD}>
                    <Link href={`/admin/propostas/${p.id}`} className="font-medium underline-offset-4 hover:underline">
                      {p.projeto}
                    </Link>
                    {p.dealId ? <span className="block text-xs text-[color:var(--muted)]">Ligada ao Pipeline</span> : null}
                  </td>
                  <td className={TD}>{p.cliente}</td>
                  <td className={TD}>{ROTULO_ESTADO[p.estado]}</td>
                  <td className={`${TD} text-right tabular-nums whitespace-nowrap`}>{valor(p.total, p.moeda as Moeda)}</td>
                  <td className={`${TD} text-right tabular-nums`}>{p.versao}</td>
                  <td className={TD}>
                    <DataHora valor={p.actualizada} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {truncado && <p className="text-sm text-[color:var(--muted)]">Mostram-se as 200 mais recentes.</p>}
    </section>
  );
}
