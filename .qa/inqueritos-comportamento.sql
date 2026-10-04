-- ============================================================================
-- QA da 0013 — inquéritos: acções do admin, caminho público, direitos.
-- Postgres local descartável (NUNCA em produção):
--
--   psql … -v ON_ERROR_STOP=1 -f .qa/inqueritos-comportamento.sql
--
-- Cada bloco levanta excepção se o comportamento não for o esperado. Dados
-- sintéticos; a transacção é desfeita no fim.
-- ============================================================================

begin;

-- Pessoas: uma admin, uma só de leitura, e uma sessão sem perfil.
insert into auth.users (id) values
  ('00000000-0000-0000-0000-00000000aa01'),
  ('00000000-0000-0000-0000-00000000aa02'),
  ('00000000-0000-0000-0000-00000000aa03');
insert into public.profiles (id, role, display_name) values
  ('00000000-0000-0000-0000-00000000aa01', 'admin', 'QA Admin'),
  ('00000000-0000-0000-0000-00000000aa02', 'leitura', 'QA Leitura');

-- Um contacto que já existe no CRM (veio do diagnóstico).
insert into public.contacts (id, name, email, normalized_email, phone)
values ('00000000-0000-0000-0000-0000000000c9', 'Nome Original', 'existente@exemplo.test',
        'existente@exemplo.test', '+258 21 000 000');

create temporary table qa (chave text primary key, valor text);
grant all on qa to public;

create function pg_temp.qa_spec(p_titulo text) returns jsonb language sql as $$
  select jsonb_build_object(
    'schemaVersion', 'survey.v1', 'idioma', 'pt',
    'boasVindas', jsonb_build_object('titulo', 'Olá'),
    'agradecimento', jsonb_build_object('titulo', 'Obrigado'),
    'perguntas', jsonb_build_array(
      jsonb_build_object('tipo', 'escolha_unica', 'chave', 'p1', 'titulo', p_titulo, 'obrigatoria', true,
        'opcoes', jsonb_build_array(jsonb_build_object('chave', 'sim', 'rotulo', 'Sim'),
                                    jsonb_build_object('chave', 'nao', 'rotulo', 'Não'))),
      jsonb_build_object('tipo', 'nps', 'chave', 'p2', 'titulo', 'Recomendaria?', 'obrigatoria', false),
      jsonb_build_object('tipo', 'escolha_multipla', 'chave', 'p3', 'titulo', 'Áreas', 'obrigatoria', false,
        'opcoes', jsonb_build_array(jsonb_build_object('chave', 'rh', 'rotulo', 'RH'),
                                    jsonb_build_object('chave', 'vendas', 'rotulo', 'Vendas'))),
      jsonb_build_object('tipo', 'seccao', 'chave', 's1', 'titulo', 'Fim')),
    'contacto', jsonb_build_object('campos', jsonb_build_array('nome', 'email', 'telefone'),
                                   'textoConsentimento', 'Aceito ser contactado pela AGORAMOZ.'));
$$;

-- ---------------------------------------------------------------------------
-- A. Acções do admin
-- ---------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000aa01', true);

do $$
declare v_id uuid; v int; n int;
begin
  -- 1. Criar: questionário `survey`, fechado, com rascunho v1.
  v_id := public.criar_inquerito('qa-inquerito', 'Inquérito QA', pg_temp.qa_spec('Usa ERP?'));
  insert into qa values ('inquerito', v_id::text);
  if (select kind || '/' || active::text from public.questionnaires where id = v_id) <> 'survey/false' then
    raise exception '1: questionário mal criado';
  end if;
  if (select count(*) from public.questionnaire_versions where questionnaire_id = v_id and published_at is null) <> 1 then
    raise exception '1: sem rascunho';
  end if;

  -- 2. Guardar sobre o rascunho não cria versão nova.
  v := public.guardar_rascunho(v_id, 'Inquérito QA (rev)', pg_temp.qa_spec('Usa um ERP?'));
  if v <> 1 then raise exception '2: versão %', v; end if;

  -- 3. Publicar abre o inquérito.
  v := public.publicar_versao(v_id);
  if v <> 1 or not (select active from public.questionnaires where id = v_id) then
    raise exception '3: publicação';
  end if;

  -- 4. Guardar depois de publicado cria a v2; publicar retira a v1.
  v := public.guardar_rascunho(v_id, 'Inquérito QA (rev)', pg_temp.qa_spec('Usa algum ERP?'));
  if v <> 2 then raise exception '4: rascunho novo devia ser v2, é %', v; end if;
  perform public.publicar_versao(v_id);
  select count(*) into n from public.questionnaire_versions
   where questionnaire_id = v_id and published_at is not null and retired_at is null;
  if n <> 1 then raise exception '4: % versões activas', n; end if;
  if (select retired_at from public.questionnaire_versions where questionnaire_id = v_id and version = 1) is null then
    raise exception '4: v1 não foi retirada';
  end if;

  -- 5. Publicar sem rascunho é recusado.
  begin
    perform public.publicar_versao(v_id);
    raise exception '5: publicou sem rascunho';
  exception when no_data_found then null;
  end;

  -- 6. Links: um sem tecto, um com tecto 1.
  perform public.criar_link(v_id, '00000000-0000-0000-0000-0000000001a1', repeat('a', 64), 'Evento', null, null);
  perform public.criar_link(v_id, '00000000-0000-0000-0000-0000000001a2', repeat('b', 64), null, null, 1);
  begin
    perform public.criar_link(v_id, gen_random_uuid(), repeat('c', 64), null, now() - interval '1 day', null);
    raise exception '6: aceitou expiração no passado';
  exception when invalid_parameter_value then null;
  end;

  -- 7. Formato inválido recusado na base, mesmo por pedido directo.
  begin
    perform public.guardar_rascunho(v_id, 'x', '{"schemaVersion":"outra"}'::jsonb);
    raise exception '7: aceitou spec inválido';
  exception when invalid_parameter_value then null;
  end;

  -- 8. O diagnóstico nunca é mexido por este caminho.
  begin
    perform public.definir_inquerito_activo(
      (select id from public.questionnaires where kind = 'diagnostic' limit 1), false);
    raise exception '8: fechou o diagnóstico';
  exception when invalid_parameter_value then null;
  end;

  -- 9. Auditoria na mesma transacção.
  select count(*) into n from public.audit_log where action like 'inquerito.%';
  if n < 7 then raise exception '9: auditoria com % linhas', n; end if;
end $$;

-- 10. Quem só lê não edita.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000aa02', true);
do $$ begin
  perform public.criar_inquerito('qa-leitura', 'x', pg_temp.qa_spec('x'));
  raise exception '10: leitura criou inquérito';
exception when insufficient_privilege then null; end $$;
do $$ begin
  perform public.revogar_link('00000000-0000-0000-0000-0000000001a1');
  raise exception '10: leitura revogou link';
exception when insufficient_privilege then null; end $$;
-- …mas vê os links, sem o hash.
do $$ declare n int; begin
  select count(*) into n from public.survey_links;
  if n <> 2 then raise exception '10: leitura viu % links', n; end if;
end $$;
do $$ begin
  perform token_hash from public.survey_links;
  raise exception '10: a equipa leu o token_hash';
exception when insufficient_privilege then null; end $$;
reset role;

-- ---------------------------------------------------------------------------
-- B. Caminho público (chave de serviço)
-- ---------------------------------------------------------------------------
set local role service_role;

do $$
declare r jsonb; n int; v_resp uuid; v_contact uuid;
begin
  -- 11. Ler o inquérito aberto: a v2.
  r := public.obter_inquerito_publico(repeat('a', 64));
  if r->>'estado' <> 'aberto' or (r->>'versao')::int <> 2 or r->'spec'->'perguntas'->0->>'titulo' <> 'Usa algum ERP?' then
    raise exception '11: %', r;
  end if;
  if public.obter_inquerito_publico('xyz')->>'estado' <> 'inexistente'
     or public.obter_inquerito_publico(repeat('f', 64))->>'estado' <> 'inexistente' then
    raise exception '11: hash inválido ou desconhecido não deu inexistente';
  end if;

  -- 12. Resposta anónima.
  r := public.ingest_survey_response(repeat('a', 64), '{"p1":"sim","p2":9,"p3":["rh","vendas"]}',
                                     repeat('1', 64), repeat('2', 64), null, null, null, null);
  if not (r->>'ok')::boolean or (r->>'duplicado')::boolean then raise exception '12: %', r; end if;
  select id, contact_id into v_resp, v_contact from public.responses where idempotency_key = repeat('1', 64);
  if v_contact is not null then raise exception '12: anónima ficou com contacto'; end if;
  if (select survey_link_id from public.responses where id = v_resp) <> '00000000-0000-0000-0000-0000000001a1' then
    raise exception '12: sem link';
  end if;
  if (select string_agg(question_key || ':' || position, ',' order by position) from public.response_answers
      where response_id = v_resp) <> 'p1:0,p2:1,p3:2' then
    raise exception '12: respostas mal gravadas';
  end if;
  if not exists (select 1 from public.analytics_events where name = 'survey_submitted' and origin = 'servidor') then
    raise exception '12: sem evento survey_submitted';
  end if;
  if exists (select 1 from public.response_attribution where response_id = v_resp) then
    raise exception '12: atribuição gravada (não devia: não é lead)';
  end if;

  -- 13. A mesma submissão outra vez: nada duplica.
  r := public.ingest_survey_response(repeat('a', 64), '{"p1":"sim"}', repeat('1', 64), repeat('2', 64),
                                     null, null, null, null);
  if not (r->>'duplicado')::boolean then raise exception '13: repetição não detectada'; end if;
  select count(*) into n from public.responses where survey_link_id is not null;
  if n <> 1 then raise exception '13: % respostas', n; end if;

  -- 14. Chave que o inquérito não tem, ou uma secção: recusado.
  begin
    perform public.ingest_survey_response(repeat('a', 64), '{"inventada":"x"}', repeat('3', 64), repeat('2', 64),
                                          null, null, null, null);
    raise exception '14: aceitou chave desconhecida';
  exception when invalid_parameter_value then null; end;
  begin
    perform public.ingest_survey_response(repeat('a', 64), '{"s1":"x"}', repeat('4', 64), repeat('2', 64),
                                          null, null, null, null);
    raise exception '14: aceitou resposta a uma secção';
  exception when invalid_parameter_value then null; end;

  -- 15. Email SEM consentimento: resposta gravada, nenhum contacto criado.
  r := public.ingest_survey_response(repeat('a', 64), '{"p1":"nao"}', repeat('5', 64), repeat('2', 64),
                                     '{"email":"sem@exemplo.test","consentimento":false}', 'consent.inquerito.x', null, null);
  if not (r->>'ok')::boolean then raise exception '15: %', r; end if;
  if exists (select 1 from public.contacts where normalized_email = 'sem@exemplo.test') then
    raise exception '15: criou contacto sem consentimento';
  end if;

  -- 16. Email COM consentimento: contacto, consentimento (texto do spec) e
  --     actividade sem oportunidade.
  r := public.ingest_survey_response(repeat('a', 64), '{"p1":"sim"}', repeat('6', 64), repeat('2', 64),
                                     '{"email":"Nova@Exemplo.test","consentimento":true}', 'consent.inquerito.abc', null, null);
  select id into v_contact from public.contacts where normalized_email = 'nova@exemplo.test';
  if v_contact is null then raise exception '16: contacto não criado'; end if;
  if (select name || '/' || source from public.contacts where id = v_contact) <> 'nova@exemplo.test/inquerito' then
    raise exception '16: nome/origem do contacto';
  end if;
  if (select consent_text from public.consent_records where contact_id = v_contact) <> 'Aceito ser contactado pela AGORAMOZ.' then
    raise exception '16: consentimento não é o texto do inquérito';
  end if;
  if not exists (select 1 from public.activities where contact_id = v_contact and deal_id is null
                 and activity_type = 'inquerito_respondido') then
    raise exception '16: sem actividade';
  end if;
  if exists (select 1 from public.deals where contact_id = v_contact) then
    raise exception '16: criou oportunidade';
  end if;

  -- 17. Um contacto que já existe NÃO é reescrito por uma resposta pública.
  r := public.ingest_survey_response(repeat('a', 64), '{"p1":"sim"}', repeat('7', 64), repeat('2', 64),
                                     '{"email":"existente@exemplo.test","nome":"Outro Nome","telefone":"+1 999","consentimento":true}',
                                     'consent.inquerito.abc', null, null);
  if (select name || '|' || phone from public.contacts where id = '00000000-0000-0000-0000-0000000000c9')
     <> 'Nome Original|+258 21 000 000' then
    raise exception '17: contacto existente foi alterado';
  end if;
  if (select contact_id from public.responses where idempotency_key = repeat('7', 64)) <> '00000000-0000-0000-0000-0000000000c9' then
    raise exception '17: resposta não ligada ao contacto existente';
  end if;

  -- 18. Tecto de respostas: o link b aceita uma e fecha.
  r := public.ingest_survey_response(repeat('b', 64), '{"p1":"sim"}', repeat('8', 64), repeat('2', 64),
                                     null, null, null, null);
  if not (r->>'ok')::boolean then raise exception '18: primeira recusada %', r; end if;
  r := public.ingest_survey_response(repeat('b', 64), '{"p1":"sim"}', repeat('9', 64), repeat('2', 64),
                                     null, null, null, null);
  if (r->>'ok')::boolean or r->>'estado' <> 'fechado' then raise exception '18: passou do tecto %', r; end if;
  if public.obter_inquerito_publico(repeat('b', 64))->>'estado' <> 'fechado' then
    raise exception '18: leitura não mostra fechado';
  end if;
end $$;
reset role;

-- 19. Link expirado (criado já com prazo passado, directamente).
insert into public.survey_links (id, questionnaire_id, token_hash, created_at, expires_at)
select '00000000-0000-0000-0000-0000000001a3', valor::uuid, repeat('e', 64), now() - interval '2 days', now() - interval '1 day'
  from qa where chave = 'inquerito';
set local role service_role;
do $$ declare r jsonb; begin
  r := public.ingest_survey_response(repeat('e', 64), '{"p1":"sim"}', repeat('0', 63) || 'a', repeat('2', 64),
                                     null, null, null, null);
  if r->>'estado' <> 'expirado' then raise exception '19: %', r; end if;
end $$;
reset role;

-- 20. Revogar e fechar.
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000aa01', true);
do $$ begin perform public.revogar_link('00000000-0000-0000-0000-0000000001a1'); end $$;
reset role;
set local role service_role;
do $$ begin
  if public.obter_inquerito_publico(repeat('a', 64))->>'estado' <> 'fechado' then raise exception '20: revogado aberto'; end if;
end $$;
reset role;

-- 21. Uma versão publicada não muda (gatilho de 0003).
do $$ begin
  update public.questionnaire_versions set spec = '{}'::jsonb
   where questionnaire_id = (select valor::uuid from qa where chave = 'inquerito') and version = 2;
  raise exception '21: versão publicada alterada';
exception when insufficient_privilege then null; end $$;

-- 22. Resultados: agregados certos para a equipa; nada para quem não é.
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000aa02', true);
do $$ declare r jsonb; begin
  r := public.resultados_inquerito((select valor::uuid from qa where chave = 'inquerito'));
  -- 12 (sim), 15 (nao), 16 (sim), 17 (sim), 18 (sim) = 5 respostas.
  if (r->>'total')::int <> 5 then raise exception '22: total %', r->>'total'; end if;
  if (r->'porPergunta'->'p1'->'valores'->>'sim')::int <> 4 or (r->'porPergunta'->'p1'->'valores'->>'nao')::int <> 1 then
    raise exception '22: p1 %', r->'porPergunta'->'p1';
  end if;
  if (r->'porPergunta'->'p3'->'valores'->>'rh')::int <> 1 or (r->'porPergunta'->'p2'->>'media')::numeric <> 9 then
    raise exception '22: p2/p3 %', r->'porPergunta';
  end if;
  if r->'porPergunta' ? 's1' then raise exception '22: secção nos resultados'; end if;
end $$;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000aa03', true);
do $$ begin
  perform public.resultados_inquerito((select valor::uuid from qa where chave = 'inquerito'));
  raise exception '22: sem perfil viu resultados';
exception when insufficient_privilege then null; end $$;

-- 23. Direitos: nem a equipa nem ninguém executa o caminho público directamente.
do $$ begin
  perform public.ingest_survey_response(repeat('a', 64), '{}', repeat('1', 64), repeat('2', 64), null, null, null, null);
  raise exception '23: authenticated executou a ingestão';
exception when insufficient_privilege then null; end $$;
do $$ begin
  perform public.obter_inquerito_publico(repeat('a', 64));
  raise exception '23: authenticated leu o inquérito público';
exception when insufficient_privilege then null; end $$;
do $$ begin
  insert into public.survey_links (questionnaire_id, token_hash)
  values ((select valor::uuid from qa where chave = 'inquerito'), repeat('d', 64));
  raise exception '23: authenticated escreveu em survey_links';
exception when insufficient_privilege then null; end $$;
do $$ begin
  truncate public.survey_links cascade;
  raise exception '23: authenticated fez truncate';
exception when insufficient_privilege then null; end $$;
reset role;

set local role anon;
do $$ begin
  perform public.criar_inquerito('x', 'x', '{}'::jsonb);
  raise exception '23: anon executou criar_inquerito';
exception when insufficient_privilege then null; end $$;
do $$ begin
  perform 1 from public.survey_links;
  raise exception '23: anon leu survey_links';
exception when insufficient_privilege then null; end $$;
do $$ begin
  perform public.resultados_inquerito(gen_random_uuid());
  raise exception '23: anon executou resultados';
exception when insufficient_privilege then null; end $$;
reset role;

-- 24. Uma actividade tem de ter oportunidade ou contacto.
do $$ begin
  insert into public.activities (activity_type, actor_type) values ('x', 'system');
  raise exception '24: actividade sem dono';
exception when check_violation then null; end $$;

-- 25. Uma resposta sem contacto e sem link continua proibida (o diagnóstico
--     não pode gravar respostas órfãs).
do $$ begin
  insert into public.responses (questionnaire_version_id, raw, normalized, idempotency_key, input_fingerprint)
  select id, '{}', '{}', repeat('9', 64), repeat('9', 64) from public.questionnaire_versions limit 1;
  raise exception '25: resposta órfã';
exception when check_violation then null; end $$;

select 'inqueritos-comportamento: tudo verde' as resultado;
rollback;
