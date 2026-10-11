import { ManualGabinete } from '@/components/admin/gabinete/Manual';
import { requireModulo, tituloPrivado } from '@/lib/auth/modulos';

export const generateMetadata = tituloPrivado('direcao', 'Manual — Gabinete');

export default async function ManualGabinetePage() {
  await requireModulo('direcao');
  return <ManualGabinete />;
}
