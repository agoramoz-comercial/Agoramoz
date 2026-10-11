import { Mensagens } from '@/components/admin/espaco/partes';
import { GabineteNav, OK } from '@/components/admin/gabinete/partes';
import { FichaProjeto } from '@/components/admin/gabinete/Registos';
import { AdminHeading } from '@/components/admin/primitives';
import { requireModulo } from '@/lib/auth/modulos';

export const metadata = { title: 'Novo projecto — Gabinete' };

export default async function NovoProjetoPage({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  await requireModulo('direcao');
  const { erro } = await searchParams;
  return (
    <div className="max-w-3xl">
      <AdminHeading titulo="Novo projecto" descricao="Responsável, escopo, fase, economia e a próxima acção com data." />
      <GabineteNav activo="projetos" />
      <Mensagens erro={erro} textos={OK} />
      <FichaProjeto />
    </div>
  );
}
