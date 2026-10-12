import { Feedback } from '@/components/admin/Feedback';
import { PainelComando } from '@/components/admin/painel/PainelComando';
import { janela, lerPeriodo } from '@/lib/admin/painel';
import { carregarPainel, type Ligacoes } from '@/lib/admin/painel-dados';
import { createSessionClient } from '@/lib/auth/client';
import { serverEnv } from '@/lib/config/env';
import { estadoErp } from '@/lib/erp/porta';
import { PorResponsavel } from '@/components/admin/crm/PorResponsavel';
import { crmOperacional } from '@/lib/crm/activacao';
import { lerEquipa, lerOportunidades } from '@/lib/crm/leitura';
import { porResponsavel } from '@/lib/crm/responsaveis';

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

export const metadata = { title: 'Painel' };

export default async function PainelPage({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string; erro?: string }>;
}) {
  const { periodo, erro } = await searchParams;
  const env = serverEnv();
  const ligacoes: Ligacoes = {
    pixel: env.ANALYTICS_PERSISTENCE === 'on',
    agendamento: env.SCHEDULING === 'cal',
    news: env.NEWS_ENGINE !== 'off',
    inqueritos: env.SURVEYS === 'on',
    filtrarInqueritos: env.SURVEYS === 'on' || Boolean(env.SURVEY_LINK_SECRET),
    erp: estadoErp(env),
  };

  const supabase = await createSessionClient();
  const instante = await agora();
  const j = janela(lerPeriodo(periodo), instante);
  const activo = (await crmOperacional(supabase)) === true;
  const [dados, lido, equipa] = await Promise.all([
    carregarPainel(supabase, j, ligacoes),
    lerOportunidades(supabase, {}, activo),
    lerEquipa(supabase),
  ]);

  // Acções que falham antes de saber o destino (pedido inválido) voltam aqui
  // com `?erro=`; antes ninguém o mostrava.
  return (
    <>
      <Feedback erro={erro} textos={{}} />
      <PainelComando dados={dados} />
      {/* Se a leitura falhar, o bloco não aparece: melhor ausente do que com zeros falsos. */}
      {lido && equipa ? (
        <div className="mt-6">
          <PorResponsavel linhas={porResponsavel(lido.itens, equipa, instante, j.inicio, activo)} dias={j.dias} />
          {lido.truncado ? (
            <p role="note" className="mt-2 text-xs text-[color:var(--muted)]">
              Contas sobre as 500 oportunidades mais recentes.
            </p>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
