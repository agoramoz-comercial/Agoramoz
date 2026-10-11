import { ManualGabinete } from '@/components/admin/gabinete/Manual';
import { requireModulo } from '@/lib/auth/modulos';

export const metadata = { title: 'Manual — Gabinete' };

export default async function ManualGabinetePage() {
  await requireModulo('direcao');
  return <ManualGabinete />;
}
