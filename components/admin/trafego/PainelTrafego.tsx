import Link from 'next/link';
import { CANAL } from '@/lib/admin/labels';
import { duracao, PERIODOS, ROTULO_CONVERSAO, type Contagem, type PeriodoTrafego, type Resumo } from '@/lib/admin/trafego';
import type { Canal } from '@/lib/attribution/types';
import { cn } from '@/lib/utils/cn';

/**
 * O painel «Tráfego» (D-47). Componente de servidor e sem estado: o período
 * vive no URL (`?periodo=`), como no resto da consola. Nenhum número é
 * desenhado sem vir de `resumir()` — sem dados, aparece «—» ou zero.
 */

const ROTULO =
  'font-[family-name:var(--font-chakra)] text-[length:var(--text-micro)] tracking-[var(--tracking-eyebrow)] text-[color:var(--muted)] uppercase';
const CAIXA = 'border border-[color:var(--border)] bg-[color:var(--surface)]';
const TH = 'border-b border-[color:var(--border)] px-3 py-2 text-left font-medium whitespace-nowrap';
const TD = 'border-b border-[color:var(--border)] px-3 py-2 align-top tabular-nums';
const H2 = 'text-[length:var(--text-h3)] tracking-[-0.02em]';

const fmt = (n: number) => n.toLocaleString('pt-PT');
const pct = (x: number | null) => (x === null ? '—' : `${Math.round(x * 100)} %`);
const NOME_PERIODO: Readonly<Record<PeriodoTrafego, string>> = { 1: '24 horas', 7: '7 dias', 30: '30 dias', 90: '90 dias' };

let paises: Intl.DisplayNames | null = null;
function nomePais(codigo: string): string {
  try {
    paises ??= new Intl.DisplayNames(['pt-PT'], { type: 'region' });
    return paises.of(codigo) ?? codigo;
  } catch {
    return codigo;
  }
}
const ECRA: Readonly<Record<string, string>> = { telemovel: 'Telemóvel', tablet: 'Tablet', computador: 'Computador' };

function Kpi({ rotulo, valor, nota }: { rotulo: string; valor: string; nota?: string }) {
  return (
    <div className={cn(CAIXA, 'grid content-start gap-1 p-4')}>
      <p className={ROTULO}>{rotulo}</p>
      <p className="text-[length:var(--text-h3)] tracking-[-0.02em] tabular-nums">{valor}</p>
      {nota && <p className="text-xs text-[color:var(--muted)]">{nota}</p>}
    </div>
  );
}

function Lista({ titulo, itens, nome, vazio }: { titulo: string; itens: readonly Contagem[]; nome: (k: string) => string; vazio: string }) {
  const max = Math.max(1, ...itens.map((i) => i.visitas));
  return (
    <section aria-label={titulo} className={cn(CAIXA, 'grid content-start gap-3 p-4')}>
      <h3 className="text-base font-medium">{titulo}</h3>
      {itens.length === 0 ? (
        <p className="text-sm text-[color:var(--muted)]">{vazio}</p>
      ) : (
        <ul role="list" className="grid gap-2 text-sm">
          {itens.map((i) => (
            <li key={i.chave} className="grid gap-1">
              <div className="flex items-baseline justify-between gap-3">
                <span className="min-w-0 truncate">{nome(i.chave)}</span>
                <span className="shrink-0 tabular-nums">
                  {fmt(i.visitas)}
                  {i.conversoes ? <span className="text-[color:var(--muted)]"> · {fmt(i.conversoes)} conv.</span> : null}
                </span>
              </div>
              <span aria-hidden className="h-1.5 bg-[color:var(--border)]">
                <span className="block h-full bg-[color:var(--on-surface)]" style={{ width: `${(i.visitas / max) * 100}%` }} />
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function PainelTrafego({ resumo: r, periodo, truncado }: { resumo: Resumo; periodo: PeriodoTrafego; truncado: boolean }) {
  const comVistas = r.paginas.filter((p) => p.vistas > 0);
  const semVistas = r.paginas.filter((p) => p.vistas === 0);
  const maxDia = Math.max(1, ...r.serie.map((d) => d.vistas));
  const ondeParam = comVistas
    .filter((p) => p.vistas >= 3 && p.taxaSaida !== null)
    .sort((a, b) => (b.taxaSaida ?? 0) - (a.taxaSaida ?? 0) || b.vistas - a.vistas)
    .slice(0, 8);

  return (
    <div className="grid gap-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <nav aria-label="Período" className="flex flex-wrap gap-2">
          {PERIODOS.map((p) => (
            <Link
              key={p}
              href={`/admin/trafego?periodo=${p}`}
              aria-current={p === periodo ? 'page' : undefined}
              className={cn(
                'inline-flex min-h-11 items-center rounded-[--radius-xs] border px-3 text-sm',
                p === periodo ? 'border-[color:var(--on-surface)] font-medium' : 'border-[color:var(--border)]',
              )}
            >
              {NOME_PERIODO[p]}
            </Link>
          ))}
        </nav>
        <section aria-labelledby="trafego-agora" className={cn(CAIXA, 'flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3')}>
          <h2 id="trafego-agora" className="flex items-center gap-2 text-sm font-medium">
            <span
              aria-hidden
              className={cn('size-2 rounded-full', r.agora.visitas ? 'bg-[color:var(--color-growth-500)]' : 'bg-[color:var(--border)]')}
            />
            Agora no site: <span className="tabular-nums">{fmt(r.agora.visitas)}</span>
          </h2>
          <p className="text-sm text-[color:var(--muted)]">
            {r.agora.paginas.length
              ? `a ver: ${r.agora.paginas.map((p) => (p.n > 1 ? `${p.path} (${p.n})` : p.path)).join(' · ')}`
              : 'ninguém nos últimos 5 minutos'}
          </p>
        </section>
      </div>

      {truncado && (
        <p role="status" className="border border-[color:var(--border)] px-4 py-3 text-sm">
          Muito tráfego neste período: o painel leu os primeiros 60 000 eventos. Escolha um período mais curto para números completos.
        </p>
      )}

      <section aria-label="Resumo" className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
        <Kpi rotulo="Vistas" valor={fmt(r.vistas)} />
        <Kpi rotulo="Visitantes" valor={fmt(r.visitantes)} nota={periodo > 1 ? 'visitantes-dia' : undefined} />
        <Kpi rotulo="Visitas" valor={fmt(r.visitas)} />
        <Kpi rotulo="Páginas por visita" valor={r.paginasPorVisita === null ? '—' : r.paginasPorVisita.toFixed(1).replace('.', ',')} />
        <Kpi rotulo="Leitura por visita" valor={duracao(r.tempoMedioMs)} nota="tempo com a página visível" />
        <Kpi rotulo="Rejeição" valor={pct(r.rejeicao)} nota="1 página, menos de 10 s" />
        <Kpi rotulo="Conversões" valor={fmt(r.conversoes)} />
      </section>

      <section aria-labelledby="trafego-serie" className={cn(CAIXA, 'grid gap-3 p-4')}>
        <h2 id="trafego-serie" className="text-base font-medium">
          Vistas por dia
        </h2>
        {r.serie.length === 0 ? (
          <p className="text-sm text-[color:var(--muted)]">Ainda sem vistas neste período.</p>
        ) : (
          <>
            <div aria-hidden className="flex h-32 items-end gap-1">
              {r.serie.map((d) => (
                <div
                  key={d.dia}
                  className="flex h-full min-w-1 flex-1 flex-col justify-end"
                  title={`${d.dia}: ${d.vistas} vistas, ${d.visitantes} visitantes`}
                >
                  <div className="bg-[color:var(--on-surface)]" style={{ height: `${Math.max(2, (d.vistas / maxDia) * 100)}%` }} />
                </div>
              ))}
            </div>
            <table className="sr-only">
              <caption>Vistas e visitantes por dia</caption>
              <thead>
                <tr>
                  <th scope="col">Dia</th>
                  <th scope="col">Vistas</th>
                  <th scope="col">Visitantes</th>
                </tr>
              </thead>
              <tbody>
                {r.serie.map((d) => (
                  <tr key={d.dia}>
                    <td>{d.dia}</td>
                    <td>{d.vistas}</td>
                    <td>{d.visitantes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-xs text-[color:var(--muted)] tabular-nums">
              {r.serie[0]!.dia} → {r.serie[r.serie.length - 1]!.dia} · máximo {fmt(maxDia)} vistas num dia
            </p>
          </>
        )}
      </section>

      <section aria-labelledby="trafego-paginas" className="grid gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 id="trafego-paginas" className={H2}>
            Todas as páginas
          </h2>
          <p className="text-sm text-[color:var(--muted)]">
            {fmt(comVistas.length)} com vistas · {fmt(semVistas.length)} sem vistas neste período
          </p>
        </div>
        <div className={cn(CAIXA, 'overflow-x-auto')}>
          <table className="w-full min-w-[60rem] border-collapse text-sm">
            <thead>
              <tr>
                <th scope="col" className={TH}>
                  Página
                </th>
                <th scope="col" className={cn(TH, 'text-right')}>
                  Vistas
                </th>
                <th scope="col" className={cn(TH, 'text-right')}>
                  Visitantes
                </th>
                <th scope="col" className={cn(TH, 'text-right')}>
                  Entradas
                </th>
                <th scope="col" className={cn(TH, 'text-right')}>
                  Saídas
                </th>
                <th scope="col" className={cn(TH, 'text-right')}>
                  Taxa de saída
                </th>
                <th scope="col" className={cn(TH, 'text-right')}>
                  Leitura média
                </th>
                <th scope="col" className={cn(TH, 'text-right')}>
                  Até onde leu
                </th>
                <th scope="col" className={cn(TH, 'text-right')}>
                  Conversões
                </th>
              </tr>
            </thead>
            <tbody>
              {comVistas.length === 0 ? (
                <tr>
                  <td colSpan={9} className={cn(TD, 'text-[color:var(--muted)]')}>
                    Ainda sem vistas neste período. As vistas começam a contar a partir da publicação desta versão.
                  </td>
                </tr>
              ) : (
                comVistas.map((p) => (
                  <tr key={p.path}>
                    <th scope="row" className={cn(TD, 'max-w-[22rem] truncate text-left font-normal')}>
                      <a href={p.path} target="_blank" rel="noopener" className="underline-offset-4 hover:underline">
                        {p.path}
                      </a>
                    </th>
                    <td className={cn(TD, 'text-right font-medium')}>{fmt(p.vistas)}</td>
                    <td className={cn(TD, 'text-right')}>{fmt(p.visitantes)}</td>
                    <td className={cn(TD, 'text-right')}>{fmt(p.entradas)}</td>
                    <td className={cn(TD, 'text-right')}>{fmt(p.saidas)}</td>
                    <td className={cn(TD, 'text-right')}>{pct(p.taxaSaida)}</td>
                    <td className={cn(TD, 'text-right')}>{duracao(p.tempoMedioMs)}</td>
                    <td className={cn(TD, 'text-right')}>{p.scrollMedio === null ? '—' : `${p.scrollMedio} %`}</td>
                    <td className={cn(TD, 'text-right')}>{p.conversoes ? fmt(p.conversoes) : '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {semVistas.length > 0 && (
          <details className={cn(CAIXA, 'px-4 py-3 text-sm')}>
            <summary className="cursor-pointer">Páginas sem vistas neste período ({fmt(semVistas.length)})</summary>
            <ul role="list" className="mt-3 columns-1 gap-6 text-[color:var(--muted)] sm:columns-2 lg:columns-3">
              {semVistas.map((p) => (
                <li key={p.path} className="truncate">
                  {p.path}
                </li>
              ))}
            </ul>
          </details>
        )}
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section aria-labelledby="trafego-param" className={cn(CAIXA, 'grid content-start gap-3 p-4')}>
          <h2 id="trafego-param" className="text-base font-medium">
            Onde param
          </h2>
          <p className="text-xs text-[color:var(--muted)]">
            Páginas com 3 ou mais vistas, pela taxa de saída: é aqui que as visitas acabam.
          </p>
          {ondeParam.length === 0 ? (
            <p className="text-sm text-[color:var(--muted)]">Ainda sem dados suficientes.</p>
          ) : (
            <ol role="list" className="grid gap-1.5 text-sm">
              {ondeParam.map((p) => (
                <li key={p.path} className="flex items-baseline justify-between gap-3">
                  <span className="min-w-0 truncate">{p.path}</span>
                  <span className="shrink-0 tabular-nums">
                    {pct(p.taxaSaida)} <span className="text-[color:var(--muted)]">de {fmt(p.vistas)}</span>
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>
        <section aria-labelledby="trafego-percursos" className={cn(CAIXA, 'grid content-start gap-3 p-4')}>
          <h2 id="trafego-percursos" className="text-base font-medium">
            Percursos mais comuns
          </h2>
          {r.percursos.length === 0 ? (
            <p className="text-sm text-[color:var(--muted)]">Ainda sem visitas de mais de uma página.</p>
          ) : (
            <ol role="list" className="grid gap-1.5 text-sm">
              {r.percursos.map((x) => (
                <li key={`${x.de}>${x.para}`} className="flex items-baseline justify-between gap-3">
                  <span className="min-w-0 truncate">
                    {x.de} <span aria-label="para">→</span> {x.para}
                  </span>
                  <span className="shrink-0 tabular-nums">{fmt(x.n)}</span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      <section aria-labelledby="trafego-fontes" className="grid gap-3">
        <h2 id="trafego-fontes" className={H2}>
          De onde vêm
        </h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Lista titulo="Canais (visitas)" itens={r.canais} nome={(k) => CANAL[k as Canal]?.texto ?? k} vazio="Sem visitas." />
          <Lista titulo="Sites de origem" itens={r.referencias} nome={(k) => k} vazio="Nenhuma visita veio de outro site." />
          <Lista titulo="Campanhas (UTM)" itens={r.campanhas} nome={(k) => k} vazio="Nenhuma visita de campanha marcada com UTM." />
          <Lista titulo="Países" itens={r.paises} nome={nomePais} vazio="Sem país (só em produção, na Vercel)." />
          <Lista titulo="Ecrãs" itens={r.ecras} nome={(k) => ECRA[k] ?? k} vazio="Sem visitas." />
          <section aria-label="Conversões por página de entrada" className={cn(CAIXA, 'grid content-start gap-3 p-4')}>
            <h3 className="text-base font-medium">Conversões por página de entrada</h3>
            {r.porConversao.length === 0 ? (
              <p className="text-sm text-[color:var(--muted)]">Sem conversões neste período.</p>
            ) : (
              <ul role="list" className="grid gap-3 text-sm">
                {r.porConversao.map((c) => (
                  <li key={c.nome}>
                    <p className="flex justify-between gap-3">
                      <span>{ROTULO_CONVERSAO[c.nome]}</span>
                      <span className="tabular-nums">{fmt(c.total)}</span>
                    </p>
                    {c.porEntrada.length > 0 && (
                      <p className="text-xs text-[color:var(--muted)]">
                        Entraram por: {c.porEntrada.map((e) => `${e.path} (${e.n})`).join(' · ')}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </section>

      <section aria-labelledby="trafego-def" className="text-sm text-[color:var(--muted)]">
        <h2 id="trafego-def" className={ROTULO}>
          Como se conta
        </h2>
        <p className="mt-2 max-w-[90ch]">
          Sem cookies nem scripts de terceiros. Uma visita é uma sequência de páginas do mesmo visitante com menos de 30 minutos de
          intervalo; o visitante é um resumo criptográfico diário calculado no servidor (o IP e o navegador não são guardados, e o resumo
          muda todos os dias). Por isso, em períodos de vários dias, «visitantes» conta visitantes-dia, e pessoas atrás do mesmo IP com o
          mesmo navegador contam como uma. Robôs, ferramentas e quem envia o sinal Global Privacy Control não contam. A leitura é o tempo
          com a página visível; «até onde leu» é o ponto mais fundo da página a que se chegou.
        </p>
      </section>
    </div>
  );
}
