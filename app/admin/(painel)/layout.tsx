import { CascaAdmin } from '@/components/admin/CascaAdmin';
import { requireStaff } from '@/lib/auth/session';
import { serverEnv } from '@/lib/config/env';

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

export default async function PainelLayout({ children }: { children: React.ReactNode }) {
  const sessao = await requireStaff();
  return (
    <CascaAdmin
      sessao={{ nome: sessao.nome, email: sessao.email, papel: sessao.papel }}
      inqueritos={serverEnv().SURVEYS === 'on'}
      news={serverEnv().NEWS_BLOG === 'on'}
    >
      {children}
    </CascaAdmin>
  );
}
