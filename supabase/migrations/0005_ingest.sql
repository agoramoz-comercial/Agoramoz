-- ============================================================================
-- 0005 — Ingestão transacional
-- ============================================================================
-- Uma submissão válida grava tudo ou não grava nada. O pedido público termina
-- no COMMIT desta função; nada externo é chamado antes disso.
--
-- Idempotente por construção: a mesma `idempotency_key` devolve o mesmo
-- resultado observável, sem criar um segundo lead. É o que torna seguro um
-- cliente carregar duas vezes em «enviar» ou a rede repetir um pedido.
-- ============================================================================

-- Domínios de correio pessoal. Um contacto com e-mail nestes domínios NÃO cria
-- organização: senão «gmail.com» tornar-se-ia uma organização com dezenas de
-- contactos sem relação nenhuma entre si, e o CRM passava a mentir.
create table public.public_email_domains (
  domain text primary key check (domain = lower(domain))
);

insert into public.public_email_domains (domain) values
  ('gmail.com'), ('googlemail.com'), ('outlook.com'), ('hotmail.com'),
  ('hotmail.co.uk'), ('live.com'), ('msn.com'), ('yahoo.com'), ('yahoo.co.uk'),
  ('yahoo.com.br'), ('icloud.com'), ('me.com'), ('aol.com'), ('proton.me'),
  ('protonmail.com'), ('gmx.com'), ('zoho.com'), ('mail.com'), ('yandex.com'),
  ('tvcabo.co.mz'), ('teledata.mz'), ('sapo.pt'), ('clix.pt'), ('netcabo.pt'),
  ('bol.com.br'), ('uol.com.br'), ('terra.com.br'), ('ig.com.br');

alter table public.public_email_domains enable row level security;
create policy public_email_domains_select on public.public_email_domains
  for select to authenticated using (public.is_staff());

-- ---------------------------------------------------------------------------

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
  p_user_agent_hash text default null
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
    insert into public.deals (organisation_id, contact_id, source_response_id, stage, tier, score)
    values (v_org_id, v_contact_id, v_response_id, 'novo', p_tier, p_score)
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
  text, jsonb, jsonb, text, text, integer, text, text, text, jsonb, jsonb, text, text, uuid, text, text
) from public, anon, authenticated;
