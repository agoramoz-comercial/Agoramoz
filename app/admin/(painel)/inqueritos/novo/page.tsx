import { notFound } from 'next/navigation';
import { AdminHeading } from '@/components/admin/primitives';
import { Button } from '@/components/ui/Button';
import { criarInquerito } from '@/lib/admin/actions';
import { requireRole } from '@/lib/auth/session';
import { serverEnv } from '@/lib/config/env';

export const metadata = { title: 'Novo inquérito' };

const campo =
  'mt-1.5 w-full min-h-11 rounded-[--radius-sm] border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm';

export default async function NovoInqueritoPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  if (serverEnv().SURVEYS !== 'on') notFound();
  await requireRole(['admin', 'comercial']);
  const { erro } = await searchParams;

  return (
    <>
      <AdminHeading
        titulo="Novo inquérito"
        descricao="Começa com uma pergunta de exemplo. Nada fica visível fora da equipa até publicar e criar um link."
      />

      {erro ? (
        <p
          role="alert"
          className="mb-6 border border-[color:var(--color-signal-600)] px-4 py-3 text-sm text-[color:var(--color-signal-700)]"
        >
          {erro}
        </p>
      ) : null}

      <form action={criarInquerito} className="max-w-xl space-y-5">
        <div>
          <label htmlFor="nome" className="block text-sm font-medium">
            Nome interno
          </label>
          <p id="nome-ajuda" className="mt-1 text-xs text-[color:var(--muted)]">
            Só a equipa vê. Quem responde vê o título das boas-vindas, que se escreve a seguir.
          </p>
          <input
            id="nome"
            name="nome"
            required
            maxLength={160}
            aria-describedby="nome-ajuda"
            className={campo}
          />
        </div>
        <div>
          <label htmlFor="idioma" className="block text-sm font-medium">
            Idioma de quem responde
          </label>
          <select id="idioma" name="idioma" defaultValue="pt" className={campo}>
            <option value="pt">Português</option>
            <option value="en">Inglês</option>
          </select>
        </div>
        <Button type="submit" size="sm">
          Criar e editar
        </Button>
      </form>
    </>
  );
}
