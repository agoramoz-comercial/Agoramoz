import { PainelComando } from '@/components/admin/painel/PainelComando';
import { janela, lerPeriodo } from '@/lib/admin/painel';
import { carregarPainel, type Ligacoes } from '@/lib/admin/painel-dados';
import { createSessionClient } from '@/lib/auth/client';
import { serverEnv } from '@/lib/config/env';
import { estadoErp } from '@/lib/erp/porta';

/**
 * Painel de comando. Responde a «o que precisa de mim agora?» e «como está a
 * correr?», com o período no URL (`?periodo=7|30|90`).
 *
 * Tudo é lido pela sessão de quem entrou, sujeito à RLS. Uma fonte ainda não
 * ligada (Cal, News, ERP) aparece «por activar», com o passo que falta —
 * nunca como zero.
 */

/**
 * O relógio fica fora do corpo do componente de propósito: o compilador do
 * React recusa ler a hora durante a renderização, e contorná-lo com um
 * comentário de supressão seria desligar o aviso em vez de arrumar o código.
 */
async function agora(): Promise<Date> {
  return new Date(Date.now());
}

export default async function PainelPage({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string }>;
}) {
  const { periodo } = await searchParams;
  const env = serverEnv();
  const ligacoes: Ligacoes = {
    pixel: env.ANALYTICS_PERSISTENCE === 'on',
    agendamento: env.SCHEDULING === 'cal',
    news: env.NEWS_ENGINE !== 'off',
    inqueritos: env.SURVEYS === 'on',
    erp: estadoErp(env),
  };

  const supabase = await createSessionClient();
  const dados = await carregarPainel(
    supabase,
    janela(lerPeriodo(periodo), await agora()),
    ligacoes,
  );

  return <PainelComando dados={dados} />;
}
