
-- APLICAR NO SQL EDITOR DO SUPABASE — projecto nixltrbdplqjadfytryd
-- 0018 em DUAS PARTES — PARTE 1 de 2: módulo `direcao`, tabelas e RLS do Gabinete do Fundador
-- Pressupõe a 0017 aplicada (linha 29 do verificar-estado em «ok»).
-- As duas partes juntas são a migração 0018 palavra por palavra (um teste
-- garante-o). Ambas são repetíveis: pode correr cada uma as vezes que quiser.
-- 1. No GitHub, botão «Copy raw file» (ou Raw, Ctrl+A, Ctrl+C).
-- 2. SQL Editor: consulta NOVA e vazia, colar, Run. Esperado: «Success».
-- 3. Depois, a PARTE 2 (aplicar-0018-parte2.sql), da mesma forma.
-- ===== fim do cabeçalho: daqui para baixo é a migração 0018, sem alterações =====
-- ============================================================================
-- 0018 — Gabinete do Fundador: o Work Operating System do Founder/CEO/CTO
-- ============================================================================
-- Um espaço no /admin que SÓ o dono vê (módulo `direcao`): decisões por
-- chapéu (Founder, CEO, CTO), prioridades do trimestre, portfólio de
-- projectos com margem, tesouraria (caixa, recebimentos, pagamentos) e
-- capacidade da equipa.
--
-- Privacidade: o mesmo desenho do Espaço CEnO (0017), que esta migração
-- pressupõe aplicada — `acessos_modulo`, `tem_modulo`, `exigir_modulo`.
-- 1. O acesso é uma linha em `acessos_modulo` com `modulo = 'direcao'`.
-- 2. Cada linha tem `dono`; a RLS só devolve as linhas do próprio, com o
--    módulo e a palavra-passe provisória já trocada.
-- 3. Não há políticas de escrita: escreve-se só por estas funções.
-- 4. O `audit_log` leva só a acção e o id, e a equipa não lê estas linhas.
--
-- Os valores financeiros são os que o dono registar. Nenhuma conversão de
-- moeda é feita na base: cada valor fica na sua moeda.
--
-- Idempotente: pode correr mais do que uma vez.
-- ============================================================================


-- ---------------------------------------------------------------------------
-- Módulo `direcao`
-- ---------------------------------------------------------------------------

alter table public.acessos_modulo drop constraint if exists acessos_modulo_modulo_check;
alter table public.acessos_modulo
  add constraint acessos_modulo_modulo_check check (modulo in ('energia', 'direcao'));


-- ---------------------------------------------------------------------------
-- Decisões — por chapéu, com responsável, indicador e data de revisão
-- ---------------------------------------------------------------------------

create table if not exists public.gab_decisoes (
  id uuid primary key default extensions.gen_random_uuid(),
  dono uuid not null default auth.uid() references auth.users(id) on delete restrict,
  titulo text not null check (length(trim(titulo)) between 3 and 200),
  contexto text check (contexto is null or length(trim(contexto)) between 1 and 2000),
  chapeu text not null check (chapeu in ('founder', 'ceo', 'cto')),
  estado text not null default 'exige_minha' check (estado in (
    'exige_minha', 'delegavel', 'precisa_info', 'aguarda_externa', 'eliminar', 'decidida')),
  decisao text check (decisao is null or length(trim(decisao)) between 1 and 2000),
  responsavel text check (responsavel is null or length(trim(responsavel)) between 1 and 120),
  consultados text check (consultados is null or length(trim(consultados)) between 1 and 300),
  indicador text check (indicador is null or length(trim(indicador)) between 1 and 200),
  data_revisao date,
  -- A métrica crítica: decisões recorrentes que deixaram de passar pelo fundador.
  recorrente boolean not null default false,
  quem_decidiu text check (quem_decidiu is null or quem_decidiu in ('fundador', 'delegada')),
  decidida_em timestamptz,
  revisao integer not null default 1 check (revisao >= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Uma decisão em aberto tem dono e data para voltar a ela.
  constraint gab_decisoes_aberta_tem_dono
    check (estado in ('decidida', 'eliminar') or (responsavel is not null and data_revisao is not null)),
  -- Decidida: o que se decidiu e quem decidiu.
  constraint gab_decisoes_decidida_completa
    check (estado <> 'decidida' or (decisao is not null and quem_decidiu is not null and decidida_em is not null))
);

create index if not exists gab_decisoes_dono_idx on public.gab_decisoes (dono, estado, data_revisao);

drop trigger if exists gab_decisoes_set_updated_at on public.gab_decisoes;
create trigger gab_decisoes_set_updated_at
  before update on public.gab_decisoes
  for each row execute function public.set_updated_at();


-- ---------------------------------------------------------------------------
-- Prioridades — cinco resultados por trimestre, um por tipo
-- ---------------------------------------------------------------------------

create table if not exists public.gab_prioridades (
  id uuid primary key default extensions.gen_random_uuid(),
  dono uuid not null default auth.uid() references auth.users(id) on delete restrict,
  trimestre text not null check (trimestre ~ '^20[0-9]{2}-T[1-4]$'),
  tipo text not null check (tipo in ('empresarial', 'comercial', 'operacional', 'tecnologica', 'lideranca')),
  resultado text not null check (length(trim(resultado)) between 3 and 300),
  indicador text check (indicador is null or length(trim(indicador)) between 1 and 200),
  meta text check (meta is null or length(trim(meta)) between 1 and 200),
  estado text not null default 'em_curso' check (estado in ('em_curso', 'em_risco', 'concluida', 'abandonada')),
  nota text check (nota is null or length(trim(nota)) between 1 and 1000),
  revisao integer not null default 1 check (revisao >= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- No máximo cinco por trimestre: uma por tipo, por construção.
  constraint gab_prioridades_uma_por_tipo unique (dono, trimestre, tipo)
);

drop trigger if exists gab_prioridades_set_updated_at on public.gab_prioridades;
create trigger gab_prioridades_set_updated_at
  before update on public.gab_prioridades
  for each row execute function public.set_updated_at();


-- ---------------------------------------------------------------------------
-- Projectos — o ciclo público (diagnóstico → evolução), com receita e margem
-- ---------------------------------------------------------------------------

create table if not exists public.gab_projetos (
  id uuid primary key default extensions.gen_random_uuid(),
  dono uuid not null default auth.uid() references auth.users(id) on delete restrict,
  nome text not null check (length(trim(nome)) between 3 and 160),
  cliente text check (cliente is null or length(trim(cliente)) between 1 and 160),
  fase text not null default 'diagnostico' check (fase in (
    'diagnostico', 'arquitetura', 'prototipo', 'implementacao', 'ativacao', 'evolucao',
    'encerrado', 'suspenso')),
  responsavel text check (responsavel is null or length(trim(responsavel)) between 1 and 120),
  sponsor text check (sponsor is null or length(trim(sponsor)) between 1 and 120),
  resultado text check (resultado is null or length(trim(resultado)) between 1 and 1000),
  escopo text check (escopo is null or length(trim(escopo)) between 1 and 2000),
  moeda text not null default 'MZN' check (moeda in ('MZN', 'USD', 'EUR')),
  receita_contratada numeric(16, 2) check (receita_contratada is null or receita_contratada >= 0),
  receita_faturada numeric(16, 2) check (receita_faturada is null or receita_faturada >= 0),
  receita_recebida numeric(16, 2) check (receita_recebida is null or receita_recebida >= 0),
  custos_variaveis numeric(16, 2) check (custos_variaveis is null or custos_variaveis >= 0),
  -- Margem bruta = receita (contratada) menos custos variáveis directos.
  margem_bruta numeric(16, 2) generated always as (receita_contratada - custos_variaveis) stored,
  -- Os sete critérios para entrar em implementação.
  pronto_contrato boolean not null default false,
  pronto_escopo boolean not null default false,
  pronto_responsavel boolean not null default false,
  pronto_capacidade boolean not null default false,
  pronto_aceitacao boolean not null default false,
  pronto_dependencias boolean not null default false,
  pronto_pagamento boolean not null default false,
  risco text not null default 'baixo' check (risco in ('baixo', 'medio', 'alto')),
  proxima_accao text check (proxima_accao is null or length(trim(proxima_accao)) between 1 and 300),
  proxima_data date,
  ligacao text check (ligacao is null or (length(ligacao) <= 2048 and ligacao ~ '^https://[^\s/]+' and ligacao !~ '\s')),
  revisao integer not null default 1 check (revisao >= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint gab_projetos_faturada_ate_contratada
    check (receita_faturada is null or receita_contratada is null or receita_faturada <= receita_contratada),
  constraint gab_projetos_recebida_ate_faturada
    check (receita_recebida is null or receita_faturada is null or receita_recebida <= receita_faturada),
  -- Nenhum projecto activo sem próxima acção e data.
  constraint gab_projetos_activo_tem_accao
    check (fase in ('encerrado', 'suspenso') or (proxima_accao is not null and proxima_data is not null)),
  -- Não se implementa sem os sete critérios (e não se perdem depois).
  constraint gab_projetos_pronto_para_implementar
    check (fase not in ('implementacao', 'ativacao', 'evolucao')
           or (pronto_contrato and pronto_escopo and pronto_responsavel and pronto_capacidade
               and pronto_aceitacao and pronto_dependencias and pronto_pagamento))
);

create index if not exists gab_projetos_dono_idx on public.gab_projetos (dono, fase, proxima_data);

drop trigger if exists gab_projetos_set_updated_at on public.gab_projetos;
create trigger gab_projetos_set_updated_at
  before update on public.gab_projetos
  for each row execute function public.set_updated_at();


-- ---------------------------------------------------------------------------
-- Tesouraria — saldos (fotografias), recebimentos e pagamentos
-- ---------------------------------------------------------------------------

create table if not exists public.gab_tesouraria (
  id uuid primary key default extensions.gen_random_uuid(),
  dono uuid not null default auth.uid() references auth.users(id) on delete restrict,
  tipo text not null check (tipo in ('saldo', 'recebimento', 'pagamento')),
  descricao text not null check (length(trim(descricao)) between 1 and 200),
  projeto_id uuid references public.gab_projetos(id) on delete restrict,
  valor numeric(16, 2) not null check (valor >= 0),
  moeda text not null default 'MZN' check (moeda in ('MZN', 'USD', 'EUR')),
  data_prevista date not null,
  -- Nula = ainda previsto. Um saldo é um facto numa data: tem sempre data efectiva.
  data_efectiva date,
  revisao integer not null default 1 check (revisao >= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint gab_tesouraria_movimento_positivo check (tipo = 'saldo' or valor > 0),
  constraint gab_tesouraria_saldo_e_facto check (tipo <> 'saldo' or data_efectiva is not null)
);

create index if not exists gab_tesouraria_dono_idx on public.gab_tesouraria (dono, tipo, data_prevista);
create index if not exists gab_tesouraria_projeto_idx on public.gab_tesouraria (projeto_id) where projeto_id is not null;

drop trigger if exists gab_tesouraria_set_updated_at on public.gab_tesouraria;
create trigger gab_tesouraria_set_updated_at
  before update on public.gab_tesouraria
  for each row execute function public.set_updated_at();


-- ---------------------------------------------------------------------------
-- Capacidade — pessoas e horas por semana alocadas a projectos
-- ---------------------------------------------------------------------------

create table if not exists public.gab_pessoas (
  id uuid primary key default extensions.gen_random_uuid(),
  dono uuid not null default auth.uid() references auth.users(id) on delete restrict,
  nome text not null check (length(trim(nome)) between 1 and 80),
  funcao text check (funcao is null or length(trim(funcao)) between 1 and 80),
  area text not null default 'tecnologia' check (area in (
    'gestao', 'comercial', 'tecnologia', 'operacoes', 'energia', 'outro')),
  horas_semana numeric(4, 1) not null check (horas_semana between 0 and 80),
  activa boolean not null default true,
  revisao integer not null default 1 check (revisao >= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists gab_pessoas_dono_idx on public.gab_pessoas (dono, activa);

drop trigger if exists gab_pessoas_set_updated_at on public.gab_pessoas;
create trigger gab_pessoas_set_updated_at
  before update on public.gab_pessoas
  for each row execute function public.set_updated_at();

create table if not exists public.gab_alocacoes (
  pessoa_id uuid not null references public.gab_pessoas(id) on delete cascade,
  projeto_id uuid not null references public.gab_projetos(id) on delete cascade,
  dono uuid not null default auth.uid() references auth.users(id) on delete restrict,
  horas_semana numeric(4, 1) not null check (horas_semana > 0 and horas_semana <= 80),
  ate date,
  updated_at timestamptz not null default now(),
  primary key (pessoa_id, projeto_id)
);

create index if not exists gab_alocacoes_projeto_idx on public.gab_alocacoes (projeto_id);
create index if not exists gab_alocacoes_dono_idx on public.gab_alocacoes (dono);

drop trigger if exists gab_alocacoes_set_updated_at on public.gab_alocacoes;
create trigger gab_alocacoes_set_updated_at
  before update on public.gab_alocacoes
  for each row execute function public.set_updated_at();


-- ---------------------------------------------------------------------------
-- RLS: só o dono, e só com o módulo. Sem escrita directa.
-- ---------------------------------------------------------------------------

do $$
declare t text;
begin
  foreach t in array array['gab_decisoes', 'gab_prioridades', 'gab_projetos', 'gab_tesouraria',
                           'gab_pessoas', 'gab_alocacoes'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from public, anon, authenticated, service_role', t);
    execute format('grant select on public.%I to authenticated', t);
    execute format('drop policy if exists %I on public.%I', t || '_select', t);
    execute format(
      'create policy %I on public.%I for select to authenticated using (dono = (select auth.uid()) and (select public.tem_modulo(''direcao'')))',
      t || '_select', t);
  end loop;
end;
$$;

-- O `audit_log` (legível pela equipa) deixa de mostrar também o gabinete.
drop policy if exists audit_log_select on public.audit_log;
create policy audit_log_select on public.audit_log
  for select to authenticated
  using (public.is_staff() and entity_type is distinct from 'ceno' and entity_type is distinct from 'gabinete');


