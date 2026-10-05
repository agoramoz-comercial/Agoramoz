import { notFound } from 'next/navigation';
import { EditorInquerito } from '@/components/admin/inqueritos/EditorInquerito';
import { Partilha } from '@/components/admin/inqueritos/Partilha';
import {
  criarLink,
  definirInqueritoActivo,
  guardarInquerito,
  revogarLink,
} from '@/lib/admin/actions';
import { estadoDoInquerito } from '@/lib/admin/labels';
import { createSessionClient } from '@/lib/auth/client';
import { podeEscrever, requireStaff } from '@/lib/auth/session';
import { serverEnv } from '@/lib/config/env';
import { importarTextoInquerito } from '@/lib/admin/importar-inquerito';
import { chavesReservadas } from '@/lib/inqueritos/construtor';
import { iaDisponivel } from '@/lib/inqueritos/importar/servidor';
import { montarLinks, type LinhaLink } from '@/lib/inqueritos/partilha';
import { specInquerito } from '@/lib/inqueritos/spec';
import { SITE_URL } from '@/lib/seo/site';
import { log } from '@/lib/log/logger';

export const metadata = { title: 'Inquérito' };

/** O «Colar e transformar» chama o Kimi por uma Server Action desta página, com 45 s de
 * limite: a função tem de durar mais do que isso para o recurso ao analisador local correr. */
export const maxDuration = 60;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Assíncrona de propósito: ler o relógio no corpo de um componente é o que a
 * regra de pureza do React recusa (o mesmo recurso do painel).
 */
async function agora(): Promise<Date> {
  return new Date(Date.now());
}

interface Versao {
  version: number;
  spec: unknown;
  published_at: string | null;
  retired_at: string | null;
}

export default async function InqueritoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erro?: string; ok?: string }>;
}) {
  if (serverEnv().SURVEYS !== 'on') notFound();
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const { erro, ok } = await searchParams;
  const sessao = await requireStaff();
  const supabase = await createSessionClient();

  const env = serverEnv();
  const [inquerito, versoes, links, total] = await Promise.all([
    supabase
      .from('questionnaires')
      .select('id, name, kind, active')
      .eq('id', id)
      .eq('kind', 'survey')
      .maybeSingle(),
    supabase
      .from('questionnaire_versions')
      .select('version, spec, published_at, retired_at')
      .eq('questionnaire_id', id)
      .order('version', { ascending: false }),
    supabase
      .from('survey_links')
      .select('id, rotulo, created_at, expires_at, revoked_at, max_responses')
      .eq('questionnaire_id', id)
      .order('created_at', { ascending: false })
      .limit(200),
    // O total vem de uma contagem própria: a soma dos links listados ficava
    // curta com mais links do que a lista mostra.
    supabase
      .from('responses')
      .select('id, questionnaire_versions!inner(questionnaire_id)', { count: 'exact', head: true })
      .eq('questionnaire_versions.questionnaire_id', id)
      .not('survey_link_id', 'is', null),
  ]);

  const q = inquerito.data as { id: string; name: string; active: boolean } | null;
  if (!q) notFound();
  const lista = (versoes.data ?? []) as Versao[];
  const rascunho = lista.find((v) => !v.published_at);
  const emVigor = lista.find((v) => v.published_at && !v.retired_at);

  // O spec guardado volta a passar pelo esquema: o construtor só trabalha com
  // o formato que a página pública aceita.
  const spec = specInquerito.safeParse((rascunho ?? emVigor)?.spec);
  if (!spec.success) {
    log.error('inquerito.spec_ilegivel', {
      entityType: 'inquerito',
      entityId: id,
      outcome: 'failed',
    });
    throw new Error('Inquérito com formato ilegível.');
  }

  // Uma contagem por link (cabeça, sem linhas): exacta mesmo além das mil
  // linhas que o PostgREST devolve por pedido. Toda a resposta de inquérito
  // vem por um link, por isso o total é a soma.
  const linhasLinks = (links.data ?? []) as LinhaLink[];
  const contagens = await Promise.all(
    linhasLinks.map(async (l) => {
      const { count, error } = await supabase
        .from('responses')
        .select('*', { count: 'exact', head: true })
        .eq('survey_link_id', l.id);
      return [l.id, error ? null : (count ?? 0)] as const;
    }),
  );
  const leituraFalhou = Boolean(links.error) || contagens.some(([, n]) => n === null);
  const porLink = new Map(contagens.map(([k, n]) => [k, n ?? 0]));
  const estado = estadoDoInquerito(q.active, lista);

  return (
    <EditorInquerito
      dados={{
        id: q.id,
        nome: q.name,
        estado,
        emVigor: emVigor ? { versao: emVigor.version, publicadaEm: emVigor.published_at! } : null,
        temRascunho: Boolean(rascunho),
        spec: spec.data,
        // Só as versões publicadas tiveram respostas; as chaves delas ficam.
        reservadas: chavesReservadas(lista.filter((v) => v.published_at).map((v) => v.spec)),
      }}
      escreve={podeEscrever(sessao.papel)}
      erro={erro}
      ok={ok}
      guardar={guardarInquerito}
      definirActivo={definirInqueritoActivo}
      importar={importarTextoInquerito}
      iaDisponivel={iaDisponivel(env)}
      modeloIA={iaDisponivel(env) ? env.KIMI_MODEL : undefined}
    >
      <Partilha
        inqueritoId={q.id}
        estadoInquerito={estado}
        totalRespostas={leituraFalhou || total.error ? null : (total.count ?? 0)}
        links={montarLinks(
          linhasLinks,
          porLink,
          // O endereço é uma capacidade de responder: só para quem pode
          // escrever (revisão ECC, L3). Sem segredo, montarLinks não o deriva.
          podeEscrever(sessao.papel) ? env.SURVEY_LINK_SECRET : undefined,
          SITE_URL,
          await agora(),
        )}
        escreve={podeEscrever(sessao.papel)}
        semSegredo={!env.SURVEY_LINK_SECRET}
        criarLink={criarLink}
        revogarLink={revogarLink}
      />
    </EditorInquerito>
  );
}
