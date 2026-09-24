import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { RPC } from './rpc';

const SQL = readFileSync('supabase/migrations/0006_admin_actions.sql', 'utf-8');

/** Lê os parâmetros declarados na migração para cada função. */
function parametrosDe(nome: string): string[] {
  const inicio = SQL.indexOf(`create or replace function public.${nome}(`);
  if (inicio === -1) return [];
  const abre = SQL.indexOf('(', inicio);
  const fecha = SQL.indexOf('\n)', abre);
  return [...SQL.slice(abre + 1, fecha).matchAll(/^\s*(p_[a-z_]+)\s/gm)].map((m) => m[1]!);
}

describe('contrato das funções do admin', () => {
  it.each(Object.entries(RPC))('%s declara exactamente os parâmetros esperados', (nome, params) => {
    const naMigracao = parametrosDe(nome);
    expect(naMigracao.length, `função ausente da migração: ${nome}`).toBeGreaterThan(0);
    expect([...params].sort()).toEqual([...naMigracao].sort());
  });

  it('toda a função de escrita verifica o papel', () => {
    // A guarda não pode faltar em nenhuma: sem ela, qualquer pessoa
    // autenticada executaria a função, porque o `grant` é a `authenticated`.
    for (const nome of Object.keys(RPC)) {
      const inicio = SQL.indexOf(`create or replace function public.${nome}(`);
      const fim = SQL.indexOf('$$;', inicio);
      const corpo = SQL.slice(inicio, fim);
      expect(corpo, `sem verificação de papel: ${nome}`).toContain('exigir_papel');
    }
  });

  it('toda a função corre com search_path fixo', () => {
    // Sem isto, quem possa criar objectos antepõe um esquema seu e sequestra a
    // resolução de nomes dentro de uma função privilegiada.
    const definers = [...SQL.matchAll(/create or replace function public\.([a-z_]+)\(/g)].map(
      (m) => m[1]!,
    );
    for (const nome of definers) {
      const inicio = SQL.indexOf(`create or replace function public.${nome}(`);
      const cabecalho = SQL.slice(inicio, SQL.indexOf('as $$', inicio));
      expect(cabecalho, nome).toContain('security definer');
      expect(cabecalho, nome).toContain('set search_path = public, pg_catalog');
    }
  });

  it('as políticas de escrita directa são removidas', () => {
    for (const politica of [
      'diagnostics_update',
      'deals_update',
      'activities_insert',
      'profiles_admin_write',
    ]) {
      expect(SQL).toContain(`drop policy if exists ${politica}`);
    }
  });
});
