import { Mensagens } from '@/components/admin/espaco/partes';
import { ErroGabinete, OK } from '@/components/admin/gabinete/partes';
import { PainelCeoVista } from '@/components/admin/gabinete/Paineis';
import { requireModulo, tituloPrivado } from '@/lib/auth/modulos';
import { lerGabinete, lerPipeline } from '@/lib/gabinete/dados';
import { hojeEmMaputo, painelCeo } from '@/lib/gabinete/modelo';

export const generateMetadata = tituloPrivado('direcao', 'Gabinete do Fundador');

/**
 * O Painel CEO do Gabinete do Fundador. Só quem tem o módulo `direcao` chega
 * aqui (404 para todos os outros, administradores incluídos); a RLS só
 * devolve as linhas do próprio.
 */
export default async function GabinetePage({ searchParams }: { searchParams: Promise<{ erro?: string; ok?: string }> }) {
  await requireModulo('direcao');
  const { erro, ok } = await searchParams;
  const [g, pipeline] = await Promise.all([
    lerGabinete(['decisoes', 'prioridades', 'projetos', 'movimentos', 'pessoas', 'alocacoes']),
    lerPipeline(),
  ]);
  if (!g) return <ErroGabinete activo="ceo" titulo="Gabinete do Fundador" />;
  const hoje = hojeEmMaputo(new Date());
  return (
    <>
      <Mensagens erro={erro} ok={ok} textos={OK} />
      <PainelCeoVista p={painelCeo(g, hoje)} hoje={hoje} pipeline={pipeline} />
    </>
  );
}
