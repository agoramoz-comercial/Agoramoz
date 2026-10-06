import { BotaoEnviar } from '@/components/admin/BotaoEnviar';
import { CAIXA, CamposOportunidade, EnergiaNav, H2, Mensagens } from '@/components/admin/energia/partes';
import { AdminHeading } from '@/components/admin/primitives';
import { criarOportunidade } from '@/lib/admin/energia-actions';
import { requireModulo } from '@/lib/auth/modulos';

export const metadata = { title: 'Nova oportunidade — Espaço CEnO' };

export default async function NovaOportunidadePage({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  await requireModulo('energia');
  const { erro } = await searchParams;
  return (
    <div className="max-w-3xl">
      <AdminHeading
        titulo="Nova oportunidade"
        descricao="Entra no radar (etapa 0). Depois: contacto, descoberta, problema validado — e o score decide se qualifica."
      />
      <EnergiaNav activo="oportunidades" />
      <Mensagens erro={erro} textos={{}} />
      <form action={criarOportunidade} className={CAIXA}>
        <h2 className={H2}>Sinal de mercado</h2>
        <CamposOportunidade />
        <div>
          <BotaoEnviar size="sm" aEnviar="A registar…">
            Registar oportunidade
          </BotaoEnviar>
        </div>
      </form>
    </div>
  );
}
