import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ANUNCIO_VAZIO, FormularioAnuncio } from '@/components/admin/news/FormularioAnuncio';
import { AdminHeading, DataTable, EmptyState, StateBadge } from '@/components/admin/primitives';
import { guardarAnuncio } from '@/lib/admin/news-actions';
import { conversoesPorCampanha } from '@/lib/admin/news-metricas';
import { createSessionClient } from '@/lib/auth/client';
import { podeEscrever, requireStaff } from '@/lib/auth/session';
import { serverEnv } from '@/lib/config/env';
import { taxa } from '@/lib/news/anuncios';

export const metadata = { title: 'Publicidade — News' };

interface Linha {
  id: string;
  slug: string;
  titulo: string;
  destino: string;
  activo: boolean;
  inicio: string | null;
  fim: string | null;
  impressoes: number;
  alcance_unico: number;
  cliques: number;
  cliques_unicos: number;
}

const n = (v: number | null | undefined) => (v === null || v === undefined ? '—' : v.toLocaleString('pt-PT'));

function noAr(l: Linha, agora: number): boolean {
  return (
    l.activo &&
    (!l.inicio || new Date(l.inicio).getTime() <= agora) &&
    (!l.fim || new Date(l.fim).getTime() > agora)
  );
}

async function agora(): Promise<number> {
  return Date.now();
}

export default async function PublicidadePage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  if (serverEnv().NEWS_BLOG !== 'on') notFound();
  const sessao = await requireStaff();
  const escreve = podeEscrever(sessao.papel);
  const { erro } = await searchParams;

  const supabase = await createSessionClient();
  const { data, error } = await supabase
    .from('news_anuncios')
    .select('id, slug, titulo, destino, activo, inicio, fim, impressoes, alcance_unico, cliques, cliques_unicos')
    .order('created_at', { ascending: false })
    .limit(100);
  const linhas = ((data ?? []) as Linha[]).map((l) => ({
    ...l,
    impressoes: Number(l.impressoes),
    alcance_unico: Number(l.alcance_unico),
    cliques: Number(l.cliques),
    cliques_unicos: Number(l.cliques_unicos),
  }));
  const conversoes = await conversoesPorCampanha(supabase, linhas.map((l) => l.slug));
  const momento = await agora();

  return (
    <>
      <AdminHeading
        titulo="Publicidade — o outdoor do News"
        descricao="Os anúncios que correm no jornal. Cada impressão e cada clique contam no servidor; as conversões vêm da campanha do anúncio (estimativa)."
        accao={
          <Link href="/admin/news" className="text-sm underline underline-offset-4">
            Voltar à redacção
          </Link>
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

      {error ? (
        <p
          role="alert"
          className="mb-6 border border-[color:var(--color-signal-600)] px-4 py-3 text-sm text-[color:var(--color-signal-700)]"
        >
          Não foi possível ler os anúncios agora. Confirme que a migração 0015 está aplicada.
        </p>
      ) : (
        <DataTable
          legenda="Anúncios e resultados"
          linhas={linhas}
          chaveDe={(l) => l.id}
          colunas={[
            {
              chave: 'titulo',
              cabecalho: 'Anúncio',
              render: (l) => (
                <span className="grid gap-0.5">
                  <Link href={`/admin/news/publicidade/${l.id}`} className="font-medium underline">
                    {l.titulo}
                  </Link>
                  <span className="text-xs text-[color:var(--muted)]">
                    {l.slug} → {l.destino}
                  </span>
                </span>
              ),
            },
            {
              chave: 'estado',
              cabecalho: 'Estado',
              render: (l) => (
                <StateBadge
                  rotulo={
                    noAr(l, momento)
                      ? { texto: 'No ar', tom: 'bom' }
                      : l.activo
                        ? { texto: 'Fora de datas', tom: 'aviso' }
                        : { texto: 'Desligado', tom: 'neutro' }
                  }
                />
              ),
            },
            { chave: 'imp', cabecalho: 'Impressões', numerico: true, render: (l) => n(l.impressoes) },
            { chave: 'alc', cabecalho: 'Alcance único', numerico: true, render: (l) => n(l.alcance_unico) },
            { chave: 'cli', cabecalho: 'Cliques', numerico: true, render: (l) => n(l.cliques) },
            { chave: 'pes', cabecalho: 'Pessoas que clicaram', numerico: true, render: (l) => n(l.cliques_unicos) },
            {
              chave: 'ctr',
              cabecalho: 'CTR',
              numerico: true,
              render: (l) => {
                const t = taxa(l.cliques, l.impressoes);
                return t === null ? '—' : `${t.toLocaleString('pt-PT')} %`;
              },
            },
            {
              chave: 'conv',
              cabecalho: 'Respostas / oportunidades',
              numerico: true,
              render: (l) => {
                const c = conversoes?.get(l.slug);
                return c ? `${n(c.respostas)} / ${n(c.oportunidades)}` : '—';
              },
            },
          ]}
          vazio={
            <EmptyState
              titulo="Ainda não há anúncios."
              descricao={escreve ? 'Crie o primeiro abaixo; nasce desligado até o ligar.' : undefined}
            />
          }
        />
      )}

      {escreve && (
        <section aria-labelledby="anuncio-novo" className="mt-12 max-w-3xl">
          <h2 id="anuncio-novo" className="mb-4 text-[length:var(--text-h3)] tracking-[-0.02em]">
            Novo anúncio
          </h2>
          <FormularioAnuncio valores={ANUNCIO_VAZIO} accao={guardarAnuncio} textoBotao="Criar anúncio (desligado)" />
        </section>
      )}
    </>
  );
}
