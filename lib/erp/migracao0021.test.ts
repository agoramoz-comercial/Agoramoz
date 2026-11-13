import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * A 0021 (Facturação interna) é aplicada pelo fundador, numa parte. Estes
 * testes guardam a forma; o comportamento — só ganhas, número único, sem
 * data futura, anular com motivo e revisão, refacturar, sem escrita directa,
 * `leitura` só lê, `anon` sem nada — foi provado num Postgres 16 real por
 * `.qa/facturacao-comportamento.sql`, com 0001–0021 aplicadas por ordem.
 */

const MIGRACAO = readFileSync('supabase/migrations/0021_facturacao.sql', 'utf-8');
const APLICAR = readFileSync('supabase/aplicar-0021.sql', 'utf-8');
const VERIFICAR = readFileSync('supabase/verificar-estado.sql', 'utf-8');
const FIM = '-- ===== fim do cabeçalho: daqui para baixo é a migração 0021, sem alterações =====\n';

function corpoDe(nome: string): string {
  const inicio = MIGRACAO.indexOf(`create or replace function public.${nome}(`);
  expect(inicio, `função ausente: ${nome}`).toBeGreaterThan(-1);
  return MIGRACAO.slice(inicio, MIGRACAO.indexOf('$$;', MIGRACAO.indexOf('as $$', inicio)));
}

describe('0021 — Facturação interna', () => {
  it('o ficheiro de aplicar é a migração palavra por palavra, e cabe no SQL Editor', () => {
    const i = APLICAR.indexOf(FIM);
    expect(i).toBeGreaterThan(0);
    expect(APLICAR.slice(i + FIM.length)).toBe(MIGRACAO);
    expect(APLICAR.length).toBeLessThan(21_000);
    expect(MIGRACAO).toContain("set lock_timeout = '5s';");
    expect(MIGRACAO.trimEnd().endsWith("notify pgrst, 'reload schema';")).toBe(true);
  });

  it('é repetível', () => {
    expect(MIGRACAO).not.toMatch(/create table (?!if not exists)/);
    expect(MIGRACAO).not.toMatch(/create (unique )?index (?!if not exists)/);
    expect(MIGRACAO).toContain('drop policy if exists facturacao_select on public.facturacao;');
    expect(MIGRACAO).toContain('drop trigger if exists facturacao_set_updated_at on public.facturacao;');
  });

  it('sem escrita directa: só leitura para a equipa', () => {
    expect(MIGRACAO).not.toMatch(/create policy[^;]*for (insert|update|delete|all)\b/);
    expect(MIGRACAO).toContain('revoke all on public.facturacao from public, anon, authenticated;');
    expect(MIGRACAO).not.toMatch(/grant (insert|update|delete)/);
  });

  it('as funções verificam o papel, desistem de locks presos, auditam e deixam rasto na oportunidade', () => {
    for (const nome of ['marcar_facturada', 'anular_facturacao', 'registar_exportacao_facturacao']) {
      const corpo = corpoDe(nome);
      expect(corpo, nome).toContain("exigir_papel(array['admin', 'comercial']");
      expect(corpo, nome).toContain("set lock_timeout = '4s'");
      expect(corpo, nome).toContain('insert into public.audit_log');
    }
    for (const nome of ['marcar_facturada', 'anular_facturacao']) {
      expect(corpoDe(nome), nome).toContain('insert into public.activities');
      expect(corpoDe(nome), nome).toMatch(/is distinct from p_revisao/);
    }
    expect(corpoDe('marcar_facturada')).toContain("d.stage <> 'ganho'");
  });

  it('o número de factura é único entre as válidas', () => {
    expect(MIGRACAO).toMatch(/create unique index if not exists facturacao_numero_unico[\s\S]*where estado = 'facturada'/);
  });

  it('o verificar-estado tem a linha 33, com as três respostas', () => {
    expect(VERIFICAR).toContain("select 33, 'facturacao'");
    expect(VERIFICAR).toContain('EM FALTA - correr aplicar-0021.sql');
    expect(VERIFICAR).toContain('ATENCAO - protecção incompleta; correr aplicar-0021.sql de novo');
  });
});
