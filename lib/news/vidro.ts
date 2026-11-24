import sharp from 'sharp';

/**
 * Vidro fosco a sério para a revista em PDF. O PDF não sabe desfocar o que
 * está por trás de um painel, por isso faz-se aqui, no servidor (sharp):
 *
 * 1. `cena()` prepara o fundo exactamente como vai ser desenhado na página
 *    (fotografia em «cover», ou um gradiente de cor AGORAMOZ);
 * 2. `vidro()` recorta desse fundo a região por trás do painel, desfoca-a,
 *    aviva a cor, junta a tinta do vidro, o brilho em gradiente e o reflexo
 *    da aresta, e recorta os cantos arredondados (PNG com transparência).
 *
 * A borda clara de 0,5 pt desenha-se depois no PDF, em vector. Tudo em
 * «pixels de cena»: `k` píxeis por ponto PDF.
 */

export const K = 2;

export interface Cena {
  /** O fundo, já do tamanho da caixa (JPEG para embutir no PDF). */
  readonly jpeg: Buffer;
  /** O mesmo fundo em bruto, para recortar os painéis. */
  readonly bruto: { data: Buffer; largura: number; altura: number };
  readonly wPt: number;
  readonly hPt: number;
}

export type Tema = 'tinta' | 'energia' | 'crescimento' | 'noite';

/** Gradientes AGORAMOZ (luzes âmbar, violeta e verde-mar sobre a noite). */
const LUZES: Record<Tema, [string, string, string]> = {
  tinta: ['#e9a35c', '#6d5bd0', '#1f6f6b'],
  energia: ['#f0b24a', '#c2512a', '#3a2a7a'],
  crescimento: ['#4fae8b', '#e9a35c', '#2f5d73'],
  noite: ['#e9a35c', '#7a5cff', '#2f5d73'],
};

function svgGradiente(w: number, h: number, tema: Tema, semente: number): Buffer {
  const [a, b, c] = LUZES[tema];
  const s = (n: number) => ((Math.sin(semente * 12.9898 + n * 78.233) * 43758.5453) % 1 + 1) % 1;
  const bolha = (cor: string, i: number, r: number) =>
    `<circle cx="${(0.15 + 0.7 * s(i)) * w}" cy="${(0.1 + 0.8 * s(i + 7)) * h}" r="${r * Math.max(w, h)}" fill="url(#g${i})"/>` +
    `<defs><radialGradient id="g${i}"><stop offset="0" stop-color="${cor}" stop-opacity="0.95"/><stop offset="1" stop-color="${cor}" stop-opacity="0"/></radialGradient></defs>`;
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="100%" height="100%" fill="#0b0a09"/>` +
      bolha(a, 1, 0.55) +
      bolha(b, 2, 0.5) +
      bolha(c, 3, 0.42) +
      bolha(a, 4, 0.28) +
      `</svg>`,
  );
}

async function terminar(img: ReturnType<typeof sharp>, wPt: number, hPt: number): Promise<Cena> {
  const { data, info } = await img.clone().removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const jpeg = await sharp(data, { raw: { width: info.width, height: info.height, channels: info.channels } })
    .jpeg({ quality: 82, mozjpeg: true })
    .toBuffer();
  return { jpeg, bruto: { data, largura: info.width, altura: info.height }, wPt, hPt };
}

/** Uma fotografia em «cover» numa caixa de `wPt` × `hPt` pontos. */
export async function cenaDeFoto(foto: Uint8Array, wPt: number, hPt: number): Promise<Cena> {
  const img = sharp(foto).rotate().resize(Math.round(wPt * K), Math.round(hPt * K), { fit: 'cover', position: 'centre' });
  return terminar(img, wPt, hPt);
}

/** Um gradiente de cor AGORAMOZ numa caixa de `wPt` × `hPt` pontos (desfocado: luz, não formas). */
export async function cenaDeCor(wPt: number, hPt: number, tema: Tema = 'noite', semente = 1): Promise<Cena> {
  const w = Math.round(wPt * K);
  const h = Math.round(hPt * K);
  const img = sharp(svgGradiente(w, h, tema, semente)).blur(Math.max(8, Math.round(Math.min(w, h) * 0.03)));
  return terminar(img, wPt, hPt);
}

export interface Painel {
  /** Posição dentro da cena, em pontos, a partir do canto SUPERIOR esquerdo. */
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  readonly raio?: number;
  /** Vidro escuro (texto claro por cima) ou claro. */
  readonly tom?: 'escuro' | 'claro';
  /** Desfoque em pontos (por omissão 14). */
  readonly desfoque?: number;
}

/** O painel de vidro: PNG do tamanho exacto do painel, com cantos transparentes. */
export async function vidro(c: Cena, p: Painel): Promise<Buffer> {
  const r = Math.round((p.raio ?? 16) * K);
  const left = Math.max(0, Math.round(p.x * K));
  const top = Math.max(0, Math.round(p.y * K));
  const width = Math.min(c.bruto.largura - left, Math.round(p.w * K));
  const height = Math.min(c.bruto.altura - top, Math.round(p.h * K));
  const sigma = (p.desfoque ?? 14) * K * 0.5;
  // Recorta com margem para o desfoque não escurecer as arestas.
  const marg = Math.ceil(sigma * 2);
  const ex = {
    left: Math.max(0, left - marg),
    top: Math.max(0, top - marg),
    width: 0,
    height: 0,
  };
  ex.width = Math.min(c.bruto.largura, left + width + marg) - ex.left;
  ex.height = Math.min(c.bruto.altura, top + height + marg) - ex.top;
  const desfocado = await sharp(c.bruto.data, { raw: { width: c.bruto.largura, height: c.bruto.altura, channels: 3 } })
    .extract(ex)
    .blur(sigma)
    .modulate({ saturation: 1.35, brightness: p.tom === 'claro' ? 1.12 : 1.02 })
    .extract({ left: left - ex.left, top: top - ex.top, width, height })
    .png()
    .toBuffer();
  const escuro = p.tom !== 'claro';
  const capa = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">` +
      `<defs>` +
      `<linearGradient id="brilho" x1="0" y1="0" x2="0.9" y2="1">` +
      `<stop offset="0" stop-color="#ffffff" stop-opacity="${escuro ? 0.26 : 0.5}"/>` +
      `<stop offset="0.38" stop-color="#ffffff" stop-opacity="${escuro ? 0.06 : 0.16}"/>` +
      `<stop offset="1" stop-color="#ffffff" stop-opacity="0"/></linearGradient>` +
      `<linearGradient id="aresta" x1="0" y1="0" x2="0" y2="1">` +
      `<stop offset="0" stop-color="#ffffff" stop-opacity="0.55"/><stop offset="0.5" stop-color="#ffffff" stop-opacity="0.08"/>` +
      `<stop offset="1" stop-color="#ffffff" stop-opacity="0.3"/></linearGradient>` +
      `</defs>` +
      `<rect width="100%" height="100%" fill="${escuro ? '#0b0a09' : '#f3efe6'}" fill-opacity="${escuro ? 0.5 : 0.34}"/>` +
      `<rect width="100%" height="100%" fill="url(#brilho)"/>` +
      `<rect x="${K}" y="${K}" width="${width - 2 * K}" height="${height - 2 * K}" rx="${r - K}" fill="none" stroke="url(#aresta)" stroke-width="${K * 1.4}"/>` +
      `</svg>`,
  );
  const mascara = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" rx="${r}" fill="#fff"/></svg>`,
  );
  return sharp(desfocado)
    .ensureAlpha()
    .composite([
      { input: capa, blend: 'over' },
      { input: mascara, blend: 'dest-in' },
    ])
    .png({ compressionLevel: 8 })
    .toBuffer();
}

/** O caminho SVG de um rectângulo de cantos arredondados (para a borda em vector no PDF). */
export function rectArredondado(w: number, h: number, r: number): string {
  const q = Math.min(r, w / 2, h / 2);
  return `M${q},0 H${w - q} A${q},${q} 0 0 1 ${w},${q} V${h - q} A${q},${q} 0 0 1 ${w - q},${h} H${q} A${q},${q} 0 0 1 0,${h - q} V${q} A${q},${q} 0 0 1 ${q},0 Z`;
}
