import { BotaoEnviar } from '@/components/admin/BotaoEnviar';
import { GuardaRascunho } from '@/components/admin/energia/GuardaRascunho';
import { CAIXA, CamposStakeholder, EnergiaNav, H2, Mensagens } from '@/components/admin/energia/partes';
import { AdminHeading } from '@/components/admin/primitives';
import { criarStakeholder } from '@/lib/admin/energia-actions';
import { requireModulo } from '@/lib/auth/modulos';

export const metadata = { title: 'Novo stakeholder — Espaço CEnO' };

export default async function NovoStakeholderPage({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  await requireModulo('energia');
  const { erro } = await searchParams;
  return (
    <div className="max-w-3xl">
      <AdminHeading
        titulo="Novo stakeholder"
        descricao="Registe a pessoa ou a organização uma única vez; depois ligue-a às oportunidades com o papel que tem em cada uma."
      />
      <EnergiaNav activo="stakeholders" />
      <Mensagens erro={erro} textos={{}} />
      <form action={criarStakeholder} className={CAIXA}>
        <h2 className={H2}>Dados do stakeholder</h2>
        <GuardaRascunho chave="novo-stakeholder" />
        <CamposStakeholder />
        <div>
          <BotaoEnviar size="sm" aEnviar="A registar…">
            Registar stakeholder
          </BotaoEnviar>
        </div>
      </form>
    </div>
  );
}
