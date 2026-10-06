import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireModulo } from '@/lib/auth/modulos';
import { createSessionClient } from '@/lib/auth/client';
import { COLUNAS_OPORTUNIDADE, dataCurta, oportunidadeDe } from '@/lib/energia/leitura';
import { MEMO, PRIORIDADE, SECTORES, textoFase } from '@/lib/energia/modelo';

export const metadata = { title: 'Opportunity Memo — Espaço CEnO' };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * O memo em formato de leitura — uma ou duas páginas, para levar ao comité
 * (imprimir ou guardar em PDF pelo browser). É a forma de partilhar uma
 * oportunidade sem abrir o espaço a mais ninguém: quem decide recebe o memo,
 * não a conta.
 */
export default async function MemoPage({ params }: { params: Promise<{ id: string }> }) {
  await requireModulo('energia');
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const supabase = await createSessionClient();
  const { data } = await supabase.from('ceno_oportunidades').select(COLUNAS_OPORTUNIDADE).eq('id', id).maybeSingle();
  if (!data) notFound();
  const op = oportunidadeDe(data as unknown as Record<string, unknown>);
  const memo = op.memo as Record<string, string | undefined>;

  return (
    <article className="mx-auto max-w-[72ch]">
      <p className="mb-6 text-sm print:hidden">
        <Link href={`/admin/energia/oportunidades/${op.id}#memo`} className="underline">
          Voltar à oportunidade
        </Link>
      </p>
      <header className="border-b border-[color:var(--border)] pb-5">
        <p className="rule-label text-[color:var(--muted)]">Opportunity Memo · AGORAMOZ · confidencial</p>
        <h1 className="mt-2 text-[length:var(--text-h3)] tracking-[-0.02em]">{op.titulo}</h1>
        <p className="mt-2 text-sm text-[color:var(--muted)]">
          {[op.organizacao, SECTORES[op.sector as keyof typeof SECTORES], textoFase(op.fase)].filter(Boolean).join(' · ')}
          {op.score_total !== null && op.prioridade && ` · score ${op.score_total}/40 (${PRIORIDADE[op.prioridade].texto})`}
          {` · actualizado ${dataCurta(op.updated_at.slice(0, 10))}`}
        </p>
      </header>
      <ol className="mt-6 grid gap-5">
        {MEMO.map((m, i) => (
          <li key={m.chave} className="grid gap-1">
            <h2 className="text-sm font-semibold">
              {i + 1}. {m.titulo}
            </h2>
            <p className="text-sm whitespace-pre-line">
              {memo[m.chave]?.trim() ? memo[m.chave] : <span className="text-[color:var(--muted)]">Por preencher.</span>}
            </p>
          </li>
        ))}
      </ol>
    </article>
  );
}
