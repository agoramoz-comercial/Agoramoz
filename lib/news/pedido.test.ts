import { describe, expect, it } from 'vitest';
import { hostPrivado, pedidoSchema, TEXTO_MIN, urlPublica } from './pedido';

describe('urlPublica — só notícias na Internet pública', () => {
  it('aceita https de um domínio público', () => {
    expect(urlPublica('https://www.exemplo.co.mz/noticia/123?x=1')).toBe(true);
    expect(urlPublica('https://exemplo.com:443/a')).toBe(true);
  });

  it.each([
    ['http, não https', 'http://exemplo.com/a'],
    ['credenciais no URL', 'https://user:pw@exemplo.com/a'],
    ['porta não standard', 'https://exemplo.com:8443/a'],
    ['localhost', 'https://localhost/a'],
    ['loopback', 'https://127.0.0.1/a'],
    ['loopback em decimal', 'https://2130706433/a'],
    ['rede privada 10/8', 'https://10.1.2.3/a'],
    ['rede privada 172.16/12', 'https://172.20.0.1/a'],
    ['rede privada 192.168/16', 'https://192.168.1.1/a'],
    ['metadados da nuvem', 'https://169.254.169.254/latest'],
    ['CGNAT', 'https://100.64.0.1/a'],
    ['IPv6 literal', 'https://[::1]/a'],
    ['nome local', 'https://servidor.internal/a'],
    ['nome sem ponto', 'https://intranet/a'],
    ['não é URL', 'isto não é url'],
    ['javascript:', 'javascript:alert(1)'],
  ])('recusa %s', (_, url) => {
    expect(urlPublica(url)).toBe(false);
  });

  it('hostPrivado aceita IPs públicos (o motor decide se há lá notícia)', () => {
    expect(hostPrivado('8.8.8.8')).toBe(false);
    expect(hostPrivado('172.32.0.1')).toBe(false);
  });
});

describe('pedidoSchema', () => {
  it('modo url com idioma do motor', () => {
    expect(pedidoSchema.safeParse({ modo: 'url', url: 'https://exemplo.com/a', idioma: 'xg' }).success).toBe(true);
  });

  it('modo texto exige pelo menos TEXTO_MIN caracteres depois de aparar', () => {
    const curto = ' '.repeat(50) + 'x'.repeat(TEXTO_MIN - 1) + ' '.repeat(50);
    expect(pedidoSchema.safeParse({ modo: 'texto', texto: curto, idioma: 'pt' }).success).toBe(false);
    expect(pedidoSchema.safeParse({ modo: 'texto', texto: 'x'.repeat(TEXTO_MIN), idioma: 'pt' }).success).toBe(true);
  });

  it('idioma fora da lista, modo desconhecido ou campo do outro modo: recusado', () => {
    expect(pedidoSchema.safeParse({ modo: 'url', url: 'https://exemplo.com/a', idioma: 'es' }).success).toBe(false);
    expect(pedidoSchema.safeParse({ modo: 'pdf', url: 'https://exemplo.com/a', idioma: 'pt' }).success).toBe(false);
    expect(pedidoSchema.safeParse({ modo: 'url', texto: 'x'.repeat(300), idioma: 'pt' }).success).toBe(false);
  });
});
