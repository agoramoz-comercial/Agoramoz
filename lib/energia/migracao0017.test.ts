import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { RPC } from '@/lib/admin/rpc';

/**
 * A 0017 (Espaço CEnO) é aplicada pelo fundador, em duas partes. Estes testes
 * guardam em CI o que torna o espaço privado; o comportamento — a dona vê, o
 * admin sem módulo não vê nem escreve, outra pessoa com o módulo não toca no
 * espaço alheio — foi provado num Postgres 16 real por
 * `.qa/energia-comportamento.sql`.
 */

const MIGRACAO = readFileSync('supabase/migrations/0017_espaco_ceno.sql', 'utf-8');
const VERIFICAR = readFileSync('supabase/verificar-estado.sql', 'utf-8');
const FIM = '-- ===== fim do cabeçalho: daqui para baixo é a migração 0017, sem alterações =====\n';

function corpo(ficheiro: string): string {
  const texto = readFileSync(ficheiro, 'utf-8');
  const i = texto.indexOf(FIM);
  expect(i, ficheiro).toBeGreaterThan(0);
  // Começa com linhas em branco: uma cópia cortada no início não estraga nada.
  expect(texto.startsWith('\n'), ficheiro).toBe(true);
  return texto.slice(i + FIM.length);
}

const TABELAS = [
  'ceno_stakeholders',
  'ceno_oportunidades',
  'ceno_oportunidade_stakeholders',
  'ceno_registos',
  'ceno_documentos',
];

const FUNCOES = [
  'guardar_stakeholder',
  'guardar_oportunidade',
  'avaliar_oportunidade',
  'mudar_fase_ceno',
  'guardar_memo_ceno',
  'ligar_stakeholder',
  'desligar_stakeholder',
  'registar_ceno',
  'guardar_documento_ceno',
] as const;

function corpoDe(nome: string): string {
  const inicio = MIGRACAO.indexOf(`create or replace function public.${nome}(`);
  expect(inicio, `função ausente: ${nome}`).toBeGreaterThan(-1);
  return MIGRACAO.slice(inicio, MIGRACAO.indexOf('$$;', MIGRACAO.indexOf('as $$', inicio)));
}

describe('0017 — Espaço CEnO', () => {
  it('as duas partes de aplicar somam a migração, palavra por palavra', () => {
    const parte1 = corpo('supabase/aplicar-0017-parte1.sql');
    const parte2 = corpo('supabase/aplicar-0017-parte2.sql');
    expect(parte1 + parte2).toBe(MIGRACAO);
    expect(parte1).toContain('create table if not exists public.ceno_oportunidades');
    expect(parte1).not.toContain('create or replace function public.guardar_stakeholder(');
    expect(parte2).toContain('create or replace function public.guardar_stakeholder(');
    expect(parte2.trimEnd().endsWith("notify pgrst, 'reload schema';")).toBe(true);
  });

  it('é repetível: só formas idempotentes de criação', () => {
    expect(MIGRACAO).not.toMatch(/create table (?!if not exists)/);
    expect(MIGRACAO).not.toMatch(/create (unique )?index (?!if not exists)/);
    expect(MIGRACAO).toContain('drop policy if exists acessos_modulo_select');
    expect(MIGRACAO).toContain("execute format('drop policy if exists %I on public.%I', t || '_select', t);");
  });

  it('cada tabela do espaço só se lê pela dona, com o módulo, e nunca se escreve directamente', () => {
    for (const t of TABELAS) expect(MIGRACAO).toContain(`'${t}'`);
    expect(MIGRACAO).toContain("using (dono = auth.uid() and public.tem_modulo(''energia''))");
    expect(MIGRACAO).toContain(
      "execute format('revoke all on public.%I from public, anon, authenticated, service_role', t);",
    );
    expect(MIGRACAO).toContain("execute format('grant select on public.%I to authenticated', t);");
    // Nenhuma política de insert/update/delete em lado nenhum (o `for update`
    // dos `select … for update` é bloqueio de linha, não política).
    expect(MIGRACAO).not.toMatch(/create policy[^;]*\bfor (insert|update|delete|all)\b/i);
    expect(MIGRACAO.match(/create policy/g)?.length).toBe(2);
  });

  it('o acesso ao módulo só se concede por SQL do dono da base', () => {
    expect(MIGRACAO).toContain('revoke all on public.acessos_modulo from public, anon, authenticated, service_role;');
    expect(MIGRACAO).toContain('grant select on public.acessos_modulo to authenticated;');
    expect(MIGRACAO).toContain('for select to authenticated using (user_id = auth.uid())');
  });

  it('a guarda interna não é chamável de fora e exige papel activo e módulo', () => {
    expect(MIGRACAO).toContain('revoke all on function public.exigir_modulo(text) from public, anon, authenticated;');
    const guarda = corpoDe('exigir_modulo');
    expect(guarda).toContain('public.exigir_papel(');
    expect(guarda).toContain('public.tem_modulo(p_modulo)');
    expect(corpoDe('tem_modulo')).toContain('p.active');
  });

  it('toda a função de escrita exige o módulo, verifica o dono e desiste de locks em 4 s', () => {
    for (const nome of FUNCOES) {
      expect(Object.keys(RPC)).toContain(nome);
      const c = corpoDe(nome);
      expect(c, nome).toContain("perform public.exigir_modulo('energia');");
      expect(c, nome).toContain('dono = auth.uid()');
      expect(MIGRACAO, nome).toMatch(new RegExp(`alter function public\\.${nome}\\([^)]*\\) set lock_timeout = '4s';`));
    }
  });

  it('o audit_log, que toda a equipa lê, nunca leva conteúdo do espaço', () => {
    const insercoes = [...MIGRACAO.matchAll(/insert into public\.audit_log \(([^)]*)\)/g)].map((m) => m[1]!);
    expect(insercoes.length).toBe(FUNCOES.length);
    for (const colunas of insercoes) {
      expect(colunas).not.toMatch(/\bbefore\b|\bafter\b/);
    }
  });

  it('apagar a conta não apaga o trabalho em silêncio', () => {
    const donos = MIGRACAO.match(/dono uuid not null default auth\.uid\(\) references auth\.users\(id\) on delete restrict/g);
    expect(donos?.length).toBe(TABELAS.length);
    expect(MIGRACAO).not.toMatch(/dono uuid[^\n]*on delete cascade/);
  });

  it('as regras do pipeline estão na base, não só no ecrã', () => {
    expect(MIGRACAO).toContain('constraint ceno_oportunidades_activa_tem_accao');
    expect(MIGRACAO).toContain('constraint ceno_oportunidades_perdida_tem_motivo');
    expect(MIGRACAO).toContain('constraint ceno_oportunidades_valor_com_evidencia');
    expect(MIGRACAO).toContain('constraint ceno_stakeholders_activo_tem_accao');
    expect(corpoDe('mudar_fase_ceno')).toContain('v_score < 24');
    expect(corpoDe('mudar_fase_ceno')).toContain('generate_series(1, 12)');
  });

  it('o verificar-estado tem a linha 29', () => {
    expect(VERIFICAR).toContain("select 29, 'espaço'");
    expect(VERIFICAR).toContain('EM FALTA - correr aplicar-0017-parte1.sql');
    expect(VERIFICAR).toContain('EM FALTA - correr aplicar-0017-parte2.sql');
  });
});
