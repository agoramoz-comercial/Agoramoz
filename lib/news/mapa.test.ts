import { describe, expect, it } from 'vitest';
import { ISO_DO_PAIS, mapaDoPais, mapaMundo, mundoParaTextura } from './mapa';
import { PAISES_NEWS } from './paises';

describe('mapas do News (Natural Earth, sem servidores externos)', () => {
  it('cada país da lista tem geometria e fica dentro do seu mapa regional', () => {
    for (const p of PAISES_NEWS) {
      const m = mapaDoPais(p, 640, 400);
      expect(m.destaque.length, p).toBeGreaterThan(20);
      const [x, y] = m.marcador;
      expect(x > 0 && x < 640 && y > 0 && y < 400, p).toBe(true);
      expect(m.paises.length, p).toBeGreaterThan(0);
    }
  });

  it('o mapa do mundo tem os países e um ponto para cada mercado', () => {
    const m = mapaMundo();
    expect(m.paises.length).toBeGreaterThan(150);
    expect(m.paises.some((c) => c.id === ISO_DO_PAIS.mz)).toBe(true);
    for (const p of PAISES_NEWS) expect(m.pontos[p][0]).toBeGreaterThan(0);
  });

  it('a textura do globo usa coordenadas 0–360 × 0–180', () => {
    const t = mundoParaTextura();
    const nums = t.flatMap((c) => c.d.match(/-?\d+(\.\d+)?/g)!.map(Number));
    expect(Math.min(...nums)).toBeGreaterThanOrEqual(-0.5);
    expect(Math.max(...nums)).toBeLessThanOrEqual(360.5);
  });
});
