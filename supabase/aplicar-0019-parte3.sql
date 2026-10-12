
-- APLICAR NO SQL EDITOR DO SUPABASE — projecto nixltrbdplqjadfytryd
-- 0019 em TRÊS PARTES — PARTE 3 de 3: reuniões do Cal, atribuição, pesquisa, exportação e direitos
-- Só DEPOIS da parte 2. Repetível.
-- 1. No GitHub, botão «Copy raw file» (ou Raw, Ctrl+A, Ctrl+C).
-- 2. SQL Editor: consulta NOVA e vazia, colar, Run. Esperado: «Success».
-- 3. Depois, verificar-estado.sql: a linha 31 tem de dizer «ok».
-- ===== fim do cabeçalho: daqui para baixo é a migração 0019, sem alterações =====
-- ---------------------------------------------------------------------------
-- Reuniões do Cal (0012) e atribuição (0006): mesmas assinaturas
-- ---------------------------------------------------------------------------

set lock_timeout = '5s';
-- `registar_reuniao` igual à 0012 excepto no UPDATE de `deals`: não mexe numa
-- acção que a equipa definiu. `atribuir_oportunidade` passa a contar como
-- revisão, para o controlo optimista ver todas as escritas.

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
set lock_timeout = '4s'
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
    -- 0019: nunca toca numa próxima acção escrita pela equipa (`proxima_accao`
    -- preenchida) — apagar-lhe a data violava `deals_proxima_accao_com_data` e
    -- fazia o webhook falhar —, e a escrita conta como revisão.
    update public.deals d
       set next_action_at = (select min(r.inicio) from public.reunioes r
                              where r.deal_id = d.id and r.estado = 'marcada' and r.inicio > now()),
           revisao = d.revisao + 1
     where d.id = v_deal
       and d.proxima_accao is null
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

revoke all on function public.registar_reuniao(text, text, text, timestamptz, timestamptz, text, text)
  from public, anon, authenticated;
grant execute on function public.registar_reuniao(text, text, text, timestamptz, timestamptz, text, text)
  to service_role;

create or replace function public.atribuir_oportunidade(
  p_deal_id uuid,
  p_owner uuid
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
set lock_timeout = '4s'
as $$
declare
  d public.deals;
begin
  perform public.exigir_papel(array['admin', 'comercial']::public.user_role[]);

  if p_owner is not null
     and not exists (select 1 from public.profiles where id = p_owner and active) then
    raise exception 'O responsável tem de ser um perfil activo.' using errcode = '23503';
  end if;

  select * into d from public.deals where id = p_deal_id for update;
  if not found then
    raise exception 'Oportunidade inexistente.' using errcode = 'P0002';
  end if;

  update public.deals set owner_id = p_owner, revisao = d.revisao + 1 where id = p_deal_id;

  insert into public.activities (deal_id, activity_type, actor_id, actor_type, metadata)
  values (p_deal_id, 'atribuicao', auth.uid(), 'user',
          jsonb_build_object('de', d.owner_id, 'para', p_owner));

  insert into public.audit_log (actor_id, actor_type, action, entity_type, entity_id, before, after)
  values (auth.uid(), 'user', 'oportunidade.atribuir', 'deal', p_deal_id::text,
          jsonb_build_object('owner_id', d.owner_id), jsonb_build_object('owner_id', p_owner));

  return jsonb_build_object('id', p_deal_id, 'owner_id', p_owner);
end;
$$;


-- ---------------------------------------------------------------------------
-- Pesquisa global (leitura; sujeita à RLS de quem pesquisa)
-- ---------------------------------------------------------------------------
-- `security invoker`: a função não vê mais do que a pessoa veria nas listas.
-- Os curingas do LIKE (% e _) que vierem no texto são tratados como letras.

-- Índices trigram para `ilike '%…%'`: com três ou mais letras deixam de ler as
-- tabelas inteiras. As expressões têm de ser iguais às da consulta.
create extension if not exists pg_trgm with schema extensions;
create index if not exists contacts_nome_trgm on public.contacts using gin (name extensions.gin_trgm_ops);
create index if not exists contacts_email_trgm on public.contacts using gin (email extensions.gin_trgm_ops);
create index if not exists contacts_telefone_trgm
  on public.contacts using gin ((coalesce(phone, '')) extensions.gin_trgm_ops);
create index if not exists organisations_nome_trgm on public.organisations using gin (name extensions.gin_trgm_ops);
create index if not exists organisations_dominio_trgm
  on public.organisations using gin ((coalesce(normalized_domain, '')) extensions.gin_trgm_ops);

create or replace function public.pesquisar_global(p_q text)
returns jsonb
language plpgsql
stable
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_q text := left(trim(coalesce(p_q, '')), 80);
  v_padrao text;
begin
  if length(v_q) < 2 then
    return jsonb_build_object('contactos', '[]'::jsonb, 'organizacoes', '[]'::jsonb, 'oportunidades', '[]'::jsonb);
  end if;
  v_padrao := '%' || replace(replace(replace(v_q, '\', '\\'), '%', '\%'), '_', '\_') || '%';

  return jsonb_build_object(
    'contactos', coalesce((
      select jsonb_agg(jsonb_build_object('id', c.id, 'nome', c.name, 'email', c.email))
        from (select id, name, email from public.contacts
               where name ilike v_padrao or email ilike v_padrao or coalesce(phone, '') ilike v_padrao
               order by name limit 8) c), '[]'::jsonb),
    'organizacoes', coalesce((
      select jsonb_agg(jsonb_build_object('id', o.id, 'nome', o.name, 'dominio', o.normalized_domain))
        from (select id, name, normalized_domain from public.organisations
               where name ilike v_padrao or coalesce(normalized_domain, '') ilike v_padrao
               order by name limit 8) o), '[]'::jsonb),
    'oportunidades', coalesce((
      select jsonb_agg(jsonb_build_object('id', x.id, 'fase', x.stage, 'contacto', x.nome, 'organizacao', x.org))
        from (select d.id, d.stage, c.name as nome, o.name as org
                from public.deals d
                join public.contacts c on c.id = d.contact_id
                left join public.organisations o on o.id = d.organisation_id
               where c.name ilike v_padrao or c.email ilike v_padrao or coalesce(o.name, '') ilike v_padrao
               order by d.updated_at desc limit 8) x), '[]'::jsonb)
  );
end;
$$;


-- ---------------------------------------------------------------------------
-- Exportação CSV das listas do CRM: sem registo na auditoria, não há ficheiro
-- ---------------------------------------------------------------------------
-- O ficheiro sai pela aplicação, pela sessão de quem exporta; aqui fica quem,
-- que lista, quantas linhas e com que filtros (nunca os dados exportados).

create or replace function public.registar_exportacao_crm(
  p_lista text,
  p_linhas integer,
  p_filtros jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
set lock_timeout = '4s'
as $$
begin
  perform public.exigir_papel(array['admin', 'comercial']::public.user_role[]);
  if p_lista is null or p_lista not in ('contactos', 'oportunidades') then
    raise exception 'Lista desconhecida.' using errcode = '22023';
  end if;
  if p_linhas is null or p_linhas < 0 or p_linhas > 100000 then
    raise exception 'Número de linhas inválido.' using errcode = '22023';
  end if;
  if p_filtros is not null and (jsonb_typeof(p_filtros) <> 'object' or octet_length(p_filtros::text) > 1000) then
    raise exception 'Filtros inválidos.' using errcode = '22023';
  end if;
  insert into public.audit_log (actor_id, actor_type, action, entity_type, entity_id, after)
  values (auth.uid(), 'user', 'crm.exportar', 'crm_lista', p_lista,
          jsonb_build_object('linhas', p_linhas, 'filtros', coalesce(p_filtros, '{}'::jsonb)));
end;
$$;


-- ---------------------------------------------------------------------------
-- Direitos
-- ---------------------------------------------------------------------------

do $$
declare
  f text;
begin
  foreach f in array array[
    'public.definir_proxima_accao(uuid, integer, text, timestamptz)',
    'public.guardar_oportunidade_crm(uuid, integer, numeric, text, date)',
    'public.marcar_perdida(uuid, text, text)',
    'public.atribuir_oportunidade(uuid, uuid)',
    'public.mudar_fase_oportunidade(uuid, text, text)',
    'public.registar_actividade(uuid, text, text)',
    'public.aprovar_diagnostico(uuid, integer)',
    'public.rejeitar_diagnostico(uuid, integer, text)',
    'public.pesquisar_global(text)',
    'public.registar_exportacao_crm(text, integer, jsonb)'
  ] loop
    execute format('revoke all on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
  -- O gatilho não é chamável de fora.
  execute 'revoke all on function public.deals_marca_fase() from public, anon, authenticated';
end $$;

reset lock_timeout;

notify pgrst, 'reload schema';
