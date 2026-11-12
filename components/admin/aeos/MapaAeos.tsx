import Link from 'next/link';
import { AdminHeading } from '@/components/admin/primitives';
import { CADENCIA, FASES, RED_TEAM, REGISTO, aeosVisivel, type Permissoes } from '@/lib/admin/aeos';
import { cn } from '@/lib/utils/cn';

/**
 * O mapa do AEOS: os nove blocos, os sete painéis, a cadência e as fases.
 * Componente de servidor e sem dados — o mesmo markup serve a página
 * autenticada e a pré-visualização de QA.
 *
 * A distinção que o ecrã existe para tornar óbvia: o que já tem um ecrã na
 * consola (ligação) e o que o documento pede e ainda não existe («por
 * construir»). Nada aparece como feito por ter um nome bonito.
 */

const ROTULO = 'font-[family-name:var(--font-chakra)] text-[length:var(--text-micro)] tracking-[var(--tracking-eyebrow)] uppercase';
const CAIXA = 'border border-[color:var(--border)] bg-[color:var(--surface)]';
const LIGACAO =
  'inline-flex min-h-9 items-center rounded-[--radius-xs] border border-[color:var(--border)] px-2.5 text-sm underline-offset-4 hover:underline focus-visible:underline';

const indice = (n: number) => `[${String(n).padStart(2, '0')}]`;

function Ligacoes({ ligacoes }: { ligacoes: readonly { href: string; texto: string }[] }) {
  return (
    <ul role="list" className="flex flex-wrap gap-2">
      {ligacoes.map((l) => (
        <li key={l.href}>
          <Link href={l.href} className={LIGACAO}>
            {l.texto}
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function MapaAeos({ permite }: { permite: Permissoes }) {
  const { blocos, paineis } = aeosVisivel(permite);
  const parciais = paineis.filter((p) => p.estado === 'parcial').length;

  return (
    <div className="max-w-6xl">
      <AdminHeading
        titulo="Mapa AEOS"
        descricao="AGORAMOZ Enterprise Operating System: nove blocos, sete painéis e a cadência de gestão, ligados aos ecrãs que já existem nesta consola. O que ainda não tem ecrã está marcado «por construir»."
      />

      <section aria-labelledby="aeos-registo" className={cn(CAIXA, 'mb-10 grid gap-4 p-5 sm:grid-cols-4')}>
        <h2 id="aeos-registo" className="sr-only">
          Registo do documento
        </h2>
        {[
          ['Documento', REGISTO.projeto],
          ['Estado', REGISTO.estado],
          ['Baseline organizacional', REGISTO.baseline],
          ['Próximo gate', REGISTO.proximoGate],
        ].map(([r, v]) => (
          <div key={r}>
            <p className={cn(ROTULO, 'text-[color:var(--muted)]')}>{r}</p>
            <p className="mt-1.5 text-sm">{v}</p>
          </div>
        ))}
      </section>

      <section aria-labelledby="aeos-blocos">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
          <h2 id="aeos-blocos" className="text-[length:var(--text-h3)] tracking-[-0.02em]">
            Os nove blocos
          </h2>
          <p className="text-sm text-[color:var(--muted)]">
            Nove blocos não são nove diretores: uma pessoa pode exercer mais de uma função.
          </p>
        </div>
        <ol role="list" className="grid gap-4 lg:grid-cols-2">
          {blocos.map((b) => (
            <li key={b.n} className={cn(CAIXA, 'grid content-start gap-4 p-5')}>
              <div className="flex items-baseline gap-3">
                <span className={cn(ROTULO, 'text-[color:var(--muted)] tabular-nums')}>{indice(b.n)}</span>
                <h3 className="text-base font-medium">{b.nome}</h3>
              </div>
              <p className="text-sm text-[color:var(--muted)]">{b.missao}</p>
              <div className="grid gap-2">
                <p className={ROTULO}>Na consola</p>
                {b.noAdmin.length > 0 ? (
                  <Ligacoes ligacoes={b.noAdmin} />
                ) : (
                  <p className="text-sm text-[color:var(--muted)]">Ainda nenhum ecrã.</p>
                )}
              </div>
              {b.porConstruir.length > 0 && (
                <div className="grid gap-2">
                  <p className={ROTULO}>Por construir</p>
                  <ul role="list" className="grid gap-1 text-sm">
                    {b.porConstruir.map((x) => (
                      <li key={x} className="flex gap-2">
                        <span aria-hidden className="text-[color:var(--muted)]">
                          —
                        </span>
                        {x}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="aeos-paineis" className="mt-12">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
          <h2 id="aeos-paineis" className="text-[length:var(--text-h3)] tracking-[-0.02em]">
            Os sete painéis
          </h2>
          <p className="text-sm text-[color:var(--muted)]">
            {parciais} de {paineis.length} com ecrãs que cobrem parte dos indicadores. Nenhum está completo.
          </p>
        </div>
        <ol role="list" className="grid gap-px border border-[color:var(--border)] bg-[color:var(--border)]">
          {paineis.map((p) => (
            <li key={p.n} className="grid gap-3 bg-[color:var(--surface)] p-5 md:grid-cols-[14rem_1fr_16rem]">
              <div>
                <p className={cn(ROTULO, 'text-[color:var(--muted)] tabular-nums')}>Painel {p.n}</p>
                <h3 className="mt-1 text-base font-medium">{p.nome}</h3>
                <p className={cn(ROTULO, 'mt-2', p.estado === 'parcial' ? 'text-[color:var(--on-surface)]' : 'text-[color:var(--muted)]')}>
                  {p.estado === 'parcial' ? 'Parcial' : 'Por construir'}
                </p>
              </div>
              <p className="text-sm text-[color:var(--muted)]">{p.indicadores.join(' · ')}</p>
              <div>{p.noAdmin.length > 0 ? <Ligacoes ligacoes={p.noAdmin} /> : <p className="text-sm text-[color:var(--muted)]">—</p>}</div>
            </li>
          ))}
        </ol>
      </section>

      <div className="mt-12 grid gap-8 lg:grid-cols-2">
        <section aria-labelledby="aeos-cadencia">
          <h2 id="aeos-cadencia" className="mb-4 text-[length:var(--text-h3)] tracking-[-0.02em]">
            Cadência de gestão
          </h2>
          <dl className="grid gap-px border border-[color:var(--border)] bg-[color:var(--border)]">
            {CADENCIA.map((c) => (
              <div key={c.quando} className="grid gap-1 bg-[color:var(--surface)] p-4 sm:grid-cols-[9rem_1fr]">
                <dt>
                  <span className="text-sm font-medium">{c.quando}</span>
                  <span className="block text-xs text-[color:var(--muted)]">{c.duracao}</span>
                </dt>
                <dd className="text-sm text-[color:var(--muted)]">{c.foco}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section aria-labelledby="aeos-fases">
          <h2 id="aeos-fases" className="mb-4 text-[length:var(--text-h3)] tracking-[-0.02em]">
            Roadmap e gates
          </h2>
          <ol role="list" className="grid gap-px border border-[color:var(--border)] bg-[color:var(--border)]">
            {FASES.map((f, i) => (
              <li key={f.nome} className="grid gap-1 bg-[color:var(--surface)] p-4">
                <p className="flex flex-wrap items-baseline gap-x-3">
                  <span className={cn(ROTULO, 'text-[color:var(--muted)] tabular-nums')}>Fase {i + 1}</span>
                  <span className="text-sm font-medium">{f.nome}</span>
                  <span className="text-xs text-[color:var(--muted)]">{f.prazo}</span>
                </p>
                <p className="text-sm">
                  <span className="text-[color:var(--muted)]">Gate: </span>
                  {f.gate}
                </p>
              </li>
            ))}
          </ol>
        </section>
      </div>

      <section aria-labelledby="aeos-red-team" className="mt-12">
        <h2 id="aeos-red-team" className="mb-4 text-[length:var(--text-h3)] tracking-[-0.02em]">
          Red Team: cinco formas de esta estrutura falhar
        </h2>
        <ol role="list" className="grid gap-px border border-[color:var(--border)] bg-[color:var(--border)] md:grid-cols-5">
          {RED_TEAM.map((r, i) => (
            <li key={r.falha} className="grid content-start gap-2 bg-[color:var(--surface)] p-4">
              <span className={cn(ROTULO, 'text-[color:var(--muted)] tabular-nums')}>{indice(i + 1)}</span>
              <p className="text-sm font-medium">{r.falha}</p>
              <p className="text-sm text-[color:var(--muted)]">Sinal: {r.sinal}</p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
