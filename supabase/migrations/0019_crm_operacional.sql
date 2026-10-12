-- ============================================================================
-- 0019 — CRM operacional: próxima acção, valor, fecho, motivo de perda
-- ============================================================================
-- O CRM partilhado deixa de ser um registo e passa a dizer o que fazer a
-- seguir. Decisões do fundador (11/10/2026):
--   * cada oportunidade tem valor e moeda (MZN/EUR/BRL/USD), data prevista de
--     fecho e próxima acção com data;
--   * «perdido» exige um motivo de uma lista fechada;
--   * o responsável é manual («Atribuir a mim»); sem distribuição automática;
--   * aprovar um diagnóstico leva a oportunidade de `novo` a `qualificacao`;
--     rejeitá-lo leva-a a `perdido` com motivo `nao_qualificado`.
--
-- O padrão é o de 0006: nenhuma escrita directa; funções `security definer`
-- que verificam o papel, derivam o autor de `auth.uid()` e escrevem a
-- auditoria na mesma transacção. As assinaturas que a aplicação já usa
-- (`mudar_fase_oportunidade`, `registar_actividade`, `aprovar_diagnostico`,
-- `rejeitar_diagnostico`) mantêm-se: muda o corpo, não a chamada.
--
-- Idempotente: pode correr mais do que uma vez.
-- ============================================================================


-- ---------------------------------------------------------------------------
-- Colunas novas em `deals`
-- ---------------------------------------------------------------------------

alter table public.deals
  add column if not exists proxima_accao text
    check (proxima_accao is null or length(trim(proxima_accao)) between 1 and 200),
  add column if not exists valor numeric(14, 2) check (valor is null or valor >= 0),
  add column if not exists moeda text check (moeda is null or moeda in ('MZN', 'EUR', 'BRL', 'USD')),
  add column if not exists data_prevista_fecho date,
  add column if not exists motivo_perda text check (motivo_perda is null or motivo_perda in (
    'preco', 'timing', 'concorrente', 'sem_orcamento', 'sem_decisor', 'nao_qualificado', 'outro')),
  add column if not exists motivo_perda_nota text
    check (motivo_perda_nota is null or length(trim(motivo_perda_nota)) between 1 and 500),
  add column if not exists revisao integer not null default 1 check (revisao >= 1),
  add column if not exists fase_desde timestamptz;

-- Há quanto tempo está nesta fase: para as que já existiam, a última mudança
-- de fase registada na cronologia, ou a criação. Só preenche o que está vazio,
-- por isso repetir a migração não muda nada.
update public.deals d
   set fase_desde = coalesce(
         (select max(a.occurred_at) from public.activities a
           where a.deal_id = d.id and a.activity_type = 'fase'),
         d.created_at)
 where d.fase_desde is null;
alter table public.deals alter column fase_desde set default now();
alter table public.deals alter column fase_desde set not null;

-- Valor sem moeda (ou moeda sem valor) não se soma a nada.
alter table public.deals drop constraint if exists deals_valor_com_moeda;
alter table public.deals
  add constraint deals_valor_com_moeda check ((valor is null) = (moeda is null));

-- Uma próxima acção tem data; uma data sem acção não diz o que fazer.
alter table public.deals drop constraint if exists deals_proxima_accao_com_data;
alter table public.deals
  add constraint deals_proxima_accao_com_data check (proxima_accao is null or next_action_at is not null);

-- O motivo só existe numa oportunidade perdida. (Que «perdido» o exija é
-- garantido pelas funções: as perdidas antes desta migração não o têm.)
alter table public.deals drop constraint if exists deals_motivo_so_se_perdido;
alter table public.deals
  add constraint deals_motivo_so_se_perdido check (motivo_perda is null or stage = 'perdido');

-- A fila de cada pessoa: abertas por responsável e pela próxima data.
create index if not exists deals_abertas_por_dono_idx
  on public.deals (owner_id, next_action_at)
  where stage not in ('ganho', 'perdido');
create index if not exists deals_abertas_por_data_idx
  on public.deals (next_action_at)
  where stage not in ('ganho', 'perdido');

-- `fase_desde` acompanha qualquer mudança de fase, venha de onde vier.
create or replace function public.deals_marca_fase()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if new.stage is distinct from old.stage then
    new.fase_desde := now();
  end if;
  return new;
end;
$$;

drop trigger if exists deals_marca_fase on public.deals;
create trigger deals_marca_fase
  before update of stage on public.deals
  for each row execute function public.deals_marca_fase();


-- ---------------------------------------------------------------------------
-- Próxima acção
-- ---------------------------------------------------------------------------

create or replace function public.definir_proxima_accao(
  p_deal_id uuid,
  p_revisao integer,
  p_accao text,
  p_quando timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
set lock_timeout = '4s'
as $$
declare
  d public.deals;
  v_accao text := nullif(trim(coalesce(p_accao, '')), '');
begin
  perform public.exigir_papel(array['admin', 'comercial']::public.user_role[]);

  -- As duas juntas, ou nenhuma (limpar).
  if (v_accao is null) <> (p_quando is null) then
    raise exception 'A próxima acção precisa de descrição e de data.' using errcode = '22023';
  end if;

  select * into d from public.deals where id = p_deal_id for update;
  if not found then
    raise exception 'Oportunidade inexistente.' using errcode = 'P0002';
  end if;
  if d.revisao <> p_revisao then
    raise exception 'A oportunidade mudou entretanto. Recarregue e volte a tentar.' using errcode = '40001';
  end if;
  if d.stage in ('ganho', 'perdido') and v_accao is not null then
    raise exception 'Uma oportunidade fechada não tem próxima acção.' using errcode = '22023';
  end if;

  update public.deals
     set proxima_accao = left(v_accao, 200), next_action_at = p_quando, revisao = d.revisao + 1
   where id = p_deal_id;

  insert into public.activities (deal_id, activity_type, body, actor_id, actor_type, metadata)
  values (p_deal_id, 'proxima_accao', left(v_accao, 200), auth.uid(), 'user',
          jsonb_build_object('quando', p_quando));

  insert into public.audit_log (actor_id, actor_type, action, entity_type, entity_id, before, after)
  values (auth.uid(), 'user', 'oportunidade.proxima_accao', 'deal', p_deal_id::text,
          jsonb_build_object('next_action_at', d.next_action_at),
          jsonb_build_object('next_action_at', p_quando));

  return jsonb_build_object('id', p_deal_id, 'revisao', d.revisao + 1);
end;
$$;


-- ---------------------------------------------------------------------------
-- Valor, moeda e data prevista de fecho
-- ---------------------------------------------------------------------------

create or replace function public.guardar_oportunidade_crm(
  p_deal_id uuid,
  p_revisao integer,
  p_valor numeric,
  p_moeda text,
  p_data_prevista_fecho date
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

  if (p_valor is null) <> (nullif(trim(coalesce(p_moeda, '')), '') is null) then
    raise exception 'O valor precisa de moeda (e a moeda de valor).' using errcode = '22023';
  end if;

  select * into d from public.deals where id = p_deal_id for update;
  if not found then
    raise exception 'Oportunidade inexistente.' using errcode = 'P0002';
  end if;
  if d.revisao <> p_revisao then
    raise exception 'A oportunidade mudou entretanto. Recarregue e volte a tentar.' using errcode = '40001';
  end if;

  update public.deals
     set valor = p_valor,
         moeda = nullif(trim(coalesce(p_moeda, '')), ''),
         data_prevista_fecho = p_data_prevista_fecho,
         revisao = d.revisao + 1
   where id = p_deal_id;

  insert into public.activities (deal_id, activity_type, actor_id, actor_type, metadata)
  values (p_deal_id, 'dados', auth.uid(), 'user',
          jsonb_build_object('valor', p_valor, 'moeda', p_moeda, 'data_prevista_fecho', p_data_prevista_fecho));

  insert into public.audit_log (actor_id, actor_type, action, entity_type, entity_id, before, after)
  values (auth.uid(), 'user', 'oportunidade.dados', 'deal', p_deal_id::text,
          jsonb_build_object('valor', d.valor, 'moeda', d.moeda, 'data_prevista_fecho', d.data_prevista_fecho),
          jsonb_build_object('valor', p_valor, 'moeda', p_moeda, 'data_prevista_fecho', p_data_prevista_fecho));

  return jsonb_build_object('id', p_deal_id, 'revisao', d.revisao + 1);
end;
$$;


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
