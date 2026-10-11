import { ManualEnergia } from '@/components/admin/energia/Manual';
import { requireModulo, tituloPrivado } from '@/lib/auth/modulos';

export const generateMetadata = tituloPrivado('energia', 'Manual — Espaço CEnO');

export default async function ManualEnergiaPage() {
  await requireModulo('energia');
  return <ManualEnergia />;
}
