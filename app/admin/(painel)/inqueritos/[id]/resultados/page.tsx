import { notFound } from 'next/navigation';
import { Resultados, type Desistencia } from '@/components/admin/inqueritos/Resultados';
import { createSessionClient } from '@/lib/auth/client';
import { podeEscrever, requireStaff } from '@/lib/auth/session';
import { serverEnv } from '@/lib/config/env';
import { resultadosDaBase } from '@/lib/inqueritos/resultados';
import { specInquerito } from '@/lib/inqueritos/spec';
import { log } from '@/lib/log/logger';

export const metadata = { title: 'Resultados do inquérito' };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** O tecto de passos que o esquema dos eventos aceita (`survey_step_viewed.step`). */
const MAX_PASSOS = 60;

export default async function ResultadosPage({ params }: { params: Promise<{ id: string }> }) {
  const env = serverEnv();
  if (env.SURVEYS !== 'on') notFound();
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const sessao = await requireStaff();
  const supabase = await createSessionClient();

  const [inquerito, versoes, rpc] = await Promise.all([
    supabase
      .from('questionnaires')
      .select('id, name')
      .eq('id', id)
      .eq('kind', 'survey')
      .maybeSingle(),
    supabase
      .from('questionnaire_versions')
      .select('version, spec, published_at')
      .eq('questionnaire_id', id)
      .order('version', { ascending: false }),
    supabase.rpc('resultados_inquerito', { p_id: id }),
  ]);
  const q = inquerito.data as { id: string; name: string } | null;
  if (!q) notFound();

  // A mesma escolha da função da base: a publicada mais recente, ou o rascunho.
  const lista = (versoes.data ?? []) as {
    version: number;
    spec: unknown;
    published_at: string | null;
  }[];
  const publicada = lista.find((v) => v.published_at);
  const spec = specInquerito.safeParse((publicada ?? lista[0])?.spec);
  if (!spec.success) throw new Error('Inquérito com formato ilegível.');

  const lidos = resultadosDaBase.safeParse(rpc.data);
  const falhou = Boolean(rpc.error) || !lidos.success;
  if (falhou) {
    log.error('inquerito.resultados_falhou', {
      entityType: 'inquerito',
      entityId: id,
      errorCode: rpc.error?.code ?? 'forma',
      outcome: 'failed',
    });
  }

  let desistencia: Desistencia;
  if (env.ANALYTICS_PERSISTENCE !== 'on') {
    desistencia = { estado: 'sem-dados', motivo: 'A medição própria está desligada.' };
  } else {
    const conta = async (nome: string, passo?: number) => {
      let consulta = supabase
        .from('analytics_events')
        .select('*', { count: 'exact', head: true })
        .eq('name', nome)
        .eq('props->>surveyId', id);
      if (passo !== undefined) consulta = consulta.eq('props->>step', String(passo));
      const { count, error } = await consulta;
      return error ? null : (count ?? 0);
    };
    const passos = Math.min(MAX_PASSOS, spec.data.perguntas.length + (spec.data.contacto ? 1 : 0));
    const [iniciados, ...porPasso] = await Promise.all([
      conta('survey_started'),
      ...Array.from({ length: passos }, (_, i) => conta('survey_step_viewed', i + 1)),
    ]);
    if (iniciados === null || iniciados === undefined || porPasso.some((n) => n === null)) {
      desistencia = { estado: 'sem-dados', motivo: 'Não foi possível ler os eventos agora.' };
    } else if (iniciados === 0) {
      desistencia = { estado: 'sem-dados', motivo: 'Ainda ninguém começou com a medição activa.' };
    } else {
      // Passos que ninguém viu (condicionais nunca abertas, o fim) saem do fim da lista.
      const vistos = porPasso as number[];
      while (vistos.length > 0 && vistos[vistos.length - 1] === 0) vistos.pop();
      desistencia = { estado: 'ok', iniciados, porPasso: vistos };
    }
  }

  return (
    <Resultados
      id={q.id}
      nome={q.name}
      versao={publicada?.version ?? null}
      spec={spec.data}
      resultados={falhou || !lidos.success ? null : lidos.data}
      desistencia={desistencia}
      escreve={podeEscrever(sessao.papel)}
    />
  );
}
