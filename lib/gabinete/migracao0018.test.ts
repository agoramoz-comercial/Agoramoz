import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { RPC } from '@/lib/admin/rpc';

/**
 * A 0018 (Gabinete do Fundador) é aplicada pelo fundador, em duas partes.
 * Estes testes guardam em CI o que torna o gabinete privado; o comportamento —
 * o dono vê, o admin sem módulo e a dona do CEnO não vêem nem escrevem, outra
 * conta com o módulo não toca no gabinete alheio, a palavra-passe provisória
 * fecha tudo — foi provado num Postgres 16 real por
 * `.qa/gabinete-comportamento.sql`.
 */

const MIGRACAO = readFileSync('supabase/migrations/0018_gabinete.sql', 'utf-8');
const VERIFICAR = readFileSync('supabase/verificar-estado.sql', 'utf-8');
const FIM = '-- ===== fim do cabeçalho: daqui para baixo é a migração 0018, sem alterações =====\n';

function corpo(ficheiro: string): string {
  const texto = readFileSync(ficheiro, 'utf-8');
  const i = texto.indexOf(FIM);
  expect(i, ficheiro).toBeGreaterThan(0);
  expect(texto.startsWith('\n'), ficheiro).toBe(true);
  return texto.slice(i + FIM.length);
}

const TABELAS = ['gab_decisoes', 'gab_prioridades', 'gab_projetos', 'gab_tesouraria', 'gab_pessoas', 'gab_alocacoes'];

const FUNCOES = [
  'guardar_decisao',
  'guardar_prioridade',
  'guardar_projeto',
  'guardar_movimento',
  'guardar_pessoa',
  'guardar_alocacao',
  'remover_alocacao',
] as const;

function corpoDe(nome: string): string {
  const inicio = MIGRACAO.indexOf(`create or replace function public.${nome}(`);
  expect(inicio, `função ausente: ${nome}`).toBeGreaterThan(-1);
  return MIGRACAO.slice(inicio, MIGRACAO.indexOf('$$;', MIGRACAO.indexOf('as $$', inicio)));
}

describe('0018 — Gabinete do Fundador', () => {
  it('as duas partes de aplicar somam a migração, palavra por palavra', () => {
    const parte1 = corpo('supabase/aplicar-0018-parte1.sql');
    const parte2 = corpo('supabase/aplicar-0018-parte2.sql');
    expect(parte1 + parte2).toBe(MIGRACAO);
    expect(parte1).toContain('create table if not exists public.gab_projetos');
    expect(parte1).not.toContain('create or replace function public.guardar_projeto(');
    expect(parte2).toContain('create or replace function public.guardar_projeto(');
    expect(parte2.trimEnd().endsWith("notify pgrst, 'reload schema';")).toBe(true);
    // Cada parte cabe numa colagem no SQL Editor.
    for (const f of ['supabase/aplicar-0018-parte1.sql', 'supabase/aplicar-0018-parte2.sql']) {
      expect(readFileSync(f).length, f).toBeLessThan(21_000);
    }
  });

  it('é repetível: só formas idempotentes de criação', () => {
    expect(MIGRACAO).not.toMatch(/create table (?!if not exists)/);
    expect(MIGRACAO).not.toMatch(/create (unique )?index (?!if not exists)/);
    expect(MIGRACAO).toContain('drop constraint if exists acessos_modulo_modulo_check');
    expect(MIGRACAO).toContain("execute format('drop policy if exists %I on public.%I', t || '_select', t);");
    for (const t of TABELAS) {
      expect(MIGRACAO, t).toContain(`drop trigger if exists ${t}_set_updated_at on public.${t};`);
    }
  });

  it('o módulo `direcao` junta-se a `energia` sem o retirar', () => {
    expect(MIGRACAO).toContain("check (modulo in ('energia', 'direcao'))");
  });

  it('cada tabela só se lê pelo dono, com o módulo, e nunca se escreve directamente', () => {
    for (const t of TABELAS) expect(MIGRACAO).toContain(`'${t}'`);
    expect(MIGRACAO).toContain("using (dono = (select auth.uid()) and (select public.tem_modulo(''direcao'')))");
    expect(MIGRACAO).toContain(
      "execute format('revoke all on public.%I from public, anon, authenticated, service_role', t);",
    );
    expect(MIGRACAO).toContain("execute format('grant select on public.%I to authenticated', t);");
    expect(MIGRACAO).not.toMatch(/create policy[^;]*\bfor (insert|update|delete|all)\b/i);
    // A das seis tabelas (no ciclo) e a do audit_log.
    expect(MIGRACAO.match(/create policy/g)?.length).toBe(2);
  });

  it('a equipa deixa de ler a actividade do CEnO e do gabinete no audit_log', () => {
    // `is distinct from`: um entity_type nulo não esconde a linha por acidente.
    expect(MIGRACAO).toContain(
      "using (public.is_staff() and entity_type is distinct from 'ceno' and entity_type is distinct from 'gabinete');",
    );
  });

  it('toda a função de escrita exige o módulo, verifica o dono e desiste de locks em 4 s', () => {
    for (const nome of FUNCOES) {
      expect(Object.keys(RPC)).toContain(nome);
      const c = corpoDe(nome);
      expect(c, nome).toContain("perform public.exigir_modulo('direcao');");
      expect(c, nome).toContain('dono = auth.uid()');
      expect(MIGRACAO, nome).toMatch(new RegExp(`alter function public\\.${nome}\\([^)]*\\) set lock_timeout = '4s';`));
      expect(MIGRACAO, nome).toMatch(new RegExp(`revoke all on function public\\.${nome}\\([^)]*\\) from public, anon;`));
    }
  });

  it('o audit_log nunca leva conteúdo do gabinete', () => {
    const insercoes = [...MIGRACAO.matchAll(/insert into public\.audit_log \(([^)]*)\)/g)].map((m) => m[1]!);
    expect(insercoes.length).toBe(FUNCOES.length);
    for (const colunas of insercoes) expect(colunas).not.toMatch(/\bbefore\b|\bafter\b/);
  });

  it('apagar a conta não apaga o trabalho em silêncio', () => {
    const donos = MIGRACAO.match(/dono uuid not null default auth\.uid\(\) references auth\.users\(id\) on delete restrict/g);
    expect(donos?.length).toBe(TABELAS.length);
  });

  it('as regras do documento estão na base, não só no ecrã', () => {
    expect(MIGRACAO).toContain('constraint gab_prioridades_uma_por_tipo unique (dono, trimestre, tipo)');
    expect(MIGRACAO).toContain('constraint gab_projetos_pronto_para_implementar');
    expect(MIGRACAO).toContain('constraint gab_projetos_activo_tem_accao');
    expect(MIGRACAO).toContain('constraint gab_decisoes_aberta_tem_dono');
    expect(MIGRACAO).toContain('constraint gab_decisoes_decidida_completa');
    expect(MIGRACAO).toContain('margem_bruta numeric(16, 2) generated always as (receita_contratada - custos_variaveis) stored');
    // A mensagem diz o que falta para implementar, em vez de só recusar.
    expect(corpoDe('guardar_projeto')).toContain("'Para implementar falta: %.'");
  });

  it('o verificar-estado tem a linha 30 e não rebenta antes das migrações', () => {
    expect(VERIFICAR).toContain("select 30, 'gabinete'");
    expect(VERIFICAR).toContain('EM FALTA - correr aplicar-0018-parte1.sql');
    expect(VERIFICAR).toContain('EM FALTA - correr aplicar-0018-parte2.sql');
    // Casts para reg* são resolvidos ao planear: um objecto em falta rebentava
    // a consulta inteira em vez de dar «EM FALTA».
    expect(VERIFICAR).not.toMatch(/'public\.[a-z_]+\([^']*\)'::regprocedure/);
  });
  it('apagar um projecto não desliga em silêncio os seus movimentos de caixa', () => {
    expect(MIGRACAO).toContain('projeto_id uuid references public.gab_projetos(id) on delete restrict,');
    expect(MIGRACAO).toContain('gab_tesouraria_projeto_idx');
  });

  it('as funções põem pg_catalog antes de public no search_path', () => {
    expect(MIGRACAO).not.toContain('set search_path = public, pg_catalog');
    expect(MIGRACAO.match(/set search_path = pg_catalog, public/g)?.length).toBe(7);
  });
});
