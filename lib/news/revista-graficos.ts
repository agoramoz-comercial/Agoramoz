import { clip, endPath, popGraphicsState, pushGraphicsState, rectangle, rgb, type PDFFont, type PDFPage, type RGB } from 'pdf-lib';
import type { Contagem } from './estatisticas';
import type { PaisCitado, RegiaoCitada } from './geografia';
import { formatarIndicador, formatarVariacao, type PainelIndicadores } from './indicadores';
import { ISO_DO_PAIS, PONTO_DO_PAIS, mapaDoPais, mapaMundo, projectarNoMundo, projectarNoPais } from './mapa';
import type { PaisNews } from './paises';
import type { Serie } from './profunda';

/**
 * Gráficos vectoriais da revista (pdf-lib): barras, colunas, linha, anel e
 * mapas. Os mesmos dados do site — séries do documento e contagens da base —
 * nunca outros. Coordenadas: `yTopo` é o topo da caixa (PDF conta de baixo).
 */

const hex = (h: string) => rgb(parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255);
export const CORES = {
  tinta: hex('#121110'),
  ferrugem: hex('#a8521a'),
  azul: hex('#2f5d73'),
  oliva: hex('#5b6b3a'),
  cinza: hex('#7a6f5f'),
  papel: hex('#f3efe6'),
  papelEscuro: hex('#e6dfd0'),
  terra: hex('#d3cab8'),
  coberto: hex('#b9a27f'),
  linha: hex('#cfc6b4'),
  muted: hex('#4f483e'),
} as const;
const CATEG = [CORES.tinta, CORES.ferrugem, CORES.azul, CORES.oliva, CORES.cinza];

export interface Ctx {
  readonly page: PDFPage;
  readonly sans: PDFFont;
  readonly forte: PDFFont;
  readonly serifa: PDFFont;
  readonly negra: PDFFont;
  readonly t: (s: string) => string;
  readonly idioma: 'pt' | 'en';
}

export const fmt = (v: number, idioma: 'pt' | 'en') =>
  new Intl.NumberFormat(idioma === 'en' ? 'en-GB' : 'pt-PT', { maximumFractionDigits: 2 })
    .format(v)
    .replace(/[  ]/g, ' ');

function comUnidade(v: number, u: string, idioma: 'pt' | 'en') {
  return u === '%' ? `${fmt(v, idioma)}%` : u ? `${fmt(v, idioma)} ${u}` : fmt(v, idioma);
}

function cortar(c: Ctx, s: string, f: PDFFont, tam: number, w: number): string {
  let x = c.t(s);
  while (x.length > 4 && f.widthOfTextAtSize(x, tam) > w) x = `${x.slice(0, -4)}...`;
  return x;
}

export interface Ponto {
  readonly rotulo: string;
  readonly valor: number;
}

/** Título do gráfico com filete e a fonte por baixo; devolve a altura total. */
export function quadro(
  c: Ctx,
  x: number,
  yTopo: number,
  w: number,
  titulo: string,
  fonte: string,
  corpo: (yTopo: number) => number,
): number {
  c.page.drawLine({ start: { x, y: yTopo }, end: { x: x + w, y: yTopo }, thickness: 1.2, color: CORES.tinta });
  // Título em até duas linhas.
  const palavras = c.t(titulo).split(' ');
  let l1 = '';
  while (palavras.length && c.negra.widthOfTextAtSize(`${l1} ${palavras[0]}`.trim(), 11.5) <= w) l1 = `${l1} ${palavras.shift()}`.trim();
  const l2 = palavras.length ? cortar(c, palavras.join(' '), c.negra, 11.5, w) : '';
  c.page.drawText(l1, { x, y: yTopo - 15, size: 11.5, font: c.negra, color: CORES.tinta });
  if (l2) c.page.drawText(l2, { x, y: yTopo - 29, size: 11.5, font: c.negra, color: CORES.tinta });
  const extra = l2 ? 14 : 0;
  const h = corpo(yTopo - 26 - extra) + extra;
  const yF = yTopo - 26 - h - 12;
  c.page.drawLine({ start: { x, y: yF + 8 }, end: { x: x + w, y: yF + 8 }, thickness: 0.4, color: CORES.linha });
  c.page.drawText(cortar(c, `${c.idioma === 'en' ? 'Source' : 'Fonte'}: ${fonte}`, c.sans, 6.5, w), {
    x,
    y: yF,
    size: 6.5,
    font: c.sans,
    color: CORES.muted,
  });
  return yTopo - yF + 4;
}

export function barras(c: Ctx, x: number, yTopo: number, w: number, pontos: readonly Ponto[], unidade = ''): number {
  const min = Math.min(0, ...pontos.map((p) => p.valor));
  const max = Math.max(0, ...pontos.map((p) => p.valor));
  const amp = max - min || 1;
  const rot = Math.min(110, w * 0.36);
  const larg = (w - rot - 46) * 1;
  const imax = pontos.reduce((m, p, i) => (p.valor > pontos[m]!.valor ? i : m), 0);
  const alt = 15;
  pontos.forEach((p, i) => {
    const y = yTopo - (i + 1) * alt;
    c.page.drawText(cortar(c, p.rotulo, c.sans, 7.5, rot - 6), { x, y: y + 4, size: 7.5, font: c.sans, color: CORES.tinta });
    const x0 = x + rot + ((Math.min(p.valor, 0) - min) / amp) * larg;
    const bw = Math.max(0.8, (Math.abs(p.valor) / amp) * larg);
    c.page.drawRectangle({ x: x0, y: y + 2, width: bw, height: 9, color: i === imax ? CORES.ferrugem : CORES.tinta });
    c.page.drawText(c.t(comUnidade(p.valor, unidade, c.idioma)), {
      x: x + rot + ((Math.max(p.valor, 0) - min) / amp) * larg + 4,
      y: y + 4,
      size: 7.5,
      font: c.forte,
      color: CORES.tinta,
    });
  });
  if (min < 0) {
    const xz = x + rot + ((0 - min) / amp) * larg;
    c.page.drawLine({ start: { x: xz, y: yTopo }, end: { x: xz, y: yTopo - pontos.length * alt }, thickness: 0.5, color: CORES.muted });
  }
  return pontos.length * alt + 2;
}

export function colunas(c: Ctx, x: number, yTopo: number, w: number, pontos: readonly Ponto[], unidade = '', h = 110): number {
  const max = Math.max(...pontos.map((p) => Math.abs(p.valor)), 1e-9);
  const passo = w / pontos.length;
  const bw = Math.min(56, passo * 0.62);
  const base = yTopo - h + 14;
  pontos.forEach((p, i) => {
    const cx = x + passo * i + passo / 2;
    const bh = Math.max(1, (Math.abs(p.valor) / max) * (h - 40));
    c.page.drawRectangle({ x: cx - bw / 2, y: base, width: bw, height: bh, color: i === pontos.length - 1 ? CORES.ferrugem : CORES.tinta });
    const v = c.t(comUnidade(p.valor, unidade, c.idioma));
    c.page.drawText(v, { x: cx - c.forte.widthOfTextAtSize(v, 8) / 2, y: base + bh + 4, size: 8, font: c.forte, color: CORES.tinta });
    const r = cortar(c, p.rotulo, c.sans, 7, passo - 4);
    c.page.drawText(r, { x: cx - c.sans.widthOfTextAtSize(r, 7) / 2, y: base - 10, size: 7, font: c.sans, color: CORES.tinta });
  });
  c.page.drawLine({ start: { x, y: base }, end: { x: x + w, y: base }, thickness: 0.7, color: CORES.tinta });
  return h;
}

export function linha(c: Ctx, x: number, yTopo: number, w: number, pontos: readonly Ponto[], unidade = '', h = 110): number {
  const vs = pontos.map((p) => p.valor);
  const y0 = Math.min(0, ...vs);
  const y1 = Math.max(...vs) || 1;
  const m = { l: 26, r: 8, t: 14, b: 16 };
  const X = (i: number) => x + m.l + (i * (w - m.l - m.r)) / Math.max(1, pontos.length - 1);
  const Y = (v: number) => yTopo - h + m.b + ((v - y0) / (y1 - y0 || 1)) * (h - m.t - m.b);
  // Só o zero e o máximo (um valor do documento) levam número: nada calculado no eixo.
  for (const v of [y0, (y0 + y1) / 2, y1]) {
    c.page.drawLine({ start: { x: x + m.l, y: Y(v) }, end: { x: x + w - m.r, y: Y(v) }, thickness: 0.35, color: CORES.linha });
    if (v !== y0 && v !== y1) continue;
    const s = c.t(fmt(v, c.idioma));
    c.page.drawText(s, { x: x + m.l - 4 - c.sans.widthOfTextAtSize(s, 6.5), y: Y(v) - 2, size: 6.5, font: c.sans, color: CORES.muted });
  }
  for (let i = 1; i < pontos.length; i++)
    c.page.drawLine({ start: { x: X(i - 1), y: Y(vs[i - 1]!) }, end: { x: X(i), y: Y(vs[i]!) }, thickness: 1.6, color: CORES.tinta });
  pontos.forEach((p, i) => {
    const ult = i === pontos.length - 1;
    c.page.drawCircle({ x: X(i), y: Y(p.valor), size: ult ? 3 : 2.2, color: ult ? CORES.ferrugem : CORES.tinta, borderColor: CORES.papel, borderWidth: 0.8 });
    if (ult || i === 0) {
      const s = c.t(comUnidade(p.valor, unidade, c.idioma));
      const sw = c.forte.widthOfTextAtSize(s, 7.5);
      c.page.drawText(s, { x: ult ? X(i) - sw : X(i), y: Y(p.valor) + 6, size: 7.5, font: c.forte, color: CORES.tinta });
    }
    if (i % Math.ceil(pontos.length / 6) === 0 || ult) {
      const r = cortar(c, p.rotulo, c.sans, 6.5, 50);
      c.page.drawText(r, { x: X(i) - c.sans.widthOfTextAtSize(r, 6.5) / 2, y: yTopo - h + 3, size: 6.5, font: c.sans, color: CORES.tinta });
    }
  });
  return h;
}

/** Anel de partes de um todo; a legenda à direita. */
export function anel(c: Ctx, x: number, yTopo: number, w: number, pontos: readonly Ponto[]): number {
  const R = 46;
  const r = 28;
  const cx = R;
  const cy = R;
  let a = -Math.PI / 2;
  const p = (rad: number, ang: number) => `${(cx + rad * Math.cos(ang)).toFixed(2)},${(cy + rad * Math.sin(ang)).toFixed(2)}`;
  pontos.forEach((pt, i) => {
    const a0 = a;
    const a1 = a + (pt.valor / 100) * Math.PI * 2;
    a = a1;
    const g = a1 - a0 > Math.PI ? 1 : 0;
    const d = `M${p(R, a0)} A${R},${R} 0 ${g} 1 ${p(R, a1)} L${p(r, a1)} A${r},${r} 0 ${g} 0 ${p(r, a0)} Z`;
    c.page.drawSvgPath(d, { x, y: yTopo, color: CATEG[i % CATEG.length], borderColor: CORES.papel, borderWidth: 0.8 });
  });
  pontos.forEach((pt, i) => {
    const y = yTopo - 14 - i * 14;
    c.page.drawRectangle({ x: x + 2 * R + 16, y, width: 7, height: 7, color: CATEG[i % CATEG.length] });
    c.page.drawText(cortar(c, pt.rotulo, c.sans, 7.5, w - 2 * R - 70), { x: x + 2 * R + 28, y: y + 1, size: 7.5, font: c.sans, color: CORES.tinta });
    const v = c.t(`${fmt(pt.valor, c.idioma)}%`);
    c.page.drawText(v, { x: x + w - c.forte.widthOfTextAtSize(v, 7.5), y: y + 1, size: 7.5, font: c.forte, color: CORES.tinta });
  });
  return 2 * R + 4;
}

/** Uma série no gráfico certo (as mesmas regras do site). */
export function serie(c: Ctx, x: number, yTopo: number, w: number, s: Serie): number {
  const soma = s.pontos.reduce((t, p) => t + p.valor, 0);
  return quadro(c, x, yTopo, w, s.titulo, s.fonte, (y) =>
    s.tipo === 'linha'
      ? linha(c, x, y, w, s.pontos, s.unidade)
      : s.tipo === 'percentagem' && soma <= 100.5 && s.pontos.length <= 6
        ? anel(c, x, y, w, s.pontos)
        : s.tipo === 'comparacao' && s.pontos.length <= 6
          ? colunas(c, x, y, w, s.pontos, s.unidade)
          : barras(c, x, y, w, s.pontos, s.tipo === 'percentagem' ? '%' : s.unidade),
  );
}

/** O país da notícia na sua região, em vector. */
export function mapaPais(c: Ctx, pais: PaisNews, nome: string, x: number, yTopo: number, w: number, h: number): void {
  const m = mapaDoPais(pais, 640, 400);
  const k = Math.min(w / m.largura, h / m.altura);
  c.page.drawRectangle({ x, y: yTopo - m.altura * k, width: m.largura * k, height: m.altura * k, color: CORES.papelEscuro });
  // Os vizinhos saem do quadro: recorta-se à caixa do mapa.
  c.page.pushOperators(pushGraphicsState(), rectangle(x, yTopo - m.altura * k, m.largura * k, m.altura * k), clip(), endPath());
  for (const p of m.paises) c.page.drawSvgPath(p.d, { x, y: yTopo, scale: k, color: CORES.terra, borderColor: CORES.papel, borderWidth: 0.5 });
  c.page.drawSvgPath(m.destaque, { x, y: yTopo, scale: k, color: CORES.tinta, borderColor: CORES.papel, borderWidth: 0.6 });
  c.page.pushOperators(popGraphicsState());
  const [mx, my] = m.marcador;
  const px = x + mx * k;
  const py = yTopo - my * k;
  c.page.drawCircle({ x: px, y: py, size: 9, borderColor: CORES.ferrugem, borderWidth: 1.4 });
  c.page.drawCircle({ x: px, y: py, size: 3.2, color: CORES.ferrugem, borderColor: CORES.papel, borderWidth: 0.8 });
  const s = c.t(nome);
  const sw = c.forte.widthOfTextAtSize(s, 9);
  const lx = Math.min(px + 14, x + m.largura * k - sw - 10);
  c.page.drawRectangle({ x: lx - 4, y: py - 6, width: sw + 8, height: 14, color: CORES.papel });
  c.page.drawText(s, { x: lx, y: py - 2, size: 9, font: c.forte, color: CORES.tinta });
}

/** O mundo com um círculo por país coberto, do tamanho do número real de artigos. */
export function mapaCobertura(c: Ctx, contagens: readonly Contagem<PaisNews>[], x: number, yTopo: number, w: number): number {
  const m = mapaMundo();
  const k = w / m.largura;
  const cobertos = new Set(contagens.map((x) => ISO_DO_PAIS[x.chave]));
  c.page.drawSvgPath(m.contorno, { x, y: yTopo, scale: k, color: CORES.papelEscuro });
  for (const p of m.paises)
    c.page.drawSvgPath(p.d, { x, y: yTopo, scale: k, color: cobertos.has(p.id) ? CORES.coberto : CORES.terra, borderColor: CORES.papel, borderWidth: 0.3 });
  const max = Math.max(1, ...contagens.map((x) => x.n));
  for (const ct of contagens) {
    const [px, py] = m.pontos[ct.chave];
    const r = 6 + 8 * Math.sqrt(ct.n / max);
    const X = x + px * k;
    const Y = yTopo - py * k;
    c.page.drawCircle({ x: X, y: Y, size: r, color: CORES.ferrugem, opacity: 0.9, borderColor: CORES.papel, borderWidth: 0.8 });
    const s = String(ct.n);
    c.page.drawText(s, { x: X - c.forte.widthOfTextAtSize(s, 7.5) / 2, y: Y - 2.6, size: 7.5, font: c.forte, color: CORES.papel });
    const cod = ct.chave.toUpperCase();
    c.page.drawText(cod, { x: X - c.forte.widthOfTextAtSize(cod, 6) / 2, y: Y - r - 7, size: 6, font: c.forte, color: CORES.tinta });
  }
  return m.altura * k;
}

/** O país com as regiões citadas, numeradas; a legenda vai por baixo. Devolve a altura. */
export function mapaRegioes(c: Ctx, pais: PaisNews, regioes: readonly RegiaoCitada[], x: number, yTopo: number, w: number): number {
  const m = mapaDoPais(pais, 640, 400);
  const k = w / m.largura;
  const h = m.altura * k;
  c.page.drawRectangle({ x, y: yTopo - h, width: w, height: h, color: CORES.papelEscuro });
  c.page.pushOperators(pushGraphicsState(), rectangle(x, yTopo - h, w, h), clip(), endPath());
  for (const p of m.paises) c.page.drawSvgPath(p.d, { x, y: yTopo, scale: k, color: CORES.terra, borderColor: CORES.papel, borderWidth: 0.5 });
  c.page.drawSvgPath(m.destaque, { x, y: yTopo, scale: k, color: hex('#3a352f'), borderColor: CORES.papel, borderWidth: 0.6 });
  c.page.pushOperators(popGraphicsState());
  const pts = projectarNoPais(pais, regioes.map((r) => [r.lon, r.lat] as const), 640, 400);
  pts.forEach((xy, i) => {
    if (!xy) return;
    const X = x + xy[0] * k;
    const Y = yTopo - xy[1] * k;
    c.page.drawCircle({ x: X, y: Y, size: 7.5, color: CORES.ferrugem, borderColor: CORES.papel, borderWidth: 0.8 });
    const n = String(i + 1);
    c.page.drawText(n, { x: X - c.forte.widthOfTextAtSize(n, 7.5) / 2, y: Y - 2.7, size: 7.5, font: c.forte, color: CORES.papel });
  });
  // Legenda numerada em duas colunas.
  let y = yTopo - h - 12;
  const meia = (w - 12) / 2;
  regioes.forEach((r, i) => {
    const col = i % 2;
    if (col === 0 && i > 0) y -= 12;
    const txt = `${i + 1}  ${r.nome}${pts[i] ? '' : c.idioma === 'en' ? ' (outside frame)' : ' (fora do quadro)'}`;
    c.page.drawText(cortar(c, txt, c.sans, 8, meia), { x: x + col * (meia + 12), y, size: 8, font: c.sans, color: CORES.tinta });
  });
  return h + 12 + Math.ceil(regioes.length / 2) * 12;
}

/** O mundo com o país da notícia ligado por arcos aos países citados. Devolve a altura. */
export function mapaLigacoes(c: Ctx, pais: PaisNews, parceiros: readonly PaisCitado[], x: number, yTopo: number, w: number): number {
  const m = mapaMundo();
  const k = w / m.largura;
  c.page.drawSvgPath(m.contorno, { x, y: yTopo, scale: k, color: CORES.papelEscuro });
  for (const p of m.paises)
    c.page.drawSvgPath(p.d, { x, y: yTopo, scale: k, color: p.id === ISO_DO_PAIS[pais] ? CORES.tinta : CORES.terra, borderColor: CORES.papel, borderWidth: 0.3 });
  const [o, ...ds] = projectarNoMundo([PONTO_DO_PAIS[pais], ...parceiros.map((p) => [p.lon, p.lat] as const)]);
  const [ox, oy] = o!;
  ds.forEach(([dx, dy], i) => {
    const mx = (ox + dx) / 2;
    const my = Math.min(oy, dy) - Math.hypot(dx - ox, dy - oy) * 0.25;
    c.page.drawSvgPath(`M${ox},${oy} Q${mx},${my} ${dx},${dy}`, { x, y: yTopo, scale: k, borderColor: CORES.ferrugem, borderWidth: 1.2 });
    const X = x + dx * k;
    const Y = yTopo - dy * k;
    c.page.drawCircle({ x: X, y: Y, size: 2.8, color: CORES.ferrugem, borderColor: CORES.papel, borderWidth: 0.6 });
    const nome = c.idioma === 'en' ? parceiros[i]!.en : parceiros[i]!.pt;
    const s = cortar(c, nome, c.forte, 6.5, 90);
    const sw = c.forte.widthOfTextAtSize(s, 6.5);
    c.page.drawRectangle({ x: X - sw / 2 - 2, y: Y + 4, width: sw + 4, height: 9, color: CORES.papel, opacity: 0.85 });
    c.page.drawText(s, { x: X - sw / 2, y: Y + 6.2, size: 6.5, font: c.forte, color: CORES.tinta });
  });
  c.page.drawCircle({ x: x + ox * k, y: yTopo - oy * k, size: 4, color: CORES.tinta, borderColor: CORES.papel, borderWidth: 1 });
  return m.altura * k;
}

/** Os indicadores oficiais em cartões: valor e ano, variação e tendência. Devolve a altura. */
export function indicadores(c: Ctx, p: PainelIndicadores, x: number, yTopo: number, w: number): number {
  const cols = 2;
  const gap = 12;
  const cw = (w - gap * (cols - 1)) / cols;
  const ch = 78;
  p.itens.forEach((i, n) => {
    const cx = x + (n % cols) * (cw + gap);
    const top = yTopo - Math.floor(n / cols) * (ch + gap);
    c.page.drawRectangle({ x: cx, y: top - ch, width: cw, height: ch, color: CORES.papelEscuro });
    const nome = c.idioma === 'en' ? i.def.en : i.def.pt;
    c.page.drawText(cortar(c, nome.toUpperCase(), c.forte, 6.5, cw - 16), { x: cx + 8, y: top - 13, size: 6.5, font: c.forte, color: CORES.muted });
    const v = c.t(formatarIndicador(i.ultimo.valor, i.def, c.idioma));
    c.page.drawText(v, { x: cx + 8, y: top - 33, size: 15, font: c.negra, color: CORES.tinta });
    const vw = c.negra.widthOfTextAtSize(v, 15);
    c.page.drawText(String(i.ultimo.ano), { x: cx + 12 + vw, y: top - 33, size: 7.5, font: c.sans, color: CORES.muted });
    if (i.variacao !== null) {
      const ant = i.serie[i.serie.length - 2]!.ano;
      const t = c.t(`${formatarVariacao(i.variacao, i.def, c.idioma)} ${c.idioma === 'en' ? 'vs' : 'face a'} ${ant}`);
      c.page.drawText(t, { x: cx + 8, y: top - 45, size: 7, font: c.sans, color: CORES.tinta });
    }
    // Tendência
    const vs = i.serie.map((s) => s.valor);
    const min = Math.min(...vs);
    const amp = Math.max(...vs) - min || 1;
    const sx = cx + 8;
    const sw = cw - 16;
    const sy = top - ch + 8;
    const sh = 18;
    const px = (k: number) => (i.serie.length === 1 ? sx + sw / 2 : sx + (k * sw) / (i.serie.length - 1));
    const py = (val: number) => sy + (sh * (val - min)) / amp;
    for (let k = 1; k < i.serie.length; k++)
      c.page.drawLine({ start: { x: px(k - 1), y: py(i.serie[k - 1]!.valor) }, end: { x: px(k), y: py(i.serie[k]!.valor) }, thickness: 1, color: CORES.tinta });
    const u = i.serie.length - 1;
    c.page.drawCircle({ x: px(u), y: py(i.serie[u]!.valor), size: 1.8, color: CORES.ferrugem });
    const r = `${i.serie[0]!.ano}–${i.ultimo.ano}`;
    c.page.drawText(c.t(r), { x: cx + cw - 8 - c.sans.widthOfTextAtSize(c.t(r), 6), y: top - 13, size: 6, font: c.sans, color: CORES.muted });
  });
  return Math.ceil(p.itens.length / cols) * (ch + gap) - gap;
}

export type { RGB };

/** Altura que `serie()` vai ocupar (para paginar antes de desenhar). */
export function alturaSerie(s: Serie): number {
  const soma = s.pontos.reduce((t, p) => t + p.valor, 0);
  const corpo =
    s.tipo === 'linha'
      ? 110
      : s.tipo === 'percentagem' && soma <= 100.5 && s.pontos.length <= 6
        ? 96
        : s.tipo === 'comparacao' && s.pontos.length <= 6
          ? 110
          : s.pontos.length * 15 + 2;
  return 26 + corpo + 30;
}
