import { ErroLeitura } from '@/components/admin/espaco/partes';
import { DecisoesVista } from '@/components/admin/gabinete/Registos';
import { requireModulo } from '@/lib/auth/modulos';
import { lerGabinete } from '@/lib/gabinete/dados';
import { hojeEmMaputo } from '@/lib/gabinete/modelo';

export const metadata = { title: 'Decisões — Gabinete' };

export default async function DecisoesPage() {
  await requireModulo('direcao');
  const g = await lerGabinete(['decisoes']);
  if (!g) return <ErroLeitura texto="Não foi possível ler as decisões agora. Recarregue dentro de instantes." />;
  return <DecisoesVista decisoes={g.decisoes} hoje={hojeEmMaputo(new Date())} />;
}
