-- ============================================================================
-- APLICAR NO SQL EDITOR DO SUPABASE — projecto nixltrbdplqjadfytryd
-- ============================================================================
-- Conteúdo igual a migrations/0012_reunioes.sql (um teste garante-o).
-- Repetível: pode correr as vezes que quiser. Só acrescenta — tabelas novas e
-- uma função nova; nada do que existe é alterado.
--
-- Pode correr ANTES ou DEPOIS do deploy: enquanto SCHEDULING não for `cal`
-- na Vercel, nada do site usa estas tabelas.
--
-- Depois, corra verificar-estado.sql: a linha 22 tem de dizer «ok».
-- ============================================================================

-- ============================================================================
-- ============================================================================
-- 0012 — Reuniões marcadas pelo Cal.com
-- ============================================================================
-- O fim do diagnóstico oferece a marcação de uma conversa. O Cal.com envia um
-- webhook a cada marcação, remarcação, cancelamento e fim de reunião. Esta
-- migração guarda o que o painel precisa — quando, em que estado, de que
-- oportunidade — e NADA do que o Cal manda sobre as pessoas: nem nome, nem
-- email, nem notas, nem o link da videochamada.
--
-- A ligação à oportunidade faz-se por um `ref` aleatório que viaja no link de
-- marcação (`?metadata[ref]=…`) e volta no webhook. Guarda-se o seu SHA-256,
-- nunca o valor: token público nunca em claro.
--
-- Idempotente: pode correr mais do que uma vez. Só acrescenta.
-- ============================================================================


-- ---------------------------------------------------------------------------
-- reunioes_intencoes — o ref de cada diagnóstico que ofereceu a marcação
-- ---------------------------------------------------------------------------

create table if not exists public.reunioes_intencoes (
  id bigint generated always as identity primary key,
  ref_hash text not null unique check (ref_hash ~ '^[0-9a-f]{64}$'),
  deal_id uuid not null references public.deals(id) on delete cascade,
  created_at timestamptz not null default now(),
  -- Um link de marcação esquecido num separador não liga para sempre: passado
  -- o prazo, a reunião fica registada mas sem oportunidade.
  expires_at timestamptz not null default now() + interval '30 days'
);

create index if not exists reunioes_intencoes_deal_idx on public.reunioes_intencoes (deal_id);
create index if not exists reunioes_intencoes_expira_idx on public.reunioes_intencoes (expires_at);

-- RLS ligada e SEM políticas: só a chave de serviço (a rota do diagnóstico) e
-- a função abaixo lhe tocam. Nem a equipa precisa de ler hashes. `revoke all`
-- primeiro: o Supabase concede ALL por omissão em tabelas novas de `public`.
alter table public.reunioes_intencoes enable row level security;
revoke all on public.reunioes_intencoes from public, anon, authenticated, service_role;
grant select, insert on public.reunioes_intencoes to service_role;

-- As intenções expiradas não servem para nada: cada inserção limpa as que já
-- passaram do prazo. Barato (índice por `expires_at`) e sem depender de um
-- agendador que o projecto não tem.
create or replace function public.limpar_intencoes_expiradas()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  delete from public.reunioes_intencoes where expires_at < now();
  return null;
end;
$$;

revoke all on function public.limpar_intencoes_expiradas() from public, anon, authenticated;

drop trigger if exists reunioes_intencoes_limpar on public.reunioes_intencoes;
create trigger reunioes_intencoes_limpar
  after insert on public.reunioes_intencoes
  for each statement execute function public.limpar_intencoes_expiradas();


-- ---------------------------------------------------------------------------
-- reunioes
-- ---------------------------------------------------------------------------

create table if not exists public.reunioes (
  id uuid primary key default extensions.gen_random_uuid(),
  cal_uid text not null unique check (length(cal_uid) between 1 and 200),
  deal_id uuid references public.deals(id) on delete set null,
  estado text not null check (estado in ('marcada', 'remarcada', 'cancelada', 'realizada')),
  tipo text check (tipo is null or length(tipo) <= 120),
  inicio timestamptz,
  fim timestamptz,
  -- Numa remarcação, o `cal_uid` da marcação que esta substitui.
  substitui_uid text check (substitui_uid is null or length(substitui_uid) between 1 and 200),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists reunioes_inicio_idx on public.reunioes (inicio) where estado = 'marcada';
create index if not exists reunioes_deal_idx on public.reunioes (deal_id) where deal_id is not null;
create index if not exists reunioes_criada_idx on public.reunioes (created_at desc);

drop trigger if exists reunioes_set_updated_at on public.reunioes;
create trigger reunioes_set_updated_at
  before update on public.reunioes
  for each row execute function public.set_updated_at();

alter table public.reunioes enable row level security;
-- `revoke all` e depois só leitura: sem isto, os privilégios por omissão do
-- Supabase deixavam `authenticated` com TRUNCATE, que a RLS não trava.
revoke all on public.reunioes from public, anon, authenticated, service_role;
grant select on public.reunioes to authenticated, service_role;

drop policy if exists reunioes_select on public.reunioes;
create policy reunioes_select on public.reunioes
  for select to authenticated using (public.is_staff());


-- ---------------------------------------------------------------------------
-- registar_reuniao — o único caminho de escrita, chamado pelo webhook
-- ---------------------------------------------------------------------------
-- Numa transação: a reunião, a próxima acção da oportunidade, a actividade no
-- CRM e o evento para o funil. O Cal pode reenviar uma entrega ou mandá-las
-- fora de ordem; por isso:
--   · `upsert` por `cal_uid` — a mesma entrega duas vezes não duplica nada;
--   · um estado final (`cancelada`, `realizada`, `remarcada`) não regride;
--   · actividade e evento só quando o estado muda de facto;
--   · entregas simultâneas do mesmo uid são serializadas (trinco por uid) —
--     sem isso, duas primeiras entregas liam «não existe» e contavam em dobro;
--   · uma marcação que outra já substituiu nasce `remarcada`, mesmo que a
--     remarcação tenha chegado primeiro.

create or replace function public.registar_reuniao(
  p_evento text,
  p_cal_uid text,
  p_ref_hash text,
  p_inicio timestamptz,
  p_fim timestamptz,
  p_tipo text,
  p_uid_anterior text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_deal uuid;
  v_antes text;
  v_estado text;
  v_evento_funil text;
  v_mudou boolean := false;
  v_canal text;
  v_campanha text;
  v_substituida boolean := false;
  -- Porque ficou (ou não) ligada: sem-ref, ref-desconhecido (inclui expirado),
  -- ref, anterior (pela marcação substituída) ou reuniao (já conhecida).
  v_motivo text;
begin
  if p_cal_uid is null or length(p_cal_uid) not between 1 and 200 then
    raise exception 'uid inválido.' using errcode = '22023';
  end if;
  if p_ref_hash is not null and p_ref_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'ref inválido.' using errcode = '22023';
  end if;
  if p_uid_anterior is not null
     and (length(p_uid_anterior) not between 1 and 200 or p_uid_anterior = p_cal_uid) then
    raise exception 'uid anterior inválido.' using errcode = '22023';
  end if;

  -- Uma entrega de cada vez por marcação, até ao fim da transação.
  perform pg_advisory_xact_lock(hashtextextended('reuniao:' || p_cal_uid, 0));

  -- O estado desta marcação e o nome do evento no funil.
  case p_evento
    when 'BOOKING_CREATED' then v_estado := 'marcada'; v_evento_funil := 'meeting_booked';
    -- A marcação NOVA fica marcada; a antiga passa a remarcada, mais abaixo.
    when 'BOOKING_RESCHEDULED' then v_estado := 'marcada'; v_evento_funil := 'meeting_rescheduled';
    when 'BOOKING_CANCELLED' then v_estado := 'cancelada'; v_evento_funil := 'meeting_cancelled';
    when 'MEETING_ENDED' then v_estado := 'realizada'; v_evento_funil := 'meeting_held';
    else raise exception 'Evento não suportado.' using errcode = '22023';
  end case;

  -- A oportunidade: pelo ref ainda válido; senão pela marcação que esta
  -- substitui; senão pela própria marcação, se já a conhecermos.
  v_motivo := case when p_ref_hash is null then 'sem-ref' else 'ref-desconhecido' end;
  if p_ref_hash is not null then
    select deal_id into v_deal from public.reunioes_intencoes
     where ref_hash = p_ref_hash and expires_at > now();
    if v_deal is not null then v_motivo := 'ref'; end if;
  end if;
  if v_deal is null and p_uid_anterior is not null then
    select deal_id into v_deal from public.reunioes where cal_uid = p_uid_anterior;
    if v_deal is not null then v_motivo := 'anterior'; end if;
  end if;
  if v_deal is null then
    select deal_id into v_deal from public.reunioes where cal_uid = p_cal_uid;
    if v_deal is not null then v_motivo := 'reuniao'; end if;
  end if;

  select estado into v_antes from public.reunioes where cal_uid = p_cal_uid for update;

  -- Um estado final não regride: uma entrega atrasada de BOOKING_CREATED não
  -- desfaz um cancelamento nem uma reunião já realizada.
  if v_antes is not null and v_antes <> 'marcada' then
    v_estado := v_antes;
  end if;

  -- A remarcação chegou antes da marcação original: esta nasce já substituída,
  -- e não conta como marcação nova.
  if v_antes is null and exists (select 1 from public.reunioes where substitui_uid = p_cal_uid) then
    v_estado := 'remarcada';
    v_substituida := true;
  end if;
  v_mudou := v_antes is distinct from v_estado and not v_substituida;

  insert into public.reunioes (cal_uid, deal_id, estado, tipo, inicio, fim, substitui_uid)
  values (p_cal_uid, v_deal, v_estado, left(p_tipo, 120), p_inicio, p_fim, p_uid_anterior)
  on conflict (cal_uid) do update
    set estado = excluded.estado,
        deal_id = coalesce(public.reunioes.deal_id, excluded.deal_id),
        tipo = coalesce(excluded.tipo, public.reunioes.tipo),
        inicio = coalesce(excluded.inicio, public.reunioes.inicio),
        fim = coalesce(excluded.fim, public.reunioes.fim),
        substitui_uid = coalesce(public.reunioes.substitui_uid, excluded.substitui_uid);

  -- A marcação substituída sai das «próximas».
  if p_evento = 'BOOKING_RESCHEDULED' and p_uid_anterior is not null then
    update public.reunioes set estado = 'remarcada'
     where cal_uid = p_uid_anterior and estado = 'marcada';
  end if;

  if v_mudou and v_deal is not null then
    -- A próxima acção passa a ser a reunião futura mais próxima (ou nenhuma,
    -- depois de um cancelamento). Só se mexe num valor que não foi a equipa a
    -- pôr: vazio, já passado, ou igual ao início de uma reunião desta
    -- oportunidade.
    update public.deals d
       set next_action_at = (select min(r.inicio) from public.reunioes r
                              where r.deal_id = d.id and r.estado = 'marcada' and r.inicio > now())
     where d.id = v_deal
       and (d.next_action_at is null
            or d.next_action_at <= now()
            or exists (select 1 from public.reunioes r
                        where r.deal_id = d.id and r.inicio = d.next_action_at));

    insert into public.activities (deal_id, activity_type, actor_type, metadata)
    values (v_deal,
            case when p_evento = 'BOOKING_RESCHEDULED' then 'reuniao_remarcada' else 'reuniao_' || v_estado end,
            'system',
            jsonb_build_object('cal_uid', p_cal_uid, 'inicio', p_inicio));
  end if;

  if v_mudou then
    select acquisition_channel, acquisition_campaign into v_canal, v_campanha
      from public.deals where id = v_deal;

    insert into public.analytics_events (name, channel, campaign, origin, props)
    values (v_evento_funil, coalesce(v_canal, 'desconhecido'), v_campanha, 'servidor',
            jsonb_build_object('ligada', v_deal is not null));
  end if;

  return jsonb_build_object('ligada', v_deal is not null, 'mudou', v_mudou, 'estado', v_estado,
                            'motivo', v_motivo);
end;
$$;

-- Só a chave de serviço (o webhook). `create function` concede a PUBLIC por
-- omissão: retirar primeiro.
revoke all on function public.registar_reuniao(text, text, text, timestamptz, timestamptz, text, text)
  from public, anon, authenticated;
grant execute on function public.registar_reuniao(text, text, text, timestamptz, timestamptz, text, text)
  to service_role;
