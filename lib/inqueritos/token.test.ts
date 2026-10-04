import { describe, expect, it } from 'vitest';
import {
  SUBMISSAO_VALIDA,
  TOKEN_VALIDO,
  chaveDeIdempotencia,
  hashToken,
  impressaoDasRespostas,
  tokenDoLink,
  urlDoInquerito,
} from './token';

const SEGREDO = 'a'.repeat(64);
const LINK = '0b5d7a3e-1f2c-4d6e-9a8b-7c6d5e4f3a2b';

describe('token do link', () => {
  it('é determinístico, tem a forma aceite pela rota e muda com o link e o segredo', () => {
    const t = tokenDoLink(SEGREDO, LINK);
    expect(t).toMatch(TOKEN_VALIDO);
    expect(tokenDoLink(SEGREDO, LINK)).toBe(t);
    expect(tokenDoLink(SEGREDO, crypto.randomUUID())).not.toBe(t);
    expect(tokenDoLink('b'.repeat(64), LINK)).not.toBe(t);
  });

  it('a base guarda um hash de 64 hex, nunca o token', () => {
    const t = tokenDoLink(SEGREDO, LINK);
    const h = hashToken(t);
    expect(h).toMatch(/^[0-9a-f]{64}$/);
    expect(h).not.toContain(t);
  });

  it('o URL é /i/<token> na origem dada', () => {
    expect(urlDoInquerito('https://agoramoz.com', 'abc')).toBe('https://agoramoz.com/i/abc');
  });
});

describe('idempotência e impressão', () => {
  it('a chave depende da submissão, não das respostas', () => {
    const h = hashToken('x');
    expect(chaveDeIdempotencia(h, crypto.randomUUID())).not.toBe(
      chaveDeIdempotencia(h, crypto.randomUUID()),
    );
    const id = crypto.randomUUID();
    expect(id).toMatch(SUBMISSAO_VALIDA);
    expect(chaveDeIdempotencia(h, id)).toBe(chaveDeIdempotencia(h, id));
  });

  it('a impressão não depende da ordem das chaves', () => {
    expect(impressaoDasRespostas({ a: 1, b: ['x', 'y'] })).toBe(
      impressaoDasRespostas({ b: ['x', 'y'], a: 1 }),
    );
    expect(impressaoDasRespostas({ a: 1 })).not.toBe(impressaoDasRespostas({ a: 2 }));
  });
});
