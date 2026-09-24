import { describe, expect, it } from 'vitest';
import { clientKey, createMemoryRateLimiter } from './rate-limit';

describe('limitador em memória', () => {
  it('permite até ao tecto e trava a partir daí', () => {
    const l = createMemoryRateLimiter({ max: 3, windowMs: 1000, now: () => 0 });

    expect(l.check('a').allowed).toBe(true);
    expect(l.check('a').allowed).toBe(true);
    expect(l.check('a').allowed).toBe(true);
    expect(l.check('a').allowed).toBe(false);
  });

  it('conta em baixo os pedidos que restam', () => {
    const l = createMemoryRateLimiter({ max: 3, windowMs: 1000, now: () => 0 });
    expect(l.check('a').remaining).toBe(2);
    expect(l.check('a').remaining).toBe(1);
    expect(l.check('a').remaining).toBe(0);
  });

  it('renova a janela depois de ela expirar', () => {
    let agora = 0;
    const l = createMemoryRateLimiter({ max: 1, windowMs: 1000, now: () => agora });

    expect(l.check('a').allowed).toBe(true);
    expect(l.check('a').allowed).toBe(false);

    agora = 1001;
    expect(l.check('a').allowed).toBe(true);
  });

  it('isola chaves distintas', () => {
    const l = createMemoryRateLimiter({ max: 1, windowMs: 1000, now: () => 0 });
    expect(l.check('a').allowed).toBe(true);
    expect(l.check('b').allowed).toBe(true);
    expect(l.check('a').allowed).toBe(false);
  });

  it('anuncia quando a janela se renova', () => {
    const l = createMemoryRateLimiter({ max: 1, windowMs: 5000, now: () => 1000 });
    expect(l.check('a').resetAt).toBe(6000);
  });

  /**
   * Sem tecto de chaves, rodar a origem fazia o mapa crescer até a instância
   * ficar sem memória — o limitador passava a ser ele próprio o vetor de
   * negação de serviço que devia travar. Falha fechado, nunca aberto.
   */
  it('não cresce sem limite e recusa em vez de ceder', () => {
    const l = createMemoryRateLimiter({ max: 10, windowMs: 60_000, now: () => 0, maxKeys: 3 });

    expect(l.check('k1').allowed).toBe(true);
    expect(l.check('k2').allowed).toBe(true);
    expect(l.check('k3').allowed).toBe(true);
    expect(l.check('k4').allowed).toBe(false);
  });

  it('liberta espaço quando as janelas antigas expiram', () => {
    let agora = 0;
    const l = createMemoryRateLimiter({ max: 10, windowMs: 1000, now: () => agora, maxKeys: 2 });

    l.check('k1');
    l.check('k2');
    expect(l.check('k3').allowed).toBe(false);

    agora = 1001; // k1 e k2 expiram
    expect(l.check('k3').allowed).toBe(true);
  });
});

describe('identidade do pedido', () => {
  function req(headers: Record<string, string>) {
    return new Request('https://agoramoz.com/x', { headers });
  }

  /**
   * A chave acaba em estruturas que podem ser inspecionadas. O IP é dado
   * pessoal e não pode lá estar em claro.
   */
  it('devolve um hash, nunca o endereço', async () => {
    const chave = await clientKey(req({ 'x-forwarded-for': '203.0.113.42' }));
    expect(chave).not.toContain('203.0.113.42');
    expect(chave).toMatch(/^[0-9a-f]{32}$/);
  });

  it('é estável para a mesma origem', async () => {
    const a = await clientKey(req({ 'x-forwarded-for': '203.0.113.42' }));
    const b = await clientKey(req({ 'x-forwarded-for': '203.0.113.42' }));
    expect(a).toBe(b);
  });

  it('separa origens diferentes', async () => {
    const a = await clientKey(req({ 'x-forwarded-for': '203.0.113.1' }));
    const b = await clientKey(req({ 'x-forwarded-for': '203.0.113.2' }));
    expect(a).not.toBe(b);
  });

  /**
   * Atrás de um proxy o cabeçalho vem como lista; o cliente é o primeiro. Usar
   * o último daria a mesma chave a toda a gente que passe pelo mesmo proxy.
   */
  it('usa o primeiro endereço da cadeia de proxies', async () => {
    const cadeia = await clientKey(req({ 'x-forwarded-for': '203.0.113.9, 70.41.3.18' }));
    const directo = await clientKey(req({ 'x-forwarded-for': '203.0.113.9' }));
    expect(cadeia).toBe(directo);
  });

  it('recorre a x-real-ip quando não há cadeia', async () => {
    const a = await clientKey(req({ 'x-real-ip': '203.0.113.5' }));
    const b = await clientKey(req({ 'x-forwarded-for': '203.0.113.5' }));
    expect(a).toBe(b);
  });

  it('não rebenta quando não há cabeçalho nenhum', async () => {
    await expect(clientKey(req({}))).resolves.toMatch(/^[0-9a-f]{32}$/);
  });
});
