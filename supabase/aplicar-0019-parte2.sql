
-- APLICAR NO SQL EDITOR DO SUPABASE — projecto nixltrbdplqjadfytryd
-- 0019 em DUAS PARTES — PARTE 2 de 2: perda com motivo, fases, actividades, diagnóstico e pesquisa
-- Só DEPOIS da parte 1. Repetível.
-- 1. No GitHub, botão «Copy raw file» (ou Raw, Ctrl+A, Ctrl+C).
-- 2. SQL Editor: consulta NOVA e vazia, colar, Run. Esperado: «Success».
-- 3. Depois, verificar-estado.sql: a linha 31 tem de dizer «ok».
-- ===== fim do cabeçalho: daqui para baixo é a migração 0019, sem alterações =====
-- ---------------------------------------------------------------------------
-- Perder com motivo
-- ---------------------------------------------------------------------------

create or replace function public.marcar_perdida(
  p_deal_id uuid,
  p_motivo text,
  p_nota text default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
set lock_timeout = '4s'
as $$
declare
  d public.deals;
  v_nota text := nullif(trim(coalesce(p_nota, '')), '');
begin
  perform public.exigir_papel(array['admin', 'comercial']::public.user_role[]);

  if p_motivo is null or p_motivo not in (
       'preco', 'timing', 'concorrente', 'sem_orcamento', 'sem_decisor', 'nao_qualificado', 'outro') then
    raise exception 'Indique o motivo da perda.' using errcode = '22023';
  end if;
  -- «Outro» sem explicação não ensina nada a quem analisar as perdas.
  if p_motivo = 'outro' and v_nota is null then
    raise exception 'Com o motivo «outro», escreva qual foi.' using errcode = '22023';
  end if;

  select * into d from public.deals where id = p_deal_id for update;
  if not found then
    raise exception 'Oportunidade inexistente.' using errcode = 'P0002';
  end if;
  if d.stage = 'perdido' then
    return jsonb_build_object('id', p_deal_id, 'stage', d.stage, 'changed', false);
  end if;

  update public.deals
     set stage = 'perdido', motivo_perda = p_motivo, motivo_perda_nota = left(v_nota, 500),
         proxima_accao = null, next_action_at = null, revisao = d.revisao + 1
   where id = p_deal_id;

  insert into public.activities (deal_id, activity_type, body, actor_id, actor_type, metadata)
  values (p_deal_id, 'fase', left(v_nota, 500), auth.uid(), 'user',
          jsonb_build_object('de', d.stage, 'para', 'perdido', 'motivo', p_motivo));

  insert into public.audit_log (actor_id, actor_type, action, entity_type, entity_id, before, after)
  values (auth.uid(), 'user', 'oportunidade.perdida', 'deal', p_deal_id::text,
          jsonb_build_object('stage', d.stage),
          jsonb_build_object('stage', 'perdido', 'motivo', p_motivo));

  return jsonb_build_object('id', p_deal_id, 'stage', 'perdido', 'changed', true);
end;
$$;


-- ---------------------------------------------------------------------------
-- Mudar de fase (mesma assinatura de 0006): «perdido» passa por marcar_perdida
-- ---------------------------------------------------------------------------

create or replace function public.mudar_fase_oportunidade(
  p_deal_id uuid,
  p_fase text,
  p_nota text default null
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

  if p_fase = 'perdido' then
    raise exception 'Para marcar como perdida, indique o motivo.' using errcode = '22023';
  end if;

  select * into d from public.deals where id = p_deal_id for update;
  if not found then
    raise exception 'Oportunidade inexistente.' using errcode = 'P0002';
  end if;

  if p_fase = d.stage then
    return jsonb_build_object('id', p_deal_id, 'stage', d.stage, 'changed', false);
  end if;

  -- Sair de «perdido» (reabrir) apaga o motivo; fechar como ganho limpa a
  -- próxima acção, que deixou de fazer sentido.
  update public.deals
     set stage = p_fase,
         motivo_perda = null,
         motivo_perda_nota = null,
         proxima_accao = case when p_fase = 'ganho' then null else proxima_accao end,
         next_action_at = case when p_fase = 'ganho' then null else next_action_at end,
         revisao = d.revisao + 1
   where id = p_deal_id;

  insert into public.activities (deal_id, activity_type, body, actor_id, actor_type, metadata)
  values (p_deal_id, 'fase', nullif(trim(coalesce(p_nota, '')), ''), auth.uid(), 'user',
          jsonb_build_object('de', d.stage, 'para', p_fase));

  insert into public.audit_log (actor_id, actor_type, action, entity_type, entity_id, before, after)
  values (auth.uid(), 'user', 'oportunidade.mudar_fase', 'deal', p_deal_id::text,
          jsonb_build_object('stage', d.stage), jsonb_build_object('stage', p_fase));

  return jsonb_build_object('id', p_deal_id, 'stage', p_fase, 'changed', true);
end;
$$;


-- ---------------------------------------------------------------------------
-- Actividade com tipo (mesma assinatura): agora também na auditoria
-- ---------------------------------------------------------------------------

create or replace function public.registar_actividade(
  p_deal_id uuid,
  p_tipo text,
  p_corpo text
)
returns bigint
language plpgsql
security definer
set search_path = pg_catalog, public
set lock_timeout = '4s'
as $$
declare
  v_id bigint;
  v_tipo text := coalesce(nullif(trim(p_tipo), ''), 'nota');
begin
  perform public.exigir_papel(array['admin', 'comercial']::public.user_role[]);

  if v_tipo not in ('nota', 'chamada', 'email', 'reuniao') then
    raise exception 'Tipo de actividade desconhecido.' using errcode = '22023';
  end if;
  if p_corpo is null or length(trim(p_corpo)) = 0 then
    raise exception 'Uma nota vazia não é uma nota.' using errcode = '22023';
  end if;
  if not exists (select 1 from public.deals where id = p_deal_id) then
    raise exception 'Oportunidade inexistente.' using errcode = 'P0002';
  end if;

  insert into public.activities (deal_id, activity_type, body, actor_id, actor_type)
  values (p_deal_id, v_tipo, left(trim(p_corpo), 4000), auth.uid(), 'user')
  returning id into v_id;

  -- Em 0006 esta era a única escrita sem auditoria. O conteúdo fica na
  -- cronologia; a auditoria regista quem, o quê e quando.
  insert into public.audit_log (actor_id, actor_type, action, entity_type, entity_id, before, after)
  values (auth.uid(), 'user', 'oportunidade.actividade', 'deal', p_deal_id::text,
          null, jsonb_build_object('tipo', v_tipo, 'actividade', v_id));

  return v_id;
end;
$$;


-- ---------------------------------------------------------------------------
-- Diagnóstico → oportunidade (mesmas assinaturas de 0006)
-- ---------------------------------------------------------------------------
-- A oportunidade da resposta só se move se ainda estiver em `novo`: uma fase
-- posterior foi decidida por uma pessoa e não regride por um clique noutro
-- ecrã.

create or replace function public.aprovar_diagnostico(
  p_id uuid,
  p_revision integer
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
set lock_timeout = '4s'
as $$
declare
  d public.diagnostics;
  v_deal uuid;
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

  update public.deals
     set stage = 'qualificacao', revisao = revisao + 1
   where source_response_id = d.response_id and stage = 'novo'
  returning id into v_deal;

  if v_deal is not null then
    insert into public.activities (deal_id, activity_type, actor_id, actor_type, metadata)
    values (v_deal, 'fase', auth.uid(), 'user',
            jsonb_build_object('de', 'novo', 'para', 'qualificacao', 'origem', 'diagnostico_aprovado'));
    insert into public.audit_log (actor_id, actor_type, action, entity_type, entity_id, before, after)
    values (auth.uid(), 'user', 'oportunidade.mudar_fase', 'deal', v_deal::text,
            jsonb_build_object('stage', 'novo'), jsonb_build_object('stage', 'qualificacao'));
  end if;

  return jsonb_build_object('id', p_id, 'state', 'approved', 'deal', v_deal);
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
set search_path = pg_catalog, public
set lock_timeout = '4s'
as $$
declare
  d public.diagnostics;
  v_deal uuid;
begin
  perform public.exigir_papel(array['admin', 'comercial']::public.user_role[]);

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

  update public.deals
     set stage = 'perdido', motivo_perda = 'nao_qualificado',
         motivo_perda_nota = left(trim(p_motivo), 500),
         proxima_accao = null, next_action_at = null, revisao = revisao + 1
   where source_response_id = d.response_id and stage = 'novo'
  returning id into v_deal;

  if v_deal is not null then
    insert into public.activities (deal_id, activity_type, body, actor_id, actor_type, metadata)
    values (v_deal, 'fase', left(trim(p_motivo), 500), auth.uid(), 'user',
            jsonb_build_object('de', 'novo', 'para', 'perdido', 'motivo', 'nao_qualificado',
                               'origem', 'diagnostico_rejeitado'));
    insert into public.audit_log (actor_id, actor_type, action, entity_type, entity_id, before, after)
    values (auth.uid(), 'user', 'oportunidade.perdida', 'deal', v_deal::text,
            jsonb_build_object('stage', 'novo'),
            jsonb_build_object('stage', 'perdido', 'motivo', 'nao_qualificado'));
  end if;

  return jsonb_build_object('id', p_id, 'state', 'rejected', 'deal', v_deal);
end;
$$;


-- ---------------------------------------------------------------------------
-- Pesquisa global (leitura; sujeita à RLS de quem pesquisa)
-- ---------------------------------------------------------------------------
-- `security invoker`: a função não vê mais do que a pessoa veria nas listas.
-- Os curingas do LIKE (% e _) que vierem no texto são tratados como letras.

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
    'public.mudar_fase_oportunidade(uuid, text, text)',
    'public.registar_actividade(uuid, text, text)',
    'public.aprovar_diagnostico(uuid, integer)',
    'public.rejeitar_diagnostico(uuid, integer, text)',
    'public.pesquisar_global(text)'
  ] loop
    execute format('revoke all on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
  -- O gatilho não é chamável de fora.
  execute 'revoke all on function public.deals_marca_fase() from public, anon, authenticated';
end $$;

notify pgrst, 'reload schema';
