-- ============================================================================
-- QA da 0019 — CRM operacional. Postgres local descartável (NUNCA em
-- produção), com a 0018 já aplicada:
--
--   psql … -v ON_ERROR_STOP=1 -f .qa/crm-comportamento.sql
--
-- Cada bloco levanta excepção se o comportamento não for o esperado. Dados
-- sintéticos; a transacção é desfeita no fim.
--   cc01 — comercial; cc02 — leitura
-- ============================================================================

begin;

insert into auth.users (id) values
  ('00000000-0000-0000-0000-0000000000a1'),
  ('00000000-0000-0000-0000-0000000000a2');
insert into public.profiles (id, role, display_name) values
  ('00000000-0000-0000-0000-0000000000a1', 'comercial', 'QA Comercial'),
  ('00000000-0000-0000-0000-0000000000a2', 'leitura', 'QA Leitura');

insert into public.organisations (id, name, normalized_name, normalized_domain)
values ('00000000-0000-0000-0000-0000000000f1', 'Empresa_Sintética 100%', 'empresa_sintetica 100%', 'sintetica.test');
insert into public.contacts (id, organisation_id, name, email, normalized_email, phone) values
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000f1',
   'Pessoa Sintética', 'qa@sintetica.test', 'qa@sintetica.test', '+258840000000'),
  ('00000000-0000-0000-0000-0000000000c2', null, 'Outra Pessoa', 'outra@exemplo.test', 'outra@exemplo.test', null);

-- Três respostas com diagnóstico e oportunidade: uma em `novo` (vai ser
-- aprovada), uma em `novo` (vai ser rejeitada), uma já em `proposta`.
insert into public.responses (id, questionnaire_version_id, contact_id, raw, normalized, idempotency_key, input_fingerprint)
select v.id_resp, (select id from public.questionnaire_versions order by version limit 1),
       '00000000-0000-0000-0000-0000000000c1', '{}', '{}', repeat(v.k, 64), repeat(v.k, 64)
  from (values ('00000000-0000-0000-0000-0000000000b1'::uuid, 'a'),
               ('00000000-0000-0000-0000-0000000000b2'::uuid, 'b'),
               ('00000000-0000-0000-0000-0000000000b3'::uuid, 'c')) v(id_resp, k);
insert into public.diagnostics (id, response_id, ruleset_version, scoring_version, score, tier, state) values
  ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000b1', 'qa', 'qa', 70, 'B', 'pending_review'),
  ('00000000-0000-0000-0000-0000000000e2', '00000000-0000-0000-0000-0000000000b2', 'qa', 'qa', 20, 'D', 'pending_review'),
  ('00000000-0000-0000-0000-0000000000e3', '00000000-0000-0000-0000-0000000000b3', 'qa', 'qa', 90, 'A', 'pending_review');
insert into public.deals (id, contact_id, organisation_id, source_response_id, stage, acquisition_channel) values
  ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000f1',
   '00000000-0000-0000-0000-0000000000b1', 'novo', 'organico'),
  ('00000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-0000000000c1', null,
   '00000000-0000-0000-0000-0000000000b2', 'novo', 'organico'),
  ('00000000-0000-0000-0000-0000000000d3', '00000000-0000-0000-0000-0000000000c1', null,
   '00000000-0000-0000-0000-0000000000b3', 'proposta', 'organico'),
  ('00000000-0000-0000-0000-0000000000d4', '00000000-0000-0000-0000-0000000000c2', null,
   null, 'qualificacao', 'directo');

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a1', true);
select set_config('request.jwt.claims', '{}', true);

-- 1. Próxima acção -----------------------------------------------------------
do $$
declare r jsonb; d public.deals;
begin
  r := public.definir_proxima_accao('00000000-0000-0000-0000-0000000000d4', 1, 'Ligar ao decisor', now() + interval '2 days');
  select * into d from public.deals where id = '00000000-0000-0000-0000-0000000000d4';
  if d.proxima_accao <> 'Ligar ao decisor' or d.next_action_at is null or d.revisao <> 2 then
    raise exception '1a: próxima acção não gravada %', row_to_json(d);
  end if;
  begin
    perform public.definir_proxima_accao('00000000-0000-0000-0000-0000000000d4', 1, 'X', now());
    raise exception '1b: revisão desactualizada aceite';
  exception when sqlstate '40001' then null; end;
  begin
    perform public.definir_proxima_accao('00000000-0000-0000-0000-0000000000d4', 2, 'Sem data', null);
    raise exception '1c: acção sem data aceite';
  exception when sqlstate '22023' then null; end;
  -- Limpar: as duas a nulo.
  perform public.definir_proxima_accao('00000000-0000-0000-0000-0000000000d4', 2, null, null);
  if (select proxima_accao from public.deals where id = '00000000-0000-0000-0000-0000000000d4') is not null then
    raise exception '1d: não limpou';
  end if;
end $$;

-- 2. Valor e moeda -------------------------------------------------------------
do $$
declare d public.deals;
begin
  begin
    perform public.guardar_oportunidade_crm('00000000-0000-0000-0000-0000000000d4', 3, 1000, null, null);
    raise exception '2a: valor sem moeda aceite';
  exception when sqlstate '22023' then null; end;
  perform public.guardar_oportunidade_crm('00000000-0000-0000-0000-0000000000d4', 3, 250000, 'MZN', date '2026-12-15');
  select * into d from public.deals where id = '00000000-0000-0000-0000-0000000000d4';
  if d.valor <> 250000 or d.moeda <> 'MZN' or d.data_prevista_fecho <> date '2026-12-15' then
    raise exception '2b: dados não gravados';
  end if;
  begin
    perform public.guardar_oportunidade_crm('00000000-0000-0000-0000-0000000000d4', 4, 1, 'GBP', null);
    raise exception '2c: moeda fora da lista aceite';
  exception when check_violation then null; end;
end $$;

-- 3. Fase: «perdido» exige motivo; fase_desde acompanha -------------------------
do $$
begin
  begin
    perform public.mudar_fase_oportunidade('00000000-0000-0000-0000-0000000000d4', 'perdido', null);
    raise exception '3a: perdido sem motivo aceite';
  exception when sqlstate '22023' then null; end;
end $$;
-- Recuar a data como superutilizador, para provar que a mudança a renova.
reset role;
update public.deals set fase_desde = now() - interval '10 days' where id = '00000000-0000-0000-0000-0000000000d4';
set local role authenticated;
do $$
declare d public.deals;
begin
  perform public.mudar_fase_oportunidade('00000000-0000-0000-0000-0000000000d4', 'proposta', 'Proposta enviada');
  select * into d from public.deals where id = '00000000-0000-0000-0000-0000000000d4';
  if d.stage <> 'proposta' or d.fase_desde < now() - interval '1 minute' then
    raise exception '3b: fase_desde não acompanhou a mudança %', row_to_json(d);
  end if;
end $$;

-- 4. Perder com motivo e reabrir ------------------------------------------------
do $$
declare d public.deals;
begin
  perform public.definir_proxima_accao('00000000-0000-0000-0000-0000000000d4',
    (select revisao from public.deals where id = '00000000-0000-0000-0000-0000000000d4'), 'Seguimento', now() + interval '1 day');
  begin
    perform public.marcar_perdida('00000000-0000-0000-0000-0000000000d4', null, null);
    raise exception '4a: perda sem motivo aceite';
  exception when sqlstate '22023' then null; end;
  begin
    perform public.marcar_perdida('00000000-0000-0000-0000-0000000000d4', 'outro', '  ');
    raise exception '4b: «outro» sem nota aceite';
  exception when sqlstate '22023' then null; end;
  perform public.marcar_perdida('00000000-0000-0000-0000-0000000000d4', 'preco', 'Orçamento abaixo da proposta');
  select * into d from public.deals where id = '00000000-0000-0000-0000-0000000000d4';
  if d.stage <> 'perdido' or d.motivo_perda <> 'preco' or d.proxima_accao is not null or d.next_action_at is not null then
    raise exception '4c: perda mal registada %', row_to_json(d);
  end if;
  perform public.mudar_fase_oportunidade('00000000-0000-0000-0000-0000000000d4', 'qualificacao', 'Reaberta');
  select * into d from public.deals where id = '00000000-0000-0000-0000-0000000000d4';
  if d.motivo_perda is not null or d.motivo_perda_nota is not null then
    raise exception '4d: reabrir não apagou o motivo';
  end if;
end $$;

-- 5. Actividade com tipo e auditoria -------------------------------------------
do $$
declare v bigint;
begin
  begin
    perform public.registar_actividade('00000000-0000-0000-0000-0000000000d4', 'sms', 'texto');
    raise exception '5a: tipo desconhecido aceite';
  exception when sqlstate '22023' then null; end;
  v := public.registar_actividade('00000000-0000-0000-0000-0000000000d4', 'chamada', 'Falámos 10 min');
  reset role;
  if not exists (select 1 from public.audit_log where action = 'oportunidade.actividade'
                  and entity_id = '00000000-0000-0000-0000-0000000000d4' and (after->>'actividade')::bigint = v) then
    raise exception '5b: actividade sem auditoria';
  end if;
end $$;
set local role authenticated;

-- 6. Aprovar move de novo para qualificação; não regride uma fase posterior -----
do $$
begin
  perform public.aprovar_diagnostico('00000000-0000-0000-0000-0000000000e1', 1);
  if (select stage from public.deals where id = '00000000-0000-0000-0000-0000000000d1') <> 'qualificacao' then
    raise exception '6a: aprovar não passou a oportunidade a qualificação';
  end if;
  perform public.aprovar_diagnostico('00000000-0000-0000-0000-0000000000e3', 1);
  if (select stage from public.deals where id = '00000000-0000-0000-0000-0000000000d3') <> 'proposta' then
    raise exception '6b: aprovar fez regredir uma oportunidade em proposta';
  end if;
end $$;

-- 7. Rejeitar leva de novo a perdido com «não qualificado» ----------------------
do $$
declare d public.deals;
begin
  perform public.rejeitar_diagnostico('00000000-0000-0000-0000-0000000000e2', 1, 'Fora do perfil: sem processo crítico');
  select * into d from public.deals where id = '00000000-0000-0000-0000-0000000000d2';
  if d.stage <> 'perdido' or d.motivo_perda <> 'nao_qualificado' or d.motivo_perda_nota is null then
    raise exception '7: rejeitar não marcou perdida %', row_to_json(d);
  end if;
end $$;

-- 8. Pesquisa global: encontra, trata % e _ como letras ------------------------
do $$
declare r jsonb;
begin
  r := public.pesquisar_global('sintética');
  if jsonb_array_length(r->'contactos') <> 1 or jsonb_array_length(r->'oportunidades') < 1 then
    raise exception '8a: não encontrou %', r;
  end if;
  r := public.pesquisar_global('100%');
  if jsonb_array_length(r->'organizacoes') <> 1 then raise exception '8b: «100%%» literal falhou %', r; end if;
  r := public.pesquisar_global('%');
  if jsonb_array_length(r->'contactos') <> 0 then raise exception '8c: «%%» casou com tudo'; end if;
  r := public.pesquisar_global('a_ess');
  if jsonb_array_length(r->'contactos') <> 0 then raise exception '8d: «_» foi curinga'; end if;
  r := public.pesquisar_global('8400');
  if jsonb_array_length(r->'contactos') <> 1 then raise exception '8e: telefone não pesquisado'; end if;
end $$;

-- 9. Papel leitura: lê, não escreve -------------------------------------------
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a2', true);
do $$
begin
  if jsonb_array_length(public.pesquisar_global('sintética')->'contactos') <> 1 then
    raise exception '9a: leitura não pesquisa';
  end if;
  begin
    perform public.marcar_perdida('00000000-0000-0000-0000-0000000000d3', 'preco', null);
    raise exception '9b: leitura marcou perdida';
  exception when insufficient_privilege then null; end;
  begin
    perform public.definir_proxima_accao('00000000-0000-0000-0000-0000000000d3', 1, 'X', now());
    raise exception '9c: leitura definiu próxima acção';
  exception when insufficient_privilege then null; end;
end $$;

-- 10. anon não executa nenhuma -------------------------------------------------
reset role;
do $$
declare f text;
begin
  foreach f in array array['definir_proxima_accao', 'guardar_oportunidade_crm', 'marcar_perdida',
                           'mudar_fase_oportunidade', 'registar_actividade', 'pesquisar_global'] loop
    if exists (select 1 from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname = f
                and has_function_privilege('anon', p.oid, 'execute')) then
      raise exception '10: anon executa %', f;
    end if;
  end loop;
end $$;

-- 11. Ganho limpa a próxima acção ---------------------------------------------
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a1', true);
do $$
declare d public.deals;
begin
  perform public.definir_proxima_accao('00000000-0000-0000-0000-0000000000d3',
    (select revisao from public.deals where id = '00000000-0000-0000-0000-0000000000d3'), 'Assinar', now() + interval '1 day');
  perform public.mudar_fase_oportunidade('00000000-0000-0000-0000-0000000000d3', 'ganho', null);
  select * into d from public.deals where id = '00000000-0000-0000-0000-0000000000d3';
  if d.proxima_accao is not null or d.next_action_at is not null then raise exception '11: ganho manteve acção'; end if;
end $$;

-- 12. A vista do pipeline traz a última actividade e respeita a RLS ----------
do $$
declare u timestamptz;
begin
  select ultima_actividade into u from public.crm_oportunidades where id = '00000000-0000-0000-0000-0000000000d4';
  if u is null then raise exception '12a: vista sem última actividade'; end if;
end $$;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000ff', true);
do $$
begin
  if (select count(*) from public.crm_oportunidades) <> 0 then raise exception '12b: quem não é equipa leu a vista'; end if;
end $$;

-- 13. Revisão nula não contorna o controlo optimista --------------------------
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a1', true);
do $$
begin
  begin
    perform public.definir_proxima_accao('00000000-0000-0000-0000-0000000000d1', null, 'X', now());
    raise exception '13: revisão nula aceite';
  exception when sqlstate '40001' then null; end;
end $$;

-- 14. Perdida antes da 0019, sem motivo: recebe motivo sem reabrir ------------
reset role;
insert into public.deals (id, contact_id, stage, acquisition_channel)
values ('00000000-0000-0000-0000-0000000000d5', '00000000-0000-0000-0000-0000000000c2', 'perdido', 'directo');
update public.deals set fase_desde = now() - interval '30 days' where id = '00000000-0000-0000-0000-0000000000d5';
set local role authenticated;
do $$
declare d public.deals; r jsonb;
begin
  r := public.marcar_perdida('00000000-0000-0000-0000-0000000000d5', 'timing', null);
  select * into d from public.deals where id = '00000000-0000-0000-0000-0000000000d5';
  if d.motivo_perda <> 'timing' or d.fase_desde > now() - interval '29 days' or not (r->>'changed')::boolean then
    raise exception '14: perda antiga não completada sem reabrir %', row_to_json(d);
  end if;
  r := public.marcar_perdida('00000000-0000-0000-0000-0000000000d5', 'preco', null);
  if (r->>'changed')::boolean then raise exception '14b: motivo existente reescrito'; end if;
end $$;

-- 15. O Cal não apaga a data de uma acção escrita pela equipa ----------------
do $$
begin
  perform public.definir_proxima_accao('00000000-0000-0000-0000-0000000000d1',
    (select revisao from public.deals where id = '00000000-0000-0000-0000-0000000000d1'),
    'Enviar proposta', now() - interval '1 day');
end $$;
reset role;
insert into public.reunioes_intencoes (ref_hash, deal_id)
values (repeat('9', 64), '00000000-0000-0000-0000-0000000000d1');
set local role service_role;
do $$
declare r jsonb; d public.deals;
begin
  r := public.registar_reuniao('BOOKING_CREATED', 'qa-cal-1', repeat('9', 64), now() + interval '2 days', null, null, null);
  r := public.registar_reuniao('BOOKING_CANCELLED', 'qa-cal-1', repeat('9', 64), now() + interval '2 days', null, null, null);
  select * into d from public.deals where id = '00000000-0000-0000-0000-0000000000d1';
  if d.proxima_accao <> 'Enviar proposta' or d.next_action_at is null then
    raise exception '15: o Cal mexeu na acção da equipa %', row_to_json(d);
  end if;
end $$;
reset role;
-- Sem acção da equipa, o Cal continua a pôr a data da reunião.
update public.deals set proxima_accao = null, next_action_at = null where id = '00000000-0000-0000-0000-0000000000d4';
insert into public.reunioes_intencoes (ref_hash, deal_id)
values (repeat('8', 64), '00000000-0000-0000-0000-0000000000d4');
set local role service_role;
do $$
declare r jsonb;
begin
  r := public.registar_reuniao('BOOKING_CREATED', 'qa-cal-2', repeat('8', 64), now() + interval '3 days', null, null, null);
  if (select next_action_at from public.deals where id = '00000000-0000-0000-0000-0000000000d4') is null then
    raise exception '15b: o Cal deixou de marcar a reunião como próxima acção';
  end if;
end $$;
reset role;

select 'CRM 0019: todos os cenários passaram' as resultado;
rollback;
