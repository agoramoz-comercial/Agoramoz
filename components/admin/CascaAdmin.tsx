import Link from 'next/link';
import { AdminNav, AdminSubNav } from '@/components/admin/AdminNav';
import { Paleta } from '@/components/admin/Paleta';
import { comandosDe } from '@/lib/admin/comandos';
import { pesquisarGlobal } from '@/lib/admin/pesquisa-actions';
import { gruposVisiveis } from '@/lib/admin/navegacao';
import { LimparRascunhos } from '@/components/admin/espaco/LimparRascunhos';
import { StateBadge } from '@/components/admin/primitives';
import { Logo } from '@/components/brand/Logo';
import { PAPEL } from '@/lib/admin/labels';
import { sair } from '@/lib/auth/actions';
import { podeEscrever, type Papel } from '@/lib/auth/session';

/**
 * A casca visual dos ecrãs autenticados: barra de topo por tarefa e área de trabalho.
 *
 * Separada do layout para que a guarda de sessão (`requireStaff`) fique no
 * layout e a pré-visualização de QA use exactamente o mesmo markup.
 */

export interface SessaoVisivel {
  readonly nome: string;
  readonly email: string | null;
  readonly papel: string;
}

export function CascaAdmin({
  sessao,
  inqueritos = false,
  news = false,
  energia = false,
  direcao = false,
  pesquisa = pesquisarGlobal,
  children,
}: {
  sessao: SessaoVisivel;
  /** `SURVEYS=on`. Desligado, a entrada não aparece — as páginas dariam 404. */
  inqueritos?: boolean;
  /** `NEWS_BLOG=on`. Desligado, a redacção do News não aparece. */
  news?: boolean;
  /**
   * Quem tem o módulo `energia` (`acessos_modulo`). Para todos os outros —
   * administradores incluídos — o Espaço CEnO não aparece nem existe (404).
   */
  energia?: boolean;
  /** Quem tem o módulo `direcao`: o Gabinete do Fundador. Para os outros, 404. */
  direcao?: boolean;
  /** A pesquisa da paleta (⌘K). A pré-visualização de QA passa uma de exemplo. */
  pesquisa?: (q: string) => ReturnType<typeof pesquisarGlobal>;
  children: React.ReactNode;
}) {
  const grupos = gruposVisiveis({
    inqueritos,
    news,
    energia,
    direcao,
    admin: sessao.papel === 'admin',
  });
  const iniciais = sessao.nome
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('');
  return (
    <div className="admin-v3 min-h-screen w-full bg-[color:var(--surface)] text-[color:var(--on-surface)]">
      {/* Barra de topo (estudo do painel, 25/11/2026): marca, as seis tarefas em
          pílula, a paleta (⌘K) e a conta. Sem desfoque: é sólida (memória de GPU). */}
      <header className="sticky top-0 z-40 border-b border-[color:var(--border)] bg-[color:var(--surface)] print:hidden">
        <div className="mx-auto grid max-w-[96rem] gap-3 px-4 py-3 sm:px-5 lg:px-8">
          <div className="flex flex-wrap items-center gap-3 lg:flex-nowrap lg:gap-5">
            <Link href="/admin" className="inline-flex shrink-0" aria-label="Início da administração">
              <Logo variant="mark" className="h-7 w-auto" href={null} />
            </Link>
            <div className="order-3 w-full min-w-0 lg:order-none lg:w-auto">
              <AdminNav grupos={grupos} />
            </div>
            <div className="ms-auto flex min-w-0 flex-1 items-center justify-end gap-2 lg:max-w-md">
              <Paleta comandos={comandosDe(grupos, { escreve: podeEscrever(sessao.papel as Papel) })} pesquisa={pesquisa} />
              <details className="relative shrink-0">
                <summary
                  aria-label={`Conta de ${sessao.nome}`}
                  className="flex size-11 cursor-pointer list-none items-center justify-center rounded-full bg-[#0b0a09] text-sm font-medium text-[#efe8da] [&::-webkit-details-marker]:hidden"
                >
                  {iniciais || '·'}
                </summary>
                <div className="absolute end-0 top-full z-50 mt-2 grid w-72 gap-1 rounded-[24px] border border-[color:var(--border)] bg-[color:var(--surface-raised)] p-4 shadow-[0_24px_48px_-24px_rgb(11_10_9/0.35)]">
                  <p className="text-sm font-medium">{sessao.nome}</p>
                  <p className="text-xs break-all text-[color:var(--muted)]">{sessao.email}</p>
                  <div className="mt-2">
                    <StateBadge rotulo={PAPEL[sessao.papel]} />
                  </div>
                  <Link
                    href="/admin/conta"
                    className="mt-2 inline-flex min-h-11 items-center text-sm text-[color:var(--muted)] underline hover:text-[color:var(--on-surface)]"
                  >
                    Mudar palavra-passe
                  </Link>
                  {/* Sair é uma acção, logo é um POST. Nunca uma ligação: um `GET` que
                      altera estado é accionável por um `<img>` numa página qualquer. */}
                  <form action={sair}>
                    <LimparRascunhos />
                    <button
                      type="submit"
                      className="min-h-11 text-sm text-[color:var(--muted)] underline hover:text-[color:var(--on-surface)]"
                    >
                      Terminar sessão
                    </button>
                  </form>
                </div>
              </details>
            </div>
          </div>
          <AdminSubNav grupos={grupos} />
        </div>
      </header>

      <main
        id="conteudo"
        className="min-h-screen min-w-0 px-4 py-8 sm:px-5 lg:px-8 lg:py-10 print:p-0"
      >
        <div className="mx-auto max-w-[96rem]">{children}</div>
      </main>
    </div>
  );
}
