import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * A 0012 não pode ser aplicada por mim em produção (a base está fora do meu
 * acesso): quem a aplica corre `supabase/aplicar-0012.sql` no SQL Editor. Estes
 * testes garantem que esse ficheiro é a migração, e que as guardas estão lá.
 * O comportamento é provado num Postgres real por `.qa/reunioes-comportamento.sql`.
 */

const MIGRACAO = readFileSync('supabase/migrations/0012_reunioes.sql', 'utf-8');
const APLICAR = readFileSync('supabase/aplicar-0012.sql', 'utf-8');

describe('0012 — reuniões', () => {
  it('o ficheiro de aplicar contém a migração, palavra por palavra', () => {
    expect(APLICAR.endsWith(MIGRACAO)).toBe(true);
  });

  it('é repetível: só formas idempotentes de criação', () => {
    expect(MIGRACAO).not.toMatch(/create table (?!if not exists)/);
    expect(MIGRACAO).not.toMatch(/create index (?!if not exists)/);
    expect(MIGRACAO).toMatch(/drop trigger if exists reunioes_set_updated_at/);
    expect(MIGRACAO).toMatch(/drop policy if exists reunioes_select/);
  });

  it('a função corre com search_path fixo e só a chave de serviço a executa', () => {
    const inicio = MIGRACAO.indexOf('create or replace function public.registar_reuniao(');
    const cabecalho = MIGRACAO.slice(inicio, MIGRACAO.indexOf('as $$', inicio));
    expect(cabecalho).toContain('security definer');
    expect(cabecalho).toContain('set search_path = public, pg_catalog');
    expect(MIGRACAO).toMatch(/revoke all on function public\.registar_reuniao\([^)]*\)\s+from public, anon, authenticated;/);
    expect(MIGRACAO).toMatch(/grant execute on function public\.registar_reuniao\([^)]*\)\s+to service_role;/);
  });

  it('RLS ligada nas duas tabelas; as intenções não têm política nenhuma', () => {
    expect(MIGRACAO).toContain('alter table public.reunioes_intencoes enable row level security;');
    expect(MIGRACAO).toContain('alter table public.reunioes enable row level security;');
    expect(MIGRACAO).not.toMatch(/create policy \w+ on public\.reunioes_intencoes/);
    expect(MIGRACAO).toMatch(/create policy reunioes_select on public\.reunioes\s+for select to authenticated using \(public\.is_staff\(\)\);/);
  });

  it('não há colunas para dados pessoais', () => {
    const tabelas = MIGRACAO.slice(0, MIGRACAO.indexOf('create or replace function'));
    for (const proibida of ['email', 'nome', 'name', 'phone', 'telefone', 'video', 'attendee']) {
      expect(tabelas, proibida).not.toMatch(new RegExp(`^\\s+${proibida}\\w*\\s+text`, 'm'));
    }
  });
});
