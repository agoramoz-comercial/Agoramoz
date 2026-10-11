import { ErroGabinete } from '@/components/admin/gabinete/partes';
import { PainelCtoVista } from '@/components/admin/gabinete/Paineis';
import { requireModulo, tituloPrivado } from '@/lib/auth/modulos';
import { lerGabinete } from '@/lib/gabinete/dados';
import { hojeEmMaputo, painelCto } from '@/lib/gabinete/modelo';

export const generateMetadata = tituloPrivado('direcao', 'Painel CTO — Gabinete');

export default async function PainelCtoPage() {
  await requireModulo('direcao');
  const g = await lerGabinete(['decisoes', 'prioridades', 'projetos', 'pessoas', 'alocacoes']);
  if (!g) return <ErroGabinete activo="cto" titulo="Painel CTO" />;
  return <PainelCtoVista p={painelCto(g, hojeEmMaputo(new Date()))} />;
}
