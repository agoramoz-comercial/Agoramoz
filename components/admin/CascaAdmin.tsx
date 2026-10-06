import Link from 'next/link';
import { AdminNav, type Entrada } from '@/components/admin/AdminNav';
import { StateBadge } from '@/components/admin/primitives';
import { Logo } from '@/components/brand/Logo';
import { PAPEL } from '@/lib/admin/labels';
import { sair } from '@/lib/auth/actions';

/**
 * A casca visual dos ecrãs autenticados: barra lateral e área de trabalho.
 *
 * Separada do layout para que a guarda de sessão (`requireStaff`) fique no
 * layout e a pré-visualização de QA use exactamente o mesmo markup.
 */

const ENTRADAS: readonly Entrada[] = [
  { href: '/admin', texto: 'Painel', icone: 'painel' },
  { href: '/admin/energia', texto: 'Espaço CEnO', icone: 'energia' },
  { href: '/admin/diagnosticos', texto: 'Diagnósticos', icone: 'diagnosticos' },
  { href: '/admin/oportunidades', texto: 'Oportunidades', icone: 'oportunidades' },
  { href: '/admin/contactos', texto: 'Contactos', icone: 'contactos' },
  { href: '/admin/organizacoes', texto: 'Organizações', icone: 'organizacoes' },
  { href: '/admin/inqueritos', texto: 'Inquéritos', icone: 'inqueritos' },
  { href: '/admin/news', texto: 'News', icone: 'news' },
  { href: '/admin/aquisicao', texto: 'Aquisição', icone: 'aquisicao' },
  { href: '/admin/fila', texto: 'Fila', icone: 'fila' },
  { href: '/admin/equipa', texto: 'Equipa', icone: 'equipa' },
];

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
  children: React.ReactNode;
}) {
  const entradas = ENTRADAS.filter(
    (e) =>
      (inqueritos || e.icone !== 'inqueritos') &&
      (news || e.icone !== 'news') &&
      (energia || e.icone !== 'energia'),
  );
  return (
    <div className="flex w-full flex-col lg:flex-row">
      <aside className="border-b border-[color:var(--border)] lg:w-64 lg:shrink-0 lg:border-r lg:border-b-0">
        {/* A borda vive no <aside>, que estica com a página; o conteúdo fica
            fixo no ecrã ao fazer scroll. */}
        <div className="px-5 py-6 lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:overflow-y-auto">
          <Link href="/admin" className="inline-flex" aria-label="Painel da administração">
            <Logo variant="mark" className="h-7 w-auto" href={null} />
          </Link>

          <div className="mt-5 lg:mt-8">
            <AdminNav entradas={entradas} />
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-[color:var(--border)] pt-4 lg:mt-auto lg:block lg:pt-5">
            <p className="text-sm font-medium">{sessao.nome}</p>
            <p className="text-xs lg:mt-1 break-all text-[color:var(--muted)]">{sessao.email}</p>
            <div className="lg:mt-3">
              <StateBadge rotulo={PAPEL[sessao.papel]} />
            </div>

            <Link
              href="/admin/conta"
              className="inline-flex min-h-11 items-center text-sm text-[color:var(--muted)] underline hover:text-[color:var(--on-surface)] lg:mt-2"
            >
              Mudar palavra-passe
            </Link>

            {/* Sair é uma acção, logo é um POST. Nunca uma ligação: um `GET` que
              altera estado é accionável por um `<img>` numa página qualquer. */}
            <form action={sair} className="lg:mt-4">
              <button
                type="submit"
                className="min-h-11 text-sm text-[color:var(--muted)] underline hover:text-[color:var(--on-surface)]"
              >
                Terminar sessão
              </button>
            </form>
          </div>
        </div>
      </aside>

      {/* A área de trabalho em giz-2, os cartões em giz por cima: a mesma
          hierarquia de superfícies que o site usa, sem um sistema novo. */}
      <main
        id="conteudo"
        data-surface="tint"
        className="min-h-screen min-w-0 flex-1 bg-[color:var(--surface)] px-4 py-8 text-[color:var(--on-surface)] sm:px-5 lg:px-10 lg:py-10"
      >
        <div className="mx-auto max-w-[88rem]">{children}</div>
      </main>
    </div>
  );
}
