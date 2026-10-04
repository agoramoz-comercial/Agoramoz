import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * A 0013 não pode ser aplicada por mim em produção: quem a aplica corre
 * `supabase/aplicar-0013.sql` no SQL Editor. Estes testes garantem que esse
 * ficheiro é a migração e que as guardas estão lá. O comportamento é provado
 * num Postgres real por `.qa/inqueritos-comportamento.sql`.
 */

const MIGRACAO = readFileSync('supabase/migrations/0013_inqueritos.sql', 'utf-8');
const APLICAR = readFileSync('supabase/aplicar-0013.sql', 'utf-8');
const VERIFICAR = readFileSync('supabase/verificar-estado.sql', 'utf-8');

function cabecalhoDe(nome: string): string {
  const inicio = MIGRACAO.indexOf(`create or replace function public.${nome}(`);
  expect(inicio, `função ausente: ${nome}`).toBeGreaterThan(-1);
  return MIGRACAO.slice(inicio, MIGRACAO.indexOf('as $$', inicio));
}

function corpoDe(nome: string): string {
  const inicio = MIGRACAO.indexOf(`create or replace function public.${nome}(`);
  return MIGRACAO.slice(inicio, MIGRACAO.indexOf('$$;', MIGRACAO.indexOf('as $$', inicio)));
}

describe('0013 — inquéritos', () => {
  it('o ficheiro de aplicar contém a migração, palavra por palavra', () => {
    expect(APLICAR.endsWith(MIGRACAO)).toBe(true);
  });

  it('é repetível: só formas idempotentes de criação', () => {
    expect(MIGRACAO).not.toMatch(/create table (?!if not exists)/);
    expect(MIGRACAO).not.toMatch(/create (unique )?index (?!if not exists)/);
    expect(MIGRACAO).not.toMatch(/add column (?!if not exists)/);
    for (const c of ['responses_contacto_ou_link', 'activities_deal_ou_contacto']) {
      expect(MIGRACAO).toContain(`drop constraint if exists ${c}`);
    }
    expect(MIGRACAO).toContain('drop policy if exists survey_links_select');
  });

  it('o caminho público só é executável pela chave de serviço', () => {
    for (const [nome, assinatura] of [
      ['obter_inquerito_publico', 'text'],
      ['ingest_survey_response', 'text, jsonb, text, text, jsonb, text, text, text'],
    ] as const) {
      const cab = cabecalhoDe(nome);
      expect(cab, nome).toContain('security definer');
      expect(cab, nome).toContain('set search_path = public, pg_catalog');
      expect(MIGRACAO).toMatch(
        new RegExp(
          `revoke all on function public\\.${nome}\\(${assinatura}\\)\\s+from public, anon, authenticated;`,
        ),
      );
      expect(MIGRACAO).toMatch(
        new RegExp(
          `grant execute on function public\\.${nome}\\(${assinatura}\\)\\s+to service_role;`,
        ),
      );
    }
  });

  it('os resultados correm com os direitos de quem pede (a RLS aplica-se) e exigem equipa', () => {
    const cab = cabecalhoDe('resultados_inquerito');
    expect(cab).toContain('security invoker');
    expect(cab).not.toContain('security definer');
    expect(corpoDe('resultados_inquerito')).toContain('if not public.is_staff() then');
  });

  it('survey_links: RLS ligada, o hash fora da leitura da equipa, sem escrita directa', () => {
    expect(MIGRACAO).toContain('alter table public.survey_links enable row level security;');
    expect(MIGRACAO).toContain(
      'revoke all on public.survey_links from public, anon, authenticated, service_role;',
    );
    const grant = /grant select \(([^)]*)\)\s+on public\.survey_links to authenticated;/.exec(
      MIGRACAO,
    );
    expect(grant, 'grant por colunas em falta').not.toBeNull();
    expect(grant![1]).not.toContain('token_hash');
    expect(MIGRACAO).not.toMatch(/grant (insert|update|delete|all)[^;]*on public\.survey_links/);
  });

  it('o token nunca está em claro: só o hash, com formato fixo', () => {
    expect(MIGRACAO).toContain(
      "token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$')",
    );
    expect(MIGRACAO).not.toMatch(/^\s+token\s+text/m);
  });

  it('as funções de edição recusam o questionário do diagnóstico', () => {
    for (const f of [
      'guardar_rascunho',
      'publicar_versao',
      'definir_inquerito_activo',
      'criar_link',
      'revogar_link',
    ]) {
      expect(corpoDe(f), f).toContain('inquerito_para_editar');
    }
    expect(corpoDe('inquerito_para_editar')).toContain("if q.kind <> 'survey' then");
  });

  it('a ingestão nunca reescreve um contacto existente nem cria oportunidades', () => {
    const corpo = corpoDe('ingest_survey_response');
    expect(corpo).toContain('on conflict (normalized_email) do nothing');
    expect(corpo).not.toMatch(/on conflict \(normalized_email\) do update/);
    expect(corpo).not.toContain('insert into public.deals');
    expect(corpo).not.toContain('response_attribution');
  });

  it('revisão ECC: idempotência depois do bloqueio, consentimento só em contacto novo, limite por IP', () => {
    const corpo = corpoDe('ingest_survey_response');
    const bloqueio = corpo.indexOf('for update');
    expect(corpo.indexOf('idempotency_key = p_idempotency_key', bloqueio)).toBeGreaterThan(
      bloqueio,
    );
    const consentimento = corpo.indexOf('insert into public.consent_records');
    expect(corpo.lastIndexOf('if v_novo then', consentimento)).toBeGreaterThan(-1);
    expect(corpo).toContain("'estado', 'limitado'");
    expect(MIGRACAO).toContain('responses_link_ip_idx');
  });

  it('o spec é medido em bytes de texto, com chaves únicas', () => {
    const f = corpoDe('spec_de_inquerito_valido');
    expect(f).toContain('octet_length(p_spec::text)');
    expect(f).not.toContain('pg_column_size(p_spec)');
    expect(f).toContain("count(distinct p->>'chave') = count(*)");
  });

  it('a exportação é auditada e com contactos exige admin ou comercial', () => {
    const f = corpoDe('registar_exportacao_inquerito');
    expect(f).toContain("array['admin', 'comercial']::public.user_role[]");
    expect(f).toContain("'inquerito.exportar'");
    expect(MIGRACAO).toMatch(
      /grant execute on function public\.registar_exportacao_inquerito\(uuid, boolean\) to authenticated;/,
    );
  });

  it('verificar-estado.sql tem a linha 23 da 0013', () => {
    expect(VERIFICAR).toMatch(/select 23, [^\n]*\(0013\)/);
    expect(VERIFICAR).toContain("'EM FALTA - correr aplicar-0013.sql'");
  });
});
