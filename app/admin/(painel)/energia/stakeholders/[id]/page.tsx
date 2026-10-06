import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BotaoEnviar } from '@/components/admin/BotaoEnviar';
import { GuardaRascunho } from '@/components/admin/energia/GuardaRascunho';
import { CAIXA, CamposStakeholder, EnergiaNav, ErroLeitura, H2, Mensagens } from '@/components/admin/energia/partes';
import { AdminHeading } from '@/components/admin/primitives';
import { guardarStakeholder } from '@/lib/admin/energia-actions';
import { requireModulo } from '@/lib/auth/modulos';
import { createSessionClient } from '@/lib/auth/client';
import { COLUNAS_STAKEHOLDER, stakeholderDe } from '@/lib/energia/leitura';
import { PAPEIS_LIGACAO, textoFase } from '@/lib/energia/modelo';

export const metadata = { title: 'Stakeholder — Espaço CEnO' };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const OK: Record<string, string> = {
  criado: 'Stakeholder registado. Ligue-o às oportunidades na ficha de cada uma.',
  guardado: 'Dados guardados.',
};

interface LigacaoLida {
  readonly papel: string;
  readonly ceno_oportunidades: { id: string; titulo: string; fase: string } | null;
}

export default async function StakeholderCenoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erro?: string; ok?: string }>;
}) {
  await requireModulo('energia');
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const { erro, ok } = await searchParams;

  const supabase = await createSessionClient();
  const [st, ligacoes] = await Promise.all([
    supabase.from('ceno_stakeholders').select(COLUNAS_STAKEHOLDER).eq('id', id).maybeSingle(),
    supabase
      .from('ceno_oportunidade_stakeholders')
      .select('papel, ceno_oportunidades(id, titulo, fase)')
      .eq('stakeholder_id', id),
  ]);

  if (st.error || ligacoes.error) return <ErroLeitura />;
  // Não existe — ou não é dela, que para a RLS é o mesmo.
  if (!st.data) notFound();
  const s = stakeholderDe(st.data as unknown as Record<string, unknown>);
  const ligadas = ((ligacoes.data ?? []) as unknown as LigacaoLida[]).filter((l) => l.ceno_oportunidades);

  return (
    <div className="max-w-3xl">
      <AdminHeading titulo={s.organizacao} descricao={[s.pessoa, s.cargo].filter(Boolean).join(' · ') || undefined} />
      <EnergiaNav activo="stakeholders" />
      <Mensagens erro={erro} ok={ok} textos={OK} />

      <section aria-labelledby="ligadas" className={`${CAIXA} mb-8`}>
        <h2 id="ligadas" className={H2}>
          Oportunidades ligadas
        </h2>
        {ligadas.length === 0 ? (
          <p className="text-sm text-[color:var(--muted)]">Ainda não está ligado a nenhuma oportunidade.</p>
        ) : (
          <ul className="grid gap-2">
            {ligadas.map((l) => (
              <li key={l.ceno_oportunidades!.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm">
                <Link href={`/admin/energia/oportunidades/${l.ceno_oportunidades!.id}`} className="font-medium underline">
                  {l.ceno_oportunidades!.titulo}
                </Link>
                <span className="text-[color:var(--muted)]">
                  {PAPEIS_LIGACAO[l.papel as keyof typeof PAPEIS_LIGACAO] ?? l.papel} · {textoFase(l.ceno_oportunidades!.fase)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <form action={guardarStakeholder} className={CAIXA}>
        <h2 className={H2}>Dados do stakeholder</h2>
        <input type="hidden" name="id" value={s.id} />
        <input type="hidden" name="revisao" value={s.revisao} />
        <GuardaRascunho chave={`stakeholder-${s.id}`} />
        <CamposStakeholder v={s} />
        <div>
          <BotaoEnviar size="sm" aEnviar="A guardar…">
            Guardar
          </BotaoEnviar>
        </div>
      </form>
    </div>
  );
}
