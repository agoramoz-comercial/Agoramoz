import { ErroLeitura } from '@/components/admin/espaco/partes';
import { ProjetosVista } from '@/components/admin/gabinete/Registos';
import { requireModulo } from '@/lib/auth/modulos';
import { lerGabinete } from '@/lib/gabinete/dados';

export const metadata = { title: 'Projectos — Gabinete' };

export default async function ProjetosPage() {
  await requireModulo('direcao');
  const g = await lerGabinete(['projetos']);
  if (!g) return <ErroLeitura texto="Não foi possível ler os projectos agora. Recarregue dentro de instantes." />;
  return <ProjetosVista projetos={g.projetos} />;
}
