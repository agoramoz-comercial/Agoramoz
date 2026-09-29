import { chromium } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';

/**
 * Os retratos dos fundadores, a cores, compostos no quadrado 1280×1280.
 *
 * Entrada: os recortes a cores com alfa (u2net + alpha matting) — os mesmos de
 * que saíram os retratos monocromáticos de ce1e784. Não estão no repositório;
 * passam-se por `ORIGEM` (pasta com `gerson-cru.png` e `sheinaz-cru.png`).
 *
 * Enquadramento, em píxeis do quadrado por píxel do recorte:
 *
 * - **Sheinaz** — o de ce1e784, recuperado por registo do alfa (IoU 0,999):
 *   escala 1,259, deslocamento (−210, 43). A geometria não muda; só a cor.
 * - **Gerson** — a fotografia de origem tem 768px de largura: com a escala de
 *   ce1e784 (1,2095) o tronco acabava em x=214 e x=1143, cortado a direito,
 *   com vazio dos dois lados. Agora a largura do recorte cobre o quadrado
 *   (1280/768), como os ombros da Sheinaz, e o topo do chapéu fica à altura
 *   do topo da cabeça dela. O rosto fica maior que o dela — decisão pedida.
 *
 * Sem monocromia e sem correcção de tons: é a cor da fotografia.
 *
 * Uma limpeza, no Gerson: acima da aba direita do chapéu o recorte deixou
 * passar um tufo do fundo laranja da fotografia (R≈140–205, G≈80–100, contra o
 * castanho do chapéu, R≈85–105 — medido). Em monocromia lia-se como fiapos
 * cinzentos; a cores salta à vista. Apaga-se só nessa janela e só nos píxeis
 * com essa cor.
 */
const ORIGEM = process.env.ORIGEM;
if (!ORIGEM) throw new Error('ORIGEM: pasta com gerson-cru.png e sheinaz-cru.png');
const L = 1280;

const dataUrl = (f) => 'data:image/png;base64,' + readFileSync(f).toString('base64');
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const p = await b.newPage();

const saida = await p.evaluate(
  async ({ gerson, sheinaz, L }) => {
    const carregar = (src) => new Promise((ok, falha) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => falha(new Error('imagem ilegível')); i.src = src; });
    const [ig, is] = await Promise.all([carregar(gerson), carregar(sheinaz)]);
    // As constantes de enquadramento só valem para ESTES recortes. Outro ficheiro seria composto em silêncio.
    if (ig.width !== 768 || ig.height !== 1364) throw new Error(`gerson-cru.png: ${ig.width}×${ig.height}, esperado 768×1364`);
    if (is.width !== 1254 || is.height !== 1254) throw new Error(`sheinaz-cru.png: ${is.width}×${is.height}, esperado 1254×1254`);

    /** Primeira linha com alfa relevante, num canvas já desenhado. */
    const topo = (g) => {
      const a = g.getImageData(0, 0, L, L).data;
      for (let y = 0; y < L; y++) for (let x = 0; x < L; x++) if (a[(y * L + x) * 4 + 3] > 128) return y;
      return 0;
    };
    const compor = (img, s, dx, dy) => {
      const c = new OffscreenCanvas(L, L);
      const g = c.getContext('2d', { willReadFrequently: true });
      g.imageSmoothingQuality = 'high';
      g.drawImage(img, dx, dy, img.width * s, img.height * s);
      return { c, g };
    };

    const sh = compor(is, 1.259, -210, 43);
    const topoSheinaz = topo(sh.g);

    // Gerson: primeiro a escala nova com dy=0, para medir onde fica o chapéu; depois alinha.
    const s = L / ig.width;
    const ensaio = compor(ig, s, 0, 0);
    const ge = compor(ig, s, 0, topoSheinaz - topo(ensaio.g));

    const JANELA = { x: 930, y: 440, w: 170, h: 120 };
    const zona = ge.g.getImageData(JANELA.x, JANELA.y, JANELA.w, JANELA.h);
    let apagados = 0;
    for (let i = 0; i < zona.data.length; i += 4) {
      const [r, g] = [zona.data[i], zona.data[i + 1]];
      if (zona.data[i + 3] > 0 && r > 135 && r - g > 55) {
        zona.data[i + 3] = 0;
        apagados++;
      }
    }
    ge.g.putImageData(zona, JANELA.x, JANELA.y);

    const png = async (c) => {
      const blob = await c.convertToBlob({ type: 'image/png' });
      const buf = new Uint8Array(await blob.arrayBuffer());
      let bin = '';
      for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
      return btoa(bin);
    };
    return { gerson: await png(ge.c), sheinaz: await png(sh.c), topoSheinaz, escalaGerson: s, apagados };
  },
  { gerson: dataUrl(`${ORIGEM}/gerson-cru.png`), sheinaz: dataUrl(`${ORIGEM}/sheinaz-cru.png`), L },
);

for (const nome of ['gerson', 'sheinaz']) {
  writeFileSync(`public/equipa/${nome}.png`, Buffer.from(saida[nome], 'base64'));
}
// Na janela havia 2751 píxeis do fundo (medido). Muito fora disso: janela ou entrada erradas.
if (saida.apagados < 1000 || saida.apagados > 6000) throw new Error(`limpeza anómala: ${saida.apagados} píxeis`);
console.log(`topo da cabeça da Sheinaz: y=${saida.topoSheinaz}; escala do Gerson: ${saida.escalaGerson.toFixed(4)}; píxeis do fundo apagados: ${saida.apagados}`);
await b.close();
