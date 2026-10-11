import { ErroLeitura, Mensagens } from '@/components/admin/espaco/partes';
import { OK } from '@/components/admin/gabinete/partes';
import { CapacidadeVista } from '@/components/admin/gabinete/Registos';
import { requireModulo } from '@/lib/auth/modulos';
import { lerGabinete } from '@/lib/gabinete/dados';
import { hojeEmMaputo } from '@/lib/gabinete/modelo';

export const metadata = { title: 'Capacidade — Gabinete' };

export default async function CapacidadePage({ searchParams }: { searchParams: Promise<{ erro?: string; ok?: string }> }) {
  await requireModulo('direcao');
  const { erro, ok } = await searchParams;
  const g = await lerGabinete(['pessoas', 'alocacoes', 'projetos']);
  if (!g) return <ErroLeitura texto="Não foi possível ler a capacidade agora. Recarregue dentro de instantes." />;
  return (
    <>
      <Mensagens erro={erro} ok={ok} textos={OK} />
      <CapacidadeVista pessoas={g.pessoas} alocacoes={g.alocacoes} projetos={g.projetos} hoje={hojeEmMaputo(new Date())} />
    </>
  );
}
