import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { RPC } from '@/lib/admin/rpc';

/**
 * A 0019 (CRM operacional) é aplicada pelo fundador, em duas partes. Estes
 * testes guardam em CI a forma; o comportamento — próxima acção com revisão,
 * perda com motivo, aprovar/rejeitar a mover só o que está em `novo`, a
 * pesquisa a tratar % e _ como letras, `leitura` sem escrita, `anon` sem
 * execução — foi provado num Postgres 16 real por `.qa/crm-comportamento.sql`.
 */

const MIGRACAO = readFileSync('supabase/migrations/0019_crm_operacional.sql', 'utf-8');
const VERIFICAR = readFileSync('supabase/verificar-estado.sql', 'utf-8');
const FIM = '-- ===== fim do cabeçalho: daqui para baixo é a migração 0019, sem alterações =====\n';

function corpo(ficheiro: string): string {
  const texto = readFileSync(ficheiro, 'utf-8');
  const i = texto.indexOf(FIM);
  expect(i, ficheiro).toBeGreaterThan(0);
  return texto.slice(i + FIM.length);
}

function corpoDe(nome: string): string {
  const inicio = MIGRACAO.indexOf(`create or replace function public.${nome}(`);
  expect(inicio, `função ausente: ${nome}`).toBeGreaterThan(-1);
  return MIGRACAO.slice(inicio, MIGRACAO.indexOf('$$;', MIGRACAO.indexOf('as $$', inicio)));
}

const ESCRITA = [
  'atribuir_oportunidade',
  'definir_proxima_accao',
  'guardar_oportunidade_crm',
  'marcar_perdida',
  'mudar_fase_oportunidade',
  'registar_actividade',
  'aprovar_diagnostico',
  'rejeitar_diagnostico',
  'registar_exportacao_crm',
] as const;

describe('0019 — CRM operacional', () => {
  it('as três partes de aplicar somam a migração, palavra por palavra', () => {
    const p1 = corpo('supabase/aplicar-0019-parte1.sql');
    const p2 = corpo('supabase/aplicar-0019-parte2.sql');
    const p3 = corpo('supabase/aplicar-0019-parte3.sql');
    expect(p1 + p2 + p3).toBe(MIGRACAO);
    expect(p1).toContain('add column if not exists proxima_accao');
    expect(p2).toContain('create or replace function public.marcar_perdida(');
    expect(p3).toContain('create or replace function public.registar_reuniao(');
    expect(p3.trimEnd().endsWith("notify pgrst, 'reload schema';")).toBe(true);
    // Cada parte desiste de um lock preso em vez de bloquear o tráfego, e repõe-no.
    for (const p of [p1, p2, p3]) {
      expect(p).toContain("set lock_timeout = '5s';");
      expect(p).toContain('reset lock_timeout;');
    }
    for (const f of [1, 2, 3].map((n) => `supabase/aplicar-0019-parte${n}.sql`)) {
      expect(readFileSync(f).length, f).toBeLessThan(21_000);
    }
  });

  it('o Cal nunca apaga a data de uma acção escrita pela equipa', () => {
    const c = corpoDe('registar_reuniao');
    expect(c).toContain('and d.proxima_accao is null');
    expect(c).toContain('revisao = d.revisao + 1');
    expect(MIGRACAO).toMatch(/grant execute on function public\.registar_reuniao\([^)]*\)\s+to service_role;/);
  });

  it('revisão nula não contorna o controlo optimista', () => {
    expect(MIGRACAO).not.toMatch(/revisao <> p_revisao|revision <> p_revision/);
    expect(MIGRACAO).toContain('is distinct from p_revisao');
  });

  it('é repetível: só formas idempotentes', () => {
    expect(MIGRACAO).not.toMatch(/add column (?!if not exists)/);
    expect(MIGRACAO).not.toMatch(/create index (?!if not exists)/);
    expect(MIGRACAO).not.toMatch(/create function /);
    for (const c of ['deals_valor_com_moeda', 'deals_proxima_accao_com_data', 'deals_motivo_so_se_perdido']) {
      expect(MIGRACAO).toContain(`drop constraint if exists ${c}`);
    }
    expect(MIGRACAO).toContain('drop trigger if exists deals_marca_fase');
    expect(MIGRACAO).toContain('drop view if exists public.crm_oportunidades;');
    expect(MIGRACAO).not.toMatch(/create or replace view/);
  });

  it.each(ESCRITA)('%s: guarda de papel, security definer, search_path e lock_timeout', (nome) => {
    const c = corpoDe(nome);
    expect(c).toContain("exigir_papel(array['admin', 'comercial']");
    expect(c).toContain('security definer');
    expect(c).toContain('set search_path = pg_catalog, public');
    expect(c).toContain("set lock_timeout = '4s'");
    expect(c).toContain('insert into public.audit_log');
  });

  it('as assinaturas que a aplicação já usa não mudaram', () => {
    expect(corpoDe('mudar_fase_oportunidade')).toMatch(/p_deal_id uuid,\s+p_fase text,\s+p_nota text default null\s*\)/);
    expect(corpoDe('registar_actividade')).toMatch(/p_deal_id uuid,\s+p_tipo text,\s+p_corpo text\s*\)/);
    expect(corpoDe('aprovar_diagnostico')).toMatch(/p_id uuid,\s+p_revision integer\s*\)/);
    expect(corpoDe('rejeitar_diagnostico')).toMatch(/p_id uuid,\s+p_revision integer,\s+p_motivo text\s*\)/);
  });

  it('«perdido» só por marcar_perdida, e o diagnóstico só move o que está em novo', () => {
    expect(corpoDe('mudar_fase_oportunidade')).toContain("if p_fase = 'perdido' then");
    expect(corpoDe('aprovar_diagnostico')).toContain("and stage = 'novo'");
    expect(corpoDe('rejeitar_diagnostico')).toContain("and stage = 'novo'");
    expect(corpoDe('rejeitar_diagnostico')).toContain("motivo_perda = 'nao_qualificado'");
  });

  it('a pesquisa é security invoker (RLS de quem pesquisa) e escapa os curingas', () => {
    const c = corpoDe('pesquisar_global');
    expect(c).toContain('security invoker');
    expect(c).not.toContain('security definer');
    expect(c).toContain("'%', '\\%'");
    expect(c).toContain("'_', '\\_'");
  });

  it('direitos: tudo revogado a public e anon, concedido só a authenticated', () => {
    for (const f of [...ESCRITA, 'pesquisar_global']) {
      expect(MIGRACAO, f).toMatch(new RegExp(`'public\\.${f}\\(`));
    }
    expect(MIGRACAO).toContain("revoke all on function %s from public, anon");
    expect(MIGRACAO).toContain('revoke all on function public.deals_marca_fase() from public, anon, authenticated');
  });

  it('a vista do pipeline é security_invoker e não é legível por anon', () => {
    expect(MIGRACAO).toContain('create view public.crm_oportunidades\nwith (security_invoker = true)');
    expect(MIGRACAO).toContain('revoke all on public.crm_oportunidades from public, anon;');
  });

  it('o contrato RPC cobre as funções novas', () => {
    expect(RPC.definir_proxima_accao).toEqual(['p_deal_id', 'p_revisao', 'p_accao', 'p_quando']);
    expect(RPC.marcar_perdida).toEqual(['p_deal_id', 'p_motivo', 'p_nota']);
    expect(RPC.registar_exportacao_crm).toEqual(['p_lista', 'p_linhas', 'p_filtros']);
  });

  it('a exportação CSV fica na auditoria: só duas listas, nunca os dados exportados', () => {
    const c = corpoDe('registar_exportacao_crm');
    expect(c).toContain("p_lista not in ('contactos', 'oportunidades')");
    expect(c).toContain("'crm.exportar'");
    expect(c).toContain("octet_length(p_filtros::text) > 1000");
  });

  it('verificar-estado: linha 31 distingue parte 1, parte 2 e protecção', () => {
    expect(VERIFICAR).toContain("select 31, 'crm'");
    expect(VERIFICAR).toContain('EM FALTA - correr aplicar-0019-parte1.sql');
    expect(VERIFICAR).toContain('EM FALTA - correr aplicar-0019-parte2.sql');
    expect(VERIFICAR).toContain("p.prosrc like '%Para marcar como perdida%'");
  });
});
