import Link from 'next/link';
import { inputClass } from '@/components/form/Field';
import { anularFacturacao, marcarFacturada } from '@/lib/admin/facturacao-actions';
import { diasDesde, estadoDe, FILTROS, totais, type FiltroFacturacao, type LinhaFacturacao } from '@/lib/erp/facturacao';
import { agrupar } from '@/lib/propostas/modelo';
import { cn } from '@/lib/utils/cn';

/**
 * A fila «A facturar» (D-48). Componente de servidor; formulários são
 * formulários (POST para Server Actions), como no resto da consola. O filtro
 * vive no URL. Esta consola regista facturas emitidas — não as emite.
 */

const CAIXA = 'border border-[color:var(--border)] bg-[color:var(--surface)]';
const ROTULO =
  'font-[family-name:var(--font-chakra)] text-[length:var(--text-micro)] tracking-[var(--tracking-eyebrow)] text-[color:var(--muted)] uppercase';
const TH = 'border-b border-[color:var(--border)] px-3 py-2 text-left font-medium whitespace-nowrap';
const TD = 'border-b border-[color:var(--border)] px-3 py-3 align-top';
const BOTAO =
  'inline-flex min-h-11 items-center justify-center rounded-[--radius-xs] border border-[color:var(--border)] px-3 text-sm hover:bg-[color:var(--surface-raised)]';
const NOME_FILTRO: Readonly<Record<FiltroFacturacao, string>> = {
  'por-facturar': 'Por facturar',
  facturadas: 'Facturadas',
  todas: 'Todas',
};

/** Espaço fino de milhar também com 4 algarismos (`5 000 USD`): o `toLocaleString` português não agrupa esses. */
const dinheiro = (n: number, moeda: string) => `${agrupar(n)} ${moeda}`;
const somas = (m: Readonly<Record<string, number>>) =>
  Object.keys(m).length
    ? Object.entries(m)
        .map(([moeda, v]) => dinheiro(v, moeda))
        .join(' · ')
    : '—';
const dia = (iso: string) => new Date(iso).toLocaleDateString('pt-PT', { timeZone: 'Africa/Maputo' });

function Registar({ l, hoje }: { l: LinhaFacturacao; hoje: string }) {
  const id = `f-${l.dealId}`;
  return (
    <details className="group">
      <summary className={cn(BOTAO, 'cursor-pointer list-none')}>Registar factura</summary>
      <form action={marcarFacturada} className="mt-3 grid gap-3 sm:grid-cols-2">
        <input type="hidden" name="deal_id" value={l.dealId} />
        {l.factura?.estado === 'anulada' && <input type="hidden" name="revisao" value={l.factura.revisao} />}
        <label className="grid gap-1 text-sm">
          N.º da factura
          <input name="numero" required maxLength={60} className={inputClass} placeholder="FT 2026/001" id={`${id}-n`} />
        </label>
        <label className="grid gap-1 text-sm">
          Data
          <input name="data" type="date" required max={hoje} defaultValue={hoje} className={inputClass} />
        </label>
        <label className="grid gap-1 text-sm">
          Valor facturado
          <input name="valor" required inputMode="decimal" defaultValue={l.valor ?? ''} className={cn(inputClass, 'tabular-nums')} />
        </label>
        <label className="grid gap-1 text-sm">
          Moeda
          <select name="moeda" defaultValue={l.moeda ?? 'MZN'} className={inputClass}>
            {['MZN', 'USD', 'EUR', 'BRL'].map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm sm:col-span-2">
          Nota (opcional)
          <input name="nota" maxLength={300} className={inputClass} placeholder="Ex.: 1.ª prestação de 2" />
        </label>
        <button
          type="submit"
          className={cn(
            BOTAO,
            'justify-self-start bg-[color:var(--color-signal-600)] font-medium text-white hover:bg-[color:var(--color-signal-600)]',
          )}
        >
          Marcar como facturada
        </button>
      </form>
    </details>
  );
}

function Anular({ l }: { l: LinhaFacturacao }) {
  if (!l.factura) return null;
  return (
    <details>
      <summary className="cursor-pointer text-sm text-[color:var(--muted)] underline">Anular</summary>
      <form action={anularFacturacao} className="mt-2 grid gap-2">
        <input type="hidden" name="deal_id" value={l.dealId} />
        <input type="hidden" name="revisao" value={l.factura.revisao} />
        <label className="grid gap-1 text-sm">
          Porque anula
          <input name="motivo" required minLength={3} maxLength={300} className={inputClass} />
        </label>
        <button type="submit" className={cn(BOTAO, 'justify-self-start')}>
          Anular registo
        </button>
      </form>
    </details>
  );
}

export function FilaFacturacao({
  linhas,
  filtro,
  agora,
  podeEscrever,
  registoActivo,
  passo,
  truncado,
}: {
  linhas: readonly LinhaFacturacao[];
  filtro: FiltroFacturacao;
  agora: Date;
  podeEscrever: boolean;
  registoActivo: boolean;
  passo: string;
  truncado: boolean;
}) {
  const t = totais(linhas, agora);
  const hoje = agora.toLocaleDateString('sv-SE', { timeZone: 'Africa/Maputo' });
  const vistas =
    filtro === 'todas'
      ? linhas
      : linhas.filter((l) => (filtro === 'facturadas' ? estadoDe(l) === 'facturada' : estadoDe(l) === 'por-facturar'));
  return (
    <div className="grid gap-8">
      {!registoActivo && (
        <p role="status" className="border border-[color:var(--border)] px-4 py-3 text-sm">
          A fila mostra as oportunidades ganhas; registar facturas está por activar. {passo}
        </p>
      )}

      <section aria-label="Resumo" className="grid gap-3 sm:grid-cols-3">
        <div className={cn(CAIXA, 'grid gap-1 p-4')}>
          <p className={ROTULO}>Por facturar</p>
          <p className="text-[length:var(--text-h3)] tabular-nums">{t.porFacturar.n}</p>
          <p className="text-sm text-[color:var(--muted)] tabular-nums">
            {somas(t.porFacturar.porMoeda)}
            {t.porFacturar.semValor ? ` · ${t.porFacturar.semValor} sem valor no Pipeline` : ''}
          </p>
        </div>
        <div className={cn(CAIXA, 'grid gap-1 p-4')}>
          <p className={ROTULO}>Há mais de 7 dias</p>
          <p className={cn('text-[length:var(--text-h3)] tabular-nums', t.atrasadas > 0 && 'text-[color:var(--color-signal-700)]')}>
            {t.atrasadas}
          </p>
          <p className="text-sm text-[color:var(--muted)]">ganhas e ainda por facturar</p>
        </div>
        <div className={cn(CAIXA, 'grid gap-1 p-4')}>
          <p className={ROTULO}>Facturado este mês</p>
          <p className="text-[length:var(--text-h3)] tabular-nums">{t.facturadoNoMes.n}</p>
          <p className="text-sm text-[color:var(--muted)] tabular-nums">{somas(t.facturadoNoMes.porMoeda)}</p>
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav aria-label="Filtro" className="flex flex-wrap gap-2">
          {FILTROS.map((f) => (
            <Link
              key={f}
              href={`/admin/facturacao?estado=${f}`}
              aria-current={f === filtro ? 'page' : undefined}
              className={cn(BOTAO, f === filtro && 'border-[color:var(--on-surface)] font-medium')}
            >
              {NOME_FILTRO[f]}
            </Link>
          ))}
        </nav>
        {podeEscrever && (
          <a href={`/admin/facturacao/exportar?estado=${filtro}`} className={BOTAO}>
            Exportar para o contabilista (CSV)
          </a>
        )}
      </div>

      <div className={cn(CAIXA, 'overflow-x-auto')}>
        <table className="w-full min-w-[56rem] border-collapse text-sm">
          <thead>
            <tr>
              <th scope="col" className={TH}>
                Cliente
              </th>
              <th scope="col" className={TH}>
                Ganha
              </th>
              <th scope="col" className={cn(TH, 'text-right')}>
                Valor no Pipeline
              </th>
              <th scope="col" className={TH}>
                Factura
              </th>
              <th scope="col" className={TH}>
                <span className="sr-only">Acções</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {vistas.length === 0 ? (
              <tr>
                <td colSpan={5} className={cn(TD, 'text-[color:var(--muted)]')}>
                  {filtro === 'por-facturar'
                    ? 'Nada por facturar. Quando uma oportunidade passar a «Ganho» no Pipeline, aparece aqui.'
                    : 'Nada neste filtro.'}
                </td>
              </tr>
            ) : (
              vistas.map((l) => {
                const facturada = estadoDe(l) === 'facturada';
                const dias = diasDesde(l.ganhaEm, agora);
                return (
                  <tr key={l.dealId}>
                    <td className={TD}>
                      <Link href={`/admin/oportunidades/${l.dealId}`} className="font-medium underline-offset-4 hover:underline">
                        {l.cliente}
                      </Link>
                      <span className="block text-xs text-[color:var(--muted)]">
                        {[l.contacto, l.responsavel && `resp. ${l.responsavel}`].filter(Boolean).join(' · ')}
                      </span>
                    </td>
                    <td className={cn(TD, 'whitespace-nowrap tabular-nums')}>
                      {dia(l.ganhaEm)}
                      {!facturada && (
                        <span
                          className={cn('block text-xs', dias > 7 ? 'text-[color:var(--color-signal-700)]' : 'text-[color:var(--muted)]')}
                        >
                          há {dias} dia{dias === 1 ? '' : 's'}
                        </span>
                      )}
                    </td>
                    <td className={cn(TD, 'text-right whitespace-nowrap tabular-nums')}>
                      {l.valor === null || !l.moeda ? '—' : dinheiro(l.valor, l.moeda)}
                    </td>
                    <td className={TD}>
                      {facturada && l.factura ? (
                        <>
                          <span className="font-medium">{l.factura.numero}</span>
                          <span className="block text-xs text-[color:var(--muted)] tabular-nums">
                            {dia(l.factura.data)} · {dinheiro(l.factura.valor, l.factura.moeda)}
                            {l.factura.nota ? ` · ${l.factura.nota}` : ''}
                          </span>
                        </>
                      ) : (
                        <span className="text-[color:var(--muted)]">
                          Por facturar
                          {l.factura?.estado === 'anulada' ? ` (anulada: ${l.factura.numero} — ${l.factura.motivoAnulacao ?? ''})` : ''}
                        </span>
                      )}
                    </td>
                    <td className={cn(TD, 'w-[22rem]')}>
                      {podeEscrever && registoActivo && (facturada ? <Anular l={l} /> : <Registar l={l} hoje={hoje} />)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      {truncado && <p className="text-sm text-[color:var(--muted)]">Mostram-se as 1000 oportunidades ganhas mais recentes.</p>}
    </div>
  );
}
