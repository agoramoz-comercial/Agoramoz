-- ============================================================================
-- 0002 — Entidades: organizações, contactos e consentimento
-- ============================================================================
-- O CRM não é um produto separado: é esta tabela vista por outro ângulo. Por
-- isso o modelo é do negócio, não do ecrã.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- organisations
-- ---------------------------------------------------------------------------
-- `normalized_domain` é a única chave de fusão automática que existe. Nomes
-- NÃO fundem: «Agora, Lda» e «AGORA LDA» podem ser duas empresas diferentes, e
-- juntar contactos que não são a mesma organização é pior do que ter dois
-- registos para alguém juntar à mão. Ver D-11 em docs/DECISIONS.md.

create table public.organisations (
  id uuid primary key default extensions.gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 200),
  normalized_name text not null,
  domain text,
  normalized_domain text,
  country_code text check (country_code is null or country_code in ('mz', 'pt', 'br')),
  sector text,
  size_band text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint organisations_normalized_name_minusculas
    check (normalized_name = lower(normalized_name)),
  constraint organisations_normalized_domain_minusculas
    check (normalized_domain is null or normalized_domain = lower(normalized_domain))
);

-- Parcial: várias organizações podem não ter domínio conhecido, e um índice
-- único simples tratá-las-ia como colisões.
create unique index organisations_domain_unico
  on public.organisations (normalized_domain)
  where normalized_domain is not null;

create index organisations_nome_idx on public.organisations (normalized_name);

create trigger organisations_set_updated_at
  before update on public.organisations
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- contacts
-- ---------------------------------------------------------------------------

create table public.contacts (
  id uuid primary key default extensions.gen_random_uuid(),
  organisation_id uuid references public.organisations(id) on delete set null,
  name text not null check (length(trim(name)) between 1 and 200),
  email text not null,
  normalized_email text not null,
  phone text,
  role text,
  source text not null default 'diagnostico',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- A invariante que garante que a idempotência funciona: se o e-mail
  -- normalizado não estivesse mesmo em minúsculas, duas submissões da mesma
  -- pessoa criavam dois contactos.
  constraint contacts_normalized_email_minusculas
    check (normalized_email = lower(normalized_email)),
  constraint contacts_email_tem_arroba
    check (position('@' in normalized_email) > 1)
);

create unique index contacts_email_unico on public.contacts (normalized_email);
create index contacts_organisation_idx on public.contacts (organisation_id);

create trigger contacts_set_updated_at
  before update on public.contacts
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- consent_records
-- ---------------------------------------------------------------------------
-- Registo próprio, não um booleano na tabela de contactos. Um booleano diz
-- «consentiu»; isto diz O QUÊ consentiu, em que versão do texto e quando — que
-- é o que permite responder a um pedido de prova meses depois. Ver D-14.

create table public.consent_records (
  id uuid primary key default extensions.gen_random_uuid(),
  contact_id uuid not null references public.contacts(id) on delete cascade,
  purpose text not null check (length(trim(purpose)) between 1 and 120),
  granted boolean not null,
  consent_text text not null check (length(consent_text) between 1 and 4000),
  consent_version text not null check (length(consent_version) between 1 and 40),
  captured_at timestamptz not null default now(),
  withdrawn_at timestamptz,
  source text not null default 'formulario-diagnostico',
  ip_hash text check (ip_hash is null or ip_hash ~ '^[0-9a-f]{64}$'),
  user_agent_hash text check (user_agent_hash is null or user_agent_hash ~ '^[0-9a-f]{64}$'),

  -- Não se pode retirar um consentimento antes de o ter dado.
  constraint consent_retirada_posterior
    check (withdrawn_at is null or withdrawn_at >= captured_at),
  -- Um consentimento negado não tem retirada: nunca chegou a valer.
  constraint consent_negado_sem_retirada
    check (granted or withdrawn_at is null)
);

create index consent_contact_idx on public.consent_records (contact_id, captured_at desc);

-- O texto do consentimento é prova. Alterá-lo depois de capturado destrói
-- exactamente aquilo que ele serve para demonstrar.
create trigger consent_records_imutavel
  before update of consent_text, consent_version, captured_at, contact_id
  on public.consent_records
  for each row execute function public.deny_mutation();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
-- Dados pessoais de leads. Ninguém anónimo lê; quem tem acesso ao admin lê;
-- escrita só pelo servidor.

alter table public.organisations enable row level security;
alter table public.contacts enable row level security;
alter table public.consent_records enable row level security;

create policy organisations_select on public.organisations
  for select to authenticated using (public.is_staff());

create policy contacts_select on public.contacts
  for select to authenticated using (public.is_staff());

create policy consent_select on public.consent_records
  for select to authenticated using (public.is_staff());
