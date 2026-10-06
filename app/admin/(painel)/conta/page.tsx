import { BotaoEnviar } from '@/components/admin/BotaoEnviar';
import { AdminHeading } from '@/components/admin/primitives';
import { inputClass } from '@/components/form/Field';
import { mudarPalavraPasse } from '@/lib/auth/actions';
import { createSessionClient } from '@/lib/auth/client';
import { MAXIMO, MENSAGEM, MINIMO, trocaObrigatoria } from '@/lib/auth/palavra-passe';
import { requireStaff } from '@/lib/auth/session';

export const metadata = { title: 'A minha conta' };

const ROTULO = 'text-sm font-medium';

/**
 * A conta de quem está autenticado: por agora, só a palavra-passe.
 *
 * Quando a conta foi criada com uma palavra-passe provisória, o middleware
 * traz para aqui todos os pedidos ao admin até ela ser trocada — e esta
 * página diz porquê, em vez de parecer um castigo.
 */
export default async function ContaPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string; ok?: string }>;
}) {
  const sessao = await requireStaff();
  const { erro, ok } = await searchParams;
  const supabase = await createSessionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const obrigatoria = trocaObrigatoria(user?.app_metadata);
  const mensagemErro = erro && erro in MENSAGEM ? MENSAGEM[erro as keyof typeof MENSAGEM] : null;

  return (
    <div className="max-w-xl">
      <AdminHeading
        titulo="A minha conta"
        descricao={`${sessao.nome}${sessao.email ? ` · ${sessao.email}` : ''}`}
      />

      {obrigatoria && (
        <p role="status" className="mb-6 border border-[color:var(--border)] px-4 py-3 text-sm">
          A sua conta foi criada com uma palavra-passe provisória. Antes de continuar, escolha uma palavra-passe
          só sua — o resto da administração abre logo a seguir.
        </p>
      )}
      {mensagemErro && (
        <p
          role="alert"
          className="mb-6 border border-[color:var(--color-signal-600)] px-4 py-3 text-sm text-[color:var(--color-signal-700)]"
        >
          {mensagemErro}
        </p>
      )}
      {ok === '1' && !obrigatoria && (
        <p role="status" className="mb-6 border border-[color:var(--border)] px-4 py-3 text-sm">
          Palavra-passe mudada. Use a nova a partir do próximo acesso.
        </p>
      )}

      <form
        action={mudarPalavraPasse}
        className="grid gap-5 border border-[color:var(--border)] bg-[color:var(--surface)] p-5"
      >
        <h2 className="text-[length:var(--text-h3)] tracking-[-0.02em]">Mudar palavra-passe</h2>

        <div className="grid gap-2">
          <label htmlFor="conta-actual" className={ROTULO}>
            Palavra-passe actual
          </label>
          <input
            id="conta-actual"
            name="actual"
            type="password"
            autoComplete="current-password"
            required
            className={inputClass}
          />
        </div>

        <div className="grid gap-2">
          <label htmlFor="conta-nova" className={ROTULO}>
            Palavra-passe nova
          </label>
          <input
            id="conta-nova"
            name="nova"
            type="password"
            autoComplete="new-password"
            minLength={MINIMO}
            maxLength={MAXIMO}
            required
            aria-describedby="conta-nova-ajuda"
            className={inputClass}
          />
          <p id="conta-nova-ajuda" className="text-sm text-[color:var(--muted)]">
            Pelo menos {MINIMO} caracteres. Uma frase de quatro ou cinco palavras é mais fácil de lembrar e mais
            difícil de adivinhar do que uma palavra com números.
          </p>
        </div>

        <div className="grid gap-2">
          <label htmlFor="conta-confirmacao" className={ROTULO}>
            Confirmar a palavra-passe nova
          </label>
          <input
            id="conta-confirmacao"
            name="confirmacao"
            type="password"
            autoComplete="new-password"
            minLength={MINIMO}
            maxLength={MAXIMO}
            required
            className={inputClass}
          />
        </div>

        <div>
          <BotaoEnviar size="sm" aEnviar="A mudar…">
            Mudar palavra-passe
          </BotaoEnviar>
        </div>
      </form>
    </div>
  );
}
