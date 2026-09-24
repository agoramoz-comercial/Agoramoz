import type { Metadata } from 'next';
import { entrar } from '@/lib/auth/actions';
import { Button } from '@/components/ui/Button';
import { inputClass } from '@/components/form/Field';
import { Logo } from '@/components/brand/Logo';

export const metadata: Metadata = { title: 'Entrar' };

const MENSAGENS: Record<string, string> = {
  credenciais: 'Credenciais inválidas.',
  tentativas: 'Demasiadas tentativas. Aguarde alguns minutos antes de tentar de novo.',
};

/**
 * Entrada.
 *
 * Sem JavaScript: é um `<form>` que invoca uma Server Action. O erro chega por
 * parâmetro de URL em vez de estado de cliente, o que custa o campo do e-mail
 * ficar vazio e poupa o admin inteiro de carregar React interactivo só para
 * mostrar uma linha de texto.
 *
 * A mensagem é a mesma para palavra-passe errada, conta inexistente, conta sem
 * perfil e perfil desactivado. Distinguir daria a quem sonda uma lista de quem
 * trabalha aqui.
 */
export default async function EntrarPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const { erro } = await searchParams;
  const mensagem = erro ? (MENSAGENS[erro] ?? MENSAGENS.credenciais) : null;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[26rem] flex-col justify-center px-6 py-16">
      <Logo variant="mark" className="h-9 w-auto" href={null} />

      <h1 className="mt-8 text-[length:var(--text-h3)] tracking-[-0.02em]">Área reservada</h1>
      <p className="mt-2 text-sm text-[color:var(--muted)]">
        Acesso restrito à equipa da AGORAMOZ.
      </p>

      {mensagem ? (
        <p
          role="alert"
          className="mt-6 border border-[color:var(--color-signal-600)] px-4 py-3 text-sm text-[color:var(--color-signal-600)]"
        >
          {mensagem}
        </p>
      ) : null}

      <form action={entrar} className="mt-8 flex flex-col gap-5">
        {/* Sem o componente `Field`: é de cliente e recebe os filhos por
            função, o que não atravessa a fronteira servidor→cliente. Aqui
            basta o `inputClass`, que é só uma cadeia de estilos, e o resto é
            HTML — que é também o que mantém esta página sem JavaScript. */}
        <div className="flex flex-col gap-2">
          <label htmlFor="email" className="text-sm font-medium">
            Endereço de correio
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="username"
            required
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="password" className="text-sm font-medium">
            Palavra-passe
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className={inputClass}
          />
        </div>

        <Button type="submit" size="lg" variant="solid">
          Entrar
        </Button>
      </form>
    </main>
  );
}
