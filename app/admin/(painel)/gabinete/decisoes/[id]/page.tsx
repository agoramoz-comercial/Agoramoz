import { notFound } from 'next/navigation';
import { Mensagens } from '@/components/admin/espaco/partes';
import { ErroGabinete, GabineteNav, OK } from '@/components/admin/gabinete/partes';
import { FormDecisao } from '@/components/admin/gabinete/Registos';
import { AdminHeading } from '@/components/admin/primitives';
import { requireModulo, tituloPrivado } from '@/lib/auth/modulos';
import { lerUma } from '@/lib/gabinete/dados';
import { ESTADOS_DECISAO } from '@/lib/gabinete/modelo';

export const generateMetadata = tituloPrivado('direcao', 'Decisão — Gabinete');

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function DecisaoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erro?: string; ok?: string }>;
}) {
  await requireModulo('direcao');
  const [{ id }, { erro, ok }] = await Promise.all([params, searchParams]);
  if (!UUID.test(id)) notFound();
  const d = await lerUma('decisoes', id);
  if (d === null) return <ErroGabinete activo="decisoes" titulo="Decisão" />;
  if (!d) notFound();
  return (
    <div className="max-w-3xl">
      <AdminHeading titulo={d.titulo} descricao={`Estado: ${ESTADOS_DECISAO[d.estado]}.`} />
      <GabineteNav activo="decisoes" />
      <Mensagens erro={erro} ok={ok} textos={OK} />
      <FormDecisao v={d} />
    </div>
  );
}
