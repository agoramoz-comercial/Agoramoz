import { ErroLeitura, Mensagens } from '@/components/admin/espaco/partes';
import { OK } from '@/components/admin/gabinete/partes';
import { TesourariaVista } from '@/components/admin/gabinete/Registos';
import { requireModulo } from '@/lib/auth/modulos';
import { lerGabinete } from '@/lib/gabinete/dados';
import { hojeEmMaputo } from '@/lib/gabinete/modelo';

export const metadata = { title: 'Tesouraria — Gabinete' };

export default async function TesourariaPage({ searchParams }: { searchParams: Promise<{ erro?: string; ok?: string }> }) {
  await requireModulo('direcao');
  const { erro, ok } = await searchParams;
  const g = await lerGabinete(['movimentos', 'projetos']);
  if (!g) return <ErroLeitura texto="Não foi possível ler a tesouraria agora. Recarregue dentro de instantes." />;
  const movimentos = [...g.movimentos].sort((a, b) =>
    (b.data_efectiva ?? b.data_prevista).localeCompare(a.data_efectiva ?? a.data_prevista),
  );
  return (
    <>
      <Mensagens erro={erro} ok={ok} textos={OK} />
      <TesourariaVista movimentos={movimentos} projetos={g.projetos} hoje={hojeEmMaputo(new Date())} />
    </>
  );
}
