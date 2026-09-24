import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { __testing, log } from './logger';

/**
 * O valor deste módulo é negativo: mede-se pelo que NÃO aparece. Estes testes
 * existem para que a lista de permissões continue a ser uma barreira e não
 * uma sugestão.
 */

let escrito: string[] = [];

beforeEach(() => {
  escrito = [];
  const capturar = (...args: unknown[]) => void escrito.push(String(args[0]));
  vi.spyOn(console, 'log').mockImplementation(capturar);
  vi.spyOn(console, 'warn').mockImplementation(capturar);
  vi.spyOn(console, 'error').mockImplementation(capturar);
});

afterEach(() => vi.restoreAllMocks());

describe('lista de permissões', () => {
  it('deixa passar os campos declarados', () => {
    const { safe } = __testing.sanitize({ country: 'mz', tier: 'A', score: 72 });
    expect(safe).toEqual({ country: 'mz', tier: 'A', score: 72 });
  });

  /**
   * Os quatro campos que motivaram este módulo. O `company` era escrito nos
   * logs de runtime pela rota antiga; os outros três nunca foram, e não podem
   * passar a ser por distração.
   */
  it.each(['company', 'name', 'workEmail', 'phone', 'problemImpact', 'currentWebsite'])(
    'descarta o campo sensível %s',
    (campo) => {
      const { safe, dropped } = __testing.sanitize({ [campo]: 'valor sensível' });
      expect(safe).toEqual({});
      expect(dropped).toBe(1);
    },
  );

  it('conta o que descarta, para a omissão ser visível', () => {
    const { safe, dropped } = __testing.sanitize({
      country: 'pt',
      company: 'X',
      workEmail: 'a@b.c',
    });
    expect(Object.keys(safe)).toEqual(['country']);
    expect(dropped).toBe(2);
  });

  /**
   * Um objeto aninhado passaria a verificação ao nível de cima e levava lá
   * dentro o que quisesse. Só escalares entram.
   */
  it('não serializa objetos aninhados mesmo em campos permitidos', () => {
    const { safe } = __testing.sanitize({ reason: { segredo: 'nao-devia-aparecer' } });
    expect(String(safe.reason)).not.toMatch(/segredo|nao-devia/);
  });

  it('preserva nulo e indefinido sem os converter em texto', () => {
    const { safe } = __testing.sanitize({ tier: null, score: undefined });
    expect(safe.tier).toBeNull();
    expect(safe.score).toBeUndefined();
  });
});

describe('formato da linha', () => {
  it('escreve JSON com carimbo, nível, ambiente e serviço', () => {
    log.info('teste.evento', { country: 'br' });
    const linha = JSON.parse(escrito[0]!);

    expect(linha).toMatchObject({ level: 'info', service: 'web', event: 'teste.evento', country: 'br' });
    expect(() => new Date(linha.ts).toISOString()).not.toThrow();
  });

  it('acrescenta a contagem de descartes só quando houve descartes', () => {
    log.info('sem.descarte', { country: 'mz' });
    log.info('com.descarte', { company: 'X' });

    expect(JSON.parse(escrito[0]!).droppedFields).toBeUndefined();
    expect(JSON.parse(escrito[1]!).droppedFields).toBe(1);
  });

  it('usa o stream de erro para nível de erro, que é onde os alertas escutam', () => {
    const erro = vi.spyOn(console, 'error');
    log.error('falhou', { errorCode: 'E_TESTE' });
    expect(erro).toHaveBeenCalledOnce();
  });
});
