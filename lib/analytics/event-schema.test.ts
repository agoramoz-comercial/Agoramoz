import { describe, expect, it } from 'vitest';
import { NOMES_ACEITES } from './event-schema';
import { EVENTOS_DE_BROWSER, EVENTOS_DE_SERVIDOR } from './events';

/**
 * O schema da rota e a união de tipos são duas declarações da mesma lista.
 * Divergirem não parte o typecheck: parte em produção, com um evento novo a
 * ser disparado pelo cliente e silenciosamente recusado pelo servidor — que é
 * o modo de falha mais caro de detectar, porque não há erro nenhum, só um
 * número que fica abaixo do que devia.
 */
describe('vocabulário de eventos', () => {
  it('o schema aceita exactamente os eventos de browser', () => {
    expect([...NOMES_ACEITES].sort()).toEqual([...EVENTOS_DE_BROWSER].sort());
  });

  it('nenhum evento de servidor é aceitável do browser', () => {
    for (const nome of EVENTOS_DE_SERVIDOR) {
      expect(NOMES_ACEITES as readonly string[]).not.toContain(nome);
    }
  });

  it('as duas listas não se sobrepõem', () => {
    const browser = new Set<string>(EVENTOS_DE_BROWSER);
    for (const nome of EVENTOS_DE_SERVIDOR) expect(browser.has(nome)).toBe(false);
  });
});
