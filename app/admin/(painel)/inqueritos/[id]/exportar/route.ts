import { createSessionClient } from '@/lib/auth/client';
import { currentSession, podeEscrever } from '@/lib/auth/session';
import { serverEnv } from '@/lib/config/env';
import {
  BOM,
  cabecalho,
  colunas,
  linhaDeResposta,
  type RespostaExportada,
} from '@/lib/inqueritos/csv';
import { specInquerito } from '@/lib/inqueritos/spec';
import { log } from '@/lib/log/logger';

/**
 * Exportação das respostas de um inquérito em CSV.
 *
 * Só para a equipa, lido pela sessão (RLS). Os dados de contacto só saem com
 * `?contacto=1` e só para quem pode escrever (admin e comercial): PII
 * mínima por omissão. Paginado de mil em mil — o PostgREST corta em
 * `max_rows` sem avisar — e com tecto: acima dele recusa-se, em vez de
 * entregar um ficheiro incompleto com cara de completo.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PAGINA = 1000;
const TECTO = 20_000;
/**
 * Tecto também em bytes: uma resposta pode ter até 64 KB, e o ficheiro é
 * montado em memória. 40 MB de respostas chegam para qualquer uso real da v1.
 */
const TECTO_BYTES = 40 * 1024 * 1024;

const texto = (status: number, corpo: string) =>
  new Response(corpo, {
    status,
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
  });

interface Linha {
  id: string;
  submitted_at: string;
  survey_links: { rotulo: string | null } | null;
  response_answers: { question_key: string; value: unknown }[];
  contacts?: { name: string | null; email: string | null; phone: string | null } | null;
}

export async function GET(pedido: Request, { params }: { params: Promise<{ id: string }> }) {
  if (serverEnv().SURVEYS !== 'on') return texto(404, 'Não encontrado.');
  const { id } = await params;
  if (!UUID.test(id)) return texto(404, 'Não encontrado.');
  const sessao = await currentSession();
  if (!sessao) return texto(404, 'Não encontrado.');

  const comContacto = new URL(pedido.url).searchParams.get('contacto') === '1';
  if (comContacto && !podeEscrever(sessao.papel)) {
    return texto(403, 'O seu papel não permite exportar dados de contacto.');
  }

  const supabase = await createSessionClient();
  const { data: q } = await supabase
    .from('questionnaires')
    .select('id, slug')
    .eq('id', id)
    .eq('kind', 'survey')
    .maybeSingle();
  if (!q) return texto(404, 'Não encontrado.');

  // A mesma versão que os resultados usam: a publicada mais recente, ou o rascunho.
  const { data: versoes } = await supabase
    .from('questionnaire_versions')
    .select('spec, published_at, version')
    .eq('questionnaire_id', id)
    .order('version', { ascending: false });
  const escolhida = (versoes ?? []).find((v) => v.published_at) ?? (versoes ?? [])[0];
  const spec = specInquerito.safeParse(escolhida?.spec);
  if (!spec.success) return texto(500, 'Inquérito com formato ilegível.');

  const campos = [
    'id',
    'submitted_at',
    'survey_links(rotulo)',
    'response_answers(question_key, value)',
    'questionnaire_versions!inner(questionnaire_id)',
    ...(comContacto ? ['contacts(name, email, phone)'] : []),
  ].join(', ');

  const todas: Linha[] = [];
  let bytes = 0;
  for (let de = 0; ; de += PAGINA) {
    const { data, error } = await supabase
      .from('responses')
      .select(campos)
      .eq('questionnaire_versions.questionnaire_id', id)
      .not('survey_link_id', 'is', null)
      .order('submitted_at', { ascending: true })
      .order('id', { ascending: true })
      .range(de, de + PAGINA - 1);
    if (error) {
      log.error('inquerito.exportacao_falhou', {
        entityType: 'inquerito',
        entityId: id,
        errorCode: error.code ?? 'desconhecido',
        outcome: 'failed',
      });
      return texto(503, 'Não foi possível ler as respostas. Tente de novo.');
    }
    const pagina = (data ?? []) as unknown as Linha[];
    todas.push(...pagina);
    bytes += pagina.reduce((n, l) => n + JSON.stringify(l.response_answers).length, 0);
    if (bytes > TECTO_BYTES) {
      return texto(413, 'Respostas demasiado volumosas para exportar de uma só vez.');
    }
    // Pára na página vazia, não na curta: se o projecto tiver `max_rows`
    // abaixo de PAGINA, uma página curta não quer dizer que acabou.
    if (pagina.length === 0) break;
    if (todas.length >= TECTO) {
      return texto(413, `Mais de ${TECTO} respostas: a exportação de uma só vez está limitada.`);
    }
  }

  // Sem registo na auditoria, não há ficheiro: quem exporta (e se levou
  // contactos) fica na base, como as outras acções do admin.
  const auditoria = await supabase.rpc('registar_exportacao_inquerito', {
    p_id: id,
    p_com_contacto: comContacto,
  });
  if (auditoria.error) {
    log.error('inquerito.exportacao_falhou', {
      entityType: 'inquerito',
      entityId: id,
      errorCode: auditoria.error.code ?? 'auditoria',
      outcome: 'failed',
    });
    return auditoria.error.code === '42501'
      ? texto(403, 'Sem permissão para esta exportação.')
      : texto(503, 'Não foi possível registar a exportação. Tente de novo.');
  }

  const respostas: RespostaExportada[] = todas.map((l) => ({
    submetidaEm: l.submitted_at,
    link: l.survey_links?.rotulo ?? null,
    respostas: Object.fromEntries(l.response_answers.map((a) => [a.question_key, a.value])),
    contacto: comContacto
      ? l.contacts
        ? { nome: l.contacts.name, email: l.contacts.email, telefone: l.contacts.phone }
        : null
      : undefined,
  }));
  const { antigas } = colunas(
    spec.data,
    respostas.flatMap((r) => Object.keys(r.respostas)),
  );
  const corpo =
    BOM +
    cabecalho(spec.data, antigas, comContacto) +
    respostas.map((r) => linhaDeResposta(spec.data, antigas, r, comContacto)).join('');

  log.info('inquerito.exportado', {
    entityType: 'inquerito',
    entityId: id,
    reason: comContacto ? 'com-contacto' : 'sem-contacto',
    outcome: 'accepted',
  });

  const hoje = new Date().toISOString().slice(0, 10);
  return new Response(corpo, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${q.slug}-${hoje}.csv"`,
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
