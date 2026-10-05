import Link from 'next/link';
import { notFound } from 'next/navigation';
import { FormularioAnuncio } from '@/components/admin/news/FormularioAnuncio';
import { AdminHeading, StateBadge } from '@/components/admin/primitives';
import { BarrasHorizontais, Bloco } from '@/components/admin/painel/Blocos';
import { Outdoor } from '@/components/news/Outdoor';
import { Button } from '@/components/ui/Button';
import { definirAnuncioActivo, guardarAnuncio } from '@/lib/admin/news-actions';
import { conversoesPorCampanha } from '@/lib/admin/news-metricas';
import { createSessionClient } from '@/lib/auth/client';
import { podeEscrever, requireStaff } from '@/lib/auth/session';
import { serverEnv } from '@/lib/config/env';
import {
  comUtm,
  NOME_DA_POSICAO,
  POSICOES_ANUNCIO,
  taxa,
  type PosicaoAnuncio,
  type TemaAnuncio,
} from '@/lib/news/anuncios';

export const metadata = { title: 'Anúncio — News' };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const OK: Record<string, string> = {
  criado: 'Anúncio criado — está desligado. Reveja a pré-visualização e ligue-o quando quiser.',
  guardado: 'Alterações guardadas.',
  ligado: 'Ligado: entra no outdoor do jornal (dentro das datas).',
  desligado: 'Desligado: saiu do outdoor.',
};

interface Anuncio {
  id: string;
  revisao: number;
  slug: string;
  titulo: string;
  mensagem: string | null;
  ticker: string | null;
  cta: string;
  destino: string;
  tema: TemaAnuncio;
  activo: boolean;
  inicio: string | null;
  fim: string | null;
  peso: number;
  impressoes: number;
  alcance_unico: number;
  cliques: number;
  cliques_unicos: number;
}

const n = (v: number) => v.toLocaleString('pt-PT');

export default async function AnuncioPage({
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
  const [{ data }, posicoes] = await Promise.all([
    supabase
      .from('news_anuncios')
      .select(
        'id, revisao, slug, titulo, mensagem, ticker, cta, destino, tema, activo, inicio, fim, peso, impressoes, alcance_unico, cliques, cliques_unicos',
      )
      .eq('id', id)
      .maybeSingle(),
    supabase.from('news_anuncio_posicoes').select('posicao, impressoes, cliques').eq('anuncio_id', id),
  ]);
  const a = data as Anuncio | null;
  if (!a) notFound();
  const impressoes = Number(a.impressoes);
  const cliques = Number(a.cliques);
  const conv = (await conversoesPorCampanha(supabase, [a.slug]))?.get(a.slug) ?? null;
  const porPosicao = new Map(
    ((posicoes.data ?? []) as { posicao: PosicaoAnuncio; impressoes: number; cliques: number }[]).map((p) => [
      p.posicao,
      { impressoes: Number(p.impressoes), cliques: Number(p.cliques) },
    ]),
  );
  const ctr = taxa(cliques, impressoes);
  const kpis: [string, string, string?][] = [
    ['Impressões', n(impressoes), '≥ 50 % visível durante ≥ 1 s'],
    ['Alcance único', n(Number(a.alcance_unico)), 'browsers diferentes'],
    ['Cliques', n(cliques)],
    ['Pessoas que clicaram', n(Number(a.cliques_unicos)), 'browsers diferentes'],
    ['CTR', ctr === null ? '—' : `${ctr.toLocaleString('pt-PT')} %`],
    ['Respostas geradas', conv ? n(conv.respostas) : '—', 'diagnósticos e inquéritos com esta campanha'],
    ['Oportunidades', conv ? n(conv.oportunidades) : '—', 'no CRM, com esta campanha'],
  ];

  return (
    <>
      <AdminHeading
        titulo={a.titulo}
        descricao={`Campanha «${a.slug}» → ${a.destino}`}
        accao={
          <div className="flex flex-wrap items-center gap-3">
            <StateBadge rotulo={a.activo ? { texto: 'Ligado', tom: 'bom' } : { texto: 'Desligado', tom: 'neutro' }} />
            {escreve && (
              <form action={definirAnuncioActivo}>
                <input type="hidden" name="id" value={a.id} />
                <input type="hidden" name="activo" value={a.activo ? 'nao' : 'sim'} />
                <Button type="submit" size="sm" variant={a.activo ? 'outline' : 'signal'}>
                  {a.activo ? 'Desligar' : 'Ligar no jornal'}
                </Button>
              </form>
            )}
            <Link href="/admin/news/publicidade" className="text-sm underline underline-offset-4">
              Todos os anúncios
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

      <section aria-labelledby="anuncio-previa" className="mb-10">
        <h2 id="anuncio-previa" className="mb-3 text-sm font-medium text-[color:var(--muted)]">
          Pré-visualização (não conta impressões nem cliques)
        </h2>
        <Outdoor
          previa
          posicao="topo"
          anuncios={[
            {
              id: a.id,
              slug: a.slug,
              titulo: a.titulo,
              mensagem: a.mensagem,
              ticker: a.ticker,
              cta: a.cta,
              tema: a.tema,
              peso: a.peso,
            },
          ]}
        />
        <p className="mt-2 text-xs break-all text-[color:var(--muted)]">
          O clique leva a: <code>{comUtm(a.destino, a.slug, 'topo')}</code>
        </p>
      </section>

      <dl className="mb-10 grid gap-px border border-[color:var(--border)] bg-[color:var(--border)] sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map(([rotulo, valor, nota]) => (
          <div key={rotulo} className="bg-[color:var(--surface)] p-5">
            <dt className="text-sm text-[color:var(--muted)]">{rotulo}</dt>
            <dd className="mt-1 font-techno text-[length:var(--text-h3)] font-semibold tabular-nums">{valor}</dd>
            {nota && <dd className="mt-1 text-xs text-[color:var(--muted)]">{nota}</dd>}
          </div>
        ))}
      </dl>

      <div className="mb-12 grid gap-6 lg:grid-cols-2">
        <Bloco id="anuncio-lugares-imp" titulo="Impressões por lugar" subtitulo="Onde o anúncio foi visto.">
          <BarrasHorizontais
            legenda="Impressões por lugar"
            linhas={POSICOES_ANUNCIO.map((p) => ({
              chave: p,
              rotulo: NOME_DA_POSICAO[p],
              valor: porPosicao.get(p)?.impressoes ?? 0,
            }))}
          />
        </Bloco>
        <Bloco id="anuncio-lugares-cli" titulo="Cliques por lugar" subtitulo="Que lugar converte.">
          <BarrasHorizontais
            legenda="Cliques por lugar"
            linhas={POSICOES_ANUNCIO.map((p) => {
              const x = porPosicao.get(p);
              const t = x ? taxa(x.cliques, x.impressoes) : null;
              return {
                chave: p,
                rotulo: NOME_DA_POSICAO[p],
                valor: x?.cliques ?? 0,
                nota: t === null ? undefined : `${t.toLocaleString('pt-PT')} % CTR`,
              };
            })}
          />
        </Bloco>
      </div>

      {escreve && (
        <section aria-labelledby="anuncio-editar" className="max-w-3xl">
          <h2 id="anuncio-editar" className="mb-4 text-[length:var(--text-h3)] tracking-[-0.02em]">
            Editar
          </h2>
          <FormularioAnuncio
            valores={{ ...a, revisao: a.revisao }}
            accao={guardarAnuncio}
            textoBotao="Guardar alterações"
          />
        </section>
      )}
    </>
  );
}
