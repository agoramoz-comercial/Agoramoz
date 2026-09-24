import Link from 'next/link';
import { AdminNav, type Entrada } from '@/components/admin/AdminNav';
import { StateBadge } from '@/components/admin/primitives';
import { PAPEL } from '@/lib/admin/labels';
import { sair } from '@/lib/auth/actions';
import { requireStaff } from '@/lib/auth/session';
import { Logo } from '@/components/brand/Logo';

/**
 * Casca dos ecrãs autenticados.
 *
 * O grupo `(painel)` existe para que `/admin/entrar` fique de fora: se a
 * entrada estivesse dentro deste layout, o guarda de sessão redirecionava para
 * a entrada, que voltava a correr o guarda, indefinidamente.
 *
 * `requireStaff()` aqui é a segunda das três camadas — o middleware já recusou
 * quem não tem sessão, e cada escrita volta a verificar o papel na base. Três,
 * porque cada uma falha de maneira diferente: o middleware não conhece perfis,
 * este layout não protege uma Server Action invocada directamente, e a base
 * não sabe o que mostrar.
 */

const ENTRADAS: readonly Entrada[] = [
  { href: '/admin', texto: 'Painel' },
  { href: '/admin/diagnosticos', texto: 'Diagnósticos' },
  { href: '/admin/oportunidades', texto: 'Oportunidades' },
  { href: '/admin/contactos', texto: 'Contactos' },
  { href: '/admin/organizacoes', texto: 'Organizações' },
  { href: '/admin/fila', texto: 'Fila' },
  { href: '/admin/equipa', texto: 'Equipa' },
];

export default async function PainelLayout({ children }: { children: React.ReactNode }) {
  const sessao = await requireStaff();

  return (
    <div className="mx-auto flex w-full max-w-[100rem] flex-col lg:flex-row">
      <aside className="border-b border-[color:var(--border)] px-5 py-6 lg:min-h-screen lg:w-64 lg:shrink-0 lg:border-r lg:border-b-0">
        <Link href="/admin" className="inline-flex" aria-label="Painel da administração">
          <Logo variant="mark" className="h-7 w-auto" href={null} />
        </Link>

        <div className="mt-8">
          <AdminNav entradas={ENTRADAS} />
        </div>

        <div className="mt-10 border-t border-[color:var(--border)] pt-5">
          <p className="text-sm font-medium">{sessao.nome}</p>
          <p className="mt-1 text-xs break-all text-[color:var(--muted)]">{sessao.email}</p>
          <div className="mt-3">
            <StateBadge rotulo={PAPEL[sessao.papel]} />
          </div>

          {/* Sair é uma acção, logo é um POST. Nunca uma ligação: um `GET` que
              altera estado é accionável por um `<img>` numa página qualquer. */}
          <form action={sair} className="mt-4">
            <button
              type="submit"
              className="min-h-11 text-sm text-[color:var(--muted)] underline hover:text-[color:var(--on-surface)]"
            >
              Terminar sessão
            </button>
          </form>
        </div>
      </aside>

      <main id="conteudo" className="min-w-0 flex-1 px-5 py-8 lg:px-10 lg:py-12">
        {children}
      </main>
    </div>
  );
}
