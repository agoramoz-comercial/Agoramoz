import Link from 'next/link';
import { DataHora, StateBadge } from '@/components/admin/primitives';
import { Button } from '@/components/ui/Button';
import type { EstadoInquerito, Rotulo } from '@/lib/admin/labels';
import type { EstadoLink } from '@/lib/inqueritos/links';
import type { QR } from '@/lib/inqueritos/qr';
import { CopiarLink } from './CopiarLink';

/**
 * Partilhar um inquérito: criar links, copiar o endereço, o código QR, e
 * revogar. O endereço e o QR só existem para links activos e são derivados
 * no servidor a cada visita (o token não está guardado em lado nenhum).
 */

const ESTADO_LINK: Record<EstadoLink, Rotulo> = {
  activo: { texto: 'Activo', tom: 'bom' },
  revogado: { texto: 'Revogado', tom: 'neutro' },
  expirado: { texto: 'Expirado', tom: 'aviso' },
  esgotado: { texto: 'Tecto atingido', tom: 'aviso' },
};

export interface LinkPartilha {
  readonly id: string;
  readonly rotulo: string | null;
  readonly criadoEm: string;
  readonly expiraEm: string | null;
  readonly max: number | null;
  readonly respostas: number;
  readonly estado: EstadoLink;
  /** Só para links activos. */
  readonly url: string | null;
  readonly qr: QR | null;
}

const campo =
  'mt-1.5 w-full min-h-11 rounded-[--radius-sm] border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm';

export function Partilha({
  inqueritoId,
  estadoInquerito,
  totalRespostas,
  links,
  escreve,
  semSegredo,
  criarLink,
  revogarLink,
}: {
  inqueritoId: string;
  estadoInquerito: EstadoInquerito;
  totalRespostas: number | null;
  links: readonly LinkPartilha[];
  escreve: boolean;
  /** SURVEY_LINK_SECRET em falta: não há como derivar endereços. */
  semSegredo: boolean;
  criarLink: (formData: FormData) => Promise<void>;
  revogarLink: (formData: FormData) => Promise<void>;
}) {
  return (
    <section
      id="partilha"
      aria-labelledby="partilha-titulo"
      className="mb-10 scroll-mt-6 border border-[color:var(--border)] bg-[color:var(--surface-raised)] p-5"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 id="partilha-titulo" className="text-sm font-medium">
          Partilhar
        </h2>
        <p className="text-sm">
          {totalRespostas === null ? (
            <span className="text-[color:var(--muted)]">Respostas: sem leitura. </span>
          ) : (
            <>
              <span className="tabular-nums">{totalRespostas}</span>{' '}
              {totalRespostas === 1 ? 'resposta' : 'respostas'} ·{' '}
            </>
          )}
          <Link
            href={`/admin/inqueritos/${inqueritoId}/resultados`}
            className="underline underline-offset-4"
          >
            Ver resultados
          </Link>
        </p>
      </div>

      {estadoInquerito === 'rascunho' && (
        <p className="mt-3 text-sm text-[color:var(--muted)]">
          Publique primeiro: os links de um inquérito por publicar não abrem.
        </p>
      )}
      {estadoInquerito === 'fechado' && (
        <p className="mt-3 text-sm text-[color:var(--muted)]">
          O inquérito está fechado: nenhum link aceita respostas até o reabrir.
        </p>
      )}
      {semSegredo && (
        <p role="alert" className="mt-3 text-sm text-[color:var(--color-signal-700)]">
          Falta configurar SURVEY_LINK_SECRET: os endereços não podem ser mostrados.
        </p>
      )}

      {escreve && !semSegredo && (
        <form
          action={criarLink}
          className="mt-4 grid gap-3 sm:grid-cols-[1fr_11rem_10rem_auto] sm:items-end"
        >
          <input type="hidden" name="id" value={inqueritoId} />
          <div>
            <label
              htmlFor="link-rotulo"
              className="block text-xs font-medium text-[color:var(--muted)]"
            >
              Nome do link (opcional)
            </label>
            <input
              id="link-rotulo"
              name="rotulo"
              maxLength={80}
              placeholder="por exemplo, Clientes · Outubro"
              className={campo}
            />
          </div>
          <div>
            <label
              htmlFor="link-expira"
              className="block text-xs font-medium text-[color:var(--muted)]"
            >
              Aceita até (opcional)
            </label>
            <input id="link-expira" name="expira" type="date" className={campo} />
          </div>
          <div>
            <label
              htmlFor="link-max"
              className="block text-xs font-medium text-[color:var(--muted)]"
            >
              Tecto de respostas
            </label>
            <input
              id="link-max"
              name="max"
              type="number"
              min={1}
              max={1000000}
              placeholder="sem tecto"
              className={campo}
            />
          </div>
          <Button type="submit" size="sm">
            Criar link
          </Button>
        </form>
      )}

      {links.length === 0 ? (
        <p className="mt-5 text-sm text-[color:var(--muted)]">Ainda não há links.</p>
      ) : (
        <ul className="mt-5 space-y-4">
          {links.map((l) => {
            const nome = l.rotulo ?? 'Link sem nome';
            return (
              <li
                key={l.id}
                className="border border-[color:var(--border)] bg-[color:var(--surface)] p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm font-medium">{nome}</p>
                  <StateBadge rotulo={ESTADO_LINK[l.estado]} />
                </div>
                <p className="mt-1 text-xs text-[color:var(--muted)]">
                  Criado <DataHora valor={l.criadoEm} /> · {l.respostas}{' '}
                  {l.respostas === 1 ? 'resposta' : 'respostas'}
                  {l.max !== null ? ` de ${l.max}` : ''}
                  {l.expiraEm ? (
                    <>
                      {' '}
                      · aceita até <DataHora valor={l.expiraEm} />
                    </>
                  ) : null}
                </p>

                {l.url && (
                  <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-start">
                    <CopiarLink url={l.url} rotulo={nome} />
                    {l.qr && (
                      <div className="flex flex-col items-start gap-2">
                        <svg
                          role="img"
                          aria-label={`Código QR do link «${nome}»`}
                          viewBox={`0 0 ${l.qr.lado} ${l.qr.lado}`}
                          shapeRendering="crispEdges"
                          className="size-36"
                        >
                          <rect width={l.qr.lado} height={l.qr.lado} fill="#ffffff" />
                          <path d={l.qr.caminho} fill="#000000" />
                        </svg>
                        <a
                          href={`/admin/inqueritos/${inqueritoId}/links/${l.id}/qr`}
                          className="text-xs underline underline-offset-4"
                        >
                          Descarregar QR (SVG)
                        </a>
                      </div>
                    )}
                  </div>
                )}

                {escreve && l.estado !== 'revogado' && (
                  <form action={revogarLink} className="mt-3">
                    <input type="hidden" name="id" value={inqueritoId} />
                    <input type="hidden" name="link" value={l.id} />
                    <button
                      type="submit"
                      className="min-h-11 text-sm text-[color:var(--color-signal-700)] underline underline-offset-4"
                    >
                      Revogar «{nome}»
                    </button>
                  </form>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
