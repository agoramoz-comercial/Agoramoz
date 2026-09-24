-- ============================================================================
-- 0006 — Acções do admin: nenhuma escrita directa em tabela
-- ============================================================================
-- O que esta migração corrige (T-15 do modelo de ameaças):
--
-- As políticas de 0003 deixam `admin` e `comercial` fazer `update` em QUALQUER
-- coluna de `diagnostics` e de `deals`. Nada impede pôr `approved_by` com o
-- identificador de outra pessoa, mexer em `score`, `tier`, ou trocar o
-- `source_response_id` de uma oportunidade. A CHECK garante que um diagnóstico
-- aprovado tem aprovador; não garante que o aprovador seja quem aprovou.
--
-- A partir daqui a aplicação não escreve em tabela nenhuma. Escreve através
-- destas funções, que (a) verificam o papel, (b) derivam o autor de
-- `auth.uid()` em vez de o aceitarem como argumento, (c) verificam a revisão
-- onde faz sentido, e (d) escrevem a auditoria na MESMA transação.
--
-- A auditoria na mesma transação é o ponto. Uma auditoria escrita a seguir é
-- uma auditoria que falta sempre que a transação falha a meio — e é
-- precisamente aí que ela faria falta.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Guarda comum
-- ---------------------------------------------------------------------------

create or replace function public.exigir_papel(p_papeis public.user_role[])
returns public.user_role
language plpgsql
stable
security definer
set search_path = public, pg_catalog
as $$
declare
  v_papel public.user_role;
begin
  v_papel := public.current_role_of(auth.uid());

  -- Sem sessão, ou com perfil inactivo, `current_role_of` devolve null.
  if v_papel is null then
    raise exception 'Sem acesso.' using errcode = '42501';
  end if;

  if not (v_papel = any(p_papeis)) then
    raise exception 'Sem acesso.' using errcode = '42501';
  end if;

  return v_papel;
end;
$$;

-- ---------------------------------------------------------------------------
-- Diagnósticos
-- ---------------------------------------------------------------------------

-- Leva um diagnóstico calculado para a fila de revisão humana.
create or replace function public.enviar_para_revisao(
  p_id uuid,
  p_revision integer
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  d public.diagnostics;
begin
  perform public.exigir_papel(array['admin', 'comercial']::public.user_role[]);

  select * into d from public.diagnostics where id = p_id for update;
  if not found then
    raise exception 'Diagnóstico inexistente.' using errcode = 'P0002';
  end if;

  if d.revision <> p_revision then
    raise exception 'O diagnóstico mudou entretanto (revisão %, esperada %).', d.revision, p_revision
      using errcode = '40001';
  end if;

  if d.state <> 'computed' then
    raise exception 'Só um diagnóstico calculado pode ir para revisão (está em %).', d.state
      using errcode = '42501';
  end if;

  update public.diagnostics set state = 'pending_review' where id = p_id;

  insert into public.audit_log (actor_id, actor_type, action, entity_type, entity_id, before, after)
  values (auth.uid(), 'user', 'diagnostico.enviar_para_revisao', 'diagnostic', p_id::text,
          jsonb_build_object('state', d.state),
          jsonb_build_object('state', 'pending_review'));

  return jsonb_build_object('id', p_id, 'state', 'pending_review');
end;
$$;

-- O portão. É a única porta por onde um diagnóstico passa a aprovado, e é
-- deliberado que `approved_by` não seja um argumento: quem aprova é quem está
-- autenticado, não quem o pedido disser.
create or replace function public.aprovar_diagnostico(
  p_id uuid,
  p_revision integer
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  d public.diagnostics;
begin
  perform public.exigir_papel(array['admin', 'comercial']::public.user_role[]);

  select * into d from public.diagnostics where id = p_id for update;
  if not found then
    raise exception 'Diagnóstico inexistente.' using errcode = 'P0002';
  end if;

  -- A revisão é o que impede aprovar um conteúdo e enviar outro: se algo mudou
  -- entre o ecrã que a pessoa leu e o botão que carregou, isto recusa.
  if d.revision <> p_revision then
    raise exception 'O diagnóstico mudou entretanto (revisão %, esperada %).', d.revision, p_revision
      using errcode = '40001';
  end if;

  if d.state <> 'pending_review' then
    raise exception 'Só se aprova o que está em revisão (está em %).', d.state
      using errcode = '42501';
  end if;

  update public.diagnostics
  set state = 'approved', approved_by = auth.uid(), approved_at = now()
  where id = p_id;

  insert into public.audit_log (actor_id, actor_type, action, entity_type, entity_id, before, after)
  values (auth.uid(), 'user', 'diagnostico.aprovar', 'diagnostic', p_id::text,
          jsonb_build_object('state', d.state, 'revision', d.revision),
          jsonb_build_object('state', 'approved', 'revision', d.revision));

  return jsonb_build_object('id', p_id, 'state', 'approved');
end;
$$;

create or replace function public.rejeitar_diagnostico(
  p_id uuid,
  p_revision integer,
  p_motivo text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  d public.diagnostics;
begin
  perform public.exigir_papel(array['admin', 'comercial']::public.user_role[]);

  -- Um motivo vazio torna a rejeição inútil para quem a lê depois.
  if p_motivo is null or length(trim(p_motivo)) < 10 then
    raise exception 'O motivo da rejeição é obrigatório e tem de ser explícito.'
      using errcode = '22023';
  end if;

  select * into d from public.diagnostics where id = p_id for update;
  if not found then
    raise exception 'Diagnóstico inexistente.' using errcode = 'P0002';
  end if;

  if d.revision <> p_revision then
    raise exception 'O diagnóstico mudou entretanto (revisão %, esperada %).', d.revision, p_revision
      using errcode = '40001';
  end if;

  -- As transições admissíveis são as do trigger de 0003; aqui não se repete a
  -- lista, deixa-se o trigger recusar. Repetir seria criar uma segunda fonte
  -- de verdade que um dia discordaria da primeira.
  update public.diagnostics
  set state = 'rejected',
      rejected_by = auth.uid(),
      rejected_at = now(),
      rejection_reason = left(trim(p_motivo), 2000)
  where id = p_id;

  insert into public.audit_log (actor_id, actor_type, action, entity_type, entity_id, before, after)
  values (auth.uid(), 'user', 'diagnostico.rejeitar', 'diagnostic', p_id::text,
          jsonb_build_object('state', d.state),
          jsonb_build_object('state', 'rejected'));

  return jsonb_build_object('id', p_id, 'state', 'rejected');
end;
$$;

-- ---------------------------------------------------------------------------
-- Oportunidades
-- ---------------------------------------------------------------------------

create or replace function public.mudar_fase_oportunidade(
  p_deal_id uuid,
  p_fase text,
  p_nota text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  d public.deals;
begin
  perform public.exigir_papel(array['admin', 'comercial']::public.user_role[]);

  select * into d from public.deals where id = p_deal_id for update;
  if not found then
    raise exception 'Oportunidade inexistente.' using errcode = 'P0002';
  end if;

  if p_fase = d.stage then
    return jsonb_build_object('id', p_deal_id, 'stage', d.stage, 'changed', false);
  end if;

  update public.deals set stage = p_fase where id = p_deal_id;

  -- A mudança de fase deixa rasto na cronologia da oportunidade, não só na
  -- auditoria: quem trabalha o negócio lê a cronologia, não o audit_log.
  insert into public.activities (deal_id, activity_type, body, actor_id, actor_type, metadata)
  values (p_deal_id, 'fase', nullif(trim(coalesce(p_nota, '')), ''), auth.uid(), 'user',
          jsonb_build_object('de', d.stage, 'para', p_fase));

  insert into public.audit_log (actor_id, actor_type, action, entity_type, entity_id, before, after)
  values (auth.uid(), 'user', 'oportunidade.mudar_fase', 'deal', p_deal_id::text,
          jsonb_build_object('stage', d.stage), jsonb_build_object('stage', p_fase));

  return jsonb_build_object('id', p_deal_id, 'stage', p_fase, 'changed', true);
end;
$$;

create or replace function public.atribuir_oportunidade(
  p_deal_id uuid,
  p_owner uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  d public.deals;
begin
  perform public.exigir_papel(array['admin', 'comercial']::public.user_role[]);

  -- Atribuir a quem não tem acesso é criar uma oportunidade sem dono efectivo.
  if p_owner is not null
     and not exists (select 1 from public.profiles where id = p_owner and active) then
    raise exception 'O responsável tem de ser um perfil activo.' using errcode = '23503';
  end if;

  select * into d from public.deals where id = p_deal_id for update;
  if not found then
    raise exception 'Oportunidade inexistente.' using errcode = 'P0002';
  end if;

  update public.deals set owner_id = p_owner where id = p_deal_id;

  insert into public.activities (deal_id, activity_type, actor_id, actor_type, metadata)
  values (p_deal_id, 'atribuicao', auth.uid(), 'user',
          jsonb_build_object('de', d.owner_id, 'para', p_owner));

  insert into public.audit_log (actor_id, actor_type, action, entity_type, entity_id, before, after)
  values (auth.uid(), 'user', 'oportunidade.atribuir', 'deal', p_deal_id::text,
          jsonb_build_object('owner_id', d.owner_id), jsonb_build_object('owner_id', p_owner));

  return jsonb_build_object('id', p_deal_id, 'owner_id', p_owner);
end;
$$;

create or replace function public.registar_actividade(
  p_deal_id uuid,
  p_tipo text,
  p_corpo text
)
returns bigint
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_id bigint;
begin
  perform public.exigir_papel(array['admin', 'comercial']::public.user_role[]);

  if p_corpo is null or length(trim(p_corpo)) = 0 then
    raise exception 'Uma nota vazia não é uma nota.' using errcode = '22023';
  end if;

  if not exists (select 1 from public.deals where id = p_deal_id) then
    raise exception 'Oportunidade inexistente.' using errcode = 'P0002';
  end if;

  insert into public.activities (deal_id, activity_type, body, actor_id, actor_type)
  values (p_deal_id, coalesce(nullif(trim(p_tipo), ''), 'nota'),
          left(trim(p_corpo), 4000), auth.uid(), 'user')
  returning id into v_id;

  return v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Equipa
-- ---------------------------------------------------------------------------
-- O Supabase é dono da autenticação: a conta cria-se no painel. Estas funções
-- tratam da AUTORIZAÇÃO, que é o que esta base sabe responder.

create or replace function public.criar_perfil(
  p_user uuid,
  p_nome text,
  p_papel public.user_role default 'leitura'
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  perform public.exigir_papel(array['admin']::public.user_role[]);

  if not exists (select 1 from auth.users where id = p_user) then
    raise exception 'Não existe conta com esse identificador.' using errcode = 'P0002';
  end if;

  insert into public.profiles (id, display_name, role)
  values (p_user, left(trim(p_nome), 120), p_papel);

  insert into public.audit_log (actor_id, actor_type, action, entity_type, entity_id, after)
  values (auth.uid(), 'user', 'perfil.criar', 'profile', p_user::text,
          jsonb_build_object('role', p_papel));

  return jsonb_build_object('id', p_user, 'role', p_papel);
end;
$$;

-- Guarda contra o erro irreversível: ficar sem nenhum administrador activo
-- deixa a organização fora da sua própria base, e só se resolve por SQL.
create or replace function public.definir_papel(
  p_user uuid,
  p_papel public.user_role
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_antes public.user_role;
begin
  perform public.exigir_papel(array['admin']::public.user_role[]);

  select role into v_antes from public.profiles where id = p_user for update;
  if v_antes is null then
    raise exception 'Perfil inexistente.' using errcode = 'P0002';
  end if;

  if v_antes = 'admin' and p_papel <> 'admin'
     and (select count(*) from public.profiles where role = 'admin' and active) <= 1 then
    raise exception 'Não é possível retirar o último administrador activo.' using errcode = '23514';
  end if;

  update public.profiles set role = p_papel where id = p_user;

  insert into public.audit_log (actor_id, actor_type, action, entity_type, entity_id, before, after)
  values (auth.uid(), 'user', 'perfil.definir_papel', 'profile', p_user::text,
          jsonb_build_object('role', v_antes), jsonb_build_object('role', p_papel));

  return jsonb_build_object('id', p_user, 'role', p_papel);
end;
$$;

create or replace function public.definir_perfil_activo(
  p_user uuid,
  p_activo boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  p public.profiles;
begin
  perform public.exigir_papel(array['admin']::public.user_role[]);

  select * into p from public.profiles where id = p_user for update;
  if not found then
    raise exception 'Perfil inexistente.' using errcode = 'P0002';
  end if;

  if p_user = auth.uid() and not p_activo then
    raise exception 'Não é possível desactivar o próprio perfil.' using errcode = '23514';
  end if;

  if p.role = 'admin' and p.active and not p_activo
     and (select count(*) from public.profiles where role = 'admin' and active) <= 1 then
    raise exception 'Não é possível desactivar o último administrador activo.' using errcode = '23514';
  end if;

  update public.profiles set active = p_activo where id = p_user;

  insert into public.audit_log (actor_id, actor_type, action, entity_type, entity_id, before, after)
  values (auth.uid(), 'user', 'perfil.definir_activo', 'profile', p_user::text,
          jsonb_build_object('active', p.active), jsonb_build_object('active', p_activo));

  return jsonb_build_object('id', p_user, 'active', p_activo);
end;
$$;

-- ---------------------------------------------------------------------------
-- Auditoria de entrada
-- ---------------------------------------------------------------------------
-- Só a entrada BEM SUCEDIDA é registada aqui, e a razão é estrutural: uma
-- tentativa falhada não tem sessão, logo não tem `auth.uid()`, e a CHECK de
-- `audit_log` exige actor identificado quando o tipo é `user`. As tentativas
-- falhadas ficam no log estruturado da aplicação, que é onde o alerta
-- operacional vive de qualquer forma.

create or replace function public.registar_entrada(
  p_ip_hash text default null,
  p_ua_hash text default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  perform public.exigir_papel(array['admin', 'comercial', 'leitura']::public.user_role[]);

  insert into public.audit_log (actor_id, actor_type, action, entity_type, entity_id, after, ip_hash)
  values (auth.uid(), 'user', 'sessao.entrar', 'profile', auth.uid()::text,
          jsonb_build_object('user_agent_hash', p_ua_hash), p_ip_hash);
end;
$$;

-- ---------------------------------------------------------------------------
-- Fechar as portas que estas funções tornaram desnecessárias
-- ---------------------------------------------------------------------------
-- Com as funções no lugar, estas políticas deixam de ser precisas — e a sua
-- existência é que é o risco. As funções são `security definer`, correm com os
-- direitos do dono e não dependem de política nenhuma.
--
-- `profiles_admin_write` também sai: permitia a um administrador mudar papéis
-- sem deixar rasto. Agora a única via é `definir_papel`, que audita.

drop policy if exists diagnostics_update on public.diagnostics;
drop policy if exists deals_update on public.deals;
drop policy if exists activities_insert on public.activities;
drop policy if exists profiles_admin_write on public.profiles;

-- ---------------------------------------------------------------------------
-- Direitos
-- ---------------------------------------------------------------------------
-- `create function` concede execução a PUBLIC por omissão. Retirar primeiro,
-- conceder depois, e só a `authenticated`.

do $$
declare
  f text;
begin
  foreach f in array array[
    'public.exigir_papel(public.user_role[])',
    'public.enviar_para_revisao(uuid, integer)',
    'public.aprovar_diagnostico(uuid, integer)',
    'public.rejeitar_diagnostico(uuid, integer, text)',
    'public.mudar_fase_oportunidade(uuid, text, text)',
    'public.atribuir_oportunidade(uuid, uuid)',
    'public.registar_actividade(uuid, text, text)',
    'public.criar_perfil(uuid, text, public.user_role)',
    'public.definir_papel(uuid, public.user_role)',
    'public.definir_perfil_activo(uuid, boolean)',
    'public.registar_entrada(text, text)'
  ] loop
    execute format('revoke all on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end $$;

-- `exigir_papel` é guarda interna das outras; não há razão para ser chamável
-- de fora, mas é inofensiva: devolve o papel de quem já está autenticado.
