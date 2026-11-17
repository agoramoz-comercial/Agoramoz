import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * A 0022 (Cursos) é aplicada pelo fundador, numa parte. Estes testes guardam
 * a forma; o comportamento — endereço com sufixo e fixo, revisão, publicar só
 * com conteúdo verificado, sem escrita directa, `leitura` só lê, `anon` sem
 * nada — foi provado num Postgres 16 real por `.qa/cursos-comportamento.sql`.
 */

const MIGRACAO = readFileSync('supabase/migrations/0022_cursos.sql', 'utf-8');
const APLICAR = readFileSync('supabase/aplicar-0022.sql', 'utf-8');
const VERIFICAR = readFileSync('supabase/verificar-estado.sql', 'utf-8');
const FIM = '-- ===== fim do cabeçalho: daqui para baixo é a migração 0022, sem alterações =====\n';

function corpoDe(nome: string): string {
  const inicio = MIGRACAO.indexOf(`create or replace function public.${nome}(`);
  expect(inicio, `função ausente: ${nome}`).toBeGreaterThan(-1);
  return MIGRACAO.slice(inicio, MIGRACAO.indexOf('$$;', MIGRACAO.indexOf('as $$', inicio)));
}

describe('0022 — Cursos', () => {
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
    expect(MIGRACAO).toContain('drop policy if exists cursos_select on public.cursos;');
    expect(MIGRACAO).toContain('drop trigger if exists cursos_set_updated_at on public.cursos;');
  });

  it('sem escrita directa e sem leitura anónima: o público lê pelo servidor', () => {
    expect(MIGRACAO).not.toMatch(/create policy[^;]*for (insert|update|delete|all)\b/);
    expect(MIGRACAO).not.toMatch(/to anon/);
    expect(MIGRACAO).toContain('revoke all on public.cursos from public, anon, authenticated;');
    expect(MIGRACAO).not.toMatch(/grant (insert|update|delete)/);
  });

  it('as funções verificam o papel, a revisão, desistem de locks presos e auditam sem o conteúdo', () => {
    for (const nome of ['guardar_curso', 'mudar_estado_curso']) {
      const corpo = corpoDe(nome);
      expect(corpo, nome).toContain("exigir_papel(array['admin', 'comercial']");
      expect(corpo, nome).toContain("set lock_timeout = '4s'");
      expect(corpo, nome).toContain('insert into public.audit_log');
      expect(corpo, nome).toMatch(/is distinct from p_revisao/);
      expect(corpo, nome).not.toMatch(/'conteudo', |'fontes', p_fontes/);
    }
    expect(corpoDe('mudar_estado_curso')).toContain('{verificacao,aceites}');
    expect(corpoDe('guardar_curso')).toContain('O endereço não muda');
  });

  it('o verificar-estado tem a linha 34, com as três respostas', () => {
    expect(VERIFICAR).toContain("select 34, 'cursos'");
    expect(VERIFICAR).toContain('EM FALTA - correr aplicar-0022.sql');
    expect(VERIFICAR).toContain('ATENCAO - protecção incompleta; correr aplicar-0022.sql de novo');
  });
});
