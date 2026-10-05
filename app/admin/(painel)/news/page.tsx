import Link from 'next/link';
import { notFound } from 'next/navigation';
import { RedaccaoNews } from '@/components/admin/news/RedaccaoNews';
import {
  AdminHeading,
  DataHora,
  DataTable,
  EmptyState,
  StateBadge,
} from '@/components/admin/primitives';
import { buttonVariants } from '@/components/ui/Button';
import { ESTADO_ARTIGO } from '@/lib/admin/labels';
import { criarArtigoDeAnalise } from '@/lib/admin/news-actions';
import { createSessionClient } from '@/lib/auth/client';
import { podeEscrever, requireStaff } from '@/lib/auth/session';
import { serverEnv } from '@/lib/config/env';
import { NOME_DA_SECCAO, type SeccaoJornal } from '@/lib/news/artigo';

export const metadata = { title: 'News — redacção' };

/** O motor responde em até 60 s; a página tem de durar mais do que isso. */
export const maxDuration = 70;

interface Linha {
  id: string;
  slug: string;
  idioma: 'pt' | 'en';
  titulo: string;
  estado: 'rascunho' | 'publicado' | 'arquivado';
  seccao: SeccaoJornal;
  gostos: number;
  partilhas: number;
  publicado_em: string | null;
  updated_at: string;
}

const ALERTA =
  'mb-6 border border-[color:var(--color-signal-600)] px-4 py-3 text-sm text-[color:var(--color-signal-700)]';

export default async function NewsAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const env = serverEnv();
  if (env.NEWS_BLOG !== 'on') notFound();
  const sessao = await requireStaff();
  const escreve = podeEscrever(sessao.papel);
  const { erro } = await searchParams;

  const supabase = await createSessionClient();
  const { data, error } = await supabase
    .from('news_artigos')
    .select('id, slug, idioma, titulo, estado, seccao, gostos, partilhas, publicado_em, updated_at')
    .order('updated_at', { ascending: false })
    .limit(100);
  const linhas = (data ?? []) as Linha[];
  const publicados = linhas.filter((l) => l.estado === 'publicado');
  const resumo: [string, number][] = [
    ['Publicados', publicados.length],
    ['Gostos nos publicados', publicados.reduce((s, l) => s + l.gostos, 0)],
    ['Partilhas nos publicados', publicados.reduce((s, l) => s + l.partilhas, 0)],
  ];

  return (
    <>
      <AdminHeading
        titulo="News — redacção"
        descricao="Analise uma notícia, transforme o relatório em rascunho e publique no jornal depois de rever. Gostos e partilhas são contados no servidor."
        accao={
          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin/news/publicidade"
              className={buttonVariants({ size: 'sm', variant: 'outline' })}
            >
              Publicidade
            </Link>
            <Link href="/news" className={buttonVariants({ size: 'sm', variant: 'outline' })}>
              Ver o jornal
            </Link>
          </div>
        }
      />

      {erro && (
        <p role="alert" className={ALERTA}>
          {erro}
        </p>
      )}

      <dl className="mb-10 grid gap-px border border-[color:var(--border)] bg-[color:var(--border)] sm:grid-cols-3">
        {resumo.map(([rotulo, valor]) => (
          <div key={rotulo} className="bg-[color:var(--surface)] p-5">
            <dt className="text-sm text-[color:var(--muted)]">{rotulo}</dt>
            <dd className="mt-1 font-techno text-[length:var(--text-h3)] font-semibold tabular-nums">
              {error ? '—' : valor.toLocaleString('pt-PT')}
            </dd>
          </div>
        ))}
      </dl>

      {escreve && env.NEWS_ENGINE !== 'off' ? (
        <section aria-label="Analisar uma notícia" className="mb-12">
          <RedaccaoNews criar={criarArtigoDeAnalise} />
        </section>
      ) : escreve ? (
        <p className="mb-10 border border-[color:var(--border)] px-4 py-3 text-sm">
          O motor de análise está desligado (<code>NEWS_ENGINE=off</code>): ligue-o na Vercel para
          analisar notícias aqui.
        </p>
      ) : null}

      <h2 className="mb-4 text-[length:var(--text-h3)] tracking-[-0.02em]">Artigos</h2>
      {error ? (
        <p role="alert" className={ALERTA}>
          Não foi possível ler os artigos agora. Confirme que a migração 0015 está aplicada (linha 26
          do verificar-estado).
        </p>
      ) : (
        <DataTable
          legenda="Artigos do jornal"
          linhas={linhas}
          chaveDe={(l) => l.id}
          colunas={[
            {
              chave: 'titulo',
              cabecalho: 'Título',
              render: (l) => (
                <Link href={`/admin/news/${l.id}`} className="font-medium underline">
                  {l.titulo}
                </Link>
              ),
            },
            {
              chave: 'estado',
              cabecalho: 'Estado',
              render: (l) => <StateBadge rotulo={ESTADO_ARTIGO[l.estado]} />,
            },
            { chave: 'seccao', cabecalho: 'Secção', render: (l) => NOME_DA_SECCAO[l.seccao].pt },
            { chave: 'idioma', cabecalho: 'Edição', render: (l) => l.idioma.toUpperCase() },
            {
              chave: 'gostos',
              cabecalho: 'Gostos',
              numerico: true,
              render: (l) => l.gostos.toLocaleString('pt-PT'),
            },
            {
              chave: 'partilhas',
              cabecalho: 'Partilhas',
              numerico: true,
              render: (l) => l.partilhas.toLocaleString('pt-PT'),
            },
            {
              chave: 'actualizado',
              cabecalho: 'Actualizado',
              render: (l) => <DataHora valor={l.updated_at} />,
            },
          ]}
          vazio={
            <EmptyState
              titulo="Ainda não há artigos."
              descricao={
                escreve
                  ? 'Analise uma notícia acima e carregue em «Criar rascunho de artigo».'
                  : undefined
              }
            />
          }
        />
      )}
    </>
  );
}
