import { ErroLeitura } from '@/components/admin/espaco/partes';
import { PainelCtoVista } from '@/components/admin/gabinete/Paineis';
import { requireModulo } from '@/lib/auth/modulos';
import { lerGabinete } from '@/lib/gabinete/dados';
import { hojeEmMaputo, painelCto } from '@/lib/gabinete/modelo';

export const metadata = { title: 'Painel CTO — Gabinete' };

export default async function PainelCtoPage() {
  await requireModulo('direcao');
  const g = await lerGabinete(['decisoes', 'prioridades', 'projetos', 'pessoas', 'alocacoes']);
  if (!g) return <ErroLeitura texto="Não foi possível ler o gabinete agora. Recarregue dentro de instantes." />;
  return <PainelCtoVista p={painelCto(g, hojeEmMaputo(new Date()))} />;
}
