import Link from 'next/link';
import { Bloco } from '@/components/admin/painel/Blocos';
import { formatarValor } from '@/lib/crm/modelo';
import type { LinhaResponsavel } from '@/lib/crm/responsaveis';
import { cn } from '@/lib/utils/cn';
import { ROTULO } from './partes';

/**
 * Carga e resultado por pessoa. Cada número é uma ligação para o pipeline
 * filtrado por esse responsável (drill-down): o número e a lista que o
 * explica nunca se separam.
 */

function Numero({ valor, href, alerta }: { valor: number | null; href: string; alerta?: boolean }) {
  if (valor === null) {
    return (
      <span className="text-[color:var(--muted)]">
        —<span className="sr-only"> (por activar)</span>
      </span>
    );
  }
  if (valor === 0) return <span className="text-[color:var(--muted)]">0</span>;
  return (
    <Link href={href} className={cn('font-medium underline underline-offset-4', alerta && 'text-[color:var(--color-signal-700)]')}>
      {valor}
    </Link>
  );
}

export function PorResponsavel({ linhas, dias }: { linhas: readonly LinhaResponsavel[]; dias: number }) {
  const base = (l: LinhaResponsavel, extra: string) => `/admin/oportunidades?${extra}${extra ? '&' : ''}dono=${l.id}`;
  return (
    <Bloco
      id="painel-responsaveis"
      titulo="Por responsável"
      subtitulo={`Carga actual e ganhas nos últimos ${dias} dias. Cada número abre a lista.`}
    >
      {linhas.length === 0 ? (
        <p className="mt-4 text-sm text-[color:var(--muted)]">Ainda não há equipa nem oportunidades.</p>
      ) : (
        <div className="relative mt-4 overflow-x-auto">
          <table className="w-full min-w-[36rem] border-collapse text-sm">
            <caption className="sr-only">Oportunidades por responsável</caption>
            <thead>
              <tr className="border-b border-[color:var(--border)]">
                {['Pessoa', 'Abertas', 'Atrasadas', 'Paradas', 'Ganhas', 'Valor em aberto'].map((t, i) => (
                  <th key={t} scope="col" className={cn(ROTULO, 'px-2 py-2', i === 0 ? 'text-left' : 'text-right')}>
                    {t}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {linhas.map((l) => (
                <tr key={l.id} className="border-b border-[color:var(--hairline)] last:border-b-0">
                  <th scope="row" className="px-2 py-2.5 text-left font-normal">
                    {l.nome}
                    {!l.activo ? <span className="ml-2 text-xs text-[color:var(--muted)]">(inactivo)</span> : null}
                  </th>
                  <td className="px-2 py-2.5 text-right tabular-nums">
                    <Numero valor={l.abertas} href={base(l, '')} />
                  </td>
                  <td className="px-2 py-2.5 text-right tabular-nums">
                    <Numero valor={l.atrasadas} href={base(l, 'vista=atrasadas')} alerta />
                  </td>
                  <td className="px-2 py-2.5 text-right tabular-nums">
                    <Numero valor={l.paradas} href={base(l, 'vista=paradas')} />
                  </td>
                  <td className="px-2 py-2.5 text-right tabular-nums">
                    <Numero valor={l.id === 'sem' ? null : l.ganhas} href={base(l, 'vista=todas&fase=ganho')} />
                  </td>
                  <td className="px-2 py-2.5 text-right tabular-nums">
                    {l.valor.length === 0 ? <span className="text-[color:var(--muted)]">—</span> : l.valor.map((v) => formatarValor(v.total, v.moeda)).join(' · ')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Bloco>
  );
}
