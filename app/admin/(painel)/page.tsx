import { Feedback } from '@/components/admin/Feedback';
import { HojeVista } from '@/components/admin/crm/HojeVista';
import { TEXTOS_OK_CRM } from '@/components/admin/crm/partes';
import { createSessionClient } from '@/lib/auth/client';
import { podeEscrever, requireStaff } from '@/lib/auth/session';
import { crmOperacional } from '@/lib/crm/activacao';
import { resumoHoje, triagem } from '@/lib/crm/hoje';
import { lerOportunidades, lerPorRever, lerProximasReunioes } from '@/lib/crm/leitura';
import { filaDeHoje } from '@/lib/crm/modelo';
import { criarDe } from '@/lib/admin/comandos';
import { gruposVisiveis } from '@/lib/admin/navegacao';
import { janela } from '@/lib/admin/painel';
import { carregarPainel, type EtapaFunil } from '@/lib/admin/painel-dados';
import { serverEnv } from '@/lib/config/env';
import { estadoErp } from '@/lib/erp/porta';

/** Os mesmos nomes do painel completo (`PainelComando`). */
const ETAPA: Record<EtapaFunil, string> = {
  iniciados: 'Diagnósticos iniciados',
  submetidos: 'Submetidos',
  oportunidades: 'Oportunidades criadas',
  reunioes: 'Reuniões marcadas',
  ganhos: 'Ganhos',
};

export const metadata = { title: 'Hoje' };

/** Fora do componente: o compilador do React recusa ler a hora durante a renderização. */
async function agora(): Promise<Date> {
  return new Date(Date.now());
}

/**
 * O ecrã de entrada do admin: o trabalho de quem entrou, por urgência, e o
 * que é de toda a equipa. O painel analítico está em `/admin/painel`.
 *
 * Acções que falham antes de saber o destino (pedido inválido) voltam aqui
 * com `?erro=`.
 */
export default async function HojePage({ searchParams }: { searchParams: Promise<{ erro?: string; ok?: string }> }) {
  const { erro, ok } = await searchParams;
  const sessao = await requireStaff();
  const supabase = await createSessionClient();
  const instante = await agora();
  const activo = (await crmOperacional(supabase)) === true;

  const env = serverEnv();
  // HOJE-01: o funil dos últimos 30 dias sai das mesmas contas do painel completo.
  const [lido, porRever, reunioes, painel] = await Promise.all([
    lerOportunidades(supabase, { soAbertas: true }, activo),
    lerPorRever(supabase),
    lerProximasReunioes(supabase, instante),
    carregarPainel(supabase, janela(30, instante), {
      pixel: env.ANALYTICS_PERSISTENCE === 'on',
      agendamento: env.SCHEDULING === 'cal',
      news: env.NEWS_ENGINE !== 'off',
      inqueritos: env.SURVEYS === 'on',
      filtrarInqueritos: env.SURVEYS === 'on' || Boolean(env.SURVEY_LINK_SECRET),
      erp: estadoErp(env),
    }).catch(() => null),
  ]);
  const funil =
    painel?.funil.estado === 'ok' ? painel.funil.dados.etapas.map((e) => ({ rotulo: ETAPA[e.chave], valor: e.valor })) : null;
  // HOJE-02: «Criar rápido» com as mesmas regras do «Criar» da paleta.
  const criar = criarDe(
    gruposVisiveis({
      inqueritos: env.SURVEYS === 'on',
      news: env.NEWS_BLOG === 'on',
      energia: false,
      direcao: false,
      admin: sessao.papel === 'admin',
    }),
    podeEscrever(sessao.papel),
  );

  const abertas = lido?.itens ?? [];
  const fila = filaDeHoje(abertas, sessao.userId, instante);

  return (
    <>
      <Feedback erro={erro} ok={ok} textos={TEXTOS_OK_CRM} />
      <HojeVista
        nome={sessao.nome}
        agora={instante}
        eu={sessao.userId}
        escreve={podeEscrever(sessao.papel)}
        activo={activo}
        fila={fila}
        triagem={triagem(fila.semDono)}
        porRever={porRever}
        reunioes={reunioes}
        resumo={resumoHoje(fila, porRever?.total ?? 0, reunioes.length)}
        falhou={lido === null}
        funil={funil}
        criar={criar}
      />
    </>
  );
}
