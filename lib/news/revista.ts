import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import fontkit from '@pdf-lib/fontkit';
import {
  PDFArray,
  PDFDocument,
  PDFName,
  PDFString,
  clip,
  endPath,
  popGraphicsState,
  pushGraphicsState,
  rectangle,
  rgb,
  StandardFonts,
  type PDFFont,
  type PDFImage,
  type PDFPage,
  type RGB,
} from 'pdf-lib';
import type { AnuncioPublico } from './anuncios';
import { NOME_DA_SECCAO, type ArtigoCompleto } from './artigo';
import { porEvidencia, porPais, porSeccao, total } from './estatisticas';
import { NOME_DO_PAIS } from './paises';
import { NOME_TIPO } from './profunda';
import * as G from './revista-graficos';
import { cenaDeCor, cenaDeFoto, rectArredondado, vidro, type Cena, type Painel, type Tema } from './vidro';

/**
 * A revista do AGORAMOZ News em PDF (A4), no desenho do jornal: capa
 * invertida a preto com a manchete, uma folha de papel por artigo (manchete
 * em serifa, fotografia, texto em duas colunas que corre para as folhas
 * seguintes), a análise profunda ZABATAINA 3000 num bloco a preto, a página
 * estratégica dos anunciantes (cada um com ligação clicável para a oferta,
 * contada pela rota de clique) e a contracapa.
 *
 * pdf-lib + fontkit, JavaScript puro: corre numa função serverless. A serifa é
 * a Newsreader (OFL, lib/news/fontes), com os acentos do português; os
 * rótulos em Inter (OFL, lib/email/fontes). Sem as fontes, cai na Times e na
 * Helvetica com o texto reduzido ao que elas sabem desenhar.
 */

export interface EdicaoRevista {
  readonly idioma: 'pt' | 'en';
  readonly data: Date;
  readonly artigos: readonly ArtigoCompleto[];
  readonly anuncios: readonly AnuncioPublico[];
  /** Fotografias em JPEG por id de artigo (as que se conseguiram ler). */
  readonly imagens: ReadonlyMap<string, Uint8Array>;
  /** Origem pública do site, para as ligações (ex.: https://agoramoz.com). */
  readonly site: string;
}

const A4 = { w: 595.28, h: 841.89 } as const;
const M = 42;
const PAPEL = rgb(0xf3 / 255, 0xef / 255, 0xe6 / 255);
const TINTA = rgb(0x12 / 255, 0x11 / 255, 0x10 / 255);
const NOITE = rgb(0x0b / 255, 0x0a / 255, 0x09 / 255);
const CINZA = rgb(0x4f / 255, 0x48 / 255, 0x3e / 255);
const CINZA_ESCURO = rgb(0xc9 / 255, 0xc1 / 255, 0xb3 / 255);

interface Fontes {
  serifa: PDFFont;
  italica: PDFFont;
  negra: PDFFont;
  mancha: PDFFont;
  sans: PDFFont;
  sansForte: PDFFont;
}

/** Caminhos estáticos (o rastreio de ficheiros só leva as duas pastas de fontes). */
const lerNews = (nome: string) => readFileSync(join(process.cwd(), 'lib', 'news', 'fontes', nome));
const lerEmail = (nome: string) => readFileSync(join(process.cwd(), 'lib', 'email', 'fontes', nome));

async function fontes(pdf: PDFDocument): Promise<Fontes> {
  try {
    pdf.registerFontkit(fontkit);
    const n = lerNews;
    const e = lerEmail;
    const [serifa, italica, negra, mancha, sans, sansForte] = await Promise.all([
      pdf.embedFont(n('Newsreader-Regular.ttf'), { subset: true }),
      pdf.embedFont(n('Newsreader-Italic.ttf'), { subset: true }),
      pdf.embedFont(n('Newsreader-Bold.ttf'), { subset: true }),
      pdf.embedFont(n('Newsreader-ExtraBold.ttf'), { subset: true }),
      pdf.embedFont(e('Inter-Regular.ttf'), { subset: true }),
      pdf.embedFont(e('Inter-SemiBold.ttf'), { subset: true }),
    ]);
    return { serifa, italica, negra, mancha, sans, sansForte };
  } catch {
    const [serifa, italica, negra, sans, sansForte] = await Promise.all([
      pdf.embedFont(StandardFonts.TimesRoman),
      pdf.embedFont(StandardFonts.TimesRomanItalic),
      pdf.embedFont(StandardFonts.TimesRomanBold),
      pdf.embedFont(StandardFonts.Helvetica),
      pdf.embedFont(StandardFonts.HelveticaBold),
    ]);
    return { serifa, italica, negra, mancha: negra, sans, sansForte };
  }
}

/** Troca o que a fonte não desenha por equivalentes (ou retira), para o pdf-lib não falhar. */
const TROCAS: Record<string, string> = {
  '‐': '-', '‑': '-', '‒': '-', '−': '-', '→': '->', '←': '<-',
  '≥': '>=', '≤': '<=', '≈': '~', ' ': ' ', ' ': ' ', ' ': ' ',
  '•': '·', '◆': '·', '✓': 'v', '✕': 'x', '​': '',
};

function limpador(f: PDFFont): (s: string) => string {
  let set: Set<number> | null = null;
  try {
    set = new Set(f.getCharacterSet());
  } catch {
    set = null;
  }
  return (s: string) => {
    let out = '';
    for (const ch of s.replace(/[\r\t]+/g, ' ').replace(/\s*\n\s*/g, ' ')) {
      const cp = ch.codePointAt(0)!;
      if (!set || set.has(cp)) out += ch;
      else if (TROCAS[ch] !== undefined) out += [...TROCAS[ch]!].filter((c) => !set || set.has(c.codePointAt(0)!)).join('');
      else {
        const base = ch.normalize('NFD').replace(/[̀-ͯ]/g, '');
        out += base && set.has(base.codePointAt(0)!) ? base : '';
      }
    }
    return out.replace(/ {2,}/g, ' ');
  };
}

function quebrar(texto: string, f: PDFFont, tam: number, largura: number): string[] {
  const linhas: string[] = [];
  let linha = '';
  for (const palavra of texto.split(' ').filter(Boolean)) {
    const tenta = linha ? `${linha} ${palavra}` : palavra;
    if (f.widthOfTextAtSize(tenta, tam) <= largura) {
      linha = tenta;
      continue;
    }
    if (linha) linhas.push(linha);
    // Palavra maior do que a linha: parte-se à força.
    let resto = palavra;
    while (f.widthOfTextAtSize(resto, tam) > largura && resto.length > 1) {
      let n = resto.length - 1;
      while (n > 1 && f.widthOfTextAtSize(resto.slice(0, n), tam) > largura) n -= 1;
      linhas.push(resto.slice(0, n));
      resto = resto.slice(n);
    }
    linha = resto;
  }
  if (linha) linhas.push(linha);
  return linhas;
}

type Fundo = 'papel' | 'preto';

interface Bloco {
  readonly texto: string;
  readonly fonte: PDFFont;
  readonly tam: number;
  readonly entrelinha?: number;
  readonly antes?: number;
  readonly cor?: RGB;
  readonly marca?: string;
  /** Justificar (o corpo do jornal). */
  readonly justo?: boolean;
}

class Revista {
  readonly paginas: PDFPage[] = [];
  page!: PDFPage;
  fundo: Fundo = 'papel';
  private colunas: { x: number; w: number }[] = [];
  private col = 0;
  y = 0;
  private topo = 0;
  readonly limpar: (s: string) => string;

  constructor(
    readonly pdf: PDFDocument,
    readonly f: Fontes,
    readonly e: EdicaoRevista,
    private readonly dataTexto: string,
  ) {
    this.limpar = limpador(f.serifa);
  }

  get tinta(): RGB {
    return this.fundo === 'preto' ? PAPEL : TINTA;
  }
  get cinza(): RGB {
    return this.fundo === 'preto' ? CINZA_ESCURO : CINZA;
  }

  t(s: string): string {
    return this.limpar(s);
  }

  novaPagina(fundo: Fundo, cabecalho = true): void {
    this.page = this.pdf.addPage([A4.w, A4.h]);
    this.paginas.push(this.page);
    this.fundo = fundo;
    this.page.drawRectangle({ x: 0, y: 0, width: A4.w, height: A4.h, color: fundo === 'preto' ? NOITE : PAPEL });
    this.y = A4.h - M;
    if (cabecalho) this.cabecalho();
  }

  /** Cabeça corrida: marca, data e número da página, entre filetes. */
  cabecalho(): void {
    const p = this.page;
    const y = A4.h - M + 4;
    p.drawText('AGORAMOZ NEWS', { x: M, y, size: 11, font: this.f.mancha, color: this.tinta });
    const direita = `${this.t(this.dataTexto)}  ·  ${this.paginas.length}`;
    const w = this.f.sans.widthOfTextAtSize(direita, 7.5);
    p.drawText(direita, { x: A4.w - M - w, y: y + 1.5, size: 7.5, font: this.f.sans, color: this.cinza });
    this.filete(y - 7, true);
    this.y = y - 24;
  }

  filete(y: number, duplo = false, x0 = M, x1 = A4.w - M): void {
    this.page.drawLine({ start: { x: x0, y }, end: { x: x1, y }, thickness: duplo ? 1.4 : 0.6, color: this.tinta });
    if (duplo) this.page.drawLine({ start: { x: x0, y: y - 2.6 }, end: { x: x1, y: y - 2.6 }, thickness: 0.5, color: this.tinta });
  }

  /** Texto numa largura dada, a partir de `this.y`; devolve a altura usada. */
  escrever(texto: string, fonte: PDFFont, tam: number, x: number, largura: number, cor?: RGB, entrelinha = 1.22): number {
    const linhas = quebrar(this.t(texto), fonte, tam, largura);
    for (const l of linhas) {
      this.y -= tam * entrelinha;
      this.page.drawText(l, { x, y: this.y, size: tam, font: fonte, color: cor ?? this.tinta });
    }
    return linhas.length * tam * entrelinha;
  }

  rotulo(texto: string, x: number, y: number, cor?: RGB, tam = 7): number {
    const s = this.t(texto.toUpperCase());
    this.page.drawText(s, { x, y, size: tam, font: this.f.sansForte, color: cor ?? this.tinta });
    return this.f.sansForte.widthOfTextAtSize(s, tam);
  }

  /** O selo do país: código em caixa invertida e nome. */
  selo(pais: NonNullable<ArtigoCompleto['pais']>, x: number, y: number): void {
    const codigo = pais.toUpperCase();
    const nome = this.t(NOME_DO_PAIS[pais][this.e.idioma].toUpperCase());
    const wc = this.f.sansForte.widthOfTextAtSize(codigo, 7) + 8;
    const wn = this.f.sansForte.widthOfTextAtSize(nome, 7) + 8;
    this.page.drawRectangle({ x, y: y - 3, width: wc + wn, height: 12, borderColor: this.tinta, borderWidth: 0.7 });
    this.page.drawRectangle({ x, y: y - 3, width: wc, height: 12, color: this.tinta });
    this.page.drawText(codigo, { x: x + 4, y, size: 7, font: this.f.sansForte, color: this.fundo === 'preto' ? NOITE : PAPEL });
    this.page.drawText(nome, { x: x + wc + 4, y, size: 7, font: this.f.sansForte, color: this.tinta });
  }

  imagem(img: PDFImage, x: number, yTopo: number, w: number, h: number): void {
    // «cover»: escala para encher a caixa e recorta ao centro (caminho de recorte).
    const escala = Math.max(w / img.width, h / img.height);
    const iw = img.width * escala;
    const ih = img.height * escala;
    this.page.pushOperators(pushGraphicsState(), rectangle(x, yTopo - h, w, h), clip(), endPath());
    this.page.drawImage(img, { x: x - (iw - w) / 2, y: yTopo - h - (ih - h) / 2, width: iw, height: ih });
    this.page.pushOperators(popGraphicsState());
  }

  // ── Texto corrido em colunas ──────────────────────────────────────────────

  colunasDesde(yTopo: number, n = 2, gutter = 18): void {
    const w = (A4.w - 2 * M - gutter * (n - 1)) / n;
    this.colunas = Array.from({ length: n }, (_, i) => ({ x: M + i * (w + gutter), w }));
    this.col = 0;
    this.topo = yTopo;
    this.y = yTopo;
  }

  private proximaColuna(): void {
    this.col += 1;
    if (this.col >= this.colunas.length) {
      this.novaPagina(this.fundo);
      this.colunasDesde(this.y, this.colunas.length);
      return;
    }
    // Filete entre colunas, como no jornal.
    const c = this.colunas[this.col]!;
    this.page.drawLine({ start: { x: c.x - 9, y: this.topo + 4 }, end: { x: c.x - 9, y: M + 10 }, thickness: 0.4, color: this.cinza });
    this.y = this.topo;
  }

  correr(b: Bloco): void {
    const tam = b.tam;
    const lh = tam * (b.entrelinha ?? 1.38);
    if (b.antes) {
      this.y -= b.antes;
      if (this.y < M + 14 + lh) this.proximaColuna();
    }
    let c = this.colunas[this.col]!;
    const recuo = b.marca ? 9 : 0;
    const linhas = quebrar(this.t(b.texto), b.fonte, tam, c.w - recuo);
    linhas.forEach((l, i) => {
      if (this.y - lh < M + 14) {
        this.proximaColuna();
        c = this.colunas[this.col]!;
      }
      this.y -= lh;
      if (i === 0 && b.marca) {
        this.page.drawText(this.t(b.marca), { x: c.x, y: this.y, size: tam, font: this.f.negra, color: this.tinta });
      }
      const ultima = i === linhas.length - 1;
      const palavras = l.split(' ');
      if (b.justo && !ultima && palavras.length > 1) {
        const larguraTexto = palavras.reduce((s, p) => s + b.fonte.widthOfTextAtSize(p, tam), 0);
        const espaco = (c.w - recuo - larguraTexto) / (palavras.length - 1);
        let x = c.x + recuo;
        for (const p of palavras) {
          this.page.drawText(p, { x, y: this.y, size: tam, font: b.fonte, color: b.cor ?? this.tinta });
          x += b.fonte.widthOfTextAtSize(p, tam) + espaco;
        }
      } else {
        this.page.drawText(l, { x: c.x + recuo, y: this.y, size: tam, font: b.fonte, color: b.cor ?? this.tinta });
      }
    });
  }

  titulo(texto: string): void {
    this.correr({ texto: texto.toUpperCase(), fonte: this.f.sansForte, tam: 7.5, antes: 12, entrelinha: 1.5, cor: this.tinta });
    const c = this.colunas[this.col]!;
    this.page.drawLine({ start: { x: c.x, y: this.y - 3 }, end: { x: c.x + c.w, y: this.y - 3 }, thickness: 0.6, color: this.tinta });
    this.y -= 4;
  }

  /** Desenha uma cena (fundo do vidro) com o canto superior esquerdo em (x, yTopo). */
  async cena(c: Cena, x: number, yTopo: number): Promise<void> {
    const img = await this.pdf.embedJpg(c.jpeg);
    this.page.drawImage(img, { x, y: yTopo - c.hPt, width: c.wPt, height: c.hPt });
  }

  /**
   * Um painel de vidro fosco sobre a cena desenhada em (x, yTopo): o fundo
   * desfocado (sharp) e, por cima, a borda clara de 0,5 pt em vector.
   * Devolve o topo do painel na página.
   */
  async vidro(c: Cena, x: number, yTopo: number, p: Painel): Promise<number> {
    const png = await this.pdf.embedPng(await vidro(c, p));
    const px = x + p.x;
    const pyTopo = yTopo - p.y;
    this.page.drawImage(png, { x: px, y: pyTopo - p.h, width: p.w, height: p.h });
    this.page.drawSvgPath(rectArredondado(p.w, p.h, p.raio ?? 16), {
      x: px,
      y: pyTopo,
      borderColor: PAPEL,
      borderWidth: 0.5,
      borderOpacity: 0.75,
    });
    return pyTopo;
  }

  /** Altura de um texto quebrado numa largura (sem o desenhar). */
  medir(texto: string, fonte: PDFFont, tam: number, largura: number, entrelinha = 1.22): number {
    return quebrar(this.t(texto), fonte, tam, largura).length * tam * entrelinha;
  }

  /** O contexto dos gráficos vectoriais nesta página. */
  get g(): G.Ctx {
    return { page: this.page, sans: this.f.sans, forte: this.f.sansForte, serifa: this.f.serifa, negra: this.f.negra, t: (s) => this.t(s), idioma: this.e.idioma };
  }

  /** Uma ligação clicável (anotação URI) num rectângulo da página. */
  ligacao(url: string, x: number, y: number, w: number, h: number): void {
    const anotacao = this.pdf.context.obj({
      Type: 'Annot',
      Subtype: 'Link',
      Rect: [x, y, x + w, y + h],
      Border: [0, 0, 0],
      A: { Type: 'Action', S: 'URI', URI: PDFString.of(url) },
    });
    const ref = this.pdf.context.register(anotacao);
    const existentes = this.page.node.lookup(PDFName.of('Annots'));
    if (existentes instanceof PDFArray) existentes.push(ref);
    else this.page.node.set(PDFName.of('Annots'), this.pdf.context.obj([ref]));
  }
}

const TXT = {
  pt: {
    revista: 'Revista de análise de negócio',
    edicao: 'Edição de',
    nesta: 'Nesta edição',
    resumo: 'Em resumo',
    oQue: 'O que aconteceu',
    porque: 'Porque importa',
    riscos: 'Riscos',
    oportunidades: 'Oportunidades',
    agir: 'O que fazer',
    horizonte: 'Horizonte',
    monitorizar: 'O que acompanhar',
    profunda: 'Análise profunda ZABATAINA 3000',
    impacto: 'Impacto em',
    cenarios: { base: 'Cenário base', optimista: 'Cenário optimista', pessimista: 'Cenário pessimista' },
    indicadores: 'Indicadores a vigiar',
    foto: 'Foto',
    fonte: 'Fonte',
    lerOnline: 'Ler online',
    vazio: 'Sem artigos publicados nesta edição.',
    parceiros: 'Página estratégica',
    parceirosTitulo: 'Serviços e produtos dos nossos parceiros',
    parceirosNota: 'Publicidade. Cada anúncio liga directamente à oferta do anunciante.',
    contracapa: 'Análise de negócio para quem decide em Moçambique e nos mercados lusófonos.',
    aviso: 'Análises produzidas com o motor AGORAMOZ e revistas pela redacção antes de publicar. Não são aconselhamento de investimento.',
    publicidade: 'Publicidade',
    edicaoNumeros: 'A edição em números',
    edicaoLead: 'Onde tocam as notícias desta edição, contado nos artigos publicados.',
    noticiaNumeros: 'A notícia em números',
    noticiaLead: 'Os números vêm só do documento da notícia; o que não estava lá não entra no gráfico.',
    porPais: 'Artigos por país',
    porSeccao: 'Artigos por secção',
    porEvidencia: 'Afirmações por nível de evidência',
    fonteEdicao: (n: number) => `Base de dados do AGORAMOZ News: os ${n} artigos desta edição.`,
    fonteAnalise: 'Análises profundas ZABATAINA 3000 desta edição (contagem das afirmações).',
    fonteAnaliseUma: 'Análise profunda ZABATAINA 3000 desta notícia (contagem das afirmações).',
    onde: 'Onde',
    fonteMapa: 'Natural Earth (domínio público); país escolhido pela redacção.',
  },
  en: {
    revista: 'Business analysis magazine',
    edicao: 'Edition of',
    nesta: 'In this edition',
    resumo: 'In brief',
    oQue: 'What happened',
    porque: 'Why it matters',
    riscos: 'Risks',
    oportunidades: 'Opportunities',
    agir: 'What to do',
    horizonte: 'Time horizon',
    monitorizar: 'What to monitor',
    profunda: 'ZABATAINA 3000 deep analysis',
    impacto: 'Impact on',
    cenarios: { base: 'Base case', optimista: 'Optimistic case', pessimista: 'Pessimistic case' },
    indicadores: 'Indicators to watch',
    foto: 'Photo',
    fonte: 'Source',
    lerOnline: 'Read online',
    vazio: 'No articles published in this edition.',
    parceiros: 'Strategic page',
    parceirosTitulo: 'Services and products from our partners',
    parceirosNota: "Advertising. Each ad links directly to the advertiser's offer.",
    contracapa: 'Business analysis for decision-makers in Mozambique and Portuguese-speaking markets.',
    aviso: 'Analysis produced with the AGORAMOZ engine and reviewed by our desk before publication. It is not investment advice.',
    publicidade: 'Advertisement',
    edicaoNumeros: 'This edition in numbers',
    edicaoLead: 'Where this edition’s stories land, counted from published articles.',
    noticiaNumeros: 'The story in numbers',
    noticiaLead: 'Numbers come only from the story’s document; anything not in it stays out of the chart.',
    porPais: 'Articles by country',
    porSeccao: 'Articles by section',
    porEvidencia: 'Claims by evidence level',
    fonteEdicao: (n: number) => `AGORAMOZ News database: the ${n} articles in this edition.`,
    fonteAnalise: 'ZABATAINA 3000 deep analyses in this edition (count of claims).',
    fonteAnaliseUma: 'ZABATAINA 3000 deep analysis of this story (count of claims).',
    onde: 'Where',
    fonteMapa: 'Natural Earth (public domain); country chosen by our desk.',
  },
} as const;

/** Um passo de vidro que falhe (sharp, imagem estranha) não parte a revista. */
async function talvez<T>(f: () => Promise<T>): Promise<T | null> {
  try {
    return await f();
  } catch {
    return null;
  }
}

const TEMAS: readonly Tema[] = ['noite', 'tinta', 'energia', 'crescimento'];

export function dataDaEdicao(data: Date, idioma: 'pt' | 'en'): string {
  return new Intl.DateTimeFormat(idioma === 'en' ? 'en-GB' : 'pt-PT', {
    timeZone: 'Africa/Maputo',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(data);
}

/** O URL de um artigo e o do clique de um anúncio (contado pela rota). */
function urlArtigo(e: EdicaoRevista, slug: string): string {
  return `${e.site.replace(/\/$/, '')}${e.idioma === 'en' ? '/en' : ''}/news/${slug}`;
}
export function urlAnuncio(site: string, id: string): string {
  return `${site.replace(/\/$/, '')}/api/news/anuncio/${id}`;
}

export async function gerarRevista(e: EdicaoRevista): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const x = TXT[e.idioma];
  const dataTexto = dataDaEdicao(e.data, e.idioma);
  pdf.setTitle(`AGORAMOZ News — ${x.edicao} ${dataTexto}`);
  pdf.setAuthor('AGORAMOZ News');
  pdf.setSubject(x.revista);
  pdf.setLanguage(e.idioma === 'en' ? 'en-GB' : 'pt-PT');
  pdf.setCreator('AGORAMOZ');
  pdf.setProducer('AGORAMOZ');
  pdf.setCreationDate(e.data);

  const f = await fontes(pdf);
  const r = new Revista(pdf, f, e, dataTexto);
  const imagens = new Map<string, PDFImage>();
  for (const a of e.artigos) {
    const bytes = e.imagens.get(a.id);
    if (!bytes) continue;
    try {
      imagens.set(a.id, await pdf.embedJpg(bytes));
    } catch {
      // Uma fotografia ilegível não parte a revista: o artigo sai sem ela.
    }
  }

  // ── Capa (a preto) ─────────────────────────────────────────────────────────
  r.novaPagina('preto', false);
  const larg = A4.w - 2 * M;
  r.y = A4.h - M;
  r.rotulo(x.revista, M, r.y - 8, CINZA_ESCURO);
  const dir = `${x.edicao} ${dataTexto}`;
  const wDir = f.sansForte.widthOfTextAtSize(r.t(dir.toUpperCase()), 7);
  r.rotulo(dir, A4.w - M - wDir, r.y - 8, CINZA_ESCURO);
  r.filete(r.y - 16, true);
  // A cabeça ocupa a largura toda.
  const marca = 'AGORAMOZ';
  let tamMarca = 40;
  while (f.mancha.widthOfTextAtSize(marca, tamMarca + 2) < larg) tamMarca += 2;
  r.page.drawText(marca, { x: M, y: r.y - 16 - tamMarca * 0.86, size: tamMarca, font: f.mancha, color: PAPEL });
  r.y -= 16 + tamMarca * 0.86 + 8;
  const news = 'N E W S';
  const wNews = f.italica.widthOfTextAtSize(news, 26);
  r.page.drawText(news, { x: (A4.w - wNews) / 2, y: r.y - 24, size: 26, font: f.italica, color: PAPEL });
  r.y -= 34;
  r.filete(r.y, true);
  r.y -= 18;

  const [capa, ...outros] = e.artigos;
  // A capa: a fotografia da manchete (ou um gradiente de cor) e, por cima,
  // um painel de vidro fosco com a secção, o título e a entrada.
  const alturaIndice = e.artigos.length > 1 ? 34 + Math.min(outros.length, 5) * 15 : 0;
  const caixaTopo = r.y;
  const hCaixa = caixaTopo - (M + alturaIndice + 14);
  const fotoCapa = capa ? e.imagens.get(capa.id) : undefined;
  const cenaCapa =
    (fotoCapa ? await talvez(() => cenaDeFoto(fotoCapa, larg, hCaixa)) : null) ??
    (await talvez(() => cenaDeCor(larg, hCaixa, 'noite', 1)));
  if (cenaCapa) await r.cena(cenaCapa, M, caixaTopo);
  const wTexto = larg - 32 - 40;
  const tamTitulo = 28;
  const hPainel = capa
    ? 20 + 16 + r.medir(capa.titulo, f.negra, tamTitulo, wTexto, 1.04) + (capa.entrada ? 8 + r.medir(capa.entrada, f.italica, 12.5, wTexto, 1.35) : 0) + 22
    : 70;
  const painelCapa: Painel = { x: 16, y: hCaixa - 16 - hPainel, w: larg - 32, h: hPainel, raio: 18 };
  const topoPainel = cenaCapa ? await talvez(() => r.vidro(cenaCapa, M, caixaTopo, painelCapa)) : null;
  r.y = (topoPainel ?? caixaTopo - painelCapa.y) - 20;
  const xt = M + 16 + 20;
  if (capa) {
    const kx = r.rotulo(NOME_DA_SECCAO[capa.seccao][e.idioma], xt, r.y - 6, PAPEL);
    if (capa.pais) r.selo(capa.pais, xt + kx + 8, r.y - 6);
    r.y -= 14;
    r.escrever(capa.titulo, f.negra, tamTitulo, xt, wTexto, PAPEL, 1.04);
    if (capa.entrada) {
      r.y -= 8;
      r.escrever(capa.entrada, f.italica, 12.5, xt, wTexto, CINZA_ESCURO, 1.35);
    }
    r.ligacao(urlArtigo(e, capa.slug), M + 16, caixaTopo - painelCapa.y - hPainel, larg - 32, hPainel);
  } else {
    r.escrever(x.vazio, f.italica, 18, xt, wTexto, PAPEL);
  }
  // Índice no rodapé da capa.
  if (e.artigos.length > 1) {
    let y = M + 14 + Math.min(outros.length, 5) * 15;
    r.filete(y + 14, false);
    r.rotulo(x.nesta, M, y + 2, CINZA_ESCURO);
    for (const a of outros.slice(0, 5)) {
      y -= 15;
      const tituloIdx = quebrar(r.t(a.titulo), f.serifa, 10.5, larg - 40)[0] ?? '';
      r.page.drawText(tituloIdx, { x: M, y, size: 10.5, font: f.serifa, color: PAPEL });
    }
  }

  // ── A edição em números (contagens reais dos artigos desta edição) ─────────
  const paisesEd = porPais(e.artigos);
  const seccoesEd = porSeccao(e.artigos);
  const profundas = e.artigos.flatMap((a) => (a.profunda ? [a.profunda] : []));
  if (e.artigos.length > 0) {
    r.novaPagina('papel');
    r.rotulo('INFOGRAFIA', M, r.y - 8);
    r.y -= 12;
    r.escrever(x.edicaoNumeros, f.negra, 26, M, larg, TINTA, 1.06);
    r.y -= 2;
    r.escrever(x.edicaoLead, f.italica, 11.5, M, larg, CINZA, 1.35);
    r.y -= 14;
    const fonteEd = x.fonteEdicao(e.artigos.length);
    if (paisesEd.length > 0) {
      r.y -= G.quadro(r.g, M, r.y, larg, x.porPais, fonteEd, (y) => G.mapaCobertura(r.g, paisesEd, M, y, larg));
      r.y -= 14;
    }
    const meia = (larg - 24) / 2;
    const yLinha = r.y;
    let hEsq = 0;
    if (seccoesEd.length > 0)
      hEsq = G.quadro(r.g, M, yLinha, meia, x.porSeccao, fonteEd, (y) =>
        G.barras(r.g, M, y, meia, seccoesEd.map((c) => ({ rotulo: NOME_DA_SECCAO[c.chave][e.idioma], valor: c.n }))),
      );
    let hDir = 0;
    if (profundas.length > 0) {
      const ev = (['E1', 'E2', 'E3', 'E4'] as const).map((k) => ({
        rotulo: k,
        valor: profundas.reduce((sm, p) => sm + (porEvidencia(p).find((c) => c.chave === k)?.n ?? 0), 0),
      }));
      if (total(ev.map((p) => ({ chave: p.rotulo, n: p.valor }))) > 0)
        hDir = G.quadro(r.g, M + meia + 24, yLinha, meia, x.porEvidencia, x.fonteAnalise, (y) => G.barras(r.g, M + meia + 24, y, meia, ev));
    }
    r.y = yLinha - Math.max(hEsq, hDir);
  }

  // ── Um artigo por folha (a correr para as seguintes) ───────────────────────
  for (const [ia, a] of e.artigos.entries()) {
    r.novaPagina('papel');
    const kx = r.rotulo(NOME_DA_SECCAO[a.seccao][e.idioma], M, r.y - 8);
    if (a.pais) r.selo(a.pais, M + kx + 8, r.y - 8);
    r.y -= 12;
    r.escrever(a.titulo, f.negra, 26, M, larg, TINTA, 1.06);
    if (a.entrada) {
      r.y -= 4;
      r.escrever(a.entrada, f.italica, 12.5, M, larg, CINZA, 1.35);
    }
    const img = imagens.get(a.id);
    const bytesFoto = e.imagens.get(a.id);
    if (img) {
      r.y -= 10;
      // A fotografia com o destaque em vidro fosco (o primeiro ponto do resumo).
      const cenaFoto = bytesFoto ? await talvez(() => cenaDeFoto(bytesFoto, larg, 220)) : null;
      const destaque = a.analise.resumo[0];
      if (cenaFoto) {
        await r.cena(cenaFoto, M, r.y);
        if (destaque) {
          const wP = Math.min(300, larg * 0.62);
          const linhasD = r.medir(destaque, f.serifa, 10.5, wP - 28, 1.3);
          const hP = Math.min(200, 14 + 12 + linhasD + 14);
          const yFoto = r.y;
          const topo = await talvez(() => r.vidro(cenaFoto, M, yFoto, { x: 12, y: 220 - 12 - hP, w: wP, h: hP, raio: 14 }));
          if (topo !== null) {
            const salva = r.y;
            r.fundo = 'preto';
            r.y = topo - 12;
            r.rotulo(x.resumo, M + 12 + 14, r.y - 6, PAPEL, 6.5);
            r.y -= 8;
            r.escrever(destaque, f.serifa, 10.5, M + 12 + 14, wP - 28, PAPEL, 1.3);
            r.fundo = 'papel';
            r.y = salva;
          }
        }
      } else r.imagem(img, M, r.y, larg, 220);
      r.y -= 222;
      if (a.imagem_credito) {
        r.y -= 9;
        r.page.drawText(r.t(`${x.foto}: ${a.imagem_credito}`), { x: M, y: r.y, size: 7, font: f.sans, color: CINZA });
      }
    }
    r.y -= 8;
    r.filete(r.y, false);
    r.colunasDesde(r.y - 2);

    const an = a.analise;
    const corpo = { fonte: f.serifa, tam: 10.2, justo: true } as const;
    if (an.resumo.length) {
      r.titulo(x.resumo);
      an.resumo.forEach((s, i) => r.correr({ ...corpo, texto: s, antes: i ? 3 : 2, marca: '·' }));
    }
    if (an.interpretacao?.oQue) {
      r.titulo(x.oQue);
      r.correr({ ...corpo, texto: an.interpretacao.oQue, antes: 2 });
    }
    if (an.interpretacao?.porque) {
      r.titulo(x.porque);
      r.correr({ ...corpo, texto: an.interpretacao.porque, antes: 2 });
    }
    if (an.interpretacao?.sinais.length) {
      for (const k of an.interpretacao.sinais.slice(0, 4)) r.correr({ ...corpo, texto: k, antes: 3, marca: '·' });
    }
    if (an.riscos.length) {
      r.titulo(x.riscos);
      for (const k of an.riscos.slice(0, 5)) r.correr({ ...corpo, texto: `${k.titulo}. ${k.descricao}`, antes: 3, marca: '·' });
    }
    if (an.oportunidades.length) {
      r.titulo(x.oportunidades);
      for (const k of an.oportunidades.slice(0, 5)) r.correr({ ...corpo, texto: `${k.titulo}. ${k.descricao}`, antes: 3, marca: '·' });
    }
    if (an.recomendacoes.agir.length) {
      r.titulo(x.agir);
      for (const k of an.recomendacoes.agir.slice(0, 5)) r.correr({ ...corpo, texto: k, antes: 3, marca: '·' });
    }
    const h = an.horizonte;
    if (h && (h.curto || h.medio || h.provavel)) {
      r.titulo(x.horizonte);
      for (const k of [h.curto, h.medio, h.provavel]) if (k) r.correr({ ...corpo, texto: k, antes: 3, marca: '·' });
    }
    if (an.recomendacoes.monitorizar.length) {
      r.titulo(x.monitorizar);
      for (const k of an.recomendacoes.monitorizar.slice(0, 5)) r.correr({ ...corpo, texto: k, antes: 3, marca: '·' });
    }
    if (a.fonte_nome) r.correr({ fonte: f.italica, tam: 8, texto: `${x.fonte}: ${a.fonte_nome}`, antes: 8, cor: CINZA });

    // A análise profunda: um bloco a preto numa folha própria.
    const p = a.profunda;
    if (p) {
      r.novaPagina('preto');
      r.rotulo('ZABATAINA 3000', M, r.y - 8, CINZA_ESCURO);
      r.selo(p.pais, A4.w - M - 110, r.y - 8);
      r.y -= 16;
      // O impacto num painel de vidro sobre a fotografia (ou a luz da AGORAMOZ).
      const tituloImp = `${x.impacto} ${NOME_DO_PAIS[p.pais][e.idioma]}`;
      const textoImp = `${p.impacto.resumo} [${p.impacto.evidencia} · ${NOME_TIPO[p.impacto.tipo][e.idioma]}]`;
      const wImp = larg - 2 * 18 - 2 * 20;
      const hImp = 20 + r.medir(tituloImp, f.negra, 24, wImp, 1.08) + 6 + r.medir(textoImp, f.italica, 11.5, wImp, 1.4) + 20;
      const hCena = hImp + 36;
      const cenaImp =
        (bytesFoto ? await talvez(() => cenaDeFoto(bytesFoto, larg, hCena)) : null) ??
        (await talvez(() => cenaDeCor(larg, hCena, TEMAS[ia % TEMAS.length]!, ia + 2)));
      const yCena = r.y;
      let topoImp: number | null = null;
      if (cenaImp) {
        await r.cena(cenaImp, M, yCena);
        topoImp = await talvez(() => r.vidro(cenaImp, M, yCena, { x: 18, y: 18, w: larg - 36, h: hImp, raio: 16 }));
      }
      r.y = (topoImp ?? yCena) - 20;
      r.escrever(tituloImp, f.negra, 24, M + 38, wImp, PAPEL, 1.08);
      r.y -= 6;
      r.escrever(textoImp, f.italica, 11.5, M + 38, wImp, PAPEL, 1.4);
      r.y = yCena - (cenaImp ? hCena : hImp) - 10;
      r.filete(r.y, false);
      r.colunasDesde(r.y - 2);
      const marcaE = (ev: string, tipo: keyof typeof NOME_TIPO) => ` [${ev} · ${NOME_TIPO[tipo][e.idioma]}]`;
      if (p.riscos.length) {
        r.titulo(x.riscos);
        for (const k of p.riscos) r.correr({ ...corpo, texto: `${k.titulo}. ${k.descricao}${marcaE(k.evidencia, k.tipo)}`, antes: 3, marca: '·' });
      }
      if (p.oportunidades.length) {
        r.titulo(x.oportunidades);
        for (const k of p.oportunidades)
          r.correr({ ...corpo, texto: `${k.titulo}. ${k.descricao}${marcaE(k.evidencia, k.tipo)}`, antes: 3, marca: '·' });
      }
      for (const c of ['base', 'optimista', 'pessimista'] as const) {
        const cen = p.cenarios[c];
        if (!cen) continue;
        r.titulo(x.cenarios[c]);
        r.correr({ ...corpo, texto: cen.descricao, antes: 2 });
      }
      if (p.indicadores.length) {
        r.titulo(x.indicadores);
        for (const k of p.indicadores) r.correr({ ...corpo, texto: `${k.nome}. ${k.porque}`, antes: 3, marca: '·' });
      }
    }

    // A notícia em números: o mapa do país, as séries do documento e as contagens da análise.
    const series = p?.dados ?? [];
    if (a.pais || series.length > 0) {
      r.novaPagina('papel');
      r.rotulo('INFOGRAFIA', M, r.y - 8);
      r.y -= 12;
      r.escrever(x.noticiaNumeros, f.negra, 24, M, larg, TINTA, 1.06);
      r.y -= 2;
      r.escrever(a.titulo, f.italica, 11, M, larg, CINZA, 1.3);
      if (series.length > 0) {
        r.y -= 2;
        r.escrever(x.noticiaLead, f.sans, 7.5, M, larg, CINZA, 1.4);
      }
      r.y -= 14;
      const meia = (larg - 24) / 2;
      const itens: { h: number; desenhar: (xx: number, yy: number) => void }[] = [];
      if (a.pais && series.length === 0 && !p) {
        // Só o mapa: a toda a largura.
        const pais = a.pais;
        r.y -= G.quadro(r.g, M, r.y, larg, `${x.onde}: ${NOME_DO_PAIS[pais][e.idioma]}`, x.fonteMapa, (y) => {
          G.mapaPais(r.g, pais, NOME_DO_PAIS[pais][e.idioma], M, y, larg, larg * 0.625);
          return larg * 0.625;
        });
      } else if (a.pais) {
        const pais = a.pais;
        itens.push({
          h: 26 + meia * 0.625 + 16,
          desenhar: (xx, yy) =>
            G.quadro(r.g, xx, yy, meia, `${x.onde}: ${NOME_DO_PAIS[pais][e.idioma]}`, x.fonteMapa, (y) => {
              G.mapaPais(r.g, pais, NOME_DO_PAIS[pais][e.idioma], xx, y, meia, meia * 0.625);
              return meia * 0.625;
            }),
        });
      }
      for (const s of series) itens.push({ h: G.alturaSerie(s), desenhar: (xx, yy) => G.serie(r.g, xx, yy, meia, s) });
      if (p) {
        const ev = porEvidencia(p).map((c) => ({ rotulo: c.chave, valor: c.n }));
        itens.push({
          h: 26 + ev.length * 15 + 2 + 16,
          desenhar: (xx, yy) => G.quadro(r.g, xx, yy, meia, x.porEvidencia, x.fonteAnaliseUma, (y) => G.barras(r.g, xx, y, meia, ev)),
        });
      }
      // Duas colunas: cada gráfico vai para a coluna mais curta; sem espaço, folha nova.
      const topoGrelha = r.y;
      const yCol = [topoGrelha, topoGrelha];
      for (const it of itens) {
        let k = yCol[0]! >= yCol[1]! ? 0 : 1;
        if (yCol[k]! - it.h < M + 10) {
          r.novaPagina('papel');
          yCol[0] = yCol[1] = r.y - 6;
          k = 0;
        }
        it.desenhar(M + k * (meia + 24), yCol[k]!);
        yCol[k] = yCol[k]! - it.h - 16;
      }
    }
  }

  // ── Página estratégica dos anunciantes (só se houver anúncios) ─────────────
  const ads = [...new Map(e.anuncios.map((a) => [a.id, a])).values()].slice(0, 6);
  if (ads.length > 0) {
    r.novaPagina('preto', false);
    // A página inteira é luz de cor; cada anúncio é um painel de vidro fosco por cima.
    const cenaAds = await talvez(() => cenaDeCor(A4.w, A4.h, 'noite', 7));
    if (cenaAds) await r.cena(cenaAds, 0, A4.h);
    r.cabecalho();
    r.rotulo(x.parceiros, M, r.y - 8, CINZA_ESCURO);
    r.y -= 12;
    r.escrever(x.parceirosTitulo, f.negra, 28, M, larg, PAPEL, 1.06);
    r.y -= 10;
    r.escrever(x.parceirosNota, f.sans, 8.5, M, larg, CINZA_ESCURO, 1.4);
    r.y -= 14;
    const colunas = ads.length > 3 ? 2 : 1;
    const gutter = 14;
    const w = (larg - gutter * (colunas - 1)) / colunas;
    const linhas = Math.ceil(ads.length / colunas);
    const h = Math.min(210, (r.y - M - 30 - gutter * (linhas - 1)) / linhas);
    for (const [i, ad] of ads.entries()) {
      const cx = M + (i % colunas) * (w + gutter);
      const top = r.y - Math.floor(i / colunas) * (h + gutter);
      const salva = r.y;
      await (cenaAds
        ? talvez(() => r.vidro(cenaAds, 0, A4.h, { x: cx, y: A4.h - top, w, h, raio: 16 }))
        : Promise.resolve(r.page.drawRectangle({ x: cx, y: top - h, width: w, height: h, color: rgb(0.16, 0.15, 0.13) })));
      r.y = top - 8;
      r.rotulo(x.publicidade, cx + 14, r.y - 8, CINZA_ESCURO, 6.5);
      r.y -= 14;
      r.escrever(ad.titulo.slice(0, 90), f.negra, 17, cx + 14, w - 28, PAPEL, 1.08);
      if (ad.mensagem) {
        r.y -= 2;
        r.escrever(ad.mensagem.slice(0, 200), f.serifa, 10, cx + 14, w - 28, CINZA_ESCURO, 1.35);
      }
      // A chamada em pílula, com a ligação directa para a oferta.
      const cta = `${r.t(ad.cta)}  ->`;
      const wCta = f.sansForte.widthOfTextAtSize(cta, 9) + 24;
      const yCta = top - h + 14;
      r.page.drawSvgPath(rectArredondado(wCta, 22, 11), { x: cx + 14, y: yCta + 22, color: PAPEL });
      r.page.drawText(cta, { x: cx + 26, y: yCta + 7, size: 9, font: f.sansForte, color: NOITE });
      r.ligacao(urlAnuncio(e.site, ad.id), cx, top - h, w, h);
      r.y = salva;
    }
  }

  // ── Contracapa ─────────────────────────────────────────────────────────────
  r.novaPagina('papel', false);
  r.y = A4.h / 2 + 60;
  const wM = f.mancha.widthOfTextAtSize('AGORAMOZ NEWS', 34);
  r.page.drawText('AGORAMOZ NEWS', { x: (A4.w - wM) / 2, y: r.y, size: 34, font: f.mancha, color: TINTA });
  r.y -= 14;
  r.filete(r.y, true, M + 60, A4.w - M - 60);
  r.y -= 6;
  r.escrever(x.contracapa, f.italica, 13, M + 60, larg - 120, TINTA, 1.4);
  r.y -= 24;
  const online = `${x.lerOnline}: ${e.site.replace(/^https?:\/\//, '')}${e.idioma === 'en' ? '/en' : ''}/news`;
  r.page.drawText(r.t(online), { x: M + 60, y: r.y, size: 10, font: f.sansForte, color: TINTA });
  r.ligacao(`${e.site.replace(/\/$/, '')}${e.idioma === 'en' ? '/en' : ''}/news`, M + 60, r.y - 3, larg - 120, 14);
  r.y = M + 40;
  r.escrever(x.aviso, f.sans, 7.5, M + 60, larg - 120, CINZA, 1.4);

  return pdf.save();
}
