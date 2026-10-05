import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { LIMITES } from './spec';

/**
 * A 0014 é aplicada pelo fundador (`supabase/aplicar-0014.sql`). Estes testes
 * garantem que o ficheiro de aplicar é a migração e que a rede da base
 * acompanha os limites do zod.
 */
const MIGRACAO = readFileSync('supabase/migrations/0014_inqueritos_limites.sql', 'utf-8');
const APLICAR = readFileSync('supabase/aplicar-0014.sql', 'utf-8');
const VERIFICAR = readFileSync('supabase/verificar-estado.sql', 'utf-8');

describe('0014 — limites do Microsoft Forms', () => {
  it('o ficheiro de aplicar contém a migração, palavra por palavra', () => {
    expect(APLICAR.endsWith(MIGRACAO)).toBe(true);
  });

  it('a base aceita os blocos que o zod aceita (200 perguntas + 50 secções)', () => {
    expect(LIMITES.blocos).toBe(LIMITES.perguntas + LIMITES.seccoes);
    expect(MIGRACAO).toContain(`between 1 and ${LIMITES.blocos}`);
    expect(MIGRACAO).toContain(`octet_length(p_spec::text) <= ${LIMITES.specBytes * 2}`);
  });

  it('é repetível, só substitui a função e continua fechada a quem não é a aplicação', () => {
    expect(MIGRACAO).toContain(
      'create or replace function public.spec_de_inquerito_valido(p_spec jsonb)',
    );
    expect(MIGRACAO).toContain('set search_path = public, pg_catalog');
    expect(MIGRACAO).toContain(
      'revoke all on function public.spec_de_inquerito_valido(jsonb) from public, anon, authenticated;',
    );
    // Só código SQL (sem os comentários): nada além de criar a função e o revoke.
    const codigo = MIGRACAO.replace(/--.*$/gm, '');
    expect(codigo.match(/\b(create|alter|drop|insert|update|delete|truncate|grant)\b/gi)).toEqual([
      'create',
    ]);
  });

  it('verificar-estado tem a linha 25 para a 0014', () => {
    expect(VERIFICAR).toContain(
      "select 25, 'função', 'inquéritos: 200 perguntas + 50 secções (0014)'",
    );
    expect(VERIFICAR).toContain(`between 1 and ${LIMITES.blocos}`);
    expect(VERIFICAR).toContain(`<= ${LIMITES.specBytes * 2}`);
    expect(VERIFICAR).toContain("to_regprocedure('public.spec_de_inquerito_valido(jsonb)')");
  });
});
