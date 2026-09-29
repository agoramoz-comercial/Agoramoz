import { afterEach, describe, expect, it, vi } from 'vitest';
import { verificacaoDosMotores } from './verificacao';

// Tokens sintéticos, com a forma dos verdadeiros.
const GOOGLE = 'aBcD1234efGH5678ijKL_-mnOP9012qrST3456uvWX';
const BING = '0123456789ABCDEF0123456789ABCDEF';

afterEach(() => vi.restoreAllMocks());

describe('verificação dos motores de pesquisa', () => {
  it('sem variáveis, não emite nada — nunca um token inventado', () => {
    expect(verificacaoDosMotores({})).toBeUndefined();
  });

  it('com o token do Google, emite a meta-tag do Google', () => {
    expect(verificacaoDosMotores({ GOOGLE_SITE_VERIFICATION: GOOGLE })).toEqual({ google: GOOGLE });
  });

  it('com o do Bing, emite msvalidate.01', () => {
    expect(verificacaoDosMotores({ BING_SITE_VERIFICATION: BING })).toEqual({ other: { 'msvalidate.01': BING } });
  });

  it('com os dois, emite os dois', () => {
    expect(verificacaoDosMotores({ GOOGLE_SITE_VERIFICATION: GOOGLE, BING_SITE_VERIFICATION: BING })).toEqual({
      google: GOOGLE,
      other: { 'msvalidate.01': BING },
    });
  });

  it('um valor com forma impossível é ignorado, com aviso, em vez de publicado', () => {
    const aviso = vi.spyOn(console, 'warn').mockImplementation(() => {});
    // O erro mais provável: colar a meta-tag inteira em vez do token.
    const colado = '<meta name="google-site-verification" content="abc" />';
    expect(verificacaoDosMotores({ GOOGLE_SITE_VERIFICATION: colado })).toBeUndefined();
    expect(aviso).toHaveBeenCalledOnce();
  });

  it('espaços à volta não invalidam um token bom', () => {
    expect(verificacaoDosMotores({ GOOGLE_SITE_VERIFICATION: `  ${GOOGLE}\n` })).toEqual({ google: GOOGLE });
  });
});
