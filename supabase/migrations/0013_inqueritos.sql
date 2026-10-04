-- ============================================================================
-- 0013 — Inquéritos: construtor no admin, links públicos, respostas anónimas
-- ============================================================================
-- A equipa cria inquéritos no /admin (`questionnaires.kind = 'survey'`, que a
-- 0003 já previa), publica-os e partilha-os por link. Quem responde é anónimo
-- por omissão; só deixa contacto se quiser, e com consentimento — só então a
-- resposta toca no CRM (contacto + actividade, NUNCA oportunidade).
--
-- O link público leva um token de 32 bytes derivado no servidor; a base guarda
-- só o SHA-256 (token público nunca em claro). Revogar um link não mexe no
-- inquérito.
--
-- Nada do que existe muda de comportamento: o diagnóstico continua a ter
-- contacto obrigatório (a sua função de ingestão não foi tocada) e todas as
-- actividades existentes têm oportunidade.
--
-- Idempotente: pode correr mais do que uma vez.
-- ============================================================================


-- ---------------------------------------------------------------------------
-- survey_links — os links públicos de cada inquérito
-- ---------------------------------------------------------------------------

create table if not exists public.survey_links (
  id uuid primary key default extensions.gen_random_uuid(),
  questionnaire_id uuid not null references public.questionnaires(id) on delete cascade,
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  rotulo text check (rotulo is null or length(trim(rotulo)) between 1 and 80),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  revoked_at timestamptz,
  max_responses integer check (max_responses is null or max_responses between 1 and 1000000),
  constraint survey_links_revogacao_posterior check (revoked_at is null or revoked_at >= created_at)
);

create index if not exists survey_links_questionario_idx
  on public.survey_links (questionnaire_id, created_at desc);

-- A equipa lê os links — sem o hash, que ninguém precisa de ver. Escrita só
-- pelas funções abaixo. `revoke all` primeiro: o Supabase concede ALL por
-- omissão em tabelas novas de `public`.
alter table public.survey_links enable row level security;
revoke all on public.survey_links from public, anon, authenticated, service_role;
grant select (id, questionnaire_id, rotulo, created_by, created_at, expires_at, revoked_at, max_responses)
  on public.survey_links to authenticated;
drop policy if exists survey_links_select on public.survey_links;
create policy survey_links_select on public.survey_links
  for select to authenticated using (public.is_staff());


-- ---------------------------------------------------------------------------
-- responses — uma resposta de inquérito pode não ter contacto
-- ---------------------------------------------------------------------------
-- A regra passa de «tem contacto» a «tem contacto OU veio de um link de
-- inquérito». O diagnóstico continua a gravar sempre contacto.

alter table public.responses alter column contact_id drop not null;
alter table public.responses
  add column if not exists survey_link_id uuid references public.survey_links(id) on delete restrict;
alter table public.responses drop constraint if exists responses_contacto_ou_link;
alter table public.responses
  add constraint responses_contacto_ou_link check (contact_id is not null or survey_link_id is not null);
create index if not exists responses_link_idx
  on public.responses (survey_link_id, submitted_at desc) where survey_link_id is not null;


-- ---------------------------------------------------------------------------
-- activities — uma actividade pode ser de um contacto sem oportunidade
-- ---------------------------------------------------------------------------

alter table public.activities
  add column if not exists contact_id uuid references public.contacts(id) on delete cascade;
alter table public.activities alter column deal_id drop not null;
alter table public.activities drop constraint if exists activities_deal_ou_contacto;
alter table public.activities
  add constraint activities_deal_ou_contacto check (deal_id is not null or contact_id is not null);
create index if not exists activities_contact_idx
  on public.activities (contact_id, occurred_at desc) where contact_id is not null;


-- ---------------------------------------------------------------------------
-- Um rascunho por questionário
-- ---------------------------------------------------------------------------
-- O rascunho é a versão ainda por publicar. Dois ao mesmo tempo seriam duas
-- verdades sobre o que se vai publicar.

create unique index if not exists questionnaire_versions_um_rascunho
  on public.questionnaire_versions (questionnaire_id) where published_at is null;


-- ---------------------------------------------------------------------------
-- Guarda: só inquéritos
-- ---------------------------------------------------------------------------
-- Todas as funções de edição passam por aqui. O questionário do diagnóstico
-- (`kind = 'diagnostic'`) nunca pode ser editado, publicado ou fechado por
-- este caminho.

create or replace function public.inquerito_para_editar(p_id uuid)
returns public.questionnaires
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  q public.questionnaires;
begin
  select * into q from public.questionnaires where id = p_id for update;
  if not found then
    raise exception 'Inquérito inexistente.' using errcode = 'P0002';
  end if;
  if q.kind <> 'survey' then
    raise exception 'Isto não é um inquérito.' using errcode = '22023';
  end if;
  return q;
end;
$$;

revoke all on function public.inquerito_para_editar(uuid) from public, anon, authenticated;

-- Verificação estrutural do spec. A validação completa é o zod
-- (lib/inqueritos/spec.ts), na Server Action; isto é a rede por baixo, para
-- que nem um pedido directo à RPC grave algo que a página pública não lê.
create or replace function public.spec_de_inquerito_valido(p_spec jsonb)
returns boolean
language sql
immutable
set search_path = public, pg_catalog
as $$
  select jsonb_typeof(p_spec) = 'object'
     and p_spec->>'schemaVersion' = 'survey.v1'
     and jsonb_typeof(p_spec->'perguntas') = 'array'
     and jsonb_array_length(p_spec->'perguntas') between 1 and 50
     and pg_column_size(p_spec) <= 131072
     and not exists (
       select 1 from jsonb_array_elements(p_spec->'perguntas') p
       where jsonb_typeof(p) <> 'object' or coalesce(p->>'chave', '') !~ '^[a-z0-9_]{1,40}$'
     );
$$;

revoke all on function public.spec_de_inquerito_valido(jsonb) from public, anon, authenticated;


-- ---------------------------------------------------------------------------
-- Acções do admin (admin e comercial; auditoria na mesma transacção)
-- ---------------------------------------------------------------------------

create or replace function public.criar_inquerito(p_slug text, p_nome text, p_spec jsonb)
returns uuid
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_id uuid;
begin
  perform public.exigir_papel(array['admin', 'comercial']::public.user_role[]);
  if not public.spec_de_inquerito_valido(p_spec) then
    raise exception 'Inquérito com formato inválido.' using errcode = '22023';
  end if;

  insert into public.questionnaires (slug, name, kind, creates_deal, active)
  values (p_slug, p_nome, 'survey', false, false)
  returning id into v_id;

  insert into public.questionnaire_versions (questionnaire_id, version, spec, schema_version)
  values (v_id, 1, p_spec, 'survey.v1');

  insert into public.audit_log (actor_id, actor_type, action, entity_type, entity_id, after)
  values (auth.uid(), 'user', 'inquerito.criar', 'questionnaire', v_id::text,
          jsonb_build_object('slug', p_slug, 'nome', p_nome));
  return v_id;
end;
$$;

create or replace function public.guardar_rascunho(p_id uuid, p_nome text, p_spec jsonb)
returns integer
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  q public.questionnaires;
  v_versao integer;
begin
  perform public.exigir_papel(array['admin', 'comercial']::public.user_role[]);
  q := public.inquerito_para_editar(p_id);
  if not public.spec_de_inquerito_valido(p_spec) then
    raise exception 'Inquérito com formato inválido.' using errcode = '22023';
  end if;

  update public.questionnaire_versions
     set spec = p_spec
   where questionnaire_id = p_id and published_at is null
  returning version into v_versao;

  if v_versao is null then
    select coalesce(max(version), 0) + 1 into v_versao
      from public.questionnaire_versions where questionnaire_id = p_id;
    insert into public.questionnaire_versions (questionnaire_id, version, spec, schema_version)
    values (p_id, v_versao, p_spec, 'survey.v1');
  end if;

  if p_nome is distinct from q.name then
    update public.questionnaires set name = p_nome where id = p_id;
  end if;

  insert into public.audit_log (actor_id, actor_type, action, entity_type, entity_id, after)
  values (auth.uid(), 'user', 'inquerito.guardar', 'questionnaire', p_id::text,
          jsonb_build_object('versao', v_versao, 'nome', p_nome));
  return v_versao;
end;
$$;

create or replace function public.publicar_versao(p_id uuid)
returns integer
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_versao integer;
begin
  perform public.exigir_papel(array['admin', 'comercial']::public.user_role[]);
  perform public.inquerito_para_editar(p_id);

  select version into v_versao from public.questionnaire_versions
   where questionnaire_id = p_id and published_at is null;
  if v_versao is null then
    raise exception 'Não há alterações por publicar.' using errcode = 'P0002';
  end if;

  -- A anterior deixa de receber respostas no mesmo instante em que a nova
  -- passa a recebê-las. As respostas antigas continuam ligadas à versão que
  -- as pessoas viram.
  update public.questionnaire_versions
     set retired_at = now()
   where questionnaire_id = p_id and published_at is not null and retired_at is null;

  update public.questionnaire_versions
     set published_at = now()
   where questionnaire_id = p_id and version = v_versao;

  update public.questionnaires set active = true where id = p_id;

  insert into public.audit_log (actor_id, actor_type, action, entity_type, entity_id, after)
  values (auth.uid(), 'user', 'inquerito.publicar', 'questionnaire', p_id::text,
          jsonb_build_object('versao', v_versao));
  return v_versao;
end;
$$;

create or replace function public.definir_inquerito_activo(p_id uuid, p_activo boolean)
returns void
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  q public.questionnaires;
begin
  perform public.exigir_papel(array['admin', 'comercial']::public.user_role[]);
  q := public.inquerito_para_editar(p_id);
  if q.active = p_activo then
    return;
  end if;
  update public.questionnaires set active = p_activo where id = p_id;
  insert into public.audit_log (actor_id, actor_type, action, entity_type, entity_id, before, after)
  values (auth.uid(), 'user', case when p_activo then 'inquerito.reabrir' else 'inquerito.fechar' end,
          'questionnaire', p_id::text, jsonb_build_object('activo', q.active), jsonb_build_object('activo', p_activo));
end;
$$;

-- O servidor gera o id do link e deriva dele o token (HMAC com um segredo que
-- só ele tem); aqui chega o id e o hash. Assim o link pode voltar a ser
-- mostrado à equipa sem que o token exista em claro em lado nenhum da base.
create or replace function public.criar_link(
  p_id uuid,
  p_link_id uuid,
  p_token_hash text,
  p_rotulo text,
  p_expira timestamptz,
  p_max integer
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  perform public.exigir_papel(array['admin', 'comercial']::public.user_role[]);
  perform public.inquerito_para_editar(p_id);
  if p_expira is not null and p_expira <= now() then
    raise exception 'A data de expiração já passou.' using errcode = '22023';
  end if;

  insert into public.survey_links (id, questionnaire_id, token_hash, rotulo, created_by, expires_at, max_responses)
  values (p_link_id, p_id, p_token_hash, nullif(trim(p_rotulo), ''), auth.uid(), p_expira, p_max);

  insert into public.audit_log (actor_id, actor_type, action, entity_type, entity_id, after)
  values (auth.uid(), 'user', 'inquerito.link_criar', 'survey_link', p_link_id::text,
          jsonb_build_object('inquerito', p_id, 'expira', p_expira, 'max', p_max));
  return p_link_id;
end;
$$;

create or replace function public.revogar_link(p_link_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  l public.survey_links;
begin
  perform public.exigir_papel(array['admin', 'comercial']::public.user_role[]);
  select * into l from public.survey_links where id = p_link_id for update;
  if not found then
    raise exception 'Link inexistente.' using errcode = 'P0002';
  end if;
  perform public.inquerito_para_editar(l.questionnaire_id);
  if l.revoked_at is not null then
    return;
  end if;
  update public.survey_links set revoked_at = now() where id = p_link_id;
  insert into public.audit_log (actor_id, actor_type, action, entity_type, entity_id)
  values (auth.uid(), 'user', 'inquerito.link_revogar', 'survey_link', p_link_id::text);
end;
$$;

revoke all on function public.criar_inquerito(text, text, jsonb) from public, anon;
revoke all on function public.guardar_rascunho(uuid, text, jsonb) from public, anon;
revoke all on function public.publicar_versao(uuid) from public, anon;
revoke all on function public.definir_inquerito_activo(uuid, boolean) from public, anon;
revoke all on function public.criar_link(uuid, uuid, text, text, timestamptz, integer) from public, anon;
revoke all on function public.revogar_link(uuid) from public, anon;
grant execute on function public.criar_inquerito(text, text, jsonb) to authenticated;
grant execute on function public.guardar_rascunho(uuid, text, jsonb) to authenticated;
grant execute on function public.publicar_versao(uuid) to authenticated;
grant execute on function public.definir_inquerito_activo(uuid, boolean) to authenticated;
grant execute on function public.criar_link(uuid, uuid, text, text, timestamptz, integer) to authenticated;
grant execute on function public.revogar_link(uuid) to authenticated;


-- ---------------------------------------------------------------------------
-- Caminho público (só a chave de serviço, pela rota /api/inqueritos)
-- ---------------------------------------------------------------------------

-- O estado de um link, pela mesma regra em leitura e em escrita.
create or replace function public.estado_do_link(l public.survey_links, q public.questionnaires)
returns text
language sql
stable
set search_path = public, pg_catalog
as $$
  select case
    when l.revoked_at is not null or not q.active then 'fechado'
    when l.expires_at is not null and l.expires_at <= now() then 'expirado'
    when l.max_responses is not null
         and (select count(*) from public.responses r where r.survey_link_id = l.id) >= l.max_responses
      then 'fechado'
    when not exists (select 1 from public.questionnaire_versions v
                     where v.questionnaire_id = q.id and v.published_at is not null and v.retired_at is null)
      then 'fechado'
    else 'aberto'
  end;
$$;

revoke all on function public.estado_do_link(public.survey_links, public.questionnaires) from public, anon, authenticated;

-- O que a página pública precisa: o estado e, se aberto, o spec publicado.
-- Nada sobre quem criou, quantas respostas há, ou outros links.
create or replace function public.obter_inquerito_publico(p_token_hash text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_catalog
as $$
declare
  l public.survey_links;
  q public.questionnaires;
  v public.questionnaire_versions;
  v_estado text;
begin
  if p_token_hash is null or p_token_hash !~ '^[0-9a-f]{64}$' then
    return jsonb_build_object('estado', 'inexistente');
  end if;
  select * into l from public.survey_links where token_hash = p_token_hash;
  if not found then
    return jsonb_build_object('estado', 'inexistente');
  end if;
  select * into q from public.questionnaires where id = l.questionnaire_id;
  if q.kind <> 'survey' then
    return jsonb_build_object('estado', 'inexistente');
  end if;

  v_estado := public.estado_do_link(l, q);
  if v_estado <> 'aberto' then
    return jsonb_build_object('estado', v_estado);
  end if;

  select * into v from public.questionnaire_versions
   where questionnaire_id = q.id and published_at is not null and retired_at is null
   order by version desc limit 1;
  return jsonb_build_object('estado', 'aberto', 'inquerito', q.id, 'versao', v.version, 'spec', v.spec);
end;
$$;

revoke all on function public.obter_inquerito_publico(text) from public, anon, authenticated;
grant execute on function public.obter_inquerito_publico(text) to service_role;

-- Grava uma resposta. A rota já validou tudo contra o spec (zod); esta função
-- revalida o que só a base sabe (estado do link, versão publicada, chaves do
-- spec) e grava numa transacção.
--
--  - Idempotente pela chave (derivada no servidor de um id por submissão): uma
--    repetição devolve `duplicado` e não escreve nada.
--  - Contacto só com email e consentimento dado. Um contacto que já existe
--    NUNCA é alterado por uma resposta pública: um desconhecido não reescreve
--    o CRM.
--  - Sem atribuição: o caminho do link é privado, e a resposta não conta como
--    lead do funil.
create or replace function public.ingest_survey_response(
  p_token_hash text,
  p_respostas jsonb,
  p_idempotency_key text,
  p_fingerprint text,
  p_contacto jsonb,
  p_consentimento_versao text,
  p_ip_hash text,
  p_ua_hash text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  l public.survey_links;
  q public.questionnaires;
  v public.questionnaire_versions;
  v_estado text;
  v_contact uuid;
  v_email text;
  v_texto text;
  v_response uuid;
  v_desconhecidas int;
begin
  if p_idempotency_key !~ '^[0-9a-f]{64}$' or p_fingerprint !~ '^[0-9a-f]{64}$' then
    raise exception 'Chaves inválidas.' using errcode = '22023';
  end if;
  if jsonb_typeof(p_respostas) <> 'object' then
    raise exception 'Respostas inválidas.' using errcode = '22023';
  end if;

  if exists (select 1 from public.responses where idempotency_key = p_idempotency_key) then
    return jsonb_build_object('ok', true, 'duplicado', true);
  end if;

  -- O link bloqueado serializa as respostas desse link: o tecto de respostas
  -- não é ultrapassado por duas submissões ao mesmo tempo.
  select * into l from public.survey_links where token_hash = p_token_hash for update;
  if not found then
    return jsonb_build_object('ok', false, 'estado', 'inexistente');
  end if;
  select * into q from public.questionnaires where id = l.questionnaire_id;
  if q.kind <> 'survey' then
    return jsonb_build_object('ok', false, 'estado', 'inexistente');
  end if;
  v_estado := public.estado_do_link(l, q);
  if v_estado <> 'aberto' then
    return jsonb_build_object('ok', false, 'estado', v_estado);
  end if;

  select * into v from public.questionnaire_versions
   where questionnaire_id = q.id and published_at is not null and retired_at is null
   order by version desc limit 1;

  select count(*) into v_desconhecidas
    from jsonb_object_keys(p_respostas) k
   where not exists (
     select 1 from jsonb_array_elements(v.spec->'perguntas') p
     where p->>'chave' = k and p->>'tipo' <> 'seccao'
   );
  if v_desconhecidas > 0 then
    raise exception 'Respostas a perguntas que o inquérito não tem.' using errcode = '22023';
  end if;

  -- Contacto: só com email E consentimento, e só se o inquérito o pede.
  v_email := lower(trim(coalesce(p_contacto->>'email', '')));
  v_texto := v.spec->'contacto'->>'textoConsentimento';
  if v_email <> '' and (p_contacto->>'consentimento')::boolean is true and v_texto is not null then
    if position('@' in v_email) <= 1 or length(v_email) > 254 then
      raise exception 'Email inválido.' using errcode = '22023';
    end if;
    insert into public.contacts (name, email, normalized_email, phone, source)
    values (left(coalesce(nullif(trim(p_contacto->>'nome'), ''), v_email), 200), v_email, v_email,
            nullif(trim(coalesce(p_contacto->>'telefone', '')), ''), 'inquerito')
    on conflict (normalized_email) do nothing
    returning id into v_contact;
    if v_contact is null then
      select id into v_contact from public.contacts where normalized_email = v_email;
    end if;

    insert into public.consent_records
      (contact_id, purpose, granted, consent_text, consent_version, source, ip_hash, user_agent_hash)
    values (v_contact, 'inquerito', true, v_texto, left(p_consentimento_versao, 40), 'inquerito', p_ip_hash, p_ua_hash);
  end if;

  begin
    insert into public.responses
      (questionnaire_version_id, contact_id, survey_link_id, raw, normalized,
       idempotency_key, input_fingerprint, ip_hash, user_agent_hash)
    values (v.id, v_contact, l.id, p_respostas, p_respostas,
            p_idempotency_key, p_fingerprint, p_ip_hash, p_ua_hash)
    returning id into v_response;
  exception when unique_violation then
    -- Duas entregas da mesma submissão ao mesmo tempo: a segunda é a repetição.
    return jsonb_build_object('ok', true, 'duplicado', true);
  end;

  insert into public.response_answers (response_id, question_key, value, position)
  select v_response, r.key, r.value, (p.ord - 1)::int
    from jsonb_array_elements(v.spec->'perguntas') with ordinality as p(q, ord)
    join jsonb_each(p_respostas) as r on r.key = p.q->>'chave';

  if v_contact is not null then
    insert into public.activities (contact_id, activity_type, actor_type, metadata)
    values (v_contact, 'inquerito_respondido', 'system',
            jsonb_strip_nulls(jsonb_build_object(
              'inquerito', q.id, 'resposta', v_response,
              'organizacao', left(nullif(trim(coalesce(p_contacto->>'organizacao', '')), ''), 160))));
  end if;

  insert into public.analytics_events (name, channel, origin, props)
  values ('survey_submitted', 'desconhecido', 'servidor', jsonb_build_object('surveyId', q.id));

  insert into public.audit_log (actor_type, action, entity_type, entity_id, after)
  values ('system', 'inquerito.resposta', 'response', v_response::text,
          jsonb_build_object('inquerito', q.id, 'versao', v.version, 'com_contacto', v_contact is not null));

  return jsonb_build_object('ok', true, 'duplicado', false);
end;
$$;

revoke all on function public.ingest_survey_response(text, jsonb, text, text, jsonb, text, text, text)
  from public, anon, authenticated;
grant execute on function public.ingest_survey_response(text, jsonb, text, text, jsonb, text, text, text)
  to service_role;


-- ---------------------------------------------------------------------------
-- Resultados — agregados, lidos pela sessão da equipa (a RLS aplica-se)
-- ---------------------------------------------------------------------------
-- Agregar aqui e não no servidor da aplicação: o PostgREST corta leituras em
-- `max_rows` sem avisar, e um resultado calculado sobre as primeiras mil
-- respostas seria um número errado com cara de certo.

create or replace function public.resultados_inquerito(p_id uuid)
returns jsonb
language plpgsql
stable
security invoker
set search_path = public, pg_catalog
as $$
declare
  v_spec jsonb;
  v_total int;
  v_por_pergunta jsonb;
begin
  if not public.is_staff() then
    raise exception 'Sem acesso.' using errcode = '42501';
  end if;

  select spec into v_spec from public.questionnaire_versions
   where questionnaire_id = p_id
   order by (published_at is null), version desc limit 1;

  select count(*) into v_total
    from public.responses r join public.questionnaire_versions qv on qv.id = r.questionnaire_version_id
   where qv.questionnaire_id = p_id;

  with respostas as (
    select a.question_key, a.value
      from public.response_answers a
      join public.responses r on r.id = a.response_id
      join public.questionnaire_versions qv on qv.id = r.questionnaire_version_id
     where qv.questionnaire_id = p_id
  ),
  tipos as (
    select p->>'chave' as chave, p->>'tipo' as tipo
      from jsonb_array_elements(coalesce(v_spec->'perguntas', '[]'::jsonb)) p
  ),
  contagens as (
    -- Escolha única, avaliação e NPS: uma contagem por valor.
    select r.question_key, r.value #>> '{}' as valor, count(*)::int as n
      from respostas r join tipos t on t.chave = r.question_key
     where t.tipo in ('escolha_unica', 'avaliacao', 'nps')
     group by 1, 2
    union all
    -- Escolha múltipla: cada opção escolhida conta.
    select r.question_key, e.valor, count(*)::int
      from respostas r join tipos t on t.chave = r.question_key
      cross join lateral jsonb_array_elements_text(r.value) as e(valor)
     where t.tipo = 'escolha_multipla' and jsonb_typeof(r.value) = 'array'
     group by 1, 2
  ),
  por_pergunta as (
    select t.chave,
           jsonb_build_object(
             'respondidas', (select count(*) from respostas r where r.question_key = t.chave),
             'valores', coalesce((select jsonb_object_agg(c.valor, c.n) from contagens c where c.question_key = t.chave),
                                 '{}'::jsonb),
             'media', case when t.tipo in ('numero', 'avaliacao', 'nps')
                           then (select round(avg((r.value #>> '{}')::numeric), 2) from respostas r
                                  where r.question_key = t.chave and jsonb_typeof(r.value) = 'number')
                      end
           ) as dados
      from tipos t
     where t.tipo <> 'seccao'
  )
  select coalesce(jsonb_object_agg(chave, dados), '{}'::jsonb) into v_por_pergunta from por_pergunta;

  return jsonb_build_object('total', v_total, 'porPergunta', v_por_pergunta);
end;
$$;

revoke all on function public.resultados_inquerito(uuid) from public, anon;
grant execute on function public.resultados_inquerito(uuid) to authenticated;
