import { describe, expect, it } from 'vitest';
import { GLOBAL_CODES, GLOBAL_MARKETS, RESERVED_TOP_LEVEL_SLUGS, getGlobalMarket, isGlobalCode } from '@/content/registry';

/**
 * Guardas do nível de expansão.
 *
 * A que mais importa é a dos dez setores por mercado. Hoje, quatro dos cinco
 * setores de Moçambique mostram «Página em preparação» — que o diagnóstico de
 * conversão descreve como «sinal de empresa incompleta no momento de decisão».
 * Este ficheiro existe para que isso não se repita dez vezes.
 */

describe('mercados globais', () => {
  it('são dez, na ordem do scorecard', () => {
    expect(GLOBAL_CODES).toHaveLength(10);
    expect(Object.keys(GLOBAL_MARKETS).sort()).toEqual([...GLOBAL_CODES].sort());
  });

  it('cada mercado tem exactamente dez setores', () => {
    for (const code of GLOBAL_CODES) {
      expect(GLOBAL_MARKETS[code].sectors, `${code}`).toHaveLength(10);
    }
  });

  it('nenhum setor tem dor ou resultado vazios', () => {
    const vazios: string[] = [];
    for (const code of GLOBAL_CODES) {
      for (const s of GLOBAL_MARKETS[code].sectors) {
        for (const campo of ['pain', 'outcome', 'name'] as const) {
          for (const idioma of ['pt', 'en'] as const) {
            if (s[campo][idioma].trim() === '') vazios.push(`${code}/${s.slug}.${campo}.${idioma}`);
          }
        }
      }
    }
    expect(vazios).toEqual([]);
  });

  /**
   * Nenhuma página pode dizer que está a ser preparada. Ou existe, ou não entra.
   *
   * As duas expressões são separadas de propósito. A primeira é insensível a
   * maiúsculas porque «Em Preparação» e «em preparação» são a mesma falha. A
   * segunda NÃO é: `/TODO/i` casava com a palavra portuguesa «todos» —
   * «alimenta todos os portais» — e acusava seis mercados corretos. O teste
   * estava errado, não o conteúdo.
   */
  it('nenhum texto anuncia que está por fazer', () => {
    const emProsa = /em prepara|coming soon|brevemente|placeholder|lorem ipsum/i;
    const marcadores = /\b(TODO|TBD|FIXME|XXX)\b/;
    const maus: string[] = [];
    for (const code of GLOBAL_CODES) {
      const tudo = JSON.stringify(GLOBAL_MARKETS[code]);
      if (emProsa.test(tudo) || marcadores.test(tudo)) maus.push(code);
    }
    expect(maus).toEqual([]);
  });

  it('o próprio detector funciona', () => {
    // Guarda contra o teste acima passar por não detectar nada.
    const emProsa = /em prepara|coming soon|brevemente|placeholder|lorem ipsum/i;
    const marcadores = /\b(TODO|TBD|FIXME|XXX)\b/;
    expect(emProsa.test('Página em preparação')).toBe(true);
    expect(marcadores.test('TODO: escrever')).toBe(true);
    // E não acusa o português legítimo.
    expect(marcadores.test('alimenta todos os portais')).toBe(false);
    expect(emProsa.test('Um registo mestre que alimenta todos os portais.')).toBe(false);
  });

  it('os slugs são ASCII e únicos dentro de cada mercado', () => {
    for (const code of GLOBAL_CODES) {
      const slugs = GLOBAL_MARKETS[code].sectors.map((s) => s.slug);
      expect(new Set(slugs).size, `${code} tem slugs repetidos`).toBe(slugs.length);
      for (const s of slugs) expect(s, `${code}/${s}`).toMatch(/^[a-z0-9-]+$/);
    }
  });

  it('cada mercado declara moeda e regime de dados', () => {
    for (const code of GLOBAL_CODES) {
      const m = GLOBAL_MARKETS[code];
      expect(m.currency, `${code}`).toMatch(/^[A-Z]{3}$/);
      expect(m.dataRegime.trim(), `${code}`).not.toBe('');
      expect(m.code).toBe(code);
    }
  });

  /**
   * O nível global não pode colidir com um mercado de operação. Portugal é
   * mercado de operação e não se repete aqui — foi uma correcção deliberada à
   * lista de partida, registada em GAPS.md (B-19).
   */
  it('nenhum código global colide com os mercados de operação', () => {
    for (const code of GLOBAL_CODES) expect(['mz', 'pt', 'br']).not.toContain(code);
  });

  it('`global` está reservado como segmento de topo', () => {
    expect(RESERVED_TOP_LEVEL_SLUGS as readonly string[]).toContain('global');
    expect(RESERVED_TOP_LEVEL_SLUGS as readonly string[]).toContain('en');
  });

  it('a procura por código recusa o que não existe', () => {
    expect(getGlobalMarket('ch')?.code).toBe('ch');
    expect(getGlobalMarket('mz')).toBeNull();
    expect(getGlobalMarket('xx')).toBeNull();
    expect(isGlobalCode('za')).toBe(true);
    expect(isGlobalCode('pt')).toBe(false);
  });

  it('cem setores no total', () => {
    const total = GLOBAL_CODES.reduce((n, c) => n + GLOBAL_MARKETS[c].sectors.length, 0);
    expect(total).toBe(100);
  });
});
