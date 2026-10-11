import { ErroGabinete } from '@/components/admin/gabinete/partes';
import { DecisoesVista } from '@/components/admin/gabinete/Registos';
import { requireModulo, tituloPrivado } from '@/lib/auth/modulos';
import { lerGabinete } from '@/lib/gabinete/dados';
import { hojeEmMaputo } from '@/lib/gabinete/modelo';

export const generateMetadata = tituloPrivado('direcao', 'Decisões — Gabinete');

export default async function DecisoesPage() {
  await requireModulo('direcao');
  const g = await lerGabinete(['decisoes']);
  if (!g) return <ErroGabinete activo="decisoes" titulo="Decisões" />;
  return <DecisoesVista decisoes={g.decisoes} hoje={hojeEmMaputo(new Date())} />;
}
