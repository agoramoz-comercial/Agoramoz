-- ============================================================================
-- QA da 0020 — Propostas. Postgres local descartável (NUNCA em produção),
-- com 0001–0020 aplicadas sobre os stubs mínimos da Supabase:
--
--   psql … -v ON_ERROR_STOP=1 -f .qa/propostas-comportamento.sql
--
-- Cada bloco levanta excepção se o comportamento não for o esperado. Dados
-- sintéticos; a transacção é desfeita no fim.
--   pp01 — comercial; pp02 — leitura
-- ============================================================================

begin;

insert into auth.users (id) values
  ('00000000-0000-0000-0000-0000000000a1'),
  ('00000000-0000-0000-0000-0000000000a2');
insert into public.profiles (id, role, display_name) values
  ('00000000-0000-0000-0000-0000000000a1', 'comercial', 'QA Comercial'),
  ('00000000-0000-0000-0000-0000000000a2', 'leitura', 'QA Leitura');
insert into public.contacts (id, name, email, normalized_email) values
  ('00000000-0000-0000-0000-0000000000c1', 'Pessoa Sintética', 'qa@sintetica.test', 'qa@sintetica.test');
insert into public.deals (id, contact_id, stage) values
  ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000c1', 'proposta');

-- O conteúdo mínimo que a aplicação envia (lib/propostas/modelo.ts).
create temp table qa_conteudo as
select jsonb_build_object(
  'versao', 1, 'projeto', 'Portal de exemplo', 'titulo', '', 'cliente', 'Cliente sintético',
  'destinatario', '', 'preparadaPor', 'AGORAMOZ', 'data', '2026-11-12', 'validadeDias', 30, 'moeda', 'MZN',
  'assunto', '', 'carta', '', 'decisao', '', 'contexto', '[]'::jsonb, 'objectivos', '[]'::jsonb, 'solucao', '[]'::jsonb,
  'fases', jsonb_build_array(
    jsonb_build_object('nome', 'Diagnóstico', 'entregaveis', '', 'semanasMin', 2, 'semanasMax', 3, 'valor', 285000, 'custo', 190000),
    jsonb_build_object('nome', 'Implementação', 'entregaveis', '', 'semanasMin', 6, 'semanasMax', 8, 'valor', 1450000, 'custo', null)),
  'opcoes', '[]'::jsonb, 'condicoes', '[]'::jsonb, 'riscos', '[]'::jsonb, 'passos', '[]'::jsonb) as c;
grant select on qa_conteudo to authenticated;

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a1', true);
select set_config('request.jwt.claims', '{}', true);

-- pp-1: criar — versão 1, total calculado na base, cronologia e auditoria.
do $$
declare r jsonb; v_id uuid;
begin
  r := public.guardar_proposta(null, null, '00000000-0000-0000-0000-0000000000d1',
                               (select c from qa_conteudo), 'Texto colado de exemplo', 'Primeira versão');
  v_id := (r ->> 'id')::uuid;
  if (r ->> 'versao')::int <> 1 or (r ->> 'nova')::boolean is not true then raise exception 'pp-1 versão: %', r; end if;
  if (select total from public.propostas where id = v_id) <> 1735000 then raise exception 'pp-1 total'; end if;
  if (select texto_colado from public.propostas_versoes where proposta_id = v_id and versao = 1) <> 'Texto colado de exemplo' then
    raise exception 'pp-1 texto colado';
  end if;
  perform set_config('qa.id', v_id::text, true);
end $$;
reset role;
do $$
begin
  if not exists (select 1 from public.activities where deal_id = '00000000-0000-0000-0000-0000000000d1' and activity_type = 'proposta') then
    raise exception 'pp-1 cronologia da oportunidade';
  end if;
  if not exists (select 1 from public.audit_log where entity_type = 'proposta' and action = 'proposta.criada'
                  and entity_id = current_setting('qa.id') and not (after ? 'conteudo')) then
    raise exception 'pp-1 auditoria (sem conteúdo)';
  end if;
end $$;
set local role authenticated;

-- pp-2: gravar o mesmo conteúdo não cria versão; mudar cria a versão 2.
do $$
declare r jsonb; v_id uuid := current_setting('qa.id')::uuid; c jsonb := (select c from qa_conteudo);
begin
  r := public.guardar_proposta(v_id, 1, '00000000-0000-0000-0000-0000000000d1', c, null, null);
  if (r ->> 'nova')::boolean or (r ->> 'versao')::int <> 1 then raise exception 'pp-2 repetição criou versão: %', r; end if;
  r := public.guardar_proposta(v_id, 1, '00000000-0000-0000-0000-0000000000d1', jsonb_set(c, '{fases,0,valor}', '300000'), null, 'Revisto');
  if (r ->> 'versao')::int <> 2 or (r ->> 'revisao')::int <> 2 then raise exception 'pp-2 versão 2: %', r; end if;
  if (select total from public.propostas where id = v_id) <> 1750000 then raise exception 'pp-2 total'; end if;
  if (select count(*) from public.propostas_versoes where proposta_id = v_id) <> 2 then raise exception 'pp-2 histórico'; end if;
end $$;

-- pp-3: revisão antiga → 40001 (ninguém grava por cima de outra pessoa).
do $$
begin
  perform public.guardar_proposta(current_setting('qa.id')::uuid, 1, null, (select c from qa_conteudo), null, null);
  raise exception 'pp-3 aceitou revisão antiga';
exception when sqlstate '40001' then null;
end $$;

-- pp-4: conteúdo inválido recusado (valor negativo, sem cliente, moeda, grande de mais).
do $$
declare c jsonb := (select c from qa_conteudo);
begin
  begin perform public.guardar_proposta(null, null, null, jsonb_set(c, '{fases,0,valor}', '-1'), null, null); raise exception 'pp-4 negativo';
  exception when sqlstate '22023' then null; end;
  begin perform public.guardar_proposta(null, null, null, jsonb_set(c, '{fases,0,valor}', '"abc"'), null, null); raise exception 'pp-4 texto';
  exception when sqlstate '22023' then null; end;
  begin perform public.guardar_proposta(null, null, null, jsonb_set(c, '{cliente}', '"  "'), null, null); raise exception 'pp-4 cliente';
  exception when sqlstate '22023' then null; end;
  begin perform public.guardar_proposta(null, null, null, jsonb_set(c, '{moeda}', '"BRL"'), null, null); raise exception 'pp-4 moeda';
  exception when sqlstate '22023' then null; end;
  begin perform public.guardar_proposta(null, null, null, jsonb_set(c, '{carta}', to_jsonb(repeat('x', 70000))), null, null); raise exception 'pp-4 tamanho';
  exception when sqlstate '22023' then null; end;
  begin perform public.guardar_proposta(null, null, '00000000-0000-0000-0000-00000000dead', c, null, null); raise exception 'pp-4 oportunidade';
  exception when sqlstate 'P0002' then null; end;
end $$;

-- pp-5: estados — aceite só depois de enviada; fechada não aceita versões.
do $$
declare r jsonb; v_id uuid := current_setting('qa.id')::uuid;
begin
  begin perform public.mudar_estado_proposta(v_id, 2, 'aceite'); raise exception 'pp-5 aceite sem envio';
  exception when sqlstate '22023' then null; end;
  r := public.mudar_estado_proposta(v_id, 2, 'enviada');
  r := public.mudar_estado_proposta(v_id, (r ->> 'revisao')::int, 'aceite');
  begin
    perform public.guardar_proposta(v_id, (r ->> 'revisao')::int, null, (select c from qa_conteudo), null, null);
    raise exception 'pp-5 versão numa proposta aceite';
  exception when sqlstate '22023' then null; end;
  begin perform public.mudar_estado_proposta(v_id, (r ->> 'revisao')::int, 'perdida'); raise exception 'pp-5 estado inválido';
  exception when sqlstate '22023' then null; end;
end $$;

-- pp-6: sem escrita directa, nem para a equipa.
do $$
begin
  begin insert into public.propostas (projeto, cliente, moeda, total) values ('x', 'y', 'MZN', 1); raise exception 'pp-6 insert';
  exception when insufficient_privilege then null; end;
  begin update public.propostas_versoes set nota = 'x'; raise exception 'pp-6 update versões';
  exception when insufficient_privilege then null; end;
  begin delete from public.propostas_versoes; raise exception 'pp-6 delete versões';
  exception when insufficient_privilege then null; end;
  begin perform public.total_da_proposta('{}'::jsonb); raise exception 'pp-6 auxiliar exposta';
  exception when insufficient_privilege then null; end;
end $$;

-- pp-7: `leitura` lê mas não grava.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a2', true);
do $$
begin
  if (select count(*) from public.propostas) <> 1 then raise exception 'pp-7 leitura não lê'; end if;
  begin perform public.guardar_proposta(null, null, null, (select c from qa_conteudo), null, null); raise exception 'pp-7 leitura gravou';
  exception when sqlstate '42501' then null; end;
end $$;

-- pp-8: anónimo não lê nem executa.
reset role;
set local role anon;
do $$
begin
  begin perform 1 from public.propostas; raise exception 'pp-8 anon lê';
  exception when insufficient_privilege then null; end;
  begin perform public.guardar_proposta(null, null, null, '{}'::jsonb, null, null); raise exception 'pp-8 anon executa';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

select 'propostas-comportamento: tudo certo' as resultado;
rollback;
