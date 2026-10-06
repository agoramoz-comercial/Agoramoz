import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * A 0016 (prazos do News) é aplicada pelo fundador (`supabase/aplicar-0016.sql`).
 * O comportamento — a função desiste de um lock preso em ~4 s em vez de
 * segurar a ligação — foi provado num Postgres 16 real com um lock simulado.
 */

const MIGRACAO = readFileSync('supabase/migrations/0016_news_prazos.sql', 'utf-8');
const APLICAR = readFileSync('supabase/aplicar-0016.sql', 'utf-8');
const VERIFICAR = readFileSync('supabase/verificar-estado.sql', 'utf-8');
const M0015 = readFileSync('supabase/migrations/0015_news.sql', 'utf-8');

/** As 13 funções da 0015, com a assinatura exacta. */
function funcoesDa0015(): string[] {
  return [...M0015.matchAll(/revoke all on function (public\.[a-z_]+\([^)]*\)) from public/g)].map((m) => m[1]!);
}

describe('0016 — prazos do News', () => {
  it('o ficheiro de aplicar contém a migração, palavra por palavra', () => {
    expect(APLICAR.endsWith(MIGRACAO)).toBe(true);
    // Começa com linhas em branco: uma cópia cortada no início não estraga nada.
    expect(APLICAR.startsWith('\n')).toBe(true);
  });

  it('todas as funções da 0015 ganham lock_timeout de 4 s', () => {
    const funcoes = funcoesDa0015();
    expect(funcoes).toHaveLength(13);
    for (const f of funcoes) expect(MIGRACAO).toContain(`alter function ${f} set lock_timeout = '4s';`);
  });

  it('a chave de serviço ganha um tecto por consulta, sem partir se o papel não puder ser alterado', () => {
    expect(MIGRACAO).toContain("alter role service_role set statement_timeout = ''15s''");
    expect(MIGRACAO).toContain('when insufficient_privilege then');
  });

  it('a API relê configuração e esquema no fim; nada de dados nem permissões', () => {
    expect(MIGRACAO.trimEnd().endsWith("notify pgrst, 'reload schema';")).toBe(true);
    expect(MIGRACAO).toContain("notify pgrst, 'reload config';");
    expect(MIGRACAO).not.toMatch(/\b(grant|revoke|insert|update|delete|drop)\b/i);
  });

  it('o verificar-estado tem a linha 28', () => {
    expect(VERIFICAR).toContain("select 28, 'prazo'");
    expect(VERIFICAR).toContain("'lock_timeout=4s' = any(coalesce(p.proconfig, '{}'))");
  });
});
