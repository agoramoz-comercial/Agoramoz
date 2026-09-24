-- ============================================================================
-- 0004 — Outbox: a fila que impede a perda silenciosa de submissões
-- ============================================================================
-- O erro que este padrão existe para evitar: a rota chama o webhook do n8n e
-- devolve 200. Se a VPS estiver em baixo, em manutenção, ou o pedido expirar,
-- o lead desaparece sem deixar rasto — e ninguém dá por isso, porque o
-- utilizador viu «obrigado».
--
-- Aqui a escrita do lead e a intenção de o processar acontecem na MESMA
-- transação. Se o consumidor estiver em baixo, os eventos acumulam-se e são
-- processados quando voltar.
-- ============================================================================

create table public.outbox_events (
  id uuid primary key default extensions.gen_random_uuid(),
  topic text not null check (length(topic) between 1 and 80),
  aggregate_type text not null check (length(aggregate_type) between 1 and 60),
  aggregate_id text not null check (length(aggregate_id) between 1 and 120),
  payload jsonb not null,
  status public.outbox_status not null default 'pending',
  priority smallint not null default 100 check (priority between 0 and 1000),
  attempts integer not null default 0 check (attempts >= 0),
  max_attempts integer not null default 8 check (max_attempts >= 1),
  -- Controla a elegibilidade para nova tentativa. Um evento só é reclamável
  -- quando `available_at <= now()`, que é como o recuo exponencial se
  -- implementa sem precisar de agendador externo.
  available_at timestamptz not null default now(),
  locked_at timestamptz,
  locked_by text,
  processed_at timestamptz,
  last_error_code text,
  last_error_message text check (last_error_message is null or length(last_error_message) <= 2000),
  correlation_id uuid,
  causation_id uuid,
  created_at timestamptz not null default now(),

  -- `processed_at` só existe em evento concluído. Sem isto, um evento podia
  -- parecer processado e continuar a ser reclamado.
  constraint outbox_processado_so_em_done
    check ((status = 'done') = (processed_at is not null)),
  -- Um evento em processamento tem de saber quem o tem.
  constraint outbox_processing_tem_dono
    check (status <> 'processing' or (locked_at is not null and locked_by is not null))
);

-- Índice do caminho quente: o consumidor pergunta sempre «o que há para fazer
-- agora, por prioridade». Parcial para não indexar o que já está resolvido.
create index outbox_reclamaveis_idx
  on public.outbox_events (priority, available_at, created_at)
  where status in ('pending', 'failed');

create index outbox_status_idx on public.outbox_events (status, created_at desc);
create index outbox_agregado_idx on public.outbox_events (aggregate_type, aggregate_id);

-- ---------------------------------------------------------------------------
-- outbox_attempts — o histórico, para se perceber PORQUE falhou
-- ---------------------------------------------------------------------------

create table public.outbox_attempts (
  id bigint generated always as identity primary key,
  event_id uuid not null references public.outbox_events(id) on delete cascade,
  attempt integer not null check (attempt >= 1),
  worker text not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  outcome text check (outcome is null or outcome in ('ok', 'transient', 'permanent')),
  error_code text,
  error_message text check (error_message is null or length(error_message) <= 2000),
  metadata jsonb not null default '{}'::jsonb,

  unique (event_id, attempt)
);

create index outbox_attempts_event_idx on public.outbox_attempts (event_id, attempt);

-- ---------------------------------------------------------------------------
-- processed_events — a defesa do consumidor contra entrega repetida
-- ---------------------------------------------------------------------------
-- A outbox garante entrega AT-LEAST-ONCE, não exactly-once. Um evento pode ser
-- entregue duas vezes se um worker morrer depois de agir e antes de confirmar.
-- Esta tabela é o que transforma isso em inofensivo: o consumidor verifica
-- aqui antes de repetir um efeito.

create table public.processed_events (
  consumer text not null check (length(consumer) between 1 and 80),
  event_id uuid not null references public.outbox_events(id) on delete cascade,
  processed_at timestamptz not null default now(),
  result jsonb not null default '{}'::jsonb,

  primary key (consumer, event_id)
);

-- ---------------------------------------------------------------------------
-- dead_letters — o que falhou em definitivo, para alguém decidir
-- ---------------------------------------------------------------------------

create table public.dead_letters (
  id uuid primary key default extensions.gen_random_uuid(),
  event_id uuid not null references public.outbox_events(id) on delete cascade,
  reason text not null check (length(reason) between 1 and 500),
  payload_snapshot jsonb not null,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references auth.users(id) on delete set null,
  resolution text check (resolution is null or length(resolution) <= 2000),

  constraint dead_letter_resolucao_coerente
    check ((resolved_at is null) = (resolved_by is null))
);

create index dead_letters_por_resolver_idx
  on public.dead_letters (created_at desc)
  where resolved_at is null;

-- ---------------------------------------------------------------------------
-- Operações da fila
-- ---------------------------------------------------------------------------

-- Reclama um lote. `for update skip locked` é o que permite vários workers em
-- paralelo sem se bloquearem uns aos outros nem processarem o mesmo evento.
create or replace function public.claim_events(
  p_worker text,
  p_topics text[] default null,
  p_batch_size integer default 20,
  p_lock_seconds integer default 300
)
returns setof public.outbox_events
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  if p_batch_size < 1 or p_batch_size > 200 then
    raise exception 'batch_size fora do intervalo aceite (1..200): %', p_batch_size;
  end if;

  return query
  with candidatos as (
    select e.id
    from public.outbox_events e
    where e.status in ('pending', 'failed')
      and e.available_at <= now()
      and e.attempts < e.max_attempts
      and (p_topics is null or e.topic = any(p_topics))
    order by e.priority, e.available_at, e.created_at
    limit p_batch_size
    for update skip locked
  )
  update public.outbox_events e
  set status = 'processing',
      attempts = e.attempts + 1,
      locked_at = now(),
      locked_by = p_worker,
      -- Se o worker morrer, o evento volta a ficar reclamável quando o
      -- bloqueio expirar. Sem isto, um worker perdido prendia o evento para
      -- sempre e a fila parava em silêncio.
      available_at = now() + make_interval(secs => p_lock_seconds)
  from candidatos c
  where e.id = c.id
  returning e.*;
end;
$$;

create or replace function public.complete_event(
  p_event_id uuid,
  p_worker text,
  p_result jsonb default '{}'::jsonb
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  afectadas integer;
begin
  update public.outbox_events
  set status = 'done',
      processed_at = now(),
      locked_at = null,
      locked_by = null,
      last_error_code = null,
      last_error_message = null
  where id = p_event_id and locked_by = p_worker and status = 'processing';

  get diagnostics afectadas = row_count;

  if afectadas > 0 then
    update public.outbox_attempts
    set finished_at = now(), outcome = 'ok', metadata = p_result
    where event_id = p_event_id and finished_at is null;
  end if;

  return afectadas > 0;
end;
$$;

-- Distingue erro transitório de permanente: repetir um 500 faz sentido,
-- repetir um 400 é desperdiçar tentativas até o evento morrer sem razão.
create or replace function public.fail_event(
  p_event_id uuid,
  p_worker text,
  p_error_code text,
  p_error_message text,
  p_permanent boolean default false
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  ev public.outbox_events;
  recuo interval;
begin
  select * into ev from public.outbox_events
  where id = p_event_id and locked_by = p_worker and status = 'processing'
  for update;

  if not found then
    return false;
  end if;

  update public.outbox_attempts
  set finished_at = now(),
      outcome = case when p_permanent then 'permanent' else 'transient' end,
      error_code = p_error_code,
      error_message = left(p_error_message, 2000)
  where event_id = p_event_id and finished_at is null;

  if p_permanent or ev.attempts >= ev.max_attempts then
    update public.outbox_events
    set status = 'dead', locked_at = null, locked_by = null,
        last_error_code = p_error_code,
        last_error_message = left(p_error_message, 2000)
    where id = p_event_id;

    insert into public.dead_letters (event_id, reason, payload_snapshot)
    values (
      p_event_id,
      left(coalesce(p_error_code, 'desconhecido') || ': ' || coalesce(p_error_message, ''), 500),
      ev.payload
    );
  else
    -- Recuo exponencial com tecto. O `random()` dispersa tentativas
    -- simultâneas: sem ele, mil eventos que falharam ao mesmo tempo voltam
    -- todos ao mesmo tempo e derrubam o destino outra vez.
    recuo := make_interval(secs => least(3600, power(2, ev.attempts)::int * 15) * (0.7 + random() * 0.6));

    update public.outbox_events
    set status = 'failed', locked_at = null, locked_by = null,
        available_at = now() + recuo,
        last_error_code = p_error_code,
        last_error_message = left(p_error_message, 2000)
    where id = p_event_id;
  end if;

  return true;
end;
$$;

-- Devolve à fila o que ficou preso num worker que morreu.
create or replace function public.requeue_stale_events(p_older_than_seconds integer default 900)
returns integer
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  afectadas integer;
begin
  update public.outbox_events
  set status = 'pending', locked_at = null, locked_by = null, available_at = now()
  where status = 'processing'
    and locked_at < now() - make_interval(secs => p_older_than_seconds);

  get diagnostics afectadas = row_count;
  return afectadas;
end;
$$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.outbox_events enable row level security;
alter table public.outbox_attempts enable row level security;
alter table public.processed_events enable row level security;
alter table public.dead_letters enable row level security;

create policy outbox_events_select on public.outbox_events
  for select to authenticated using (public.is_staff());
create policy outbox_attempts_select on public.outbox_attempts
  for select to authenticated using (public.is_staff());
create policy processed_events_select on public.processed_events
  for select to authenticated using (public.is_staff());
create policy dead_letters_select on public.dead_letters
  for select to authenticated using (public.is_staff());

-- O consumidor não recebe a chave de serviço, que ignoraria RLS em tudo.
-- Recebe direito de execução nestas quatro funções e mais nada.
revoke all on function public.claim_events(text, text[], integer, integer) from public, anon, authenticated;
revoke all on function public.complete_event(uuid, text, jsonb) from public, anon, authenticated;
revoke all on function public.fail_event(uuid, text, text, text, boolean) from public, anon, authenticated;
revoke all on function public.requeue_stale_events(integer) from public, anon, authenticated;
