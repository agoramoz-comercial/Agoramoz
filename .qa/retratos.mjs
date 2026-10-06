import { chromium } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';

/**
 * Os retratos dos fundadores — estúdio vermelho — no quadrado 1280×1280.
 *
 * Entrada: os cartazes das redes (1080×1350), com o retrato sobre vermelho de
 * estúdio e, por baixo, o nome, o cargo e a barra de contactos. Não estão no
 * repositório; passam-se por `ORIGEM` (pasta com `gerson-cartaz.png` e
 * `sheinaz-cartaz.png`).
 *
 * O texto do cartaz não entra no site (o nome e o cargo já estão no cartão).
 * O corte é medido, não escolhido: procura-se a primeira linha, abaixo de
 * y=900, com pelo menos 20 píxeis brancos (R, G e B > 235) — o topo do nome —
 * e o quadrado acaba 8 px acima dela. Depois escala-se para 1280 (o tamanho
 * de sempre: os imports não mudam).
 *
 * Enquadramento: o Gerson usa a largura toda e é a referência. A Sheinaz é
 * enquadrada para o topo da cabeça cair à mesma altura do topo do chapéu,
 * centrada na cabeça — a regra que o site já seguia. Sem isto, a cabeça dela
 * ficava a meio do quadrado, debaixo de um terço de vermelho vazio.
 *
 * Duas provas antes de gravar: nenhum branco de texto nas últimas 12 linhas
 * do quadrado, e os cantos de cima são vermelho de estúdio (o corte não
 * apanhou a barra preta nem outra coisa).
 *
 * Sem correcção de cor: é a cor da fotografia.
 */
const ORIGEM = process.env.ORIGEM;
if (!ORIGEM) throw new Error('ORIGEM: pasta com gerson-cartaz.png e sheinaz-cartaz.png');
const L = 1280;
const NOMES = ['gerson', 'sheinaz'];

const dataUrl = (f) => 'data:image/png;base64,' + readFileSync(f).toString('base64');
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const p = await b.newPage();

const saida = await p.evaluate(
  async ({ fontes, L }) => {
    const carregar = (src) => new Promise((ok, falha) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => falha(new Error('imagem ilegível')); i.src = src; });
    const branco = (d, i) => d[i] > 235 && d[i + 1] > 235 && d[i + 2] > 235;
    const vermelho = (d, i) => d[i] > 150 && d[i + 1] < 40 && d[i + 2] < 60;

    const png = async (c) => {
      const blob = await c.convertToBlob({ type: 'image/png' });
      const buf = new Uint8Array(await blob.arrayBuffer());
      let bin = '';
      for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
      return btoa(bin);
    };

    const resultado = {};
    let fraccaoTopo = null;
    for (const [nome, src] of Object.entries(fontes)) {
      const img = await carregar(src);
      // As regras do corte só valem para ESTE formato de cartaz.
      if (img.width !== 1080 || img.height !== 1350) throw new Error(`${nome}: ${img.width}×${img.height}, esperado 1080×1350`);

      const c = new OffscreenCanvas(img.width, img.height);
      const g = c.getContext('2d', { willReadFrequently: true });
      g.drawImage(img, 0, 0);
      const d = g.getImageData(0, 0, img.width, img.height).data;

      let topoTexto = -1;
      for (let y = 900; y < img.height && topoTexto < 0; y++) {
        let n = 0;
        for (let x = 0; x < img.width; x++) if (branco(d, (y * img.width + x) * 4)) n++;
        if (n >= 20) topoTexto = y;
      }
      if (topoTexto < 0) throw new Error(`${nome}: texto do cartaz não encontrado abaixo de y=900`);

      // Topo da pessoa: a primeira linha com 20+ píxeis que não são estúdio.
      let topo = -1;
      for (let y = 0; y < topoTexto && topo < 0; y++) {
        let n = 0;
        for (let x = 0; x < img.width; x++) if (!vermelho(d, (y * img.width + x) * 4)) n++;
        if (n >= 20) topo = y;
      }
      // Centro da cabeça: média das colunas que não são estúdio nos 300 px abaixo do topo.
      let soma = 0;
      let conta = 0;
      for (let y = topo; y < Math.min(topo + 300, topoTexto); y++)
        for (let x = 0; x < img.width; x++) if (!vermelho(d, (y * img.width + x) * 4)) { soma += x; conta++; }
      const centro = soma / conta;

      // O primeiro (o Gerson) usa a largura toda e é a referência; os seguintes
      // são enquadrados para o topo da cabeça cair à mesma fracção do quadrado.
      const fundo = topoTexto - 8;
      let lado, y0;
      if (fraccaoTopo === null) {
        lado = fundo;
        y0 = 0;
        fraccaoTopo = topo / lado;
      } else {
        lado = Math.min(img.width, Math.round((fundo - topo) / (1 - fraccaoTopo)));
        y0 = Math.max(0, Math.round(topo - fraccaoTopo * lado));
      }
      const x0 = Math.round(Math.min(Math.max(centro - lado / 2, 0), img.width - lado));
      const q = new OffscreenCanvas(L, L);
      const gq = q.getContext('2d', { willReadFrequently: true });
      gq.imageSmoothingQuality = 'high';
      gq.drawImage(img, x0, y0, lado, lado, 0, 0, L, L);

      const dq = gq.getImageData(0, 0, L, L).data;
      let brancosNoFundo = 0;
      for (let y = L - 12; y < L; y++) for (let x = 0; x < L; x++) if (branco(dq, (y * L + x) * 4)) brancosNoFundo++;
      const cantos = [[4, 4], [L - 5, 4], [4, L - 5], [L - 5, L - 5]].map(([x, y]) => vermelho(dq, (y * L + x) * 4));

      resultado[nome] = { png: await png(q), topoTexto, topo, lado, x0, y0, brancosNoFundo, cantos };
    }
    return resultado;
  },
  { fontes: Object.fromEntries(NOMES.map((n) => [n, dataUrl(`${ORIGEM}/${n}-cartaz.png`)])), L },
);
await b.close();

for (const nome of NOMES) {
  const r = saida[nome];
  if (r.brancosNoFundo > 0) throw new Error(`${nome}: ${r.brancosNoFundo} píxeis de texto no fundo do quadrado`);
  // Os ombros descem até ao fundo; basta que os cantos de cima sejam estúdio.
  if (!r.cantos[0] || !r.cantos[1]) throw new Error(`${nome}: cantos de cima não são vermelho de estúdio (${r.cantos})`);
  writeFileSync(`public/equipa/${nome}.png`, Buffer.from(r.png, 'base64'));
  console.log(`${nome}: texto a y=${r.topoTexto}; topo da cabeça a y=${r.topo}; quadrado ${r.lado}px em (${r.x0}, ${r.y0}); cantos estúdio ${r.cantos.map((c) => (c ? 'sim' : 'não')).join('/')}`);
}
