import Link from 'next/link';
import { BotaoEnviar } from '@/components/admin/BotaoEnviar';
import { notFound } from 'next/navigation';
import { AdminHeading, DataHora, StateBadge } from '@/components/admin/primitives';
import { inputClass } from '@/components/form/Field';
import { ArtigoCorpo } from '@/components/news/jornal/ArtigoCorpo';
import { buttonVariants } from '@/components/ui/Button';
import { ESTADO_ARTIGO } from '@/lib/admin/labels';
import { arquivarArtigo, guardarArtigo, publicarArtigo } from '@/lib/admin/news-actions';
import { createSessionClient } from '@/lib/auth/client';
import { podeEscrever, requireStaff } from '@/lib/auth/session';
import { serverEnv } from '@/lib/config/env';
import { fonteJornal } from '@/lib/fonts/jornal';
import { NOME_DA_SECCAO, SECCOES_JORNAL, type SeccaoJornal } from '@/lib/news/artigo';
import { validarAnalise } from '@/lib/news/esquema';

export const metadata = { title: 'Artigo — News' };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const OK: Record<string, string> = {
  criado:
    'Rascunho criado a partir da análise. Reveja o título, a entrada e a secção antes de publicar.',
  guardado: 'Alterações guardadas.',
  publicado: 'Publicado no jornal. Já aceita gostos e partilhas.',
  arquivado: 'Arquivado: saiu do jornal.',
};

interface Artigo {
  id: string;
  slug: string;
  idioma: 'pt' | 'en';
  estado: 'rascunho' | 'publicado' | 'arquivado';
  revisao: number;
  titulo: string;
  entrada: string | null;
  seccao: SeccaoJornal;
  analise: unknown;
  nota_editorial: string | null;
  fonte_nome: string | null;
  fonte_url: string | null;
  publicado_em: string | null;
  updated_at: string;
  gostos: number;
  partilhas: number;
}

const ROTULO = 'text-sm font-medium';
const NOTA = 'font-normal text-[color:var(--muted)]';
const CAIXA = 'grid gap-5 border border-[color:var(--border)] bg-[color:var(--surface)] p-5';

export default async function ArtigoAdminPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erro?: string; ok?: string }>;
}) {
  if (serverEnv().NEWS_BLOG !== 'on') notFound();
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const sessao = await requireStaff();
  const escreve = podeEscrever(sessao.papel);
  const { erro, ok } = await searchParams;

  const supabase = await createSessionClient();
  const { data } = await supabase
    .from('news_artigos')
    .select(
      'id, slug, idioma, estado, revisao, titulo, entrada, seccao, analise, nota_editorial, fonte_nome, fonte_url, publicado_em, updated_at, gostos, partilhas',
    )
    .eq('id', id)
    .maybeSingle();
  const a = data as Artigo | null;
  if (!a) notFound();
  const analise = validarAnalise(a.analise) ? a.analise : null;
  const caminhoPublico = `${a.idioma === 'en' ? '/en' : ''}/news/${a.slug}`;
  const slugFixo = a.publicado_em !== null;

  return (
    <>
      <AdminHeading
        titulo={a.titulo}
        descricao={ESTADO_ARTIGO[a.estado].nota}
        accao={
          <div className="flex flex-wrap items-center gap-3">
            <StateBadge rotulo={ESTADO_ARTIGO[a.estado]} />
            {a.estado === 'publicado' && (
              <Link href={caminhoPublico} className={buttonVariants({ size: 'sm', variant: 'outline' })}>
                Ver no jornal
              </Link>
            )}
            <Link href="/admin/news" className="text-sm underline underline-offset-4">
              Voltar à redacção
            </Link>
          </div>
        }
      />

      {erro && (
        <p
          role="alert"
          className="mb-6 border border-[color:var(--color-signal-600)] px-4 py-3 text-sm text-[color:var(--color-signal-700)]"
        >
          {erro}
        </p>
      )}
      {ok && OK[ok] && (
        <p role="status" className="mb-6 border border-[color:var(--border)] px-4 py-3 text-sm">
          {OK[ok]}
        </p>
      )}

      <p className="mb-8 text-sm text-[color:var(--muted)]">
        Edição {a.idioma.toUpperCase()} · {a.gostos.toLocaleString('pt-PT')} gostos ·{' '}
        {a.partilhas.toLocaleString('pt-PT')} partilhas · actualizado{' '}
        <DataHora valor={a.updated_at} />
        {a.publicado_em && (
          <>
            {' '}
            · publicado <DataHora valor={a.publicado_em} />
          </>
        )}
      </p>

      <div className="grid gap-10 xl:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
        {escreve ? (
          <div className="grid content-start gap-8">
            <form action={guardarArtigo} className={CAIXA}>
              <h2 className="text-[length:var(--text-h3)] tracking-[-0.02em]">Editar</h2>
              <input type="hidden" name="id" value={a.id} />
              <input type="hidden" name="revisao" value={a.revisao} />
              <div className="grid gap-2">
                <label htmlFor="artigo-titulo" className={ROTULO}>
                  Título
                </label>
                <textarea
                  id="artigo-titulo"
                  name="titulo"
                  required
                  minLength={3}
                  maxLength={200}
                  rows={2}
                  defaultValue={a.titulo}
                  className={inputClass}
                />
              </div>
              <div className="grid gap-2">
                <label htmlFor="artigo-entrada" className={ROTULO}>
                  Entrada <span className={NOTA}>(a frase por baixo do título)</span>
                </label>
                <textarea
                  id="artigo-entrada"
                  name="entrada"
                  maxLength={400}
                  rows={3}
                  defaultValue={a.entrada ?? ''}
                  className={inputClass}
                />
              </div>
              <div className="grid gap-2">
                <label htmlFor="artigo-seccao" className={ROTULO}>
                  Secção
                </label>
                <select id="artigo-seccao" name="seccao" defaultValue={a.seccao} className={inputClass}>
                  {SECCOES_JORNAL.map((s) => (
                    <option key={s} value={s}>
                      {NOME_DA_SECCAO[s].pt}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-2">
                <label htmlFor="artigo-slug" className={ROTULO}>
                  Endereço
                </label>
                <input
                  id="artigo-slug"
                  name="slug"
                  required
                  pattern="[a-z0-9]+(-[a-z0-9]+)*"
                  minLength={3}
                  maxLength={90}
                  defaultValue={a.slug}
                  readOnly={slugFixo}
                  aria-describedby="artigo-slug-nota"
                  className={inputClass}
                />
                <p id="artigo-slug-nota" className="text-xs text-[color:var(--muted)]">
                  {slugFixo
                    ? 'Já foi publicado: o endereço não muda, para os links partilhados continuarem a abrir.'
                    : `agoramoz.com${a.idioma === 'en' ? '/en' : ''}/news/… — só minúsculas, números e hífenes.`}
                </p>
              </div>
              <div className="grid gap-2">
                <label htmlFor="artigo-fonte" className={ROTULO}>
                  Fonte <span className={NOTA}>(opcional)</span>
                </label>
                <input
                  id="artigo-fonte"
                  name="fonteNome"
                  maxLength={120}
                  defaultValue={a.fonte_nome ?? ''}
                  className={inputClass}
                />
              </div>
              <div className="grid gap-2">
                <label htmlFor="artigo-fonte-url" className={ROTULO}>
                  Endereço da fonte <span className={NOTA}>(https, opcional)</span>
                </label>
                <input
                  id="artigo-fonte-url"
                  name="fonteUrl"
                  type="url"
                  maxLength={2048}
                  defaultValue={a.fonte_url ?? ''}
                  className={inputClass}
                />
              </div>
              <div className="grid gap-2">
                <label htmlFor="artigo-nota" className={ROTULO}>
                  Nota da redacção <span className={NOTA}>(aparece no fim do artigo)</span>
                </label>
                <textarea
                  id="artigo-nota"
                  name="nota"
                  maxLength={2000}
                  rows={4}
                  defaultValue={a.nota_editorial ?? ''}
                  className={inputClass}
                />
              </div>
              <div>
                <BotaoEnviar size="sm" variant="outline" aEnviar="A guardar…">
                  Guardar alterações
                </BotaoEnviar>
              </div>
            </form>

            {a.estado !== 'publicado' ? (
              <form action={publicarArtigo} className={CAIXA}>
                <h2 className="text-[length:var(--text-h3)] tracking-[-0.02em]">Publicar</h2>
                <input type="hidden" name="id" value={a.id} />
                <input type="hidden" name="revisao" value={a.revisao} />
                <input type="hidden" name="slug" value={a.slug} />
                <p className="text-sm text-[color:var(--muted)]">
                  Guarde primeiro as alterações. Publicar põe o artigo no jornal com o nome AGORAMOZ.
                </p>
                <label className="flex items-start gap-3 text-sm">
                  <input type="checkbox" name="revi" value="sim" required className="mt-1 size-4" />
                  Revi o título, a entrada e o conteúdo, e confirmo que podem sair com o nome AGORAMOZ.
                </label>
                <div>
                  <BotaoEnviar size="sm" aEnviar="A publicar…">
                    {a.estado === 'arquivado' ? 'Voltar a publicar' : 'Publicar no jornal'}
                  </BotaoEnviar>
                </div>
              </form>
            ) : (
              <form action={arquivarArtigo} className={CAIXA}>
                <h2 className="text-[length:var(--text-h3)] tracking-[-0.02em]">Tirar do jornal</h2>
                <input type="hidden" name="id" value={a.id} />
                <input type="hidden" name="revisao" value={a.revisao} />
                <input type="hidden" name="slug" value={a.slug} />
                <p className="text-sm text-[color:var(--muted)]">
                  Arquivar retira o artigo do jornal e o endereço deixa de abrir. Pode voltar a
                  publicar depois.
                </p>
                <div>
                  <BotaoEnviar size="sm" variant="outline" aEnviar="A arquivar…">
                    Arquivar
                  </BotaoEnviar>
                </div>
              </form>
            )}
          </div>
        ) : null}

        <section aria-labelledby="artigo-previa" className={`min-w-0 ${fonteJornal.variable}`}>
          <h2 id="artigo-previa" className="mb-4 text-sm font-medium text-[color:var(--muted)]">
            Pré-visualização — como sai no jornal
          </h2>
          <div className="border border-[color:var(--border)] bg-[color:var(--surface)] p-6 sm:p-10">
            <p className="font-techno text-[length:var(--text-micro)] font-semibold tracking-[0.18em] text-[color:var(--color-signal-700)] uppercase">
              {NOME_DA_SECCAO[a.seccao][a.idioma]}
            </p>
            <p className="jornal-serifa mt-3 text-[clamp(1.75rem,1.2rem+2vw,2.75rem)] leading-[1.08] font-semibold tracking-[-0.01em] text-balance">
              {a.titulo}
            </p>
            {a.entrada && (
              <p className="jornal-serifa mt-4 text-[1.25rem] leading-snug text-[color:var(--muted)]">
                {a.entrada}
              </p>
            )}
            {analise ? (
              <ArtigoCorpo analise={analise} idioma={a.idioma} />
            ) : (
              <p role="alert" className="mt-8 text-sm text-[color:var(--color-signal-700)]">
                A análise guardada não tem o formato esperado: este artigo não aparece no jornal.
              </p>
            )}
            {a.nota_editorial && (
              <p className="mt-10 border-t border-[color:var(--border)] pt-4 text-sm italic">
                {a.nota_editorial}
              </p>
            )}
          </div>
        </section>
      </div>
    </>
  );
}
