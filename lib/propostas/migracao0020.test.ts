import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * A 0020 (Propostas) é aplicada pelo fundador, numa parte. Estes testes
 * guardam em CI a forma; o comportamento — versões imutáveis, total calculado
 * na base, revisão contra gravações cruzadas, estados, `leitura` sem escrita,
 * `anon` sem nada — foi provado num Postgres 16 real por
 * `.qa/propostas-comportamento.sql`, com 0001–0020 aplicadas por ordem.
 */

const MIGRACAO = readFileSync('supabase/migrations/0020_propostas.sql', 'utf-8');
const APLICAR = readFileSync('supabase/aplicar-0020.sql', 'utf-8');
const VERIFICAR = readFileSync('supabase/verificar-estado.sql', 'utf-8');
const FIM = '-- ===== fim do cabeçalho: daqui para baixo é a migração 0020, sem alterações =====\n';

function corpoDe(nome: string): string {
  const inicio = MIGRACAO.indexOf(`create or replace function public.${nome}(`);
  expect(inicio, `função ausente: ${nome}`).toBeGreaterThan(-1);
  return MIGRACAO.slice(inicio, MIGRACAO.indexOf('$$;', MIGRACAO.indexOf('as $$', inicio)));
}

describe('0020 — Propostas', () => {
  it('o ficheiro de aplicar é a migração palavra por palavra, e cabe no SQL Editor', () => {
    const i = APLICAR.indexOf(FIM);
    expect(i).toBeGreaterThan(0);
    expect(APLICAR.slice(i + FIM.length)).toBe(MIGRACAO);
    expect(APLICAR.length).toBeLessThan(21_000);
    expect(MIGRACAO).toContain("set lock_timeout = '5s';");
    expect(MIGRACAO).toContain('reset lock_timeout;');
    expect(MIGRACAO.trimEnd().endsWith("notify pgrst, 'reload schema';")).toBe(true);
  });

  it('é repetível: tabelas, índices, políticas e gatilhos com «if not exists» ou apagados antes', () => {
    expect(MIGRACAO).not.toMatch(/create table (?!if not exists)/);
    expect(MIGRACAO).not.toMatch(/create index (?!if not exists)/);
    for (const m of MIGRACAO.matchAll(/create policy (\w+) on ([\w.]+)/g))
      expect(MIGRACAO).toContain(`drop policy if exists ${m[1]} on ${m[2]};`);
    for (const m of MIGRACAO.matchAll(/create trigger (\w+)\s+before update on ([\w.]+)/g))
      expect(MIGRACAO).toContain(`drop trigger if exists ${m[1]} on ${m[2]};`);
  });

  it('sem escrita directa: só políticas de leitura, e a equipa só tem select', () => {
    expect(MIGRACAO).not.toMatch(/create policy[^;]*for (insert|update|delete|all)\b/);
    expect(MIGRACAO).toContain('revoke all on public.propostas from public, anon, authenticated;');
    expect(MIGRACAO).toContain('revoke all on public.propostas_versoes from public, anon, authenticated;');
    expect(MIGRACAO).not.toMatch(/grant (insert|update|delete)/);
  });

  it('as funções de escrita verificam o papel, desistem de locks presos e auditam sem o conteúdo', () => {
    for (const nome of ['guardar_proposta', 'mudar_estado_proposta']) {
      const corpo = corpoDe(nome);
      expect(corpo, nome).toContain("exigir_papel(array['admin', 'comercial']");
      expect(corpo, nome).toContain("set lock_timeout = '4s'");
      expect(corpo, nome).toContain('security definer');
      expect(corpo, nome).toContain('insert into public.audit_log');
      expect(corpo, nome).toMatch(/is distinct from p_revisao/);
      // A auditoria leva números e estados; o texto da proposta nunca.
      const auditoria = corpo.slice(corpo.indexOf('insert into public.audit_log'));
      expect(auditoria, nome).not.toMatch(/p_conteudo|texto_colado|p_nota/);
    }
  });

  it('o total é calculado na base, a partir das fases', () => {
    const corpo = corpoDe('guardar_proposta');
    expect(corpo).toContain('v_total := public.total_da_proposta(p_conteudo);');
    expect(corpo).not.toMatch(/p_total/);
  });

  it('as auxiliares não são chamáveis de fora', () => {
    expect(MIGRACAO).toContain('revoke all on function public.total_da_proposta(jsonb) from public, anon, authenticated;');
    expect(MIGRACAO).toContain('revoke all on function public.validar_conteudo_proposta(jsonb) from public, anon, authenticated;');
  });

  it('o verificar-estado tem a linha 32, com as três respostas', () => {
    expect(VERIFICAR).toContain("select 32, 'propostas'");
    expect(VERIFICAR).toContain('EM FALTA - correr aplicar-0020.sql');
    expect(VERIFICAR).toContain('ATENCAO - protecção incompleta; correr aplicar-0020.sql de novo');
  });
});
