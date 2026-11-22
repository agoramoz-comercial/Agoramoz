import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import fontkit from '@pdf-lib/fontkit';
import {
  LineCapStyle,
  PDFDocument,
  PDFName,
  PDFString,
  StandardFonts,
  rgb,
  setCharacterSpacing,
  type PDFFont,
  type PDFPage,
  type RGB,
} from 'pdf-lib';
import type { Enquadramento } from './enquadramento';

/**
 * O «Enquadramento preliminar» em PDF A4, no design dos relatórios ZABATAINA
 * (o mesmo dos benchmarks): azul eléctrico, papel, lilás e tinta; títulos
 * grandes e leves que dizem a conclusão, «NN.» antes do título, etiqueta e
 * ano no topo, rodapé com número de página; uma página azul de resumo, páginas
 * claras de conteúdo, uma página preta com a mensagem principal.
 *
 * pdf-lib + fontkit, JavaScript puro: corre numa função serverless, sem
 * Chromium. O tipo é o Inter (subconjunto latino em lib/email/fontes, OFL),
 * com todos os acentos de pt/en/fr/es/de. Se as fontes não forem encontradas,
 * cai na Helvetica (WinAnsi) e troca o que ela não sabe desenhar: o documento
 * nunca falha por causa do tipo.
 */

const A4 = { w: 595.28, h: 841.89 } as const;
const M = 44; // margem lateral
const LARG = A4.w - 2 * M;

/** Tokens de reports/assets/report.css (ZABATAINA). */
const Z = {
  blue: hex('#1D2BE6'),
  blueDeep: hex('#131C9C'),
  blue2: hex('#3440EC'),
  peri: hex('#7A80DA'),
  lav: hex('#A9ACE3'),
  lilac: hex('#C8CAEE'),
  zebra: hex('#ECEDF8'),
  ink: hex('#0C0C10'),
  ink2: hex('#15151B'),
  paper: hex('#F4F4F6'),
  white: hex('#FFFFFF'),
  text: hex('#0C0C10'),
  text2: hex('#55555F'),
  muted: hex('#8A8A94'),
  rule: hex('#CFCFD7'),
  good: hex('#1E8E4E'),
  warn: hex('#C99400'),
} as const;

/** Cores de identidade da marca (o logótipo é identidade, não tema). */
const MARCA = { verde: hex('#00b060'), amarelo: hex('#ffd62e'), sinal: hex('#ff3b10') } as const;

function hex(h: string): RGB {
  const n = parseInt(h.slice(1), 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

interface Fontes {
  normal: PDFFont;
  forte: PDFFont;
  leve: PDFFont;
  display: PDFFont;
  /** true quando caiu na Helvetica: o texto passa por `seguro`. */
  padrao: boolean;
}

function lerFonte(nome: string): Uint8Array {
  return readFileSync(join(process.cwd(), 'lib', 'email', 'fontes', nome));
}

async function fontes(pdf: PDFDocument): Promise<Fontes> {
  try {
    pdf.registerFontkit(fontkit);
    // subset: false — o ficheiro já é um subconjunto latino (~70 KB), e o
    // subsetting de CFF do pdf-lib parte glifos em alguns leitores.
    const [normal, forte, leve, display] = await Promise.all([
      pdf.embedFont(lerFonte('Inter-Regular.ttf')),
      pdf.embedFont(lerFonte('Inter-SemiBold.ttf')),
      pdf.embedFont(lerFonte('InterDisplay-Light.ttf')),
      pdf.embedFont(lerFonte('InterDisplay-SemiBold.ttf')),
    ]);
    return { normal, forte, leve, display, padrao: false };
  } catch {
    const normal = await pdf.embedFont(StandardFonts.Helvetica);
    const forte = await pdf.embedFont(StandardFonts.HelveticaBold);
    return { normal, forte, leve: normal, display: forte, padrao: true };
  }
}

/** Troca o que a fonte não sabe desenhar. Nunca lança. */
function seguro(fonte: PDFFont, texto: string): string {
  const limpo = texto.replace(/\r\n?/g, '\n').replace(/\t/g, ' ');
  let out = '';
  for (const ch of limpo) {
    if (ch === '\n') {
      out += ch;
      continue;
    }
    try {
      fonte.encodeText(ch);
      out += ch;
    } catch {
      out += ch === '→' ? '->' : ch === '…' ? '...' : '?';
    }
  }
  return out;
}

/* ---------------------------------------------------------------- desenho */

class Folha {
  constructor(
    readonly page: PDFPage,
    readonly f: Fontes,
  ) {}

  /** y medido de cima (como no CSS). */
  private y(v: number) {
    return A4.h - v;
  }

  rect(x: number, top: number, w: number, h: number, color: RGB, opacity = 1) {
    this.page.drawRectangle({ x, y: this.y(top + h), width: w, height: h, color, opacity });
  }

  /**
   * Degradê vertical em faixas finas e opacas (cores já misturadas): sem
   * transparência sobreposta, não deixa riscas entre faixas.
   */
  degrade(top: number, h: number, de: RGB, para: RGB, ate: number, passos = 64) {
    const fh = h / passos;
    const mix = (a: number, b: number, k: number) => a + (b - a) * k;
    for (let i = 0; i < passos; i++) {
      const k = (ate * (i + 0.5)) / passos;
      const cor = rgb(mix(de.red, para.red, k), mix(de.green, para.green, k), mix(de.blue, para.blue, k));
      this.page.drawRectangle({ x: 0, y: this.y(top + (i + 1) * fh), width: A4.w, height: fh + 0.6, color: cor });
    }
  }

  linha(x1: number, top: number, x2: number, color: RGB, espessura = 0.6) {
    this.page.drawLine({ start: { x: x1, y: this.y(top) }, end: { x: x2, y: this.y(top) }, thickness: espessura, color });
  }

  largura(texto: string, fonte: PDFFont, tam: number, esp = 0) {
    const s = seguro(fonte, texto);
    return fonte.widthOfTextAtSize(s, tam) + esp * Math.max(0, [...s].length - 1);
  }

  /** Texto numa linha. `top` é a linha de base medida de cima. */
  texto(texto: string, x: number, top: number, fonte: PDFFont, tam: number, color: RGB, esp = 0, opacity = 1) {
    const s = seguro(fonte, texto);
    if (esp) this.page.pushOperators(setCharacterSpacing(esp));
    this.page.drawText(s, { x, y: this.y(top), size: tam, font: fonte, color, opacity });
    if (esp) this.page.pushOperators(setCharacterSpacing(0));
  }

  /** Parte o texto em linhas que cabem em `max`. */
  partir(texto: string, fonte: PDFFont, tam: number, max: number, esp = 0): string[] {
    const linhas: string[] = [];
    for (const par of seguro(fonte, texto).split('\n')) {
      let atual = '';
      for (const palavra of par.split(/\s+/).filter(Boolean)) {
        const tenta = atual ? `${atual} ${palavra}` : palavra;
        if (this.largura(tenta, fonte, tam, esp) <= max || !atual) atual = tenta;
        else {
          linhas.push(atual);
          atual = palavra;
        }
      }
      linhas.push(atual);
    }
    return linhas;
  }

  /** Parágrafo; devolve o `top` a seguir à última linha. */
  paragrafo(texto: string, x: number, top: number, max: number, fonte: PDFFont, tam: number, color: RGB, entre = 1.45, esp = 0) {
    const linhas = this.partir(texto, fonte, tam, max, esp);
    let t = top;
    for (const l of linhas) {
      t += tam * entre;
      this.texto(l, x, t - tam * (entre - 1) * 0.5, fonte, tam, color, esp);
    }
    return t;
  }

  /** Etiqueta em maiúsculas espaçadas (o «eyebrow» dos relatórios). */
  etiqueta(texto: string, x: number, top: number, color: RGB, tam = 6.8) {
    this.texto(texto.toLocaleUpperCase('pt'), x, top, this.f.forte, tam, color, 0.75);
  }

  /** Ligação clicável numa área (o anotador de URI do PDF). */
  ligacao(x: number, top: number, w: number, h: number, url: string) {
    const ctx = this.page.doc.context;
    const anot = ctx.register(
      ctx.obj({
        Type: 'Annot',
        Subtype: 'Link',
        Rect: [x, this.y(top + h), x + w, this.y(top)],
        Border: [0, 0, 0],
        A: { Type: 'Action', S: 'URI', URI: PDFString.of(url) },
      }),
    );
    const existentes = this.page.node.Annots();
    if (existentes) existentes.push(anot);
    else this.page.node.set(PDFName.of('Annots'), ctx.obj([anot]));
  }

  /**
   * O logótipo AGORAMOZ (components/brand/Mark.tsx, viewBox 1070×550): três
   * ondas, meia-disco de sinal e o letterform. `cor` pinta o letterform e a
   * onda neutra; as outras três cores são sempre as da identidade.
   */
  marca(x: number, top: number, altura: number, cor: RGB) {
    const k = altura / 550;
    const o = { x, y: this.y(top), scale: k };
    const traco = (d: string, c: RGB) =>
      this.page.drawSvgPath(d, { ...o, borderColor: c, borderWidth: 56, borderLineCap: LineCapStyle.Round });
    traco('M80 70 L268 180', MARCA.verde);
    traco('M22 267 L246 267', cor);
    traco('M80 462 L268 352', MARCA.amarelo);
    this.page.drawSvgPath('M414 150 A 136 136 0 0 0 414 422 Z', { ...o, color: MARCA.sinal });
    this.page.drawSvgPath('M448 8 H463 V542 H448 Z', { ...o, color: cor });
    this.page.drawSvgPath('M515 8 H591 V542 H515 Z', { ...o, color: cor });
    this.page.drawSvgPath('M552 275 A 230 230 0 1 0 1012 275 A 230 230 0 1 0 552 275 Z', {
      ...o,
      borderColor: cor,
      // A espessura também é escalada pelo `scale` do drawSvgPath.
      borderWidth: 112,
    });
  }

  /** Marca + palavra AGORAMOZ, lado a lado. Devolve a largura total. */
  logotipo(x: number, top: number, altura: number, cor: RGB) {
    this.marca(x, top, altura, cor);
    const w = (1070 / 550) * altura;
    const tam = altura * 0.62;
    this.texto('AGORAMOZ', x + w + altura * 0.45, top + altura * 0.72, this.f.forte, tam, cor, tam * 0.06);
    return w + altura * 0.45 + this.largura('AGORAMOZ', this.f.forte, tam, tam * 0.06);
  }
}

type Fundo = 'azul' | 'claro' | 'preto';

const COR_TEXTO: Record<Fundo, { forte: RGB; suave: RGB; etiqueta: RGB; regra: RGB }> = {
  azul: { forte: Z.white, suave: hex('#DDE0FF'), etiqueta: Z.white, regra: hex('#5560F0') },
  claro: { forte: Z.text, suave: Z.text2, etiqueta: Z.text, regra: Z.rule },
  preto: { forte: Z.white, suave: hex('#B9B9C4'), etiqueta: Z.lav, regra: hex('#2A2A33') },
};

/* ---------------------------------------------------------------- páginas */

export interface OpcoesPdf {
  /** Para onde aponta o botão de reunião (Cal.com ou mailto). */
  readonly ligacaoReuniao: string;
  /** Rótulo do botão («Marcar reunião…» ou «Falar com um especialista»). */
  readonly rotuloReuniao: string;
}

export async function gerarPdfEnquadramento(
  doc: Enquadramento,
  agora = new Date(),
  opcoes?: OpcoesPdf,
): Promise<Uint8Array> {
  const t = doc.t;
  const pdf = await PDFDocument.create();
  pdf.setTitle(`${t.titulo} — ${doc.empresa}`);
  pdf.setAuthor('AGORAMOZ');
  pdf.setSubject(t.subtitulo);
  pdf.setCreator('AGORAMOZ · agoramoz.com');
  pdf.setProducer('AGORAMOZ');
  pdf.setLanguage(doc.idioma === 'en' ? 'en-GB' : 'pt-PT');
  pdf.setCreationDate(agora);
  const f = await fontes(pdf);

  const data = new Intl.DateTimeFormat(doc.idioma === 'en' ? 'en-GB' : 'pt-PT', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Africa/Maputo',
  }).format(agora);
  const ano = String(agora.getUTCFullYear());

  const indicados = doc.elegibilidade.filter((c) => c.estado === 'indicado').length;
  const total = doc.elegibilidade.length;
  const aConfirmar = total - indicados;
  const reuniao: OpcoesPdf = opcoes ?? {
    ligacaoReuniao: `mailto:comercial@agoramoz.com?subject=${encodeURIComponent(t.assuntoResposta)}`,
    rotuloReuniao: t.ctaEscrever,
  };

  let numero = 0;
  const nova = (fundo: Fundo, etiqueta: string) => {
    numero += 1;
    const page = pdf.addPage([A4.w, A4.h]);
    const p = new Folha(page, f);
    const c = COR_TEXTO[fundo];
    p.rect(0, 0, A4.w, A4.h, fundo === 'azul' ? Z.blue : fundo === 'preto' ? Z.ink : Z.paper);
    if (fundo === 'azul') p.degrade(A4.h * 0.35, A4.h * 0.65, Z.blue, Z.blueDeep, 0.55);
    // Cabeçalho: etiqueta à esquerda, logótipo e ano à direita.
    p.etiqueta(etiqueta, M, 34, c.etiqueta);
    const wAno = p.largura(ano, f.forte, 11);
    p.texto(ano, A4.w - M - wAno, 36, f.forte, 11, c.forte);
    const marcaCor = fundo === 'claro' ? Z.ink : Z.white;
    const wLogo = (1070 / 550) * 9 + 9 * 0.45 + p.largura('AGORAMOZ', f.forte, 9 * 0.62, 9 * 0.06 * 0.62);
    p.logotipo(A4.w - M - wAno - 16 - wLogo, 28.5, 9, marcaCor);
    // Rodapé.
    if (fundo === 'claro') p.rect(0, A4.h - 40, A4.w, 40, Z.blue);
    const corRodape = fundo === 'claro' ? Z.white : c.forte;
    p.texto('AGORAMOZ', M, A4.h - 22, f.normal, 7, corRodape);
    p.texto(t.titulo, M, A4.h - 13, f.normal, 7, corRodape, 0, 0.85);
    const pag = `${t.pagina} ${String(numero).padStart(2, '0')}`;
    p.texto(pag, A4.w - M - p.largura(pag, f.normal, 7), A4.h - 17, f.normal, 7, corRodape);
    return { p, c };
  };

  /** Título-conclusão «NN. …» + pergunta + entrada. Devolve o `top` seguinte. */
  const cabeca = (p: Folha, c: (typeof COR_TEXTO)[Fundo], n: string, titulo: string, pergunta: string, lead?: string) => {
    p.texto(pergunta, M, 70, f.normal, 8, c.suave);
    let top = p.paragrafo(`${n}. ${titulo}`, M, 78, LARG - 20, f.leve, 27, c.forte, 1.08, -0.6);
    if (lead) top = p.paragrafo(lead, M, top + 10, LARG * 0.78, f.normal, 10, c.suave, 1.5);
    return top;
  };

  /* ---------------------------------------------------- 01 · capa (azul) */
  {
    numero += 1;
    const page = pdf.addPage([A4.w, A4.h]);
    const p = new Folha(page, f);
    p.rect(0, 0, A4.w, A4.h, Z.blue);
    p.degrade(A4.h * 0.3, A4.h * 0.7, Z.blue, Z.blueDeep, 0.6);
    p.logotipo(M, 30, 14, Z.white);
    const wAno = p.largura(ano, f.forte, 12);
    p.texto(ano, A4.w - M - wAno, 42, f.forte, 12, Z.white);

    p.etiqueta(`AGORAMOZ · ${t.fase}`, M, 150, Z.white, 7);
    let top = p.paragrafo(t.titulo, M, 160, LARG, f.leve, 50, Z.white, 1.02, -1.5);
    top = p.paragrafo(t.subtitulo, M, top + 12, LARG * 0.75, f.normal, 11, hex('#DDE0FF'), 1.5);

    // Painel escuro com a marca grande (a «imagem» da capa).
    const painelTop = top + 34;
    const painelH = 230;
    p.rect(M, painelTop, LARG, painelH, Z.ink);
    const alt = 120;
    p.marca(M + (LARG - (1070 / 550) * alt) / 2, painelTop + (painelH - alt) / 2, alt, Z.white);

    // Preparado para.
    let t2 = painelTop + painelH + 34;
    p.etiqueta(t.preparadoPara, M, t2, hex('#DDE0FF'), 6.8);
    t2 = p.paragrafo(doc.empresa, M, t2 + 4, LARG * 0.6, f.display, 17, Z.white, 1.2);
    t2 = p.paragrafo(`${doc.nome} · ${data}`, M, t2, LARG * 0.6, f.normal, 9.5, hex('#DDE0FF'), 1.5);

    // Três números (factos do próprio documento, nunca estimativas).
    const kpi = [
      [`${indicados}/${total}`, t.kpis.indicados],
      [String(doc.entregas.length), t.kpis.entregas],
      [String(t.decisaoOpcoes.length), t.decisaoPedida],
    ] as const;
    const baseK = A4.h - 118;
    kpi.forEach(([v, r], i) => {
      const x = M + i * 128;
      p.texto(v, x, baseK, f.display, 24, Z.white, -0.5);
      p.paragrafo(r, x, baseK + 6, 110, f.normal, 7.5, hex('#DDE0FF'), 1.4);
    });
    const nota = p.partir(data, f.normal, 8, 150);
    nota.forEach((l, i) => p.texto(l, A4.w - M - p.largura(l, f.normal, 8), baseK - 14 + i * 12, f.normal, 8, hex('#DDE0FF')));
    p.rect(0, A4.h - 40, A4.w, 40, Z.ink);
    p.texto('agoramoz.com', M, A4.h - 17, f.normal, 7.5, Z.white);
    const mail = 'comercial@agoramoz.com';
    p.texto(mail, A4.w - M - p.largura(mail, f.normal, 7.5), A4.h - 17, f.normal, 7.5, Z.white);
  }

  /* ---------------------------------------- 02 · resumo executivo (azul) */
  {
    const { p, c } = nova('azul', t.resumo);
    const conclusao = (aConfirmar === 0 ? t.conclusaoTudo : t.conclusao)
      .replace('{n}', String(indicados))
      .replace('{total}', String(total));
    let top = cabeca(p, c, '00', conclusao, t.perguntas.resumo, t.preliminar);

    top += 34;
    const kpi = [
      [`${indicados} / ${total}`, t.kpis.indicados],
      [String(aConfirmar), t.kpis.aConfirmar],
      [String(doc.entregas.length), t.kpis.entregas],
    ] as const;
    kpi.forEach(([v, r], i) => {
      const x = M + i * (LARG / 3);
      p.texto(v, x, top + 30, f.display, 34, Z.white, -0.8);
      p.paragrafo(r, x, top + 36, LARG / 3 - 24, f.normal, 8, c.suave, 1.4);
    });

    // Faixa preta: a decisão desta fase.
    const fTop = 470;
    p.rect(0, fTop, A4.w, 196, Z.ink);
    p.texto(t.decisaoPedida, M, fTop + 36, f.display, 13, Z.white);
    p.paragrafo(t.decisao, M, fTop + 44, LARG, f.normal, 9, hex('#B9B9C4'), 1.5);
    const wTile = (LARG - 16) / 3;
    t.decisaoOpcoes.forEach((o, i) => {
      const x = M + i * (wTile + 8);
      p.rect(x, fTop + 92, wTile, 76, Z.ink2);
      p.rect(x, fTop + 92, wTile, 2, Z.blue);
      p.texto(String(i + 1).padStart(2, '0'), x + 12, fTop + 114, f.forte, 8, Z.lav);
      p.paragrafo(o, x + 12, fTop + 122, wTile - 24, f.display, 13, Z.white, 1.2);
    });
    p.paragrafo(t.fontesTexto, M, A4.h - 112, LARG * 0.85, f.normal, 7, hex('#B4B9FF'), 1.5);
  }

  /* ------------------------------------ 03 · o problema (claro, tabela) */
  {
    const { p, c } = nova('claro', `01 · ${t.seccoes.problema}`);
    let top = cabeca(p, c, '01', t.tituloProblema, t.perguntas.problema);
    top += 22;
    const vazio = t.campos.naoIndicado;
    const grupos: [string, [string, string][]][] = [
      [
        `(01)  ${t.seccoes.problema}`,
        [
          [t.campos.processos, doc.problema.processos.join(' · ')],
          [t.campos.impacto, doc.problema.impacto],
          [t.campos.consequencias, doc.problema.consequencias.join(' · ')],
          [t.campos.sistemas, doc.problema.sistemas],
          [t.campos.decisaoDesejada, doc.problema.decisaoDesejada],
        ],
      ],
      [
        `(02)  ${t.seccoes.contexto}`,
        [
          [t.campos.mercado, doc.contexto.mercado],
          [t.campos.setor, doc.contexto.setor],
          [t.campos.dimensao, doc.contexto.dimensao],
        ],
      ],
      [
        `(03)  ${t.seccoes.sponsor}`,
        [
          [t.campos.papel, doc.sponsor.papel],
          [t.campos.prazo, doc.sponsor.prazo],
          [t.campos.faixa, doc.sponsor.faixa],
        ],
      ],
    ];
    const col1 = 150;
    for (const [titulo, linhas] of grupos) {
      p.etiqueta(titulo, M, top + 12, Z.text, 6.6);
      top += 20;
      p.linha(M, top, M + LARG, Z.ink, 0.9);
      linhas.forEach(([rotulo, valor], i) => {
        const v = valor.trim() || vazio;
        const ls = p.partir(v, f.normal, 8.6, LARG - col1 - 16);
        const h = Math.max(24, 12 + ls.length * 12);
        if (i % 2 === 1) p.rect(M, top, LARG, h, Z.zebra);
        p.texto(rotulo, M + 8, top + 15, f.forte, 8.2, Z.text);
        ls.forEach((l, j) => p.texto(l, M + col1, top + 15 + j * 12, f.normal, 8.6, valor.trim() ? Z.text : Z.muted));
        top += h;
        p.linha(M, top, M + LARG, Z.rule, 0.5);
      });
      top += 16;
    }
  }

  /* ---------------------------------------- 04 · elegibilidade (claro) */
  {
    const { p, c } = nova('claro', `02 · ${t.seccoes.elegibilidade}`);
    let top = cabeca(p, c, '02', t.tituloElegibilidade, t.perguntas.elegibilidade);
    top += 26;
    const cab = [t.seccoes.elegibilidade, '', ''];
    p.etiqueta(cab[0]!, M + 8, top + 10, Z.text, 6.4);
    top += 18;
    p.linha(M, top, M + LARG, Z.ink, 0.9);
    doc.elegibilidade.forEach((cr, i) => {
      const ls = p.partir(cr.detalhe, f.normal, 8.6, LARG - 210);
      const h = Math.max(46, 26 + ls.length * 12);
      if (i % 2 === 1) p.rect(M, top, LARG, h, Z.zebra);
      p.texto(cr.titulo, M + 8, top + 18, f.forte, 9.5, Z.text);
      ls.forEach((l, j) => p.texto(l, M + 8, top + 32 + j * 12, f.normal, 8.6, Z.text2));
      const ok = cr.estado === 'indicado';
      const rot = ok ? t.estados.indicado : t.estados.aConfirmar;
      const w = p.largura(rot, f.forte, 7.5) + 18;
      const cor = ok ? Z.good : Z.warn;
      p.rect(M + LARG - w - 8, top + 10, w, 16, cor, 0.12);
      p.texto(rot, M + LARG - w + 1, top + 21, f.forte, 7.5, cor);
      top += h;
      p.linha(M, top, M + LARG, Z.rule, 0.5);
    });

    // Duas peças de KPI, em azul.
    top += 30;
    const wT = (LARG - 12) / 2;
    (
      [
        [String(indicados), t.kpis.indicados, Z.blue],
        [String(aConfirmar), t.kpis.aConfirmar, Z.ink],
      ] as const
    ).forEach(([v, r, cor], i) => {
      const x = M + i * (wT + 12);
      p.rect(x, top, wT, 96, cor);
      p.texto(v, x + 18, top + 52, f.display, 38, Z.white, -1);
      p.texto(r, x + 18, top + 78, f.normal, 8.5, hex('#DDE0FF'));
    });
    top += 96 + 22;
    p.paragrafo(t.preliminar, M, top, LARG, f.normal, 7.5, Z.muted, 1.5);
  }

  /* -------------------------------- 05 · a mensagem principal (preto) */
  {
    const { p } = nova('preto', `03 · ${t.seccoes.garantias}`);
    p.texto(t.perguntas.garantias, M, 70, f.normal, 8, hex('#B9B9C4'));
    let top = p.paragrafo(t.hero, M, 190, LARG, f.leve, 54, Z.white, 1.02, -1.6);
    top = p.paragrafo(t.heroTexto, M, top + 18, LARG * 0.74, f.normal, 11, hex('#B9B9C4'), 1.55);
    top += 50;
    doc.garantias.forEach((g, i) => {
      p.linha(M, top, M + LARG, hex('#2A2A33'), 0.7);
      p.rect(M, top + 14, 22, 22, Z.blue);
      p.texto(String(i + 1).padStart(2, '0'), M + 5, top + 29, f.forte, 8, Z.white);
      p.texto(g, M + 38, top + 30, f.display, 15, Z.white);
      top += 50;
    });
    p.linha(M, top, M + LARG, hex('#2A2A33'), 0.7);
  }

  /* -------------------- 06 · entregáveis, próximos passos e método */
  {
    const { p, c } = nova('claro', `04 · ${t.seccoes.passos}`);
    let top = cabeca(p, c, '04', t.tituloEntregas, t.perguntas.entregas, t.entregasNota);
    top += 18;
    p.etiqueta(t.seccoes.entregas, M, top + 10, Z.text, 6.4);
    top += 18;
    p.linha(M, top, M + LARG, Z.ink, 0.9);
    const meio = Math.ceil(doc.entregas.length / 2);
    const wCol = (LARG - 20) / 2;
    let fundo = top;
    [doc.entregas.slice(0, meio), doc.entregas.slice(meio)].forEach((col, ci) => {
      let tc = top;
      col.forEach((e, i) => {
        const x = M + ci * (wCol + 20);
        const ls = p.partir(e, f.normal, 9, wCol - 30);
        const h = Math.max(30, 16 + ls.length * 12);
        p.texto(String(ci * meio + i + 1).padStart(2, '0'), x, tc + 19, f.forte, 8, Z.blue);
        ls.forEach((l, j) => p.texto(l, x + 26, tc + 19 + j * 12, f.normal, 9, Z.text));
        tc += h;
        p.linha(x, tc, x + wCol, Z.rule, 0.5);
      });
      fundo = Math.max(fundo, tc);
    });

    top = fundo + 40;
    p.etiqueta(t.seccoes.passos, M, top + 10, Z.text, 6.4);
    top += 22;
    p.linha(M, top, M + LARG, Z.ink, 0.9);
    doc.passos.forEach((s, i) => {
      p.texto(String(i + 1).padStart(2, '0'), M, top + 24, f.display, 15, Z.blue);
      top = p.paragrafo(s, M + 34, top + 8, LARG - 34, f.normal, 10.5, Z.text, 1.45) + 12;
      p.linha(M, top, M + LARG, Z.rule, 0.5);
    });

    // Botão (Cal.com quando existir; senão, e-mail para a equipa).
    top += 28;
    const rot = reuniao.rotuloReuniao;
    const wB = p.largura(rot, f.forte, 10.5) + 44;
    p.rect(M, top, wB, 38, Z.blue);
    p.texto(rot, M + 22, top + 24, f.forte, 10.5, Z.white);
    p.ligacao(M, top, wB, 38, reuniao.ligacaoReuniao);
    p.paragrafo(t.responder, M + wB + 16, top + 6, LARG - wB - 16, f.normal, 8, Z.text2, 1.45);

    // Fontes e método: ancorado ao fundo da página, com a altura do texto.
    const ls = p.partir(t.fontesTexto, f.normal, 7.6, LARG - 32);
    const hBox = 42 + ls.length * 11.4;
    const boxTop = A4.h - 40 - 28 - hBox;
    if (boxTop > top + 60) {
      p.rect(M, boxTop, LARG, hBox, Z.lilac);
      p.texto(t.fontes, M + 16, boxTop + 22, f.forte, 8.6, Z.text);
      p.paragrafo(t.fontesTexto, M + 16, boxTop + 28, LARG - 32, f.normal, 7.6, Z.text2, 1.5);
    }
  }

  return pdf.save();
}
