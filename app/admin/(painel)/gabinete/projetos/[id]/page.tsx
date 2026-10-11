import { notFound } from 'next/navigation';
import { Mensagens } from '@/components/admin/espaco/partes';
import { ErroGabinete, GabineteNav, OK } from '@/components/admin/gabinete/partes';
import { FichaProjeto } from '@/components/admin/gabinete/Registos';
import { AdminHeading } from '@/components/admin/primitives';
import { requireModulo, tituloPrivado } from '@/lib/auth/modulos';
import { lerGabinete, lerUma } from '@/lib/gabinete/dados';
import { FASES_PROJETO } from '@/lib/gabinete/modelo';

export const generateMetadata = tituloPrivado('direcao', 'Projecto — Gabinete');

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function ProjetoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erro?: string; ok?: string }>;
}) {
  await requireModulo('direcao');
  const [{ id }, { erro, ok }] = await Promise.all([params, searchParams]);
  if (!UUID.test(id)) notFound();
  const [p, g] = await Promise.all([lerUma('projetos', id), lerGabinete(['pessoas', 'alocacoes'])]);
  if (p === null || !g) return <ErroGabinete activo="projetos" titulo="Projecto" />;
  if (!p) notFound();
  return (
    <div className="max-w-3xl">
      <AdminHeading titulo={p.nome} descricao={`${FASES_PROJETO[p.fase]}${p.cliente ? ` · ${p.cliente}` : ''}`} />
      <GabineteNav activo="projetos" />
      <Mensagens erro={erro} ok={ok} textos={OK} />
      <FichaProjeto v={p} pessoas={g.pessoas} alocacoes={g.alocacoes} />
    </div>
  );
}
