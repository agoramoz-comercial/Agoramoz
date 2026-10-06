import { ManualEnergia } from '@/components/admin/energia/Manual';
import { requireModulo } from '@/lib/auth/modulos';

export const metadata = { title: 'Manual — Espaço CEnO' };

export default async function ManualEnergiaPage() {
  await requireModulo('energia');
  return <ManualEnergia />;
}
