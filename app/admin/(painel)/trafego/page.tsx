import { Feedback } from '@/components/admin/Feedback';
import { AdminHeading } from '@/components/admin/primitives';
import { PainelSeo } from '@/components/admin/trafego/PainelSeo';
import { AutoRefrescar } from '@/components/admin/trafego/AutoRefrescar';
import { PainelTrafego } from '@/components/admin/trafego/PainelTrafego';
import { lerPeriodoTrafego } from '@/lib/admin/trafego';
import { carregarTrafego } from '@/lib/admin/trafego-dados';
import { createSessionClient } from '@/lib/auth/client';
import { podeEscrever, requireStaff } from '@/lib/auth/session';
import { verificacaoDosMotores } from '@/lib/seo/verificacao';
import { serverEnv } from '@/lib/config/env';

export const metadata = { title: 'Tráfego' };

/** O relógio fora do corpo do componente (o compilador do React recusa ler a hora a desenhar). */
async function agora(): Promise<Date> {
  return new Date(Date.now());
}

/**
 * Tráfego do website (D-47): todas as páginas, quem está agora, de onde vêm,
 * por onde andam, onde param e o que convertem. Período no URL.
 */
export default async function TrafegoPage({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string; ok?: string; erro?: string; n?: string }>;
}) {
  const sessao = await requireStaff();
  const sp = await searchParams;
  const periodo = lerPeriodoTrafego(sp.periodo);
  const verificacao = verificacaoDosMotores();
  const ligado = serverEnv().ANALYTICS_PERSISTENCE === 'on';
  const dados = await carregarTrafego(await createSessionClient(), periodo, await agora());

  return (
    <>
      <AdminHeading
        titulo="Tráfego"
        descricao="Vistas de cada página, quem está no site agora, de onde vêm, por onde andam, onde param e o que convertem. Sem cookies: ver «Como se conta», no fim."
      />
      <AutoRefrescar segundos={60} />
      <Feedback
        erro={sp.erro}
        ok={sp.ok}
        textos={{
          indexnow: `Aviso enviado ao IndexNow${sp.n && /^\d+$/.test(sp.n) ? ` com ${sp.n} páginas` : ''}. O Bing e o Yandex visitam-nas nos próximos dias.`,
        }}
      />
      {!ligado && (
        <p role="status" className="mb-6 border border-[color:var(--border)] px-4 py-3 text-sm">
          A medição está desligada neste ambiente (ANALYTICS_PERSISTENCE=off): não se grava nenhuma vista.
        </p>
      )}
      <div className="mb-10">
        <PainelSeo google={Boolean(verificacao?.google)} bing={Boolean(verificacao?.other)} podeAvisar={podeEscrever(sessao.papel)} />
      </div>
      {dados.estado === 'ok' ? (
        <PainelTrafego resumo={dados.resumo} periodo={periodo} truncado={dados.truncado} />
      ) : (
        <p role="alert" className="border border-[color:var(--color-signal-600)] px-4 py-3 text-sm">
          Não foi possível ler o tráfego agora. Tente de novo dentro de momentos.
        </p>
      )}
    </>
  );
}
