import { notFound } from 'next/navigation';
import { EditorInquerito } from '@/components/admin/inqueritos/EditorInquerito';
import { definirInqueritoActivo, guardarInquerito } from '@/lib/admin/actions';
import { estadoDoInquerito } from '@/lib/admin/labels';
import { createSessionClient } from '@/lib/auth/client';
import { podeEscrever, requireStaff } from '@/lib/auth/session';
import { serverEnv } from '@/lib/config/env';
import { specInquerito } from '@/lib/inqueritos/spec';
import { log } from '@/lib/log/logger';

export const metadata = { title: 'Inquérito' };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

  const [inquerito, versoes] = await Promise.all([
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

  return (
    <EditorInquerito
      dados={{
        id: q.id,
        nome: q.name,
        estado: estadoDoInquerito(q.active, lista),
        emVigor: emVigor ? { versao: emVigor.version, publicadaEm: emVigor.published_at! } : null,
        temRascunho: Boolean(rascunho),
        spec: spec.data,
      }}
      escreve={podeEscrever(sessao.papel)}
      erro={erro}
      ok={ok}
      guardar={guardarInquerito}
      definirActivo={definirInqueritoActivo}
    />
  );
}
