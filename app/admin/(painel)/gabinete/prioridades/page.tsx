import { Mensagens } from '@/components/admin/espaco/partes';
import { ErroGabinete, OK } from '@/components/admin/gabinete/partes';
import { PrioridadesVista } from '@/components/admin/gabinete/Registos';
import { requireModulo, tituloPrivado } from '@/lib/auth/modulos';
import { lerGabinete } from '@/lib/gabinete/dados';
import { hojeEmMaputo, trimestreDe } from '@/lib/gabinete/modelo';

export const generateMetadata = tituloPrivado('direcao', 'Prioridades — Gabinete');

export default async function PrioridadesPage({
  searchParams,
}: {
  searchParams: Promise<{ trimestre?: string; erro?: string; ok?: string }>;
}) {
  await requireModulo('direcao');
  const { trimestre: pedido, erro, ok } = await searchParams;
  const trimestre = pedido && /^20\d{2}-T[1-4]$/.test(pedido) ? pedido : trimestreDe(hojeEmMaputo(new Date()));
  const g = await lerGabinete(['prioridades']);
  if (!g) return <ErroGabinete activo="prioridades" titulo="Prioridades" />;
  return (
    <>
      <Mensagens erro={erro} ok={ok} textos={OK} />
      <PrioridadesVista trimestre={trimestre} prioridades={g.prioridades} />
    </>
  );
}
