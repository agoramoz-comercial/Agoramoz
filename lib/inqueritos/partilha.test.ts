import { describe, expect, it } from 'vitest';
import { montarLinks, type LinhaLink } from './partilha';
import { hashToken, TOKEN_VALIDO } from './token';

const SEGREDO = 's'.repeat(64);
const AGORA = new Date('2026-10-04T12:00:00Z');
const linha = (id: string, extra: Partial<LinhaLink> = {}): LinhaLink => ({
  id,
  rotulo: null,
  created_at: '2026-10-01T00:00:00Z',
  expires_at: null,
  revoked_at: null,
  max_responses: null,
  ...extra,
});

describe('montarLinks', () => {
  it('só os activos levam endereço e QR; o token tem a forma que a rota aceita', () => {
    const [activo, revogado, esgotado] = montarLinks(
      [
        linha('0b5d7a3e-1f2c-4d6e-9a8b-7c6d5e4f3a2b'),
        linha('1b5d7a3e-1f2c-4d6e-9a8b-7c6d5e4f3a2b', { revoked_at: '2026-10-02T00:00:00Z' }),
        linha('2b5d7a3e-1f2c-4d6e-9a8b-7c6d5e4f3a2b', { max_responses: 2 }),
      ],
      new Map([['2b5d7a3e-1f2c-4d6e-9a8b-7c6d5e4f3a2b', 2]]),
      SEGREDO,
      'https://agoramoz.com',
      AGORA,
    );
    expect(activo!.estado).toBe('activo');
    const token = activo!.url!.replace('https://agoramoz.com/i/', '');
    expect(token).toMatch(TOKEN_VALIDO);
    expect(hashToken(token)).toMatch(/^[0-9a-f]{64}$/);
    expect(activo!.qr).not.toBeNull();
    expect(revogado).toMatchObject({ estado: 'revogado', url: null, qr: null });
    expect(esgotado).toMatchObject({ estado: 'esgotado', respostas: 2, url: null });
  });

  it('sem segredo não há endereço, mesmo activo', () => {
    const [l] = montarLinks(
      [linha('0b5d7a3e-1f2c-4d6e-9a8b-7c6d5e4f3a2b')],
      new Map(),
      undefined,
      'https://agoramoz.com',
      AGORA,
    );
    expect(l).toMatchObject({ estado: 'activo', url: null, qr: null });
  });
});
