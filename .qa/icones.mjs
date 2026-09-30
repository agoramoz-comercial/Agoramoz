// Gera os ícones quadrados a partir do logo oficial sobre preto.
//
//   node .qa/icones.mjs
//
// Fonte: public/brand/logo-dark-bg.png (2000×2000, logo oficial sobre #000).
// Corta o desenho, volta a enquadrá-lo num quadrado preto puro com o desenho a
// 88 % (ícones) ou 80 % (logo) da largura — o Google recorta em círculo — e escreve:
//   app/icon.png (480, múltiplo de 48), app/apple-icon.png (180), app/favicon.ico (16/32/48),
//   public/brand/logo-preto-192.png e public/brand/logo-preto-512.png.
import { createRequire } from 'node:module';
import { readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const raiz = path.resolve(import.meta.dirname, '..');
const require = createRequire(import.meta.url);
const pasta = readdirSync(path.join(raiz, 'node_modules/.pnpm')).find((d) => d.startsWith('sharp@'));
if (!pasta) throw new Error('sharp não encontrado em node_modules/.pnpm');
const sharp = require(path.join(raiz, 'node_modules/.pnpm', pasta, 'node_modules/sharp'));

const FONTE = path.join(raiz, 'public/brand/logo-dark-bg.png');
const PRETO = { r: 0, g: 0, b: 0, alpha: 1 };
/**
 * Largura do desenho no quadrado. O logo é ~1,9:1; a 0,88 o canto da caixa do
 * desenho fica a 0,497 do centro — dentro do círculo do Google (raio 0,5) — e o
 * favicon de 16 px ganha o máximo de pixels. O logo da Organization fica a 0,8.
 */
const OCUPACAO_ICONE = 0.88;
const OCUPACAO_LOGO = 0.8;

const desenho = await sharp(FONTE).trim({ background: '#000000', threshold: 20 }).png().toBuffer();

async function quadrado(lado, ocupacao = OCUPACAO_ICONE) {
  const largura = Math.round(lado * ocupacao);
  const logo = await sharp(desenho).resize({ width: largura, fit: 'inside', kernel: 'lanczos3' }).toBuffer();
  return sharp({ create: { width: lado, height: lado, channels: 4, background: PRETO } })
    .composite([{ input: logo, gravity: 'centre' }])
    .flatten({ background: '#000000' })
    .png({ compressionLevel: 9 })
    .toBuffer();
}

/** ICO com PNG embutido (suportado por todos os browsers actuais). */
function ico(pngs) {
  const cabecalho = Buffer.alloc(6 + 16 * pngs.length);
  cabecalho.writeUInt16LE(0, 0);
  cabecalho.writeUInt16LE(1, 2);
  cabecalho.writeUInt16LE(pngs.length, 4);
  let deslocamento = cabecalho.length;
  pngs.forEach(({ lado, dados }, i) => {
    const o = 6 + 16 * i;
    cabecalho.writeUInt8(lado >= 256 ? 0 : lado, o);
    cabecalho.writeUInt8(lado >= 256 ? 0 : lado, o + 1);
    cabecalho.writeUInt8(0, o + 2);
    cabecalho.writeUInt8(0, o + 3);
    cabecalho.writeUInt16LE(1, o + 4);
    cabecalho.writeUInt16LE(32, o + 6);
    cabecalho.writeUInt32LE(dados.length, o + 8);
    cabecalho.writeUInt32LE(deslocamento, o + 12);
    deslocamento += dados.length;
  });
  return Buffer.concat([cabecalho, ...pngs.map((p) => p.dados)]);
}

const saidas = [
  ['app/icon.png', 480, OCUPACAO_ICONE],
  ['app/apple-icon.png', 180, OCUPACAO_ICONE],
  ['public/brand/logo-preto-192.png', 192, OCUPACAO_LOGO],
  ['public/brand/logo-preto-512.png', 512, OCUPACAO_LOGO],
];
for (const [ficheiro, lado, ocupacao] of saidas) {
  writeFileSync(path.join(raiz, ficheiro), await quadrado(lado, ocupacao));
  console.log(`${ficheiro} ${lado}×${lado}`);
}

const tamanhosIco = [16, 32, 48];
const pngs = [];
for (const lado of tamanhosIco) pngs.push({ lado, dados: await quadrado(lado) });
writeFileSync(path.join(raiz, 'app/favicon.ico'), ico(pngs));
console.log(`app/favicon.ico ${tamanhosIco.join('/')}`);
