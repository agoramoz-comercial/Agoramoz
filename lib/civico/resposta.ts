import { urlPublica } from '@/lib/news/limites';

/**
 * A resposta do motor cívico, no NOSSO modelo.
 *
 * O motor escreve Markdown. Em vez de o entregar ao browser para ser
 * interpretado lá (uma biblioteca nova no bundle e HTML de terceiros na
 * página), o servidor lê-o para uma árvore pequena e fechada: parágrafos,
 * títulos, listas, citações e tabelas, com negrito, ênfase e ligações. O que
 * não cabe nesta árvore sai como texto — nunca como marcação.
 *
 * Três garantias que daqui saem:
 *
 * 1. **Sem HTML.** Não há variante que transporte marcação; `<script>` num
 *    texto do motor é escrito como texto pelo React.
 * 2. **Só ligações públicas `https`.** O resto (`javascript:`, `http:`, IP
 *    privados) perde a ligação e fica o rótulo.
 * 3. **As fontes ficam à vista.** Cada ligação da resposta entra numa lista
 *    numerada, com o domínio escrito por extenso — quem lê vê para onde vai
 *    antes de clicar, e vê se é um domínio do Estado.
 *
 * Sem zod: o cliente valida com `validarResposta` o que recebe da rota.
 */

export type Trecho =
  | { readonly t: 'texto'; readonly v: string }
  | { readonly t: 'forte'; readonly v: string }
  | { readonly t: 'enfase'; readonly v: string }
  | { readonly t: 'ligacao'; readonly v: string; readonly href: string; readonly n: number };

export type Bloco =
  | { readonly tipo: 'paragrafo'; readonly trechos: readonly Trecho[] }
  | { readonly tipo: 'titulo'; readonly texto: string }
  | { readonly tipo: 'lista'; readonly ordenada: boolean; readonly itens: readonly (readonly Trecho[])[] }
  | { readonly tipo: 'citacao'; readonly trechos: readonly Trecho[] }
  | { readonly tipo: 'tabela'; readonly cabecalho: readonly string[]; readonly linhas: readonly (readonly string[])[] };

export interface Fonte {
  /** A posição na lista, a partir de 1. É o número que a ligação mostra no texto. */
  readonly n: number;
  readonly titulo: string;
  readonly href: string;
  /** O domínio, sem `www.` — escrito ao lado do título. */
  readonly dominio: string;
  /** Domínio do Estado moçambicano (`gov.mz`). Lido do endereço, não afirmado pelo motor. */
  readonly estado: boolean;
}

export interface Resposta {
  readonly blocos: readonly Bloco[];
  readonly fontes: readonly Fonte[];
  /** A resposta em texto corrido: para copiar e para dar contexto ao seguimento. */
  readonly texto: string;
}

/** Tectos do que sai daqui. Uma resposta normal fica muito abaixo de todos. */
export const MAX_BLOCOS = 120;
export const MAX_FONTES = 24;
export const MAX_ITENS = 40;
export const MAX_COLUNAS = 6;
export const MAX_LINHAS = 30;
const MAX_TRECHO = 4_000;
const MAX_TITULO_FONTE = 160;

/* ------------------------------------------------------------------ fontes */

/** `gov.mz` e os seus subdomínios. Uma comparação de sufixo com o ponto, para `xgov.mz` não passar. */
export function dominioDoEstado(dominio: string): boolean {
  return dominio === 'gov.mz' || dominio.endsWith('.gov.mz');
}

class Fontes {
  private readonly porHref = new Map<string, Fonte>();

  /** A fonte desta ligação, criada à primeira vez. `null` se o endereço não for público ou a lista estiver cheia. */
  registar(href: string, rotulo: string): Fonte | null {
    if (!urlPublica(href)) return null;
    const url = new URL(href);
    // O fragmento não muda o documento: `…/lei#art-5` e `…/lei` são a mesma fonte.
    url.hash = '';
    const chave = url.toString();
    const existente = this.porHref.get(chave);
    if (existente) return existente;
    if (this.porHref.size >= MAX_FONTES) return null;

    const dominio = url.hostname.toLowerCase().replace(/^www\./, '');
    const titulo = rotulo.trim().slice(0, MAX_TITULO_FONTE);
    const fonte: Fonte = {
      n: this.porHref.size + 1,
      // Um rótulo que é o próprio endereço não acrescenta nada: fica o domínio.
      titulo: !titulo || /^https?:\/\//i.test(titulo) ? dominio : titulo,
      href: chave,
      dominio,
      estado: dominioDoEstado(dominio),
    };
    this.porHref.set(chave, fonte);
    return fonte;
  }

  lista(): Fonte[] {
    return [...this.porHref.values()];
  }
}

/* ---------------------------------------------------------------- em linha */

/** Tira os marcadores de ênfase e de código de um texto que vai ser mostrado tal e qual. */
function semMarcas(texto: string): string {
  return texto
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/(\*\*|__)(.+?)\1/g, '$2')
    .replace(/(^|[^\w*])[*_]([^*_\n]+)[*_](?![\w*])/g, '$1$2')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\\([\\`*_{}[\]()#+\-.!|>])/g, '$1')
    .trim();
}

/** Negrito e ênfase num pedaço de texto sem ligações. */
function enfases(texto: string): Trecho[] {
  const saida: Trecho[] = [];
  // Negrito primeiro: `**a**` não pode ser lido como dois `*` de ênfase.
  const re = /(\*\*|__)(?=\S)(.+?)(?<=\S)\1|(?<![\w*_])([*_])(?=\S)([^*_\n]+?)(?<=\S)\3(?![\w*_])|`([^`\n]+)`/g;
  let fim = 0;
  for (const m of texto.matchAll(re)) {
    const inicio = m.index;
    if (inicio > fim) saida.push({ t: 'texto', v: texto.slice(fim, inicio) });
    if (m[2] !== undefined) saida.push({ t: 'forte', v: semMarcas(m[2]) });
    else if (m[4] !== undefined) saida.push({ t: 'enfase', v: semMarcas(m[4]) });
    // Código em linha (um número de artigo, um formulário) lê-se como texto.
    else if (m[5] !== undefined) saida.push({ t: 'texto', v: m[5] });
    fim = inicio + m[0].length;
  }
  if (fim < texto.length) saida.push({ t: 'texto', v: texto.slice(fim) });
  return saida;
}

/** Uma linha de texto → trechos. As ligações entram na lista de fontes. */
function trechosDe(bruto: string, fontes: Fontes): Trecho[] {
  const texto = bruto.slice(0, MAX_TRECHO);
  const saida: Trecho[] = [];
  // `[rótulo](https://…)`, `<https://…>` e um endereço solto.
  const re = /\[([^\]\n]{1,300})\]\(\s*<?([^)\s>]{1,2048})>?(?:\s+"[^"]*")?\s*\)|<(https:\/\/[^>\s]{1,2048})>|(?<![\w/(])(https:\/\/[^\s<>()[\]]{1,2048})/g;
  let fim = 0;

  for (const m of texto.matchAll(re)) {
    const inicio = m.index;
    let href = m[2] ?? m[3] ?? m[4]!;
    let total = m[0].length;
    // Um endereço solto no fim de uma frase leva a pontuação atrás: fica de fora.
    if (m[4]) {
      const semPontuacao = href.replace(/[.,;:!?»”’'"]+$/, '');
      total -= href.length - semPontuacao.length;
      href = semPontuacao;
    }
    const rotulo = semMarcas(m[1] ?? href);

    if (inicio > fim) saida.push(...enfases(texto.slice(fim, inicio)));
    const fonte = fontes.registar(href, rotulo);
    // Sem fonte (endereço recusado ou lista cheia), fica o texto e mais nada.
    if (fonte) saida.push({ t: 'ligacao', v: m[1] ? rotulo : fonte.dominio, href: fonte.href, n: fonte.n });
    else if (m[1]) saida.push({ t: 'texto', v: rotulo });
    fim = inicio + total;
  }
  if (fim < texto.length) saida.push(...enfases(texto.slice(fim)));

  // Escapes de Markdown (`\*`, `\_`) valem o carácter.
  return saida
    .map((x) => (x.t === 'texto' ? { ...x, v: x.v.replace(/\\([\\`*_{}[\]()#+\-.!|>])/g, '$1') } : x))
    .filter((x) => x.v !== '');
}

/* ------------------------------------------------------------------ blocos */

const TITULO = /^\s{0,3}#{1,6}\s+(.+?)\s*#*\s*$/;
const ITEM = /^\s{0,8}(?:([-*+•])|(\d{1,3})[.)])\s+(.+)$/;
const CITACAO = /^\s{0,3}>\s?(.*)$/;
const REGUA = /^\s{0,3}(?:-{3,}|\*{3,}|_{3,})\s*$/;
const SEPARADOR_TABELA = /^\s*\|?\s*:?-{2,}:?\s*(?:\|\s*:?-{2,}:?\s*)*\|?\s*$/;
const VEDACAO = /^\s{0,3}(```|~~~)/;

function celulas(linha: string): string[] {
  return linha
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .slice(0, MAX_COLUNAS)
    .map((c) => semMarcas(c));
}

function textoDosTrechos(trechos: readonly Trecho[]): string {
  return trechos.map((x) => x.v).join('');
}

function textoDoBloco(b: Bloco): string {
  switch (b.tipo) {
    case 'titulo':
      return b.texto;
    case 'paragrafo':
    case 'citacao':
      return textoDosTrechos(b.trechos);
    case 'lista':
      return b.itens.map((i, n) => `${b.ordenada ? `${n + 1}.` : '•'} ${textoDosTrechos(i)}`).join('\n');
    case 'tabela':
      return [b.cabecalho, ...b.linhas].map((l) => l.join(' · ')).join('\n');
  }
}

/** O texto corrido de uma lista de blocos: para copiar, para o contexto e para a verificação. */
export function textoDosBlocos(blocos: readonly Bloco[]): string {
  return blocos.map(textoDoBloco).join('\n\n').trim();
}

/**
 * Markdown do motor → o nosso modelo. Devolve `null` quando não sobra nada
 * que se possa chamar resposta.
 */
export function normalizar(markdown: string): Resposta | null {
  const fontes = new Fontes();
  const blocos: Bloco[] = [];
  const linhas = markdown.replace(/\r\n?/g, '\n').split('\n');

  let paragrafo: string[] = [];
  const fecharParagrafo = () => {
    if (paragrafo.length === 0) return;
    const trechos = trechosDe(paragrafo.join(' '), fontes);
    if (trechos.length) blocos.push({ tipo: 'paragrafo', trechos });
    paragrafo = [];
  };

  for (let i = 0; i < linhas.length && blocos.length < MAX_BLOCOS; i += 1) {
    const linha = linhas[i]!;

    if (!linha.trim()) {
      fecharParagrafo();
      continue;
    }

    // Bloco de código: o conteúdo lê-se como parágrafo; as vedações desaparecem.
    if (VEDACAO.test(linha)) {
      fecharParagrafo();
      const dentro: string[] = [];
      for (i += 1; i < linhas.length && !VEDACAO.test(linhas[i]!); i += 1) dentro.push(linhas[i]!.trim());
      const texto = dentro.filter(Boolean).join(' ').slice(0, MAX_TRECHO);
      if (texto) blocos.push({ tipo: 'paragrafo', trechos: [{ t: 'texto', v: texto }] });
      continue;
    }

    if (REGUA.test(linha)) {
      fecharParagrafo();
      continue;
    }

    const titulo = TITULO.exec(linha);
    if (titulo) {
      fecharParagrafo();
      const texto = semMarcas(titulo[1]!).slice(0, 200);
      if (texto) blocos.push({ tipo: 'titulo', texto });
      continue;
    }

    // Tabela: uma linha com barras seguida da linha de traços.
    if (linha.includes('|') && SEPARADOR_TABELA.test(linhas[i + 1] ?? '')) {
      fecharParagrafo();
      const cabecalho = celulas(linha);
      const corpo: string[][] = [];
      for (i += 2; i < linhas.length && linhas[i]!.includes('|') && linhas[i]!.trim(); i += 1) {
        if (corpo.length < MAX_LINHAS) corpo.push(celulas(linhas[i]!));
      }
      i -= 1;
      if (cabecalho.some(Boolean) && corpo.length) {
        // Todas as linhas com as colunas do cabeçalho: uma célula a menos não desalinha a tabela.
        const largura = cabecalho.length;
        blocos.push({
          tipo: 'tabela',
          cabecalho,
          linhas: corpo.map((l) => Array.from({ length: largura }, (_, c) => l[c] ?? '')),
        });
      }
      continue;
    }

    const item = ITEM.exec(linha);
    if (item) {
      fecharParagrafo();
      const ordenada = item[2] !== undefined;
      const itens: Trecho[][] = [];
      let actual = item[3]!;
      for (i += 1; i < linhas.length; i += 1) {
        const seguinte = linhas[i]!;
        const outro = ITEM.exec(seguinte);
        if (outro) {
          if (itens.length < MAX_ITENS) itens.push(trechosDe(actual, fontes));
          actual = outro[3]!;
        } else if (seguinte.trim() && /^\s{2,}\S/.test(seguinte)) {
          // Continuação indentada do mesmo item.
          actual += ` ${seguinte.trim()}`;
        } else {
          break;
        }
      }
      i -= 1;
      if (itens.length < MAX_ITENS) itens.push(trechosDe(actual, fontes));
      const comConteudo = itens.filter((x) => x.length > 0);
      if (comConteudo.length) blocos.push({ tipo: 'lista', ordenada, itens: comConteudo });
      continue;
    }

    const citacao = CITACAO.exec(linha);
    if (citacao) {
      fecharParagrafo();
      const partes = [citacao[1]!];
      for (i += 1; i < linhas.length; i += 1) {
        const mais = CITACAO.exec(linhas[i]!);
        if (!mais) break;
        partes.push(mais[1]!);
      }
      i -= 1;
      const trechos = trechosDe(partes.join(' ').trim(), fontes);
      if (trechos.length) blocos.push({ tipo: 'citacao', trechos });
      continue;
    }

    paragrafo.push(linha.trim());
  }
  fecharParagrafo();

  const comTexto = blocos.slice(0, MAX_BLOCOS);
  const texto = textoDosBlocos(comTexto);
  if (!texto) return null;
  return { blocos: comTexto, fontes: fontes.lista(), texto };
}

/* --------------------------------------------------------------- validação */

const eTexto = (v: unknown): v is string => typeof v === 'string';

function trechoValido(x: unknown): x is Trecho {
  const t = x as Partial<Trecho> | null;
  if (!t || !eTexto(t.v)) return false;
  if (t.t === 'texto' || t.t === 'forte' || t.t === 'enfase') return true;
  return t.t === 'ligacao' && eTexto(t.href) && urlPublica(t.href) && Number.isInteger(t.n);
}

const trechosValidos = (v: unknown): v is Trecho[] => Array.isArray(v) && v.every(trechoValido);
const textosValidos = (v: unknown): v is string[] => Array.isArray(v) && v.every(eTexto);

function blocoValido(x: unknown): x is Bloco {
  const b = x as { tipo?: unknown } & Record<string, unknown>;
  switch (b?.tipo) {
    case 'paragrafo':
    case 'citacao':
      return trechosValidos(b.trechos);
    case 'titulo':
      return eTexto(b.texto);
    case 'lista':
      return typeof b.ordenada === 'boolean' && Array.isArray(b.itens) && b.itens.every(trechosValidos);
    case 'tabela':
      return textosValidos(b.cabecalho) && Array.isArray(b.linhas) && b.linhas.every(textosValidos);
    default:
      return false;
  }
}

function fonteValida(x: unknown): x is Fonte {
  const f = x as Partial<Fonte> | null;
  return (
    !!f &&
    Number.isInteger(f.n) &&
    eTexto(f.titulo) &&
    eTexto(f.dominio) &&
    typeof f.estado === 'boolean' &&
    eTexto(f.href) &&
    urlPublica(f.href)
  );
}

/**
 * O que chega ao browser é verificado contra o modelo inteiro antes de ser
 * desenhado: uma resposta de um proxy, ou de uma versão antiga da rota em
 * cache, não parte a página nem lhe põe uma ligação que não seja `https`.
 */
export function validarResposta(x: unknown): x is Resposta {
  const r = x as Partial<Resposta> | null;
  return (
    !!r &&
    eTexto(r.texto) &&
    Array.isArray(r.blocos) &&
    r.blocos.length > 0 &&
    r.blocos.length <= MAX_BLOCOS &&
    r.blocos.every(blocoValido) &&
    Array.isArray(r.fontes) &&
    r.fontes.length <= MAX_FONTES &&
    r.fontes.every(fonteValida)
  );
}
