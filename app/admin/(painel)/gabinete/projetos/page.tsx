import { ErroGabinete } from '@/components/admin/gabinete/partes';
import { ProjetosVista } from '@/components/admin/gabinete/Registos';
import { requireModulo, tituloPrivado } from '@/lib/auth/modulos';
import { lerGabinete } from '@/lib/gabinete/dados';

export const generateMetadata = tituloPrivado('direcao', 'Projectos — Gabinete');

export default async function ProjetosPage() {
  await requireModulo('direcao');
  const g = await lerGabinete(['projetos']);
  if (!g) return <ErroGabinete activo="projetos" titulo="Projectos" />;
  return <ProjetosVista projetos={g.projetos} />;
}
