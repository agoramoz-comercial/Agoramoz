import { Mensagens } from '@/components/admin/espaco/partes';
import { GabineteNav, OK } from '@/components/admin/gabinete/partes';
import { FormDecisao } from '@/components/admin/gabinete/Registos';
import { AdminHeading } from '@/components/admin/primitives';
import { requireModulo, tituloPrivado } from '@/lib/auth/modulos';

export const generateMetadata = tituloPrivado('direcao', 'Nova decisão — Gabinete');

export default async function NovaDecisaoPage({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  await requireModulo('direcao');
  const { erro } = await searchParams;
  return (
    <div className="max-w-3xl">
      <AdminHeading
        titulo="Nova decisão"
        descricao="Que papel é responsável, quem é consultado, que indicador é afectado e quando se revê."
      />
      <GabineteNav activo="decisoes" />
      <Mensagens erro={erro} textos={OK} />
      <FormDecisao />
    </div>
  );
}
