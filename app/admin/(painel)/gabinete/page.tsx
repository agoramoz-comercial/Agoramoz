import { ErroLeitura, Mensagens } from '@/components/admin/espaco/partes';
import { OK } from '@/components/admin/gabinete/partes';
import { PainelCeoVista } from '@/components/admin/gabinete/Paineis';
import { requireModulo } from '@/lib/auth/modulos';
import { lerGabinete, lerPipeline } from '@/lib/gabinete/dados';
import { hojeEmMaputo, painelCeo } from '@/lib/gabinete/modelo';

export const metadata = { title: 'Gabinete do Fundador' };

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
  if (!g) return <ErroLeitura texto="Não foi possível ler o gabinete agora. Recarregue dentro de instantes." />;
  const hoje = hojeEmMaputo(new Date());
  return (
    <>
      <Mensagens erro={erro} ok={ok} textos={OK} />
      <PainelCeoVista p={painelCeo(g, hoje)} hoje={hoje} pipeline={pipeline} />
    </>
  );
}
