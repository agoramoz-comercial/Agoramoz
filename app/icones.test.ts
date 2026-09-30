import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { IDENTITY, SITE } from '@/content/site';
import manifest from './manifest';

const raiz = path.resolve(__dirname, '..');

/** Largura e altura lidas do cabeçalho IHDR — sem depender de biblioteca. */
function medidasPng(dados: Buffer) {
  expect(dados.subarray(1, 4).toString('ascii')).toBe('PNG');
  return { largura: dados.readUInt32BE(16), altura: dados.readUInt32BE(20) };
}

function png(relativo: string) {
  return medidasPng(readFileSync(path.join(raiz, relativo)));
}

describe('ícones de pesquisa e de aplicação', () => {
  it('o ícone do site é quadrado e múltiplo de 48 px, como o Google exige', () => {
    const { largura, altura } = png('app/icon.png');
    expect(largura).toBe(altura);
    expect(largura % 48).toBe(0);
  });

  it('o ícone Apple tem 180×180', () => {
    expect(png('app/apple-icon.png')).toEqual({ largura: 180, altura: 180 });
  });

  it('o favicon.ico traz 16, 32 e 48 px, todos PNG quadrados', () => {
    const ico = readFileSync(path.join(raiz, 'app/favicon.ico'));
    expect(ico.readUInt16LE(2)).toBe(1);
    const n = ico.readUInt16LE(4);
    const lados = Array.from({ length: n }, (_, i) => {
      const o = 6 + 16 * i;
      const tamanho = ico.readUInt32LE(o + 8);
      const inicio = ico.readUInt32LE(o + 12);
      const { largura, altura } = medidasPng(ico.subarray(inicio, inicio + tamanho));
      expect(largura).toBe(altura);
      expect(ico.readUInt8(o)).toBe(largura);
      return largura;
    });
    expect(lados).toEqual([16, 32, 48]);
  });

  it('o ícone rectangular antigo já não existe', () => {
    expect(existsSync(path.join(raiz, 'app/icon.svg'))).toBe(false);
  });
});

describe('logo da Organization (JSON-LD)', () => {
  it('aponta para um ficheiro que existe, com as medidas declaradas', () => {
    expect(IDENTITY.logo.url.startsWith(`${SITE.url}/`)).toBe(true);
    const relativo = IDENTITY.logo.url.slice(SITE.url.length + 1);
    const { largura, altura } = png(path.join('public', relativo));
    expect({ largura, altura }).toEqual({ largura: IDENTITY.logo.width, altura: IDENTITY.logo.height });
    expect(largura).toBeGreaterThanOrEqual(112);
  });
});

describe('manifesto', () => {
  it('cada ícone declarado existe e tem o tamanho que diz ter', () => {
    const icones = manifest().icons ?? [];
    expect(icones.length).toBeGreaterThan(0);
    for (const icone of icones) {
      const [l, a] = String(icone.sizes).split('x').map(Number);
      expect(png(path.join('public', icone.src))).toEqual({ largura: l, altura: a });
    }
  });

  it('fundo preto como o ícone; tema igual ao do layout', () => {
    expect(manifest().background_color).toBe('#000000');
    // Lido do texto: importar o layout arrasta next/font e o CSS para o teste.
    const layout = readFileSync(path.join(raiz, 'app/layout.tsx'), 'utf8');
    const tema = /themeColor:\s*'(#[0-9A-Fa-f]{6})'/.exec(layout)?.[1];
    expect(tema).toBeDefined();
    expect(manifest().theme_color).toBe(tema);
  });
});
