import { chromium } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';

/**
 * Os retratos dos fundadores — estúdio vermelho — no quadrado 1280×1280.
 *
 * Entradas (não estão no repositório; passam-se por `ORIGEM`):
 *
 * - `gerson-original.png` — a fotografia de estúdio sem texto, 941×1672.
 * - `sheinaz-cartaz.png` — o cartaz das redes, 1080×1350, com o nome, o
 *   cargo e a barra de contactos por baixo do retrato.
 *
 * Do cartaz, o texto não entra no site (o nome e o cargo já estão no
 * cartão). O corte é medido, não escolhido: procura-se a primeira linha,
 * abaixo de y=900, com pelo menos 20 píxeis brancos (R, G e B > 235) — o topo
 * do nome — e o quadrado acaba 8 px acima dela.
 *
 * Enquadramento: o Gerson é a referência — a largura toda da fotografia, com
 * 6 % de estúdio acima do chapéu (cabem a barba e a gola inteiras). A Sheinaz
 * é enquadrada para o topo da cabeça cair à mesma fracção do quadrado,
 * centrada na cabeça — a regra que o site já seguia.
 *
 * Provas antes de gravar: nenhum branco de texto nas últimas 12 linhas do
 * quadrado, e os cantos de cima são vermelho de estúdio.
 *
 * Sem correcção de cor: é a cor da fotografia.
 */
const ORIGEM = process.env.ORIGEM;
if (!ORIGEM) throw new Error('ORIGEM: pasta com gerson-original.png e sheinaz-cartaz.png');
const L = 1280;
const FONTES = [
  { nome: 'gerson', ficheiro: 'gerson-original.png', largura: 941, altura: 1672, cartaz: false },
  { nome: 'sheinaz', ficheiro: 'sheinaz-cartaz.png', largura: 1080, altura: 1350, cartaz: true },
];

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
    for (const f of fontes) {
      const img = await carregar(f.src);
      // As regras do corte só valem para ESTES ficheiros.
      if (img.width !== f.largura || img.height !== f.altura)
        throw new Error(`${f.nome}: ${img.width}×${img.height}, esperado ${f.largura}×${f.altura}`);
      const W = img.width;

      const c = new OffscreenCanvas(W, img.height);
      const g = c.getContext('2d', { willReadFrequently: true });
      g.drawImage(img, 0, 0);
      const d = g.getImageData(0, 0, W, img.height).data;

      // Onde o quadrado tem de acabar: 8 px acima do nome do cartaz, ou o fundo da fotografia.
      let fundo = img.height;
      if (f.cartaz) {
        let topoTexto = -1;
        for (let y = 900; y < img.height && topoTexto < 0; y++) {
          let n = 0;
          for (let x = 0; x < W; x++) if (branco(d, (y * W + x) * 4)) n++;
          if (n >= 20) topoTexto = y;
        }
        if (topoTexto < 0) throw new Error(`${f.nome}: texto do cartaz não encontrado abaixo de y=900`);
        fundo = topoTexto - 8;
      }

      // Topo da pessoa: a primeira linha com 20+ píxeis que não são estúdio,
      // contados só na faixa central (as margens podem escurecer o vermelho).
      const [xa, xb] = [Math.round(W * 0.15), Math.round(W * 0.85)];
      let topo = -1;
      for (let y = 0; y < fundo && topo < 0; y++) {
        let n = 0;
        for (let x = xa; x < xb; x++) if (!vermelho(d, (y * W + x) * 4)) n++;
        if (n >= 20) topo = y;
      }
      if (topo < 0) throw new Error(`${f.nome}: pessoa não encontrada`);
      // Centro da cabeça: média das colunas que não são estúdio nos 300 px abaixo do topo.
      let soma = 0;
      let conta = 0;
      for (let y = topo; y < Math.min(topo + 300, fundo); y++)
        for (let x = xa; x < xb; x++) if (!vermelho(d, (y * W + x) * 4)) { soma += x; conta++; }
      const centro = soma / conta;

      let lado, y0;
      if (fraccaoTopo === null) {
        lado = Math.min(W, fundo);
        y0 = Math.min(Math.max(0, topo - Math.round(0.06 * lado)), fundo - lado);
        fraccaoTopo = (topo - y0) / lado;
      } else {
        lado = Math.min(W, Math.round((fundo - topo) / (1 - fraccaoTopo)));
        y0 = Math.max(0, Math.round(topo - fraccaoTopo * lado));
      }
      const x0 = Math.round(Math.min(Math.max(centro - lado / 2, 0), W - lado));

      const q = new OffscreenCanvas(L, L);
      const gq = q.getContext('2d', { willReadFrequently: true });
      gq.imageSmoothingQuality = 'high';
      gq.drawImage(img, x0, y0, lado, lado, 0, 0, L, L);

      const dq = gq.getImageData(0, 0, L, L).data;
      let brancosNoFundo = 0;
      for (let y = L - 12; y < L; y++) for (let x = 0; x < L; x++) if (branco(dq, (y * L + x) * 4)) brancosNoFundo++;
      const cantos = [[4, 4], [L - 5, 4], [4, L - 5], [L - 5, L - 5]].map(([x, y]) => vermelho(dq, (y * L + x) * 4));

      resultado[f.nome] = { png: await png(q), fundo, topo, lado, x0, y0, brancosNoFundo, cantos };
    }
    return resultado;
  },
  { fontes: FONTES.map((f) => ({ ...f, src: dataUrl(`${ORIGEM}/${f.ficheiro}`) })), L },
);
await b.close();

for (const { nome } of FONTES) {
  const r = saida[nome];
  if (r.brancosNoFundo > 0) throw new Error(`${nome}: ${r.brancosNoFundo} píxeis de texto no fundo do quadrado`);
  // Os ombros descem até ao fundo; basta que os cantos de cima sejam estúdio.
  if (!r.cantos[0] || !r.cantos[1]) throw new Error(`${nome}: cantos de cima não são vermelho de estúdio (${r.cantos})`);
  writeFileSync(`public/equipa/${nome}.png`, Buffer.from(r.png, 'base64'));
  console.log(`${nome}: limite y=${r.fundo}; topo da cabeça y=${r.topo}; quadrado ${r.lado}px em (${r.x0}, ${r.y0}); cantos estúdio ${r.cantos.map((c) => (c ? 'sim' : 'não')).join('/')}`);
}
