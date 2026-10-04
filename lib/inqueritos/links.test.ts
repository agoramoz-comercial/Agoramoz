import { describe, expect, it } from 'vitest';
import { estadoDoLink, fimDoDia } from './links';
import { MARGEM, qrDe, svgDe } from './qr';

const AGORA = new Date('2026-10-04T12:00:00Z');
const base = { revokedAt: null, expiresAt: null, maxResponses: null, respostas: 0 };

describe('estado de um link', () => {
  it('a mesma precedência da base: revogado, expirado, tecto', () => {
    expect(estadoDoLink(base, AGORA)).toBe('activo');
    expect(
      estadoDoLink(
        { ...base, revokedAt: '2026-10-01T00:00:00Z', expiresAt: '2026-01-01T00:00:00Z' },
        AGORA,
      ),
    ).toBe('revogado');
    expect(estadoDoLink({ ...base, expiresAt: '2026-10-04T12:00:00Z' }, AGORA)).toBe('expirado');
    expect(estadoDoLink({ ...base, maxResponses: 3, respostas: 3 }, AGORA)).toBe('esgotado');
    expect(estadoDoLink({ ...base, maxResponses: 3, respostas: 2 }, AGORA)).toBe('activo');
  });
});

describe('fim do dia', () => {
  it('inclui o dia inteiro em Maputo e recusa datas que não existem', () => {
    expect(fimDoDia('2026-12-31')).toBe('2026-12-31T23:59:59+02:00');
    expect(new Date(fimDoDia('2026-12-31')!).toISOString()).toBe('2026-12-31T21:59:59.000Z');
    expect(fimDoDia('2026-02-30')).toBeNull();
    expect(fimDoDia('31/12/2026')).toBeNull();
    expect(fimDoDia('')).toBeNull();
  });
});

describe('QR', () => {
  const url = 'https://agoramoz.com/i/AbCdEfGhIjKlMnOpQrStUvWxYz0123456789_-abcde';

  it('matriz com margem, determinística, só módulos inteiros', () => {
    const a = qrDe(url);
    expect(a).toEqual(qrDe(url));
    // Versão 1 tem 21 módulos e cada versão soma 4: o lado sem margem é 21 + 4k.
    expect((a.lado - 2 * MARGEM - 21) % 4).toBe(0);
    expect(a.caminho).toMatch(/^(M\d+ \d+h1v1h-1z)+$/);
    expect(qrDe(`${url}x`).caminho).not.toBe(a.caminho);
  });

  it('o ficheiro é preto sobre branco e não traz nada além do desenho', () => {
    const svg = svgDe(qrDe(url));
    expect(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"')).toBe(true);
    expect(svg).toContain('fill="#ffffff"');
    expect(svg).toContain('fill="#000000"');
    expect(svg).not.toMatch(/<script|on\w+=|href/i);
  });
});
