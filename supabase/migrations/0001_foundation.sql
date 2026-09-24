-- ============================================================================
-- 0001 — Fundação: tipos, utilitários, perfis e auditoria
-- ============================================================================
-- Base verificada antes de escrever: `public` com zero tabelas, zero migrações
-- registadas, só os esquemas próprios do Supabase (auth, storage, realtime,
-- vault). Sem risco de colisão com trabalho anterior.
--
-- Princípio que atravessa todas estas migrações: **as invariantes vivem na
-- base**, não só na aplicação. Uma defesa que existe apenas em TypeScript é
-- uma defesa que o próximo script de manutenção contorna sem dar por isso.
-- ============================================================================

create extension if not exists pgcrypto with schema extensions;
create extension if not exists citext with schema extensions;

-- ---------------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------------

-- Papéis. Mínimos de propósito: acrescentar um papel é barato, retirar
-- privilégios a alguém que já os teve é que não é.
create type public.user_role as enum ('admin', 'comercial', 'leitura');

create type public.diagnostic_state as enum (
  'computed', 'drafting', 'drafted', 'pending_review', 'approved',
  'rendering', 'ready', 'sending', 'sent',
  'draft_failed', 'validation_failed', 'rejected', 'render_failed',
  'send_failed', 'revoked'
);

create type public.outbox_status as enum ('pending', 'processing', 'done', 'failed', 'dead');

create type public.actor_type as enum ('user', 'system', 'ai');

-- ---------------------------------------------------------------------------
-- Utilitários
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- `profiles` vem ANTES das funções de autorização, e não depois, porque elas
-- leem-na. O Postgres valida o corpo de uma função `language sql` no momento
-- em que ela é criada (`check_function_bodies`, ligado por omissão): com a
-- ordem inversa, `create function current_role_of` falha com
-- «relation "public.profiles" does not exist».
--
-- Isto passou despercebido porque a API de migrações da Supabase não faz essa
-- validação, e foi por lá que estas migrações correram da primeira vez. No
-- editor SQL — e em qualquer Postgres normal — falhava. Uma migração que só
-- corre no sítio onde nasceu não é uma migração.

-- ---------------------------------------------------------------------------
-- profiles — quem tem acesso ao admin
-- ---------------------------------------------------------------------------
-- Não duplica `auth.users`: referencia-a. O Supabase é dono da autenticação;
-- esta tabela só responde a «o que é que esta pessoa pode fazer».

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.user_role not null default 'leitura',
  display_name text not null check (length(trim(display_name)) between 1 and 120),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- `search_path` fixo em todas as funções `security definer`: sem isto, um
-- utilizador com direito a criar objetos pode antepor um esquema seu e
-- sequestrar a resolução de nomes dentro da função privilegiada.
create or replace function public.current_role_of(p_user uuid)
returns public.user_role
language sql
stable
security definer
set search_path = public, pg_catalog
as $$
  select role from public.profiles where id = p_user and active;
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public, pg_catalog
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and active);
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_catalog
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and active and role = 'admin'
  );
$$;

-- ---------------------------------------------------------------------------
-- audit_log — o que aconteceu, por ordem, e por quem
-- ---------------------------------------------------------------------------
-- Append-only imposto por trigger, não por convenção. Um registo de auditoria
-- que se pode editar não é registo de auditoria.

create table public.audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users(id) on delete set null,
  actor_type public.actor_type not null,
  action text not null check (length(action) between 1 and 80),
  entity_type text not null check (length(entity_type) between 1 and 80),
  entity_id text not null check (length(entity_id) between 1 and 120),
  before jsonb,
  after jsonb,
  correlation_id uuid,
  -- Hash, nunca o endereço: o IP é dado pessoal e a auditoria é consultada
  -- por mais gente do que quem pode ver dados de contacto.
  ip_hash text check (ip_hash is null or ip_hash ~ '^[0-9a-f]{64}$'),
  occurred_at timestamptz not null default now(),

  -- Um ator humano tem de ser identificado; sistema e IA não têm identidade.
  constraint audit_actor_coerente check (
    (actor_type = 'user' and actor_id is not null)
    or (actor_type <> 'user')
  )
);

create index audit_log_entity_idx on public.audit_log (entity_type, entity_id, occurred_at desc);
create index audit_log_correlation_idx on public.audit_log (correlation_id) where correlation_id is not null;

create or replace function public.deny_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'Tabela append-only: % não é permitido em %', tg_op, tg_table_name
    using errcode = '42501';
end;
$$;

create trigger audit_log_append_only
  before update or delete on public.audit_log
  for each row execute function public.deny_mutation();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
-- Ligada em todas as tabelas, sempre. Uma tabela sem RLS num projeto Supabase
-- fica exposta pela API pública a quem tiver a chave anónima — que é, por
-- definição, toda a gente que abra o site.

alter table public.profiles enable row level security;
alter table public.audit_log enable row level security;

-- Cada pessoa vê o seu perfil; admin vê todos.
create policy profiles_select on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_admin());

-- Só admin cria, altera ou desativa perfis. Ninguém se promove a si próprio.
create policy profiles_admin_write on public.profiles
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Auditoria: leitura para quem tem acesso ao admin. Escrita só pelo servidor
-- (service_role ignora RLS), nunca pelo browser.
create policy audit_log_select on public.audit_log
  for select to authenticated
  using (public.is_staff());
