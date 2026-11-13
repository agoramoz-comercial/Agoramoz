import { describe, expect, it } from 'vitest';
import { CHAVE_INDEXNOW, pedidoIndexNow } from './indexnow';

describe('IndexNow', () => {
  it('a chave tem a forma que o protocolo exige (8–128 caracteres hexadecimais)', () => {
    expect(CHAVE_INDEXNOW).toMatch(/^[0-9a-f]{8,128}$/);
  });

  it('só avisa URLs do próprio domínio, sem repetições, e diz onde está a chave', () => {
    const p = pedidoIndexNow('agoramoz.com', ['https://agoramoz.com/', 'https://agoramoz.com/', 'https://outro.example/x', 'nao-e-url']);
    expect(p).toEqual({
      host: 'agoramoz.com',
      key: CHAVE_INDEXNOW,
      keyLocation: 'https://agoramoz.com/indexnow.txt',
      urlList: ['https://agoramoz.com/'],
    });
  });
});
