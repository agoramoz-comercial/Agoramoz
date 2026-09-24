import { AdminHeading, DataHora, EmptyState, StateBadge } from '@/components/admin/primitives';
import { Button } from '@/components/ui/Button';
import { definirActivo, definirPapel } from '@/lib/admin/actions';
import { PAPEL } from '@/lib/admin/labels';
import { createSessionClient } from '@/lib/auth/client';
import { PAPEIS, requireStaff } from '@/lib/auth/session';

export const metadata = { title: 'Equipa' };

/**
 * Autorização, não autenticação.
 *
 * A conta cria-se no painel do Supabase, que é dono da identidade. Esta página
 * responde à outra pergunta: quem tem acesso e com que papel. Uma conta sem
 * perfil aqui está autenticada e não vê rigorosamente nada.
 */
export default async function EquipaPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string; ok?: string }>;
}) {
  const { erro, ok } = await searchParams;
  const sessao = await requireStaff();
  const supabase = await createSessionClient();

  const { data } = await supabase
    .from('profiles')
    .select('id, display_name, role, active, created_at')
    .order('display_name');

  const perfis = (data ?? []) as unknown as {
    id: string;
    display_name: string;
    role: string;
    active: boolean;
    created_at: string;
  }[];

  const admin = sessao.papel === 'admin';

  return (
    <>
      <AdminHeading
        titulo="Equipa"
        descricao="As contas criam-se no painel do Supabase; aqui decide-se o que cada uma pode fazer."
      />

      {erro ? (
        <p
          role="alert"
          className="mb-6 border border-[color:var(--color-signal-600)] px-4 py-3 text-sm text-[color:var(--color-signal-600)]"
        >
          {erro}
        </p>
      ) : null}
      {ok ? (
        <p role="status" className="mb-6 border border-[color:var(--border)] px-4 py-3 text-sm">
          Registado.
        </p>
      ) : null}

      {!admin ? (
        <p className="mb-8 text-sm text-[color:var(--muted)]">
          Só a administração altera papéis. Vê a lista, não a pode mudar.
        </p>
      ) : null}

      {perfis.length === 0 ? (
        <EmptyState
          titulo="Ainda não há perfis."
          descricao="Crie a conta no painel do Supabase e associe-lhe um perfil por SQL para o primeiro administrador."
        />
      ) : (
        <ul className="flex flex-col gap-4">
          {perfis.map((p) => (
            <li
              key={p.id}
              className="flex flex-wrap items-center justify-between gap-4 border border-[color:var(--border)] p-5"
            >
              <div>
                <p className="font-medium">
                  {p.display_name}
                  {p.id === sessao.userId ? (
                    <span className="ml-2 text-xs text-[color:var(--muted)]">(você)</span>
                  ) : null}
                </p>
                <p className="mt-1 text-xs text-[color:var(--muted)]">
                  Desde <DataHora valor={p.created_at} />
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <StateBadge rotulo={PAPEL[p.role]} />
                {!p.active ? (
                  <span className="text-xs text-[color:var(--color-signal-600)]">Desactivado</span>
                ) : null}

                {admin ? (
                  <>
                    <form action={definirPapel} className="flex items-center gap-2">
                      <input type="hidden" name="id" value={p.id} />
                      <label htmlFor={`papel-${p.id}`} className="sr-only">
                        Papel de {p.display_name}
                      </label>
                      <select
                        id={`papel-${p.id}`}
                        name="papel"
                        defaultValue={p.role}
                        className="min-h-11 rounded-[--radius-sm] border border-[color:var(--border)] bg-[color:var(--surface)] px-3 text-sm"
                      >
                        {PAPEIS.map((v) => (
                          <option key={v} value={v}>
                            {PAPEL[v].texto}
                          </option>
                        ))}
                      </select>
                      <Button type="submit" variant="outline" size="sm">
                        Guardar
                      </Button>
                    </form>

                    {p.id !== sessao.userId ? (
                      <form action={definirActivo}>
                        <input type="hidden" name="id" value={p.id} />
                        <input type="hidden" name="activo" value={p.active ? 'nao' : 'sim'} />
                        <Button type="submit" variant="ghost" size="sm">
                          {p.active ? 'Desactivar' : 'Reactivar'}
                        </Button>
                      </form>
                    ) : null}
                  </>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
