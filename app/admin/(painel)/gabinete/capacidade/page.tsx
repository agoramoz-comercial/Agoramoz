import { Mensagens } from '@/components/admin/espaco/partes';
import { ErroGabinete, OK } from '@/components/admin/gabinete/partes';
import { CapacidadeVista } from '@/components/admin/gabinete/Registos';
import { requireModulo, tituloPrivado } from '@/lib/auth/modulos';
import { lerGabinete } from '@/lib/gabinete/dados';
import { hojeEmMaputo } from '@/lib/gabinete/modelo';

export const generateMetadata = tituloPrivado('direcao', 'Capacidade — Gabinete');

export default async function CapacidadePage({ searchParams }: { searchParams: Promise<{ erro?: string; ok?: string }> }) {
  await requireModulo('direcao');
  const { erro, ok } = await searchParams;
  const g = await lerGabinete(['pessoas', 'alocacoes', 'projetos']);
  if (!g) return <ErroGabinete activo="capacidade" titulo="Capacidade" />;
  return (
    <>
      <Mensagens erro={erro} ok={ok} textos={OK} />
      <CapacidadeVista pessoas={g.pessoas} alocacoes={g.alocacoes} projetos={g.projetos} hoje={hojeEmMaputo(new Date())} />
    </>
  );
}
