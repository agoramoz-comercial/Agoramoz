import type { Idioma } from '@/content/types';
import { NOME_DA_SECCAO, type ArtigoCompleto, type ArtigoDaLista } from '@/lib/news/artigo';
import {
  gatilhosPorCenario,
  porEfeito,
  porEvidencia,
  porMes,
  porPais,
  porProbabilidade,
  porSeccao,
  total,
  type Contagem,
} from '@/lib/news/estatisticas';
import { ISO_DO_PAIS, PONTO_DO_PAIS } from '@/lib/news/mapa';
import { NOME_DO_PAIS } from '@/lib/news/paises';
import type { AnaliseProfunda } from '@/lib/news/profunda';
import { Barras3D } from './Barras3D';
import { Barras, Colunas, Figura, GraficoSerie, numero, RotulosColunas } from './Graficos';
import { Globo } from './Globo';
import { geografiaDoArtigo } from '@/lib/news/geografia';
import type { PainelIndicadores as PainelInd } from '@/lib/news/indicadores';
import { PainelIndicadores } from './Indicadores';
import { MapaCobertura, MapaLigacoes, MapaPais, MapaRegioes } from './Mapas';

const l = (x: { pt: string; en: string }, i: Idioma) => (i === 'en' ? x.en : x.pt);

const T = {
  edicao: { pt: 'A edição em números', en: 'This edition in numbers' },
  edicaoLead: {
    pt: 'Onde as notícias da redacção tocam, contado nas notícias publicadas. Arraste o globo para o rodar.',
    en: 'Where our desk’s stories land, counted from published stories. Drag the globe to turn it.',
  },
  globo: { pt: 'Globo 3D: países cobertos e número de notícias', en: '3D globe: countries covered and number of stories' },
  paises: { pt: 'Notícias por país', en: 'Stories by country' },
  seccoes: { pt: 'Notícias por secção', en: 'Stories by section' },
  meses: { pt: 'Notícias por mês', en: 'Stories by month' },
  fonteBase: (n: number) => ({
    pt: `Base de dados do AGORAMOZ News: as ${n} notícias publicadas mais recentes desta edição.`,
    en: `AGORAMOZ News database: the ${n} most recent published stories in this edition.`,
  }),
  emNumeros: { pt: 'A notícia em números', en: 'The story in numbers' },
  emNumerosLead: {
    pt: 'Os números vêm só do documento da notícia; o que não estava lá não entra no gráfico.',
    en: 'Numbers come only from the story’s document; anything not in it stays out of the chart.',
  },
  onde: { pt: 'Onde', en: 'Where' },
  ondeFonte: { pt: 'Natural Earth (domínio público); país escolhido pela redacção.', en: 'Natural Earth (public domain); country chosen by our desk.' },
  barras3d: { pt: 'Infografia 3D', en: '3D infographic' },
  painel: { pt: 'A análise, contada', en: 'The analysis, counted' },
  painelFonte: {
    pt: 'Análise profunda ZABATAINA 3000 desta notícia (contagem dos itens publicados).',
    en: 'ZABATAINA 3000 deep analysis of this story (count of published items).',
  },
  evidencia: { pt: 'Afirmações por nível de evidência', en: 'Claims by evidence level' },
  probabilidade: { pt: 'Riscos por probabilidade', en: 'Risks by likelihood' },
  efeito: { pt: 'Sectores por efeito', en: 'Sectors by effect' },
  gatilhos: { pt: 'Gatilhos por cenário', en: 'Triggers per scenario' },
  itens: { pt: 'itens', en: 'items' },
};

const NOMES = {
  alta: { pt: 'Alta', en: 'High' },
  media: { pt: 'Média', en: 'Medium' },
  baixa: { pt: 'Baixa', en: 'Low' },
  positivo: { pt: 'Positivo', en: 'Positive' },
  negativo: { pt: 'Negativo', en: 'Negative' },
  misto: { pt: 'Misto', en: 'Mixed' },
  incerto: { pt: 'Incerto', en: 'Uncertain' },
  base: { pt: 'Base', en: 'Base case' },
  optimista: { pt: 'Optimista', en: 'Optimistic' },
  pessimista: { pt: 'Pessimista', en: 'Pessimistic' },
} as const;

function mesPorExtenso(chave: string, idioma: Idioma) {
  const [a, m] = chave.split('-').map(Number);
  return new Intl.DateTimeFormat(idioma === 'en' ? 'en-GB' : 'pt-PT', { month: 'short', year: '2-digit', timeZone: 'UTC' }).format(
    new Date(Date.UTC(a!, m! - 1, 15)),
  );
}

const Titulo = ({ id, children }: { id: string; children: React.ReactNode }) => (
  <h2 id={id} className="jornal-filetes py-2 font-sans text-[0.75rem] font-bold tracking-[0.24em] uppercase">
    {children}
  </h2>
);

/**
 * Na primeira página: o globo 3D com a cobertura por país e os gráficos de
 * secção e mês, tudo contado sobre as notícias publicadas. Sem notícias, a
 * secção não aparece.
 */
export function EdicaoEmNumeros({ lista, idioma }: { lista: readonly ArtigoDaLista[]; idioma: Idioma }) {
  if (lista.length === 0) return null;
  const paises = porPais(lista);
  const seccoes = porSeccao(lista);
  const meses = porMes(lista);
  const fonte = l(T.fonteBase(lista.length), idioma);
  const pontosPais = paises.map((c) => ({ rotulo: l(NOME_DO_PAIS[c.chave], idioma), valor: c.n }));
  return (
    <section aria-labelledby="jornal-numeros" className="mt-16">
      <Titulo id="jornal-numeros">{l(T.edicao, idioma)}</Titulo>
      {paises.length > 0 && (
        <div className="jornal-preto mt-4 grid gap-8 p-5 sm:p-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:items-center">
          <Globo
            rotulo={`${l(T.globo, idioma)}. ${pontosPais.map((p) => `${p.rotulo}: ${p.valor}`).join('; ')}`}
            pontos={paises.map((c) => ({
              codigo: c.chave,
              iso: ISO_DO_PAIS[c.chave],
              lon: PONTO_DO_PAIS[c.chave][0],
              lat: PONTO_DO_PAIS[c.chave][1],
              n: c.n,
            }))}
            alternativa={<MapaCobertura contagens={paises} idioma={idioma} escuro />}
          />
          <div>
            <p className="jornal-mancha text-[clamp(2rem,1.4rem+2.4vw,3.25rem)]">{l(T.paises, idioma)}</p>
            <p className="jornal-serifa mt-3 text-[1.0625rem] leading-relaxed text-[color:var(--muted)]">
              {l(T.edicaoLead, idioma)}
            </p>
            <ol className="mt-6 divide-y divide-current/20 border-y border-current/40">
              {paises.map((c, i) => (
                <li key={c.chave} className="flex items-center gap-3 py-2.5">
                  <span className="w-7 font-sans text-[0.75rem] tabular-nums opacity-70">{String(i + 1).padStart(2, '0')}</span>
                  <span className="border border-current px-1 font-sans text-[0.6875rem] font-bold">{c.chave.toUpperCase()}</span>
                  <span className="jornal-serifa min-w-0 flex-1 text-[1.0625rem]">{l(NOME_DO_PAIS[c.chave], idioma)}</span>
                  <span
                    aria-hidden="true"
                    className="hidden h-1.5 bg-[#e9a35c] sm:block"
                    style={{ width: `${(c.n / paises[0]!.n) * 6}rem` }}
                  />
                  <span className="w-8 text-right font-sans font-bold tabular-nums">{c.n}</span>
                </li>
              ))}
            </ol>
            <p className="mt-3 font-sans text-[0.75rem] text-[color:var(--muted)]">{fonte}</p>
          </div>
        </div>
      )}
      <div className="mt-8 grid gap-10 md:grid-cols-2">
        {seccoes.length > 0 && (
          <Figura
            titulo={l(T.seccoes, idioma)}
            fonte={fonte}
            idioma={idioma}
            pontos={seccoes.map((c) => ({ rotulo: l(NOME_DA_SECCAO[c.chave], idioma), valor: c.n }))}
          >
            <Barras pontos={seccoes.map((c) => ({ rotulo: l(NOME_DA_SECCAO[c.chave], idioma), valor: c.n }))} idioma={idioma} />
          </Figura>
        )}
        {meses.length >= 2 && (
          <Figura
            titulo={l(T.meses, idioma)}
            fonte={fonte}
            idioma={idioma}
            pontos={meses.map((c) => ({ rotulo: mesPorExtenso(c.chave, idioma), valor: c.n }))}
          >
            <Colunas pontos={meses.slice(-8).map((c) => ({ rotulo: mesPorExtenso(c.chave, idioma), valor: c.n }))} idioma={idioma} />
            <RotulosColunas pontos={meses.slice(-8).map((c) => ({ rotulo: mesPorExtenso(c.chave, idioma), valor: c.n }))} />
          </Figura>
        )}
      </div>
    </section>
  );
}

function Contagens<K extends keyof typeof NOMES | string>({
  titulo,
  c,
  idioma,
  fonte,
  nome,
}: {
  titulo: string;
  c: readonly Contagem<K>[];
  idioma: Idioma;
  fonte: string;
  nome: (k: K) => string;
}) {
  if (total(c) === 0) return null;
  const pontos = c.map((x) => ({ rotulo: nome(x.chave), valor: x.n }));
  return (
    <Figura titulo={titulo} subtitulo={`${total(c)} ${l(T.itens, idioma)}`} fonte={fonte} idioma={idioma} pontos={pontos}>
      <Barras pontos={pontos} idioma={idioma} />
    </Figura>
  );
}

/** O painel de contagens da análise profunda: evidência, riscos, sectores e cenários. */
export function PainelAnalise({ analise: a, idioma }: { analise: AnaliseProfunda; idioma: Idioma }) {
  const fonte = l(T.painelFonte, idioma);
  const nome = (k: string) => (k in NOMES ? l(NOMES[k as keyof typeof NOMES], idioma) : k);
  return (
    <div className="grid gap-10 md:grid-cols-2">
      <Contagens titulo={l(T.evidencia, idioma)} c={porEvidencia(a)} idioma={idioma} fonte={fonte} nome={(k) => k} />
      <Contagens titulo={l(T.gatilhos, idioma)} c={gatilhosPorCenario(a)} idioma={idioma} fonte={fonte} nome={nome} />
      <Contagens titulo={l(T.probabilidade, idioma)} c={porProbabilidade(a)} idioma={idioma} fonte={fonte} nome={nome} />
      <Contagens titulo={l(T.efeito, idioma)} c={porEfeito(a)} idioma={idioma} fonte={fonte} nome={nome} />
    </div>
  );
}

/**
 * No artigo: o mapa do país, os gráficos das séries do documento (com a
 * principal em 3D) e o painel de contagens da análise. Cada bloco só aparece
 * se houver dados para ele.
 */
export function ArtigoEmNumeros({
  artigo: a,
  idioma,
  indicadores = null,
}: {
  artigo: ArtigoCompleto;
  idioma: Idioma;
  indicadores?: PainelInd | null;
}) {
  const series = a.profunda?.dados ?? [];
  const principal = series.find((s) => s.pontos.every((p) => p.valor >= 0));
  if (!a.pais && series.length === 0 && !a.profunda) return null;
  const unidade = (u: string) => (u === '%' ? '%' : u ? ` ${u}` : '');
  const geo = a.pais ? geografiaDoArtigo(a) : { regioes: [], parceiros: [] };
  const nomePais = a.pais ? l(NOME_DO_PAIS[a.pais], idioma) : '';
  const en = idioma === 'en';
  return (
    <section aria-labelledby="artigo-numeros" className="mt-14">
      <Titulo id="artigo-numeros">{l(T.emNumeros, idioma)}</Titulo>
      {series.length > 0 && (
        <p className="jornal-serifa mt-3 max-w-[60ch] text-[1.0625rem] italic">{l(T.emNumerosLead, idioma)}</p>
      )}
      <div className="mt-6 grid gap-10 lg:grid-cols-12">
        {a.pais && geo.regioes.length > 0 && (
          <Figura
            titulo={
              en
                ? `Where the impact is concentrated: ${geo.regioes.length} ${geo.regioes.length === 1 ? 'region' : 'regions'} of ${nomePais} cited`
                : `Onde o impacto se concentra: ${geo.regioes.length} ${geo.regioes.length === 1 ? 'região' : 'regiões'} de ${nomePais} citadas`
            }
            fonte={
              en
                ? 'Regions named in the story’s document or published analysis; boundaries and points: Natural Earth (public domain).'
                : 'Regiões nomeadas no documento ou na análise publicada; limites e pontos: Natural Earth (domínio público).'
            }
            idioma={idioma}
            className="lg:col-span-12"
          >
            <MapaRegioes pais={a.pais} regioes={geo.regioes} idioma={idioma} />
          </Figura>
        )}
        {a.pais && geo.parceiros.length > 0 && (
          <Figura
            titulo={
              en
                ? `Who this story links ${nomePais} to: ${geo.parceiros.length} ${geo.parceiros.length === 1 ? 'country' : 'countries'} cited`
                : `Com quem esta notícia liga ${nomePais}: ${geo.parceiros.length} ${geo.parceiros.length === 1 ? 'país citado' : 'países citados'}`
            }
            fonte={
              en
                ? 'Countries named in the story’s document or published analysis. An arc shows a cited link, not a measured flow. Natural Earth (public domain).'
                : 'Países nomeados no documento ou na análise publicada. O arco mostra uma ligação citada, não um fluxo medido. Natural Earth (domínio público).'
            }
            idioma={idioma}
            className="lg:col-span-12"
          >
            <MapaLigacoes pais={a.pais} parceiros={geo.parceiros} idioma={idioma} />
          </Figura>
        )}
        {a.pais && geo.regioes.length === 0 && geo.parceiros.length === 0 && (
          <Figura
            titulo={en ? `${nomePais}: the country this story affects` : `${nomePais}: o país que esta notícia afecta`}
            fonte={l(T.ondeFonte, idioma)}
            idioma={idioma}
            className={indicadores ? 'lg:col-span-5' : 'lg:col-span-12'}
          >
            <MapaPais pais={a.pais} idioma={idioma} />
            <p className="mt-2 font-sans text-[0.8125rem] text-[color:var(--muted)]">
              {en
                ? 'The document names no region or other country, so the map shows the country only; the official indicators frame the story.'
                : 'O documento não nomeia regiões nem outros países: o mapa mostra só o país, e os indicadores oficiais enquadram a notícia.'}
            </p>
          </Figura>
        )}
        {a.pais && indicadores && (
          <div className={geo.regioes.length === 0 && geo.parceiros.length === 0 ? 'lg:col-span-7' : 'lg:col-span-12'}>
            <PainelIndicadores painel={indicadores} seccao={a.seccao} idioma={idioma} />
          </div>
        )}
        {principal && (
          <Figura
            titulo={`${l(T.barras3d, idioma)} · ${principal.titulo}`}
            fonte={principal.fonte}
            idioma={idioma}
            className="lg:col-span-12"
          >
            <Barras3D
              rotulo={`${principal.titulo}: ${principal.pontos.map((p) => `${p.rotulo} ${numero(p.valor, idioma)}${unidade(principal.unidade)}`).join('; ')}`}
              barras={principal.pontos.map((p) => ({
                rotulo: p.rotulo,
                valor: p.valor,
                texto: `${numero(p.valor, idioma)}${unidade(principal.unidade)}`,
              }))}
              alternativa={<Barras pontos={principal.pontos} unidade={principal.unidade} idioma={idioma} />}
            />
          </Figura>
        )}
      </div>
      {series.length > 0 && (
        <div className="mt-10 grid gap-10 md:grid-cols-2">
          {series.map((s) => (
            <GraficoSerie key={s.titulo} serie={s} idioma={idioma} />
          ))}
        </div>
      )}
      {a.profunda && (
        <div className="mt-12">
          <h3 className="jornal-serifa text-[1.5rem] font-bold">{l(T.painel, idioma)}</h3>
          <div className="mt-4">
            <PainelAnalise analise={a.profunda} idioma={idioma} />
          </div>
        </div>
      )}
    </section>
  );
}
