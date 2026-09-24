-- ============================================================================
-- 0003 — Questionários, respostas, diagnósticos e documentos
-- ============================================================================
-- O diagnóstico é uma INSTÂNCIA do motor de questionários, não um produto
-- separado. Por isso as surveys futuras não precisam de modelo novo: mudam o
-- `kind` e a `spec`.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- questionnaires / questionnaire_versions
-- ---------------------------------------------------------------------------

create table public.questionnaires (
  id uuid primary key default extensions.gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (length(trim(name)) between 1 and 160),
  kind text not null check (kind in ('diagnostic', 'survey')),
  -- Política explícita, por questionário: nem toda a resposta é uma
  -- oportunidade comercial. Ver D-10.
  creates_deal boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger questionnaires_set_updated_at
  before update on public.questionnaires
  for each row execute function public.set_updated_at();

create table public.questionnaire_versions (
  id uuid primary key default extensions.gen_random_uuid(),
  questionnaire_id uuid not null references public.questionnaires(id) on delete cascade,
  version integer not null check (version >= 1),
  spec jsonb not null,
  schema_version text not null,
  published_at timestamptz,
  retired_at timestamptz,
  created_at timestamptz not null default now(),

  unique (questionnaire_id, version),
  constraint versao_reforma_depois_de_publicar
    check (retired_at is null or (published_at is not null and retired_at >= published_at))
);

create index questionnaire_versions_activas_idx
  on public.questionnaire_versions (questionnaire_id, version desc)
  where published_at is not null and retired_at is null;

-- Uma versão publicada é um contrato: há respostas presas a ela. Alterar a
-- `spec` depois de publicada reescreveria retroactivamente o que foi
-- perguntado, e as respostas antigas passariam a responder a outra coisa.
-- Reformar e publicar uma versão nova é o caminho.
create or replace function public.bloquear_versao_publicada()
returns trigger
language plpgsql
as $$
begin
  if old.published_at is not null
     and (new.spec is distinct from old.spec
          or new.version is distinct from old.version
          or new.schema_version is distinct from old.schema_version
          or new.published_at is distinct from old.published_at) then
    raise exception 'Versão de questionário já publicada é imutável (id=%). Publique uma versão nova.', old.id
      using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger questionnaire_versions_imutaveis
  before update on public.questionnaire_versions
  for each row execute function public.bloquear_versao_publicada();

-- ---------------------------------------------------------------------------
-- responses / response_answers
-- ---------------------------------------------------------------------------

create table public.responses (
  id uuid primary key default extensions.gen_random_uuid(),
  questionnaire_version_id uuid not null references public.questionnaire_versions(id),
  contact_id uuid not null references public.contacts(id) on delete cascade,
  raw jsonb not null,
  normalized jsonb not null,
  -- A chave que torna a ingestão idempotente. Derivada no servidor, nunca
  -- aceite do cliente: um valor controlado por quem submete permitiria
  -- sobrepor-se ao registo de outra pessoa. Ver D-12.
  idempotency_key text not null check (idempotency_key ~ '^[0-9a-f]{64}$'),
  input_fingerprint text not null check (input_fingerprint ~ '^[0-9a-f]{64}$'),
  submitted_at timestamptz not null default now(),
  ip_hash text check (ip_hash is null or ip_hash ~ '^[0-9a-f]{64}$'),
  user_agent_hash text check (user_agent_hash is null or user_agent_hash ~ '^[0-9a-f]{64}$'),

  unique (idempotency_key)
);

create index responses_contact_idx on public.responses (contact_id, submitted_at desc);
create index responses_version_idx on public.responses (questionnaire_version_id, submitted_at desc);

-- `raw` é o que a pessoa efectivamente submeteu. É a base de tudo o que se
-- conclui e do que se lhe envia; se puder ser reescrito, nenhum diagnóstico
-- volta a ser defensável.
create or replace function public.bloquear_resposta_crua()
returns trigger
language plpgsql
as $$
begin
  if new.raw is distinct from old.raw
     or new.idempotency_key is distinct from old.idempotency_key
     or new.input_fingerprint is distinct from old.input_fingerprint
     or new.submitted_at is distinct from old.submitted_at then
    raise exception 'A resposta submetida é imutável (id=%).', old.id
      using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger responses_raw_imutavel
  before update on public.responses
  for each row execute function public.bloquear_resposta_crua();

create table public.response_answers (
  id bigint generated always as identity primary key,
  response_id uuid not null references public.responses(id) on delete cascade,
  question_key text not null check (length(question_key) between 1 and 80),
  value jsonb not null,
  position integer not null check (position >= 0),

  unique (response_id, question_key)
);

create index response_answers_response_idx on public.response_answers (response_id, position);

-- ---------------------------------------------------------------------------
-- deals / activities
-- ---------------------------------------------------------------------------

create table public.deals (
  id uuid primary key default extensions.gen_random_uuid(),
  organisation_id uuid references public.organisations(id) on delete set null,
  contact_id uuid not null references public.contacts(id) on delete cascade,
  source_response_id uuid references public.responses(id) on delete set null,
  stage text not null default 'novo'
    check (stage in ('novo', 'qualificacao', 'proposta', 'negociacao', 'ganho', 'perdido')),
  tier text check (tier is null or tier in ('A', 'B', 'C', 'D')),
  score integer check (score is null or score between 0 and 1000),
  owner_id uuid references auth.users(id) on delete set null,
  next_action_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index deals_stage_idx on public.deals (stage, created_at desc);
create index deals_owner_idx on public.deals (owner_id) where owner_id is not null;
-- Uma resposta gera no máximo uma oportunidade: sem isto, um retry da
-- ingestão criava oportunidades duplicadas para o mesmo lead.
create unique index deals_por_resposta_unica
  on public.deals (source_response_id)
  where source_response_id is not null;

create trigger deals_set_updated_at
  before update on public.deals
  for each row execute function public.set_updated_at();

create table public.activities (
  id bigint generated always as identity primary key,
  deal_id uuid not null references public.deals(id) on delete cascade,
  activity_type text not null check (length(activity_type) between 1 and 60),
  body text,
  actor_id uuid references auth.users(id) on delete set null,
  actor_type public.actor_type not null,
  occurred_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,

  constraint activities_actor_coerente check (
    (actor_type = 'user' and actor_id is not null) or actor_type <> 'user'
  )
);

create index activities_deal_idx on public.activities (deal_id, occurred_at desc);

-- ---------------------------------------------------------------------------
-- diagnostics
-- ---------------------------------------------------------------------------

create table public.diagnostics (
  id uuid primary key default extensions.gen_random_uuid(),
  response_id uuid not null references public.responses(id) on delete cascade,
  ruleset_version text not null,
  scoring_version text not null,
  findings jsonb not null default '[]'::jsonb,
  evidence_bundle jsonb not null default '{}'::jsonb,
  score integer not null check (score between 0 and 1000),
  tier text not null check (tier in ('A', 'B', 'C', 'D')),
  state public.diagnostic_state not null default 'computed',
  revision integer not null default 1 check (revision >= 1),
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  rejected_by uuid references auth.users(id) on delete set null,
  rejected_at timestamptz,
  rejection_reason text check (rejection_reason is null or length(rejection_reason) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Um diagnóstico por resposta. A repetição de uma submissão não produz
  -- diagnósticos paralelos.
  unique (response_id),

  -- A invariante que impede um envio sem dono: estar aprovado exige saber
  -- QUEM aprovou e QUANDO. Não é validação de formulário, é da base.
  constraint diagnostico_aprovado_tem_aprovador check (
    (state in ('approved', 'rendering', 'ready', 'sending', 'sent')
      and approved_by is not null and approved_at is not null)
    or state not in ('approved', 'rendering', 'ready', 'sending', 'sent')
  ),
  constraint diagnostico_rejeitado_tem_motivo check (
    (state = 'rejected' and rejected_by is not null and rejected_at is not null)
    or state <> 'rejected'
  )
);

create index diagnostics_estado_idx on public.diagnostics (state, created_at desc);
create index diagnostics_revisao_idx on public.diagnostics (state)
  where state = 'pending_review';

create trigger diagnostics_set_updated_at
  before update on public.diagnostics
  for each row execute function public.set_updated_at();

-- Transições válidas, espelhando `lib/diagnostic/transitions.ts`. Existe nos
-- dois sítios de propósito: a aplicação dá mensagens úteis, a base garante que
-- nenhum caminho alternativo — um script, uma correcção à pressa, um bug —
-- consegue enviar um documento que ninguém aprovou.
create or replace function public.validar_transicao_diagnostico()
returns trigger
language plpgsql
as $$
declare
  permitido boolean;
begin
  if new.state = old.state then
    return new;
  end if;

  permitido := case old.state
    when 'computed'          then new.state in ('drafting', 'pending_review')
    when 'drafting'          then new.state in ('drafted', 'draft_failed')
    when 'drafted'           then new.state in ('pending_review', 'validation_failed')
    when 'pending_review'    then new.state in ('approved', 'rejected', 'drafting')
    when 'approved'          then new.state in ('rendering', 'revoked')
    when 'rendering'         then new.state in ('ready', 'render_failed')
    when 'ready'             then new.state in ('sending', 'revoked')
    when 'sending'           then new.state in ('sent', 'send_failed')
    when 'sent'              then new.state in ('revoked')
    when 'draft_failed'      then new.state in ('drafting', 'rejected')
    when 'validation_failed' then new.state in ('drafting', 'rejected')
    when 'render_failed'     then new.state in ('rendering', 'rejected')
    when 'send_failed'       then new.state in ('sending', 'rejected')
    when 'rejected'          then new.state in ('drafting')
    when 'revoked'           then false
    else false
  end;

  if not permitido then
    raise exception 'Transição inválida de diagnóstico: % → % (id=%)', old.state, new.state, old.id
      using errcode = '42501';
  end if;

  return new;
end;
$$;

create trigger diagnostics_transicoes_validas
  before update of state on public.diagnostics
  for each row execute function public.validar_transicao_diagnostico();

-- ---------------------------------------------------------------------------
-- diagnostic_drafts — o que a IA produziu e o que o validador disse
-- ---------------------------------------------------------------------------

create table public.diagnostic_drafts (
  id uuid primary key default extensions.gen_random_uuid(),
  diagnostic_id uuid not null references public.diagnostics(id) on delete cascade,
  prompt_version text not null,
  provider text not null,
  model text not null,
  model_parameters jsonb not null default '{}'::jsonb,
  input_fingerprint text not null check (input_fingerprint ~ '^[0-9a-f]{64}$'),
  structured_output jsonb,
  validation_result jsonb,
  status text not null check (status in ('pending', 'ok', 'invalid', 'error')),
  created_at timestamptz not null default now(),

  -- Uma redação dada como válida tem de ter produzido texto. Sem isto, um
  -- rascunho vazio podia ser marcado `ok` e seguir para documento.
  constraint rascunho_ok_tem_saida check (status <> 'ok' or structured_output is not null)
);

create index diagnostic_drafts_diag_idx on public.diagnostic_drafts (diagnostic_id, created_at desc);

-- ---------------------------------------------------------------------------
-- documents
-- ---------------------------------------------------------------------------
-- Não existe coluna para o token em claro. Só o hash. Quem tiver acesso à base
-- não passa a ter acesso aos documentos dos clientes.

create table public.documents (
  id uuid primary key default extensions.gen_random_uuid(),
  diagnostic_id uuid not null references public.diagnostics(id) on delete cascade,
  kind text not null check (kind in ('web', 'pdf')),
  template_version text not null,
  renderer_version text not null,
  storage_key text,
  content_hash text check (content_hash is null or content_hash ~ '^[0-9a-f]{64}$'),
  token_hash text not null check (token_hash ~ '^[0-9a-f]{64}$'),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  -- Três marcas distintas de propósito: um scanner de e-mail abre links, e
  -- confundir «o servidor recebeu um GET» com «uma pessoa leu» produziria um
  -- sinal comercial falso.
  first_requested_at timestamptz,
  first_browser_view_at timestamptz,
  confirmed_view_at timestamptz,
  downloaded_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz not null default now(),

  unique (token_hash),
  constraint documento_expira_depois_de_criado check (expires_at > created_at)
);

create index documents_diagnostic_idx on public.documents (diagnostic_id, created_at desc);

-- A invariante de negócio mais importante de todo o esquema: um documento só
-- é dado como enviado se o diagnóstico estiver aprovado. Em trigger e não em
-- CHECK porque precisa de consultar outra tabela.
create or replace function public.exigir_diagnostico_aprovado()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  estado public.diagnostic_state;
begin
  if new.sent_at is null then
    return new;
  end if;

  select state into estado from public.diagnostics where id = new.diagnostic_id;

  if estado not in ('approved', 'rendering', 'ready', 'sending', 'sent') then
    raise exception 'Documento não pode ser enviado: diagnóstico % está em "%"', new.diagnostic_id, estado
      using errcode = '42501';
  end if;

  return new;
end;
$$;

create trigger documents_exigir_aprovacao
  before insert or update of sent_at on public.documents
  for each row execute function public.exigir_diagnostico_aprovado();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.questionnaires enable row level security;
alter table public.questionnaire_versions enable row level security;
alter table public.responses enable row level security;
alter table public.response_answers enable row level security;
alter table public.deals enable row level security;
alter table public.activities enable row level security;
alter table public.diagnostics enable row level security;
alter table public.diagnostic_drafts enable row level security;
alter table public.documents enable row level security;

create policy questionnaires_select on public.questionnaires
  for select to authenticated using (public.is_staff());
create policy questionnaire_versions_select on public.questionnaire_versions
  for select to authenticated using (public.is_staff());
create policy responses_select on public.responses
  for select to authenticated using (public.is_staff());
create policy response_answers_select on public.response_answers
  for select to authenticated using (public.is_staff());
create policy deals_select on public.deals
  for select to authenticated using (public.is_staff());
create policy activities_select on public.activities
  for select to authenticated using (public.is_staff());
create policy diagnostics_select on public.diagnostics
  for select to authenticated using (public.is_staff());
create policy diagnostic_drafts_select on public.diagnostic_drafts
  for select to authenticated using (public.is_staff());
create policy documents_select on public.documents
  for select to authenticated using (public.is_staff());

-- Aprovar, rejeitar e atribuir são acções de admin ou comercial; leitura não
-- escreve. As acções passam por funções do servidor, mas a política existe
-- para o caso de alguém escrever pela API com a sessão do utilizador.
create policy diagnostics_update on public.diagnostics
  for update to authenticated
  using (public.current_role_of(auth.uid()) in ('admin', 'comercial'))
  with check (public.current_role_of(auth.uid()) in ('admin', 'comercial'));

create policy deals_update on public.deals
  for update to authenticated
  using (public.current_role_of(auth.uid()) in ('admin', 'comercial'))
  with check (public.current_role_of(auth.uid()) in ('admin', 'comercial'));

create policy activities_insert on public.activities
  for insert to authenticated
  with check (public.current_role_of(auth.uid()) in ('admin', 'comercial'));
