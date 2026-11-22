import {
  PDFDocument,
  StandardFonts,
  rgb,
  setCharacterSpacing,
  type PDFFont,
  type PDFPage,
  type RGB,
} from 'pdf-lib';
import type { Enquadramento } from './enquadramento';

/**
 * O «Enquadramento preliminar» em PDF A4, com a identidade v3: noite, papel,
 * cinza e âmbar; palavra AGORAMOZ gigante; etiquetas «(01)».
 *
 * pdf-lib, JavaScript puro: corre numa função serverless sem Chromium. O tipo
 * é a Helvetica (neo-grotesca, como o Inter do site) e codifica WinAnsi, que
 * cobre o português e o inglês. Qualquer carácter fora disso — um emoji, uma
 * escrita não latina — é trocado, nunca faz falhar o documento.
 */

const A4 = { w: 595.28, h: 841.89 } as const;
const M = 48; // margem
const COR = {
  noite: hex('#0b0a09'),
  noite2: hex('#151311'),
  papel: hex('#efe8da'),
  papel2: hex('#e4dccb'),
  cinza: hex('#a8a092'),
  terra: hex('#5f584d'),
  ambar: hex('#e9a35c'),
} as const;

function hex(h: string): RGB {
  const n = parseInt(h.slice(1), 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

type Tema = 'noite' | 'papel';

interface Fontes {
  normal: PDFFont;
  forte: PDFFont;
}

/** Troca o que a Helvetica (WinAnsi) não sabe desenhar. Nunca lança. */
function seguro(fonte: PDFFont, texto: string): string {
  const limpo = texto.replace(/\r\n?/g, '\n').replace(/[→➔⟶]/g, '->').replace(/…/g, '...');
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
      out += '?';
    }
  }
  return out;
}

/** Quebra em linhas que cabem em `largura`, respeitando as quebras do texto. */
function linhas(fonte: PDFFont, texto: string, tamanho: number, largura: number): string[] {
  const out: string[] = [];
  for (const paragrafo of seguro(fonte, texto).split('\n')) {
    const palavras = paragrafo.split(/\s+/).filter(Boolean);
    if (!palavras.length) {
      out.push('');
      continue;
    }
    let atual = '';
    for (const p of palavras) {
      const tentativa = atual ? `${atual} ${p}` : p;
      if (fonte.widthOfTextAtSize(tentativa, tamanho) <= largura) atual = tentativa;
      else {
        if (atual) out.push(atual);
        // Uma palavra maior do que a linha parte-se à força.
        let resto = p;
        while (fonte.widthOfTextAtSize(resto, tamanho) > largura && resto.length > 1) {
          let corte = resto.length - 1;
          while (corte > 1 && fonte.widthOfTextAtSize(resto.slice(0, corte), tamanho) > largura) corte -= 1;
          out.push(resto.slice(0, corte));
          resto = resto.slice(corte);
        }
        atual = resto;
      }
    }
    if (atual) out.push(atual);
  }
  return out;
}

/** Um escritor com cursor vertical que abre página nova quando falta espaço. */
class Escritor {
  pagina!: PDFPage;
  y = 0;
  numero = 0;
  constructor(
    private readonly doc: PDFDocument,
    private readonly f: Fontes,
    private readonly rodape: string,
    public tema: Tema,
  ) {}

  get texto(): RGB {
    return this.tema === 'noite' ? COR.papel : COR.noite;
  }
  get suave(): RGB {
    return this.tema === 'noite' ? COR.cinza : COR.terra;
  }
  get linha(): RGB {
    return this.tema === 'noite' ? hex('#2a2724') : hex('#cfc6b4');
  }

  nova(tema: Tema = this.tema) {
    this.tema = tema;
    this.numero += 1;
    this.pagina = this.doc.addPage([A4.w, A4.h]);
    this.pagina.drawRectangle({ x: 0, y: 0, width: A4.w, height: A4.h, color: tema === 'noite' ? COR.noite : COR.papel });
    // Cabeçalho discreto e rodapé com número de página.
    this.pagina.drawText('AGORAMOZ', { x: M, y: A4.h - 32, size: 8, font: this.f.forte, color: this.suave });
    const n = String(this.numero).padStart(2, '0');
    this.pagina.drawText(n, {
      x: A4.w - M - this.f.normal.widthOfTextAtSize(n, 8),
      y: A4.h - 32,
      size: 8,
      font: this.f.normal,
      color: this.suave,
    });
    this.pagina.drawLine({ start: { x: M, y: 40 }, end: { x: A4.w - M, y: 40 }, thickness: 0.5, color: this.linha });
    this.pagina.drawText(seguro(this.f.normal, this.rodape), { x: M, y: 26, size: 7, font: this.f.normal, color: this.suave });
    this.y = A4.h - 64;
  }

  espaco(altura: number) {
    if (this.y - altura < 56) this.nova();
  }

  /** Bloco de texto com quebra de linha; devolve a altura usada. */
  paragrafo(texto: string, o: { tamanho?: number; fonte?: PDFFont; cor?: RGB; largura?: number; x?: number; entrelinha?: number } = {}) {
    const tamanho = o.tamanho ?? 10;
    const fonte = o.fonte ?? this.f.normal;
    const largura = o.largura ?? A4.w - 2 * M;
    const entre = o.entrelinha ?? tamanho * 1.45;
    for (const l of linhas(fonte, texto, tamanho, largura)) {
      this.espaco(entre);
      this.pagina.drawText(l, { x: o.x ?? M, y: this.y - tamanho, size: tamanho, font: fonte, color: o.cor ?? this.texto });
      this.y -= entre;
    }
  }

  etiqueta(numero: string, texto: string) {
    this.espaco(60);
    this.y -= 10;
    this.pagina.drawLine({ start: { x: M, y: this.y }, end: { x: A4.w - M, y: this.y }, thickness: 0.5, color: this.linha });
    this.y -= 18;
    const rotulo = `(${numero})   ${seguro(this.f.forte, texto).toUpperCase()}`;
    this.pagina.pushOperators(setCharacterSpacing(0.8));
    this.pagina.drawText(rotulo, { x: M, y: this.y, size: 8, font: this.f.forte, color: this.tema === 'noite' ? COR.ambar : COR.terra });
    this.pagina.pushOperators(setCharacterSpacing(0));
    this.y -= 18;
  }

  /** Par «campo — valor» em duas colunas. */
  campo(rotulo: string, valor: string) {
    const col = 150;
    const largura = A4.w - 2 * M - col;
    const ls = linhas(this.f.normal, valor || '—', 10, largura);
    const altura = Math.max(1, ls.length) * 14.5 + 6;
    this.espaco(altura);
    this.pagina.drawText(seguro(this.f.normal, rotulo), { x: M, y: this.y - 9, size: 8.5, font: this.f.normal, color: this.suave });
    let y = this.y;
    for (const l of ls) {
      this.pagina.drawText(l, { x: M + col, y: y - 10, size: 10, font: this.f.normal, color: this.texto });
      y -= 14.5;
    }
    this.y -= altura;
  }
}

/** A palavra AGORAMOZ a ocupar a largura útil. */
function palavraGigante(p: PDFPage, f: PDFFont, y: number, cor: RGB) {
  const texto = 'AGORAMOZ';
  const espacamento = -4;
  const base = f.widthOfTextAtSize(texto, 100) + espacamento * (texto.length - 1) * 1;
  const tamanho = Math.min(120, (100 * (A4.w - 2 * M)) / base);
  p.pushOperators(setCharacterSpacing((espacamento * tamanho) / 100));
  p.drawText(texto, { x: M - 2, y, size: tamanho, font: f, color: cor });
  p.pushOperators(setCharacterSpacing(0));
}

function data(idioma: 'pt' | 'en', agora: Date): string {
  return new Intl.DateTimeFormat(idioma === 'pt' ? 'pt-PT' : 'en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Africa/Maputo',
  }).format(agora);
}

export async function gerarPdfEnquadramento(doc: Enquadramento, agora = new Date()): Promise<Uint8Array> {
  const t = doc.t;
  const pdf = await PDFDocument.create();
  pdf.setTitle(`${t.titulo} — ${doc.empresa}`);
  pdf.setAuthor('AGORAMOZ');
  pdf.setSubject(t.subtitulo);
  pdf.setCreator('AGORAMOZ');
  pdf.setProducer('AGORAMOZ');
  pdf.setLanguage(doc.idioma === 'pt' ? 'pt-PT' : 'en-GB');
  pdf.setCreationDate(agora);

  const f: Fontes = {
    normal: await pdf.embedFont(StandardFonts.Helvetica),
    forte: await pdf.embedFont(StandardFonts.HelveticaBold),
  };
  const w = new Escritor(pdf, f, t.rodape, 'noite');

  // ------------------------------------------------------------------ capa
  w.nova('noite');
  const capa = w.pagina;
  // Faixa âmbar fina no topo e a fase.
  capa.drawRectangle({ x: M, y: A4.h - 88, width: 28, height: 2, color: COR.ambar });
  capa.pushOperators(setCharacterSpacing(0.8));
  capa.drawText(seguro(f.forte, t.fase).toUpperCase(), { x: M, y: A4.h - 106, size: 8, font: f.forte, color: COR.ambar });
  capa.pushOperators(setCharacterSpacing(0));

  w.y = A4.h - 200;
  w.paragrafo(t.titulo, { tamanho: 40, fonte: f.normal, entrelinha: 42 });
  w.y -= 8;
  w.paragrafo(t.subtitulo, { tamanho: 13, cor: COR.cinza, entrelinha: 18 });

  w.y -= 40;
  capa.drawText(seguro(f.normal, t.preparadoPara).toUpperCase(), { x: M, y: w.y, size: 7.5, font: f.normal, color: COR.cinza });
  w.y -= 22;
  w.paragrafo(doc.empresa, { tamanho: 20, fonte: f.forte, entrelinha: 24 });
  w.paragrafo(doc.nome, { tamanho: 11, cor: COR.cinza });
  w.paragrafo(data(doc.idioma, agora), { tamanho: 9, cor: COR.cinza });

  // Aviso de documento preliminar, com a barra âmbar à esquerda.
  const aviso = linhas(f.normal, t.preliminar, 9, A4.w - 2 * M - 16);
  const yAviso = 250;
  capa.drawRectangle({ x: M, y: yAviso - aviso.length * 13 + 4, width: 2, height: aviso.length * 13 + 6, color: COR.ambar });
  aviso.forEach((l, i) => capa.drawText(l, { x: M + 14, y: yAviso - i * 13, size: 9, font: f.normal, color: COR.papel }));

  palavraGigante(capa, f.normal, 70, COR.papel);

  // ------------------------------------------------- 01–04 · o enquadramento
  w.nova('papel');
  w.etiqueta('01', t.seccoes.problema);
  w.campo(t.campos.processos, doc.problema.processos.join(' · '));
  w.campo(t.campos.impacto, doc.problema.impacto || t.campos.naoIndicado);
  if (doc.problema.consequencias.length) w.campo(t.campos.consequencias, doc.problema.consequencias.join(' · '));
  if (doc.problema.sistemas) w.campo(t.campos.sistemas, doc.problema.sistemas);
  if (doc.problema.decisaoDesejada) w.campo(t.campos.decisaoDesejada, doc.problema.decisaoDesejada);

  w.etiqueta('02', t.seccoes.contexto);
  w.campo(t.campos.mercado, doc.contexto.mercado);
  w.campo(t.campos.setor, doc.contexto.setor);
  w.campo(t.campos.dimensao, doc.contexto.dimensao);

  w.etiqueta('03', t.seccoes.sponsor);
  w.campo(t.campos.papel, doc.sponsor.papel);
  w.campo(t.campos.prazo, doc.sponsor.prazo);
  w.campo(t.campos.faixa, doc.sponsor.faixa);

  w.etiqueta('04', t.seccoes.elegibilidade);
  for (const c of doc.elegibilidade) {
    const ok = c.estado === 'indicado';
    const rotulo = ok ? t.estados.indicado : t.estados.aConfirmar;
    const ls = linhas(f.normal, c.detalhe, 9, 230);
    const altura = Math.max(2, ls.length + 1) * 13 + 12;
    w.espaco(altura);
    const p = w.pagina;
    p.drawText(seguro(f.forte, c.titulo), { x: M, y: w.y - 11, size: 10.5, font: f.forte, color: w.texto });
    ls.forEach((l, i) => p.drawText(l, { x: M, y: w.y - 26 - i * 13, size: 9, font: f.normal, color: w.suave }));
    // A «pílula» do estado.
    const larg = f.forte.widthOfTextAtSize(rotulo, 8) + 20;
    const x = A4.w - M - larg;
    p.drawRectangle({
      x,
      y: w.y - 16,
      width: larg,
      height: 16,
      color: ok ? COR.noite : COR.ambar,
      borderColor: ok ? COR.noite : COR.ambar,
      borderWidth: 0.5,
    });
    p.drawText(seguro(f.forte, rotulo), { x: x + 10, y: w.y - 11.5, size: 8, font: f.forte, color: ok ? COR.papel : COR.noite });
    w.y -= altura;
    p.drawLine({ start: { x: M, y: w.y + 4 }, end: { x: A4.w - M, y: w.y + 4 }, thickness: 0.4, color: w.linha });
  }

  // ----------------------------------------- 05–08 · decisão e o que segue
  w.nova('noite');
  w.etiqueta('05', t.seccoes.decisao);
  w.paragrafo(t.decisao, { tamanho: 10, cor: COR.cinza });
  w.y -= 6;
  {
    w.espaco(70);
    const p = w.pagina;
    const largura = (A4.w - 2 * M - 16) / 3;
    t.decisaoOpcoes.forEach((op, i) => {
      const x = M + i * (largura + 8);
      p.drawRectangle({ x, y: w.y - 54, width: largura, height: 54, color: COR.noite2, borderColor: hex('#2a2724'), borderWidth: 0.5 });
      p.drawText(String(i + 1).padStart(2, '0'), { x: x + 12, y: w.y - 20, size: 9, font: f.normal, color: COR.ambar });
      p.drawText(seguro(f.forte, op), { x: x + 12, y: w.y - 42, size: 13, font: f.forte, color: COR.papel });
    });
    w.y -= 72;
  }

  w.etiqueta('06', t.seccoes.entregas);
  w.paragrafo(t.entregasNota, { tamanho: 9.5, cor: COR.cinza });
  w.y -= 4;
  doc.entregas.forEach((e, i) => {
    const ls = linhas(f.normal, e, 9.5, A4.w - 2 * M - 34);
    w.espaco(ls.length * 13 + 6);
    w.pagina.drawText(String(i + 1).padStart(2, '0'), { x: M, y: w.y - 9.5, size: 9, font: f.normal, color: COR.ambar });
    ls.forEach((l, j) => w.pagina.drawText(l, { x: M + 34, y: w.y - 9.5 - j * 13, size: 9.5, font: f.normal, color: COR.papel }));
    w.y -= ls.length * 13 + 6;
  });

  w.etiqueta('07', t.seccoes.garantias);
  for (const g of doc.garantias) {
    w.espaco(16);
    w.pagina.drawCircle({ x: M + 3, y: w.y - 6, size: 2, color: COR.ambar });
    w.pagina.drawText(seguro(f.normal, g), { x: M + 14, y: w.y - 9.5, size: 10, font: f.normal, color: COR.papel });
    w.y -= 16;
  }

  w.etiqueta('08', t.seccoes.passos);
  doc.passos.forEach((passo, i) => {
    const ls = linhas(f.normal, passo, 10, A4.w - 2 * M - 34);
    w.espaco(ls.length * 14 + 6);
    w.pagina.drawText(String(i + 1).padStart(2, '0'), { x: M, y: w.y - 10, size: 9, font: f.normal, color: COR.ambar });
    ls.forEach((l, j) => w.pagina.drawText(l, { x: M + 34, y: w.y - 10 - j * 14, size: 10, font: f.normal, color: COR.papel }));
    w.y -= ls.length * 14 + 6;
  });
  w.y -= 10;
  w.paragrafo(t.responder, { tamanho: 9, cor: COR.cinza });

  return pdf.save();
}
