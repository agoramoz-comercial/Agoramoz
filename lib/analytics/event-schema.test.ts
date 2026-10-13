import { describe, expect, it } from 'vitest';
import { eventoRecebido, NOMES_ACEITES } from './event-schema';
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

describe('project_demo_interaction (demo TerraBuild, D-41)', () => {
  const envelope = (evento: unknown) => ({ evento, channel: 'directo', campaign: null, path: '/projetos' });
  const valido = { name: 'project_demo_interaction', projectId: 'fazenda-inteligente-001', action: '3d_open' };

  it('aceita o evento válido', () => {
    expect(eventoRecebido.safeParse(envelope(valido)).success).toBe(true);
  });

  it.each([
    ['uma chave a mais (nada de texto livre)', { ...valido, texto: 'olá' }],
    ['uma acção desconhecida', { ...valido, action: 'scenario' }],
    ['um projectId que não é de demonstração', { ...valido, projectId: '841234567890' }],
  ])('recusa %s', (_, evento) => {
    expect(eventoRecebido.safeParse(envelope(evento)).success).toBe(false);
  });
});
