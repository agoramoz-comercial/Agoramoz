-- ============================================================================
-- 0009 — Atribuição: de onde veio cada submissão
-- ============================================================================
-- Até aqui, uma submissão chegava ao CRM sem se saber o que a produziu. A
-- consequência não é analítica, é comercial: não havia forma de responder à
-- única pergunta que decide onde se gasta esforço — que canal traz clientes,
-- e não apenas visitas.
--
-- Três decisões de desenho, e as razões.
--
-- 1. TABELA PRÓPRIA, 1:1 com `responses`, em vez de colunas em `responses` ou
--    de um `jsonb`. Colunas em `responses` nasciam nulas para todas as linhas
--    anteriores e misturavam dois tempos de vida. Um `jsonb` convida a chaves
--    ilimitadas e não se indexa para o filtro que o admin precisa. A chave
--    primária ser `response_id` garante o 1:1 sem gatilho nenhum.
--
-- 2. `utm_limpo` REPETE EM SQL o que `lib/attribution/sanitize.ts` já faz.
--    Não é desconfiança do TypeScript — é a mesma estrutura de duas camadas
--    que as transições de diagnóstico já têm (em `lib/diagnostic/transitions.ts`
--    e num gatilho). A diferença é que esta é a camada que sobrevive a um
--    chamador novo: um script de importação, uma correção à mão, um segundo
--    formulário. Os `check` acompanham, e nunca disparam em tráfego real
--    porque a função sanitiza antes de inserir — um `check` a disparar
--    abortava a transação e custava o lead.
--
-- 3. `drop function` E RECRIAR, em vez de `create or replace`. Uma assinatura
--    diferente não substitui: cria uma SOBRECARGA. Ficariam duas funções com o
--    mesmo nome, o PostgREST não saberia qual chamar, e a antiga continuaria a
--    aceitar submissões sem atribuição em silêncio. O `drop` é explícito e
--    tem de nomear os 16 tipos da assinatura antiga.
--
-- A atribuição NÃO entra em `responses.raw` nem na impressão digital. Se
-- entrasse, a mesma pessoa vinda de duas campanhas produzia dois leads — o
-- defeito que a idempotência de 0005 existe para impedir.
-- ============================================================================


-- ---------------------------------------------------------------------------
-- utm_limpo — a segunda camada
-- ---------------------------------------------------------------------------
-- `immutable` e sem tabelas: pode ser usada num índice e não participa na
-- ordem de criação das migrações.

create or replace function public.utm_limpo(p_valor text)
returns text
language sql
immutable
set search_path = public, pg_catalog
as $$
  select case
    when p_valor is null then null
    when length(btrim(p_valor)) = 0 then null
    -- Recusar, nunca truncar: um valor truncado parece legítimo, agrupa-se com
    -- outra campanha que partilhe o prefixo, e ninguém descobre que o
    -- relatório está errado.
    when length(btrim(p_valor)) > 64 then null
    when lower(btrim(p_valor)) !~ '^[a-z0-9._-]+$' then null
    when lower(btrim(p_valor)) in ('null','undefined','none','nil','not-set','notset','-','_','.') then null
    else lower(btrim(p_valor))
  end;
$$;

revoke all on function public.utm_limpo(text) from public, anon, authenticated;


-- ---------------------------------------------------------------------------
-- response_attribution
-- ---------------------------------------------------------------------------

create table public.response_attribution (
  response_id uuid primary key references public.responses(id) on delete cascade,

  utm_source   text check (utm_source   is null or utm_source   ~ '^[a-z0-9._-]{1,64}$'),
  utm_medium   text check (utm_medium   is null or utm_medium   ~ '^[a-z0-9._-]{1,64}$'),
  utm_campaign text check (utm_campaign is null or utm_campaign ~ '^[a-z0-9._-]{1,64}$'),
  utm_content  text check (utm_content  is null or utm_content  ~ '^[a-z0-9._-]{1,64}$'),

  -- Caminho, nunca URL. A query string é deitada fora antes de chegar aqui: é
  -- onde a informação pessoal aterra, e nenhuma pergunta de negócio precisa
  -- dela. `(privado)` marca um caminho que existe e não deve ser registado —
  -- um documento endereçado por token, por exemplo, cujo token viaja no
  -- caminho e não pode ficar numa tabela lida por toda a equipa.
  landing_page text check (landing_page is null or landing_page ~ '^(/[a-z0-9/_-]{0,119}|\(privado\))$'),

  -- Host, nunca URL completo: o endereço de onde alguém veio pode transportar
  -- a query string DESSE site — o termo pesquisado, um identificador, um
  -- e-mail.
  referrer_host text check (referrer_host is null or referrer_host ~ '^[a-z0-9.-]{1,120}$'),

  first_touch_at timestamptz,
  last_touch_at  timestamptz not null default now(),

  channel text not null default 'desconhecido'
    check (channel in ('gbp','organico','directo','social','referencia','campanha','desconhecido')),

  created_at timestamptz not null default now(),

  constraint atribuicao_ordem_dos_toques
    check (first_touch_at is null or first_touch_at <= last_touch_at)
);

create index response_attribution_canal_idx
  on public.response_attribution (channel, created_at desc);
create index response_attribution_campanha_idx
  on public.response_attribution (utm_campaign) where utm_campaign is not null;

alter table public.response_attribution enable row level security;

create policy response_attribution_select on public.response_attribution
  for select to authenticated using (public.is_staff());


-- ---------------------------------------------------------------------------
-- deals: a origem, projetada para o ecrã que a filtra
-- ---------------------------------------------------------------------------

alter table public.deals
  add column acquisition_channel text not null default 'desconhecido'
    check (acquisition_channel in ('gbp','organico','directo','social','referencia','campanha','desconhecido')),
  add column acquisition_campaign text
    check (acquisition_campaign is null or acquisition_campaign ~ '^[a-z0-9._-]{1,64}$');

create index deals_canal_idx on public.deals (acquisition_channel, created_at desc);
create index deals_campanha_idx on public.deals (acquisition_campaign)
  where acquisition_campaign is not null;

-- A origem de uma oportunidade é um facto histórico. Deixá-la editável
-- convidava a «arrumar» os números depois de a venda fechar, que é a forma
-- mais silenciosa de um relatório comercial deixar de significar alguma coisa.
--
-- Função própria e não `deny_mutation()`: aquela diz «Tabela append-only:
-- UPDATE não é permitido em deals», o que é falso — as oportunidades mudam de
-- fase o tempo todo. Uma mensagem de erro que descreve mal o que aconteceu
-- custa uma hora a quem a encontrar às duas da manhã.
create or replace function public.bloquear_atribuicao_da_oportunidade()
returns trigger
language plpgsql
set search_path = public, pg_catalog
as $$
begin
  raise exception 'A origem de uma oportunidade não se altera (id=%). Canal e campanha são registados na criação.', old.id
    using errcode = '42501';
end;
$$;

revoke all on function public.bloquear_atribuicao_da_oportunidade() from public, anon, authenticated;

create trigger deals_atribuicao_imutavel
  before update of acquisition_channel, acquisition_campaign on public.deals
  for each row execute function public.bloquear_atribuicao_da_oportunidade();


-- ---------------------------------------------------------------------------
-- A função de ingestão, com o 17.º parâmetro
-- ---------------------------------------------------------------------------

drop function if exists public.ingest_diagnostic_response(
  text, jsonb, jsonb, text, text, integer, text, text, text, jsonb, jsonb, text, text, uuid, text, text);

create or replace function public.ingest_diagnostic_response(
  p_questionnaire_slug text,
  p_payload jsonb,
  p_normalized jsonb,
  p_idempotency_key text,
  p_input_fingerprint text,
  p_score integer,
  p_tier text,
  p_ruleset_version text,
  p_scoring_version text,
  p_findings jsonb,
  p_evidence_bundle jsonb,
  p_consent_text text,
  p_consent_version text,
  p_correlation_id uuid default null,
  p_ip_hash text default null,
  p_user_agent_hash text default null,
  p_attribution jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_email          text;
  v_dominio        text;
  v_nome           text;
  v_telefone       text;
  v_empresa        text;
  v_pais           text;
  v_setor          text;
  v_dimensao       text;
  v_versao_id      uuid;
  v_cria_deal      boolean;
  v_contact_id     uuid;
  v_org_id         uuid;
  v_response_id    uuid;
  v_diagnostic_id  uuid;
  v_deal_id        uuid;
  v_existente      public.responses;
  v_publico        boolean;
  v_chave          text;
  v_valor          jsonb;
  v_pos            integer := 0;
  v_atr            jsonb;
  v_canal          text;
  v_campanha       text;
begin
  -- 1. Validação mínima. A validação a sério é do Zod na aplicação; aqui é a
  --    última barreira contra um chamador com bugs.
  if p_idempotency_key is null or p_idempotency_key !~ '^[0-9a-f]{64}$' then
    raise exception 'idempotency_key inválida' using errcode = '22023';
  end if;
  if p_tier not in ('A', 'B', 'C', 'D') then
    raise exception 'tier inválido: %', p_tier using errcode = '22023';
  end if;

  -- 2. Normalização. O e-mail em minúsculas é o que faz a idempotência
  --    funcionar; sem isso «A@x.com» e «a@x.com» seriam pessoas diferentes.
  v_email := lower(trim(p_payload ->> 'workEmail'));
  if v_email is null or position('@' in v_email) < 2 then
    raise exception 'workEmail em falta ou inválido' using errcode = '22023';
  end if;
  v_dominio  := split_part(v_email, '@', 2);
  v_nome     := trim(p_payload ->> 'name');
  v_telefone := trim(p_payload ->> 'phone');
  v_empresa  := trim(p_payload ->> 'company');
  v_pais     := p_payload ->> 'country';
  v_setor    := p_payload ->> 'sector';
  v_dimensao := p_payload ->> 'companySize';

  -- 3. Idempotência. Sai ANTES de escrever seja o que for.
  select * into v_existente from public.responses where idempotency_key = p_idempotency_key;
  if found then
    select id into v_diagnostic_id from public.diagnostics where response_id = v_existente.id;
    select id into v_deal_id from public.deals where source_response_id = v_existente.id;
    select organisation_id into v_org_id from public.contacts where id = v_existente.contact_id;

    return jsonb_build_object(
      'duplicate', true,
      'response_id', v_existente.id,
      'contact_id', v_existente.contact_id,
      'organisation_id', v_org_id,
      'diagnostic_id', v_diagnostic_id,
      'deal_id', v_deal_id,
      'score', p_score,
      'tier', p_tier
    );
  end if;

  -- 4. Versão do questionário. Tem de existir e estar publicada — uma resposta
  --    presa a uma versão que ninguém publicou não é auditável.
  select qv.id, q.creates_deal into v_versao_id, v_cria_deal
  from public.questionnaire_versions qv
  join public.questionnaires q on q.id = qv.questionnaire_id
  where q.slug = p_questionnaire_slug
    and q.active
    and qv.published_at is not null
    and qv.retired_at is null
  order by qv.version desc
  limit 1;

  if v_versao_id is null then
    raise exception 'Nenhuma versão publicada para o questionário "%"', p_questionnaire_slug
      using errcode = '23503';
  end if;

  -- 5. Organização: só com evidência fiável. O domínio do e-mail de trabalho é
  --    a única chave que uso. Domínios de correio pessoal não criam
  --    organização, e nomes nunca fundem. Ver D-11.
  select exists (select 1 from public.public_email_domains where domain = v_dominio)
    into v_publico;

  if not v_publico and v_dominio is not null then
    select id into v_org_id from public.organisations where normalized_domain = v_dominio;

    if v_org_id is null then
      insert into public.organisations (name, normalized_name, domain, normalized_domain,
                                        country_code, sector, size_band)
      values (coalesce(nullif(v_empresa, ''), v_dominio), lower(coalesce(nullif(v_empresa, ''), v_dominio)),
              v_dominio, v_dominio, v_pais, v_setor, v_dimensao)
      returning id into v_org_id;
    end if;
  end if;

  -- 6. Contacto. Upsert pelo e-mail normalizado.
  insert into public.contacts (organisation_id, name, email, normalized_email, phone, role, source)
  values (v_org_id, coalesce(nullif(v_nome, ''), v_email), p_payload ->> 'workEmail', v_email,
          nullif(v_telefone, ''), p_payload ->> 'decisionRole', 'diagnostico')
  on conflict (normalized_email) do update
    set name            = excluded.name,
        phone           = coalesce(excluded.phone, public.contacts.phone),
        -- Não desassocia de uma organização já conhecida por o novo pedido não
        -- a trazer: perder uma associação é mais caro do que não a ganhar.
        organisation_id = coalesce(excluded.organisation_id, public.contacts.organisation_id)
  returning id into v_contact_id;

  -- 7. Consentimento como registo próprio, com o texto e a versão.
  insert into public.consent_records
    (contact_id, purpose, granted, consent_text, consent_version, source, ip_hash, user_agent_hash)
  values
    (v_contact_id, 'diagnostico-comercial', coalesce((p_payload ->> 'consent')::boolean, false),
     p_consent_text, p_consent_version, 'formulario-diagnostico', p_ip_hash, p_user_agent_hash);

  -- 8. Resposta imutável.
  insert into public.responses
    (questionnaire_version_id, contact_id, raw, normalized, idempotency_key,
     input_fingerprint, ip_hash, user_agent_hash)
  values
    (v_versao_id, v_contact_id, p_payload, p_normalized, p_idempotency_key,
     p_input_fingerprint, p_ip_hash, p_user_agent_hash)
  returning id into v_response_id;

  -- 8-bis. Origem da visita que produziu esta resposta.
  --
  --  Grava-se SEMPRE uma linha, mesmo sem atribuição nenhuma. Uma linha com
  --  tudo a nulo e canal `desconhecido` diz «procurámos e não havia»; uma
  --  linha ausente é ambígua, e tornaria inútil o filtro por `desconhecido`
  --  — que é exactamente o número que interessa vigiar, porque mede quanta
  --  origem estamos a perder.
  v_atr      := coalesce(p_attribution, '{}'::jsonb);
  v_campanha := public.utm_limpo(v_atr ->> 'utm_campaign');
  v_canal    := coalesce(nullif(v_atr ->> 'channel', ''), 'desconhecido');
  if v_canal not in ('gbp','organico','directo','social','referencia','campanha','desconhecido') then
    v_canal := 'desconhecido';
  end if;

  insert into public.response_attribution
    (response_id, utm_source, utm_medium, utm_campaign, utm_content,
     landing_page, referrer_host, first_touch_at, last_touch_at, channel)
  values
    (v_response_id,
     public.utm_limpo(v_atr ->> 'utm_source'),
     public.utm_limpo(v_atr ->> 'utm_medium'),
     v_campanha,
     public.utm_limpo(v_atr ->> 'utm_content'),
     nullif(v_atr ->> 'landing_page', ''),
     nullif(v_atr ->> 'referrer', ''),
     nullif(v_atr ->> 'first_touch_at', '')::timestamptz,
     coalesce(nullif(v_atr ->> 'last_touch_at', '')::timestamptz, now()),
     v_canal);

  -- 9. Respostas normalizadas, uma linha por pergunta, para se poder agregar
  --    sem desmontar JSON em cada consulta.
  for v_chave, v_valor in select * from jsonb_each(p_normalized) loop
    insert into public.response_answers (response_id, question_key, value, position)
    values (v_response_id, v_chave, v_valor, v_pos);
    v_pos := v_pos + 1;
  end loop;

  -- 10. Diagnóstico no estado inicial. A pontuação vem calculada por código
  --     versionado; esta função não a recalcula nem a discute.
  insert into public.diagnostics
    (response_id, ruleset_version, scoring_version, findings, evidence_bundle, score, tier, state)
  values
    (v_response_id, p_ruleset_version, p_scoring_version, p_findings, p_evidence_bundle,
     p_score, p_tier, 'computed')
  returning id into v_diagnostic_id;

  -- 11. Oportunidade, se a política do questionário o determinar.
  if v_cria_deal then
    -- A origem é copiada para a oportunidade, e não lida por junção, porque a
    -- lista do pipeline é filtrada por canal e campanha a cada abertura. É uma
    -- projeção indexada, escrita uma vez na mesma transação que escreve a
    -- fonte de verdade — e um gatilho torna «uma vez» um facto, não um
    -- comentário.
    insert into public.deals (organisation_id, contact_id, source_response_id, stage, tier, score,
                              acquisition_channel, acquisition_campaign)
    values (v_org_id, v_contact_id, v_response_id, 'novo', p_tier, p_score,
            v_canal, v_campanha)
    returning id into v_deal_id;
  end if;

  -- 12. Intenção durável de processar. Na MESMA transação — é isto que impede
  --     a perda silenciosa.
  insert into public.outbox_events
    (topic, aggregate_type, aggregate_id, payload, priority, correlation_id)
  values
    ('diagnostic.computed', 'diagnostic', v_diagnostic_id::text,
     jsonb_build_object(
       'diagnostic_id', v_diagnostic_id,
       'response_id', v_response_id,
       'contact_id', v_contact_id,
       'deal_id', v_deal_id,
       'tier', p_tier
     ),
     case p_tier when 'A' then 10 when 'B' then 30 when 'C' then 60 else 90 end,
     p_correlation_id);

  -- 13. Auditoria.
  insert into public.audit_log
    (actor_type, action, entity_type, entity_id, after, correlation_id, ip_hash)
  values
    ('system', 'ingest', 'diagnostic', v_diagnostic_id::text,
     jsonb_build_object('tier', p_tier, 'score', p_score), p_correlation_id, p_ip_hash);

  return jsonb_build_object(
    'duplicate', false,
    'response_id', v_response_id,
    'contact_id', v_contact_id,
    'organisation_id', v_org_id,
    'diagnostic_id', v_diagnostic_id,
    'deal_id', v_deal_id,
    'score', p_score,
    'tier', p_tier
  );
end;
$$;
-- Nem o browser anónimo nem um utilizador autenticado chamam isto. Só o
-- servidor, com a chave de serviço.
revoke all on function public.ingest_diagnostic_response(
  text, jsonb, jsonb, text, text, integer, text, text, text, jsonb, jsonb, text, text, uuid, text, text, jsonb
) from public, anon, authenticated;
