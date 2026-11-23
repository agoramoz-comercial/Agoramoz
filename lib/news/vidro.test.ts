import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { cenaDeCor, K, rectArredondado, vidro } from './vidro';

describe('vidro fosco da revista (sharp)', () => {
  it('o painel tem o tamanho pedido, cantos transparentes e miolo opaco', async () => {
    const c = await cenaDeCor(300, 200, 'noite', 2);
    expect(c.bruto.largura).toBe(300 * K);
    const png = await vidro(c, { x: 20, y: 40, w: 200, h: 100, raio: 16 });
    const { data, info } = await sharp(png).raw().toBuffer({ resolveWithObject: true });
    expect([info.width, info.height, info.channels]).toEqual([200 * K, 100 * K, 4]);
    const alfa = (x: number, y: number) => data[(y * info.width + x) * 4 + 3]!;
    expect(alfa(0, 0)).toBe(0);
    expect(alfa(info.width / 2, info.height / 2)).toBe(255);
  });

  it('o desfoque mistura de facto o fundo (o painel não é uma cor lisa)', async () => {
    const c = await cenaDeCor(400, 300, 'energia', 5);
    const png = await vidro(c, { x: 0, y: 0, w: 400, h: 300, raio: 0 });
    const s = await sharp(png).stats();
    expect(s.channels[0]!.stdev).toBeGreaterThan(3);
  });

  it('o rectângulo arredondado fecha', () => {
    expect(rectArredondado(100, 40, 12)).toMatch(/^M12,0 .* Z$/);
  });
});
