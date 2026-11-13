import { CIVICO, LEI } from '@/content/civico';
import { DIPLOMAS, procurarArtigos } from './corpus';
import { REVOGACOES, VERIFICADO_EM } from './vigencia';

/**
 * As páginas da lei (D-47): o texto oficial que o Cívico já tem — Lei do
 * Trabalho, Lei das Sucessões e Lei da Família, artigo a artigo — em páginas
 * próprias, indexáveis.
 *
 * Porque é a alavanca certa de tráfego orgânico: em Moçambique, o texto das
 * leis está sobretudo em PDF digitalizado do Boletim da República, difícil de
 * ler num telemóvel e mal indexado. Uma página por artigo, com o texto inteiro,
 * a epígrafe no título e a fonte oficial ligada, responde a pesquisas como
 * «artigo 15 lei do trabalho moçambique» ou «licença de paternidade
 * moçambique» — com conteúdo real, não páginas feitas para enganar o motor.
 *
 * Integridade: o texto é o do corpus (extraído do PDF oficial com falha
 * fechada) e cada página diz de onde veio e manda confirmar no original. Não
 * se afirma que um diploma «está em vigor»: diz-se o que ele revogou (o
 * registo de `vigencia.ts`).
 */

export const SLUGS_DIPLOMA = ['trabalho', 'sucessoes', 'familia'] as const;
export type SlugDiploma = (typeof SLUGS_DIPLOMA)[number];

const MARCA = ' | AGORAMOZ';
const MAX_TITULO = 60 - MARCA.length;

export interface ArtigoLei {
  readonly n: number;
  readonly epigrafe: string;
  readonly paragrafos: readonly string[];
}

export interface DiplomaLei {
  readonly slug: SlugDiploma;
  readonly nome: string;
  readonly titulo: string;
  readonly numero: string;
  readonly fonte: { readonly titulo: string; readonly href: string };
  readonly artigos: readonly ArtigoLei[];
  /** O que este diploma revogou, se estiver no registo de vigência. */
  readonly revogou: string | null;
  /** Números de artigo que a extracção não leu com segurança (falha fechada): dito na página, nunca escondido. */
  readonly emFalta: readonly number[];
}

export function diploma(slug: string): DiplomaLei | null {
  const d = DIPLOMAS.find((x) => x.id === slug);
  if (!d || !(SLUGS_DIPLOMA as readonly string[]).includes(slug)) return null;
  const r = REVOGACOES.find((x) => x.numeroSubstituto === d.numero);
  const ns = new Set(d.artigos.map((a) => a.n));
  const emFalta = Array.from({ length: Math.max(0, ...ns) }, (_, i) => i + 1).filter((n) => !ns.has(n));
  return {
    slug: slug as SlugDiploma,
    nome: d.nome,
    titulo: d.titulo,
    numero: d.numero,
    fonte: d.fonte,
    artigos: d.artigos,
    revogou: r?.revogado ?? null,
    emFalta,
  };
}

export const diplomas = (): DiplomaLei[] => SLUGS_DIPLOMA.map((s) => diploma(s)!).filter(Boolean);

export const caminhoDiploma = (slug: SlugDiploma) => `/civico/lei/${slug}`;
export const caminhoArtigo = (slug: SlugDiploma, n: number) => `/civico/lei/${slug}/artigo-${n}`;

/** `artigo-15` → 15; tudo o resto → null. */
export function numeroDoParametro(p: string): number | null {
  const m = /^artigo-(\d{1,4})$/.exec(p);
  return m ? Number(m[1]) : null;
}

export function artigo(d: DiplomaLei, n: number): { artigo: ArtigoLei; anterior: ArtigoLei | null; seguinte: ArtigoLei | null } | null {
  const i = d.artigos.findIndex((a) => a.n === n);
  if (i < 0) return null;
  return { artigo: d.artigos[i]!, anterior: d.artigos[i - 1] ?? null, seguinte: d.artigos[i + 1] ?? null };
}

/** Corta numa fronteira de palavra, sem deixar pontuação pendurada. */
function caber(t: string, max: number): string {
  if (t.length <= max) return t;
  const corte = t.slice(0, max - 1);
  const espaco = corte.lastIndexOf(' ');
  return `${(espaco > max * 0.5 ? corte.slice(0, espaco) : corte).replace(/[\s,;:—–-]+$/, '')}…`;
}

/**
 * O título (sem a marca, que o template acrescenta): a epígrafe primeiro —
 * é o que se pesquisa — e o artigo e a lei a seguir. Cabe em 60 com a marca.
 */
export function tituloDoArtigo(d: DiplomaLei, a: ArtigoLei): string {
  const sufixo = ` — art. ${a.n}.º ${d.titulo}`;
  if (a.epigrafe.length + sufixo.length <= MAX_TITULO) return `${a.epigrafe}${sufixo}`;
  const curto = ` — art. ${a.n}.º`;
  return `${caber(a.epigrafe, MAX_TITULO - curto.length)}${curto}`;
}

/** A descrição: 120–160 caracteres, com a lei, o país e o começo do texto oficial. */
export function descricaoDoArtigo(d: DiplomaLei, a: ArtigoLei): string {
  const inicio = `Artigo ${a.n}.º da ${d.titulo} de Moçambique (${d.nome.replace(/,.*$/, '')}), texto oficial: `;
  const texto = a.paragrafos.join(' ').replace(/\s+/g, ' ').trim();
  const d1 = `${inicio}${texto}`;
  if (d1.length <= 160) return d1.length >= 120 ? d1 : `${d1} Fonte: Boletim da República.`.slice(0, 160);
  return caber(d1, 160);
}

export function tituloDoDiploma(d: DiplomaLei): string {
  return caber(`${d.titulo} de Moçambique — texto oficial`, MAX_TITULO);
}

export function descricaoDoDiploma(d: DiplomaLei): string {
  return caber(
    `${d.titulo} de Moçambique (${d.nome}) artigo a artigo: ${d.artigos.length} artigos com o texto oficial do Boletim da República, para ler no telemóvel.`,
    160,
  );
}

/**
 * Artigos relacionados, pela mesma procura do Cívico (BM25 sobre o corpus):
 * ligações internas com sentido, não uma lista ao acaso. Sem resultados,
 * os vizinhos.
 */
export function relacionados(d: DiplomaLei, a: ArtigoLei, max = 4): ArtigoLei[] {
  const tema = d.slug === 'trabalho' ? 'trabalho' : 'familia';
  const achados = procurarArtigos(`${a.epigrafe} ${a.paragrafos[0] ?? ''}`.slice(0, 400), tema)
    .filter((x) => !(x.numero === d.numero && x.n === a.n) && x.numero === d.numero)
    .map((x) => d.artigos.find((y) => y.n === x.n))
    .filter((x): x is ArtigoLei => Boolean(x))
    .slice(0, max);
  if (achados.length) return achados;
  const i = d.artigos.findIndex((x) => x.n === a.n);
  return [d.artigos[i - 2], d.artigos[i + 2], d.artigos[i + 3]].filter((x): x is ArtigoLei => Boolean(x)).slice(0, max);
}

export const LEI_VERIFICADA_EM = VERIFICADO_EM;

/** O trilho das páginas da lei: Início › Cívico › Leis › … (as páginas rendem-no com `<Breadcrumbs>`). */
export function trilhoDaLei(extra: readonly { name: string; path: string }[] = []): { name: string; path: string }[] {
  return [
    { name: CIVICO.inicio, path: '/' },
    { name: CIVICO.trilho, path: '/civico' },
    { name: LEI.trilho, path: '/civico/lei' },
    ...extra,
  ];
}
