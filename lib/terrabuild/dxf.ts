import type { Projeto } from '@/content/projetos/tipos';
import { cantos } from './geometria';
import { plantaCasa } from './planta';
import type { CasaConfig } from './quantidades';
import { curvasDeNivel, grelha } from './terreno';

/**
 * Exportação para AutoCAD (DXF ASCII, AC1021, unidades em metros), feita no
 * browser: o ficheiro nunca sai do computador de quem o descarrega. A
 * biblioteca (dxf-writer, MIT) só é carregada no clique. Coordenadas locais
 * da demonstração, sem georreferência, de propósito.
 */

type Desenho = InstanceType<typeof import('dxf-writer').default>;

async function novoDesenho(camadas: readonly (readonly [string, number])[]): Promise<Desenho> {
  const { default: Drawing } = await import('dxf-writer');
  const d = new Drawing();
  d.setUnits('Meters');
  for (const [nome, cor] of camadas) d.addLayer(nome, cor, 'CONTINUOUS');
  return d;
}

const ACI = { vermelho: 1, amarelo: 2, verde: 3, ciano: 4, azul: 5, magenta: 6, branco: 7, cinza: 8 } as const;

const fmt = (n: number) => n.toFixed(2).replace('.', ',');
/** Há leitores de DXF que não lêem UTF-8: os textos vão sem acentos. */
const ascii = (t: string) => t.normalize('NFD').replace(/\p{M}/gu, '').replace(/[^\x20-\x7e]/g, '');

/** Cota simples: linha com marcas nas pontas e o valor ao meio. */
function cota(d: Desenho, x1: number, y1: number, x2: number, y2: number, texto: string) {
  const horizontal = Math.abs(y2 - y1) < 1e-9;
  const m = 0.15;
  d.drawLine(x1, y1, x2, y2);
  if (horizontal) {
    d.drawLine(x1, y1 - m, x1, y1 + m).drawLine(x2, y2 - m, x2, y2 + m);
    d.drawText((x1 + x2) / 2, y1 + 0.15, 0.25, 0, texto, 'center');
  } else {
    d.drawLine(x1 - m, y1, x1 + m, y1).drawLine(x2 - m, y2, x2 + m, y2);
    d.drawText(x1 - 0.15, (y1 + y2) / 2, 0.25, 90, texto, 'center');
  }
}

/** A planta esquemática da casa, por camadas, como no construtor. */
export async function plantaCasaDxf(c: CasaConfig): Promise<string> {
  const p = plantaCasa(c);
  const d = await novoDesenho([
    ['PAREDES', ACI.branco],
    ['DIVISORIAS', ACI.cinza],
    ['JANELAS', ACI.azul],
    ['PORTAS', ACI.vermelho],
    ['COTAS', ACI.verde],
    ['TEXTO', ACI.branco],
  ]);
  const { comprimento: L, largura: A, espessura: e } = p;

  d.setActiveLayer('PAREDES');
  d.drawRect(0, 0, L, A);
  d.drawRect(e, e, L - e, A - e);

  d.setActiveLayer('DIVISORIAS');
  const meia = 0.05;
  for (const [x1, y1, x2, y2] of p.divisorias) {
    if (x1 === x2) d.drawLine(x1 - meia, Math.max(y1, e), x1 - meia, Math.min(y2, A - e)).drawLine(x1 + meia, Math.max(y1, e), x1 + meia, Math.min(y2, A - e));
    else d.drawLine(Math.max(x1, e), y1 - meia, Math.min(x2, L - e), y1 - meia).drawLine(Math.max(x1, e), y1 + meia, Math.min(x2, L - e), y1 + meia);
  }

  d.setActiveLayer('JANELAS');
  for (const j of p.janelas) {
    const h = j.largura / 2;
    if (j.horizontal) {
      const [y0, y1] = j.y === 0 ? [0, e] : [A - e, A];
      d.drawRect(j.x - h, y0, j.x + h, y1).drawLine(j.x - h, (y0 + y1) / 2, j.x + h, (y0 + y1) / 2);
    } else {
      const [x0, x1] = j.x === 0 ? [0, e] : [L - e, L];
      d.drawRect(x0, j.y - h, x1, j.y + h).drawLine((x0 + x1) / 2, j.y - h, (x0 + x1) / 2, j.y + h);
    }
  }

  d.setActiveLayer('PORTAS');
  for (const q of p.portas) {
    // Vão, folha aberta a 90° e o arco de abertura.
    const x0 = q.x - q.largura / 2;
    d.drawLine(x0, q.y, x0, q.y + q.largura);
    d.drawArc(x0, q.y, q.largura, 0, 90);
  }

  d.setActiveLayer('COTAS');
  cota(d, 0, -0.9, L, -0.9, `${fmt(L)} m`);
  cota(d, -0.9, 0, -0.9, A, `${fmt(A)} m`);

  d.setActiveLayer('TEXTO');
  d.drawText(0, A + 1.2, 0.4, 0, 'Casa principal - esquema de demonstracao (nao e projeto)');
  d.drawText(0, A + 0.6, 0.25, 0, `Unidades: metros - ${fmt(L * A)} m2 brutos - ${c.divisoes} divisoes - dados ficticios AGORAMOZ TerraBuild`);
  return d.toDxfString();
}

/** A implantação da fazenda: limite, estradas, construções, talhões, redes e curvas de nível. */
export async function implantacaoDxf(p: Projeto, casa: CasaConfig): Promise<string> {
  const d = await novoDesenho([
    ['LIMITE', ACI.branco],
    ['ESTRADAS', ACI.cinza],
    ['CONSTRUCOES', ACI.amarelo],
    ['TALHOES', ACI.verde],
    ['AGUA', ACI.azul],
    ['ELETRICA', ACI.vermelho],
    ['CURVAS', ACI.ciano],
    ['TEXTO', ACI.branco],
  ]);
  const L = p.terreno.largura;
  const H = p.terreno.profundidade;
  const camadaDe = (c: string) => (c === 'talhoes' ? 'TALHOES' : c === 'agua' ? 'AGUA' : c === 'eletrica' ? 'ELETRICA' : 'CONSTRUCOES');

  d.setActiveLayer('LIMITE');
  d.drawPolyline(
    [
      [0, 0],
      [L, 0],
      [L, H],
      [0, H],
    ],
    true,
  );

  d.setActiveLayer('CURVAS');
  for (const curva of curvasDeNivel(grelha(p.terreno, 10), 1))
    for (const m of curva.d.matchAll(/M([-\d.]+) ([-\d.]+)L([-\d.]+) ([-\d.]+)/g)) d.drawLine(+m[1]!, +m[2]!, +m[3]!, +m[4]!);

  for (const e of p.elementos) {
    if (e.id === 'casa-principal') continue; // desenhada abaixo, com a configuração escolhida
    const f = e.forma;
    if (f.tipo === 'linha') {
      const estrada = f.largura > 1;
      d.setActiveLayer(estrada ? 'ESTRADAS' : e.id === 'vedacao' ? 'LIMITE' : camadaDe(e.camada));
      d.drawPolyline(
        f.pontos.map(([x, y]) => [x, y] as [number, number]),
        false,
        estrada ? f.largura : 0,
        estrada ? f.largura : 0,
      );
      continue;
    }
    d.setActiveLayer(camadaDe(e.camada));
    if (f.tipo === 'cilindro') {
      d.drawCircle(f.cx, f.cy, f.raio);
      d.setActiveLayer('TEXTO').drawText(f.cx, f.cy + f.raio + 1, 2, 0, ascii(e.nome), 'center');
      continue;
    }
    d.drawPolyline(
      cantos(f.r).map(([x, y]) => [x, y] as [number, number]),
      true,
    );
    d.setActiveLayer('TEXTO').drawText(f.r.cx, f.r.cy, 2, 0, ascii(e.nome), 'center', 'middle');
  }

  d.setActiveLayer('CONSTRUCOES');
  const r = { cx: casa.x, cy: casa.y, w: casa.comprimento, d: casa.largura, rot: casa.rotacao };
  d.drawPolyline(
    cantos(r).map(([x, y]) => [x, y] as [number, number]),
    true,
  );
  d.setActiveLayer('TEXTO').drawText(casa.x, casa.y, 2, 0, 'Casa principal', 'center', 'middle');

  d.drawText(0, -8, 3, 0, ascii(`${p.nome} - implantacao de demonstracao com dados ficticios`));
  d.drawText(0, -13, 2, 0, 'Coordenadas locais em metros, origem no canto sudoeste; nao georreferenciada. Curvas de nivel de 1 em 1 m.');
  return d.toDxfString();
}
