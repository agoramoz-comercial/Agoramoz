-- ============================================================================
-- QA da 0012 — comportamento de registar_reuniao e dos direitos, num Postgres
-- local descartável (NUNCA em produção). Ver docs/AGENDAMENTO.md.
--
--   psql … -v ON_ERROR_STOP=1 -f .qa/reunioes-comportamento.sql
--
-- Cada bloco levanta excepção se o comportamento não for o esperado. Dados
-- sintéticos; a transacção é desfeita no fim.
-- ============================================================================

begin;

-- Uma oportunidade de teste, com canal, e uma intenção com ref conhecido.
insert into public.contacts (id, name, email, normalized_email)
values ('00000000-0000-0000-0000-0000000000c1', 'Pessoa Sintética', 'qa@exemplo.test', 'qa@exemplo.test');
insert into public.deals (id, contact_id, acquisition_channel)
values ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000c1', 'organico');
insert into public.reunioes_intencoes (ref_hash, deal_id)
values (repeat('a', 64), '00000000-0000-0000-0000-0000000000d1');
-- Uma intenção já expirada.
insert into public.reunioes_intencoes (ref_hash, deal_id, expires_at)
values (repeat('b', 64), '00000000-0000-0000-0000-0000000000d1', now() - interval '1 day');

do $$
declare r jsonb; n int; d timestamptz;
begin
  -- 1. Marcação nova, com ref válido: liga, muda, próxima acção, actividade, evento.
  r := public.registar_reuniao('BOOKING_CREATED', 'u1', repeat('a', 64),
                               now() + interval '3 days', now() + interval '3 days 30 minutes', 'conversa-30', null);
  if not (r->>'ligada')::boolean or not (r->>'mudou')::boolean or r->>'estado' <> 'marcada' then
    raise exception '1: %', r;
  end if;
  select next_action_at into d from public.deals where id = '00000000-0000-0000-0000-0000000000d1';
  if d is null then raise exception '1: next_action_at não foi escrito'; end if;
  select count(*) into n from public.activities where activity_type = 'reuniao_marcada';
  if n <> 1 then raise exception '1: actividades %', n; end if;
  select count(*) into n from public.analytics_events where name = 'meeting_booked' and channel = 'organico' and origin = 'servidor';
  if n <> 1 then raise exception '1: eventos %', n; end if;

  -- 2. A mesma entrega outra vez: nada duplica.
  r := public.registar_reuniao('BOOKING_CREATED', 'u1', repeat('a', 64), now() + interval '3 days', null, null, null);
  if (r->>'mudou')::boolean then raise exception '2: repetição contou como mudança'; end if;
  select count(*) into n from public.activities; if n <> 1 then raise exception '2: actividades %', n; end if;
  select count(*) into n from public.analytics_events where name like 'meeting_%';
  if n <> 1 then raise exception '2: eventos %', n; end if;

  -- 3. Remarcação sem ref: liga pela anterior; a anterior sai das próximas.
  r := public.registar_reuniao('BOOKING_RESCHEDULED', 'u2', null, now() + interval '5 days', null, 'conversa-30', 'u1');
  if not (r->>'ligada')::boolean or r->>'estado' <> 'marcada' then raise exception '3: %', r; end if;
  if r->>'motivo' <> 'anterior' then raise exception '3: motivo %', r->>'motivo'; end if;
  if (select estado from public.reunioes where cal_uid = 'u1') <> 'remarcada' then raise exception '3: u1 não passou a remarcada'; end if;
  if not exists (select 1 from public.activities where activity_type = 'reuniao_remarcada') then
    raise exception '3: sem actividade de remarcação';
  end if;
  if not exists (select 1 from public.analytics_events where name = 'meeting_rescheduled') then
    raise exception '3: sem evento meeting_rescheduled';
  end if;
  select next_action_at into d from public.deals where id = '00000000-0000-0000-0000-0000000000d1';
  if d < now() + interval '4 days' then raise exception '3: next_action_at não seguiu a remarcação'; end if;

  -- 4. Fim da reunião.
  r := public.registar_reuniao('MEETING_ENDED', 'u2', null, null, null, null, null);
  if r->>'estado' <> 'realizada' then raise exception '4: %', r; end if;
  if not exists (select 1 from public.analytics_events where name = 'meeting_held') then raise exception '4: sem meeting_held'; end if;

  -- 5. Uma BOOKING_CREATED atrasada não desfaz a realizada.
  r := public.registar_reuniao('BOOKING_CREATED', 'u2', null, now() + interval '5 days', null, null, null);
  if r->>'estado' <> 'realizada' or (r->>'mudou')::boolean then raise exception '5: regrediu %', r; end if;

  -- 6. Cancelamento de uma marcação sem ref conhecido: grava, sem oportunidade, sem actividade.
  r := public.registar_reuniao('BOOKING_CANCELLED', 'u3', repeat('c', 64), null, null, null, null);
  if (r->>'ligada')::boolean then raise exception '6: ligou sem intenção'; end if;
  if r->>'motivo' <> 'ref-desconhecido' then raise exception '6: motivo %', r->>'motivo'; end if;
  if (select deal_id from public.reunioes where cal_uid = 'u3') is not null then raise exception '6: deal_id'; end if;
  if not exists (select 1 from public.analytics_events where name = 'meeting_cancelled' and channel = 'desconhecido') then
    raise exception '6: evento sem canal desconhecido';
  end if;

  -- 7. Intenção expirada não liga.
  r := public.registar_reuniao('BOOKING_CREATED', 'u4', repeat('b', 64), now() + interval '1 day', null, null, null);
  if (r->>'ligada')::boolean then raise exception '7: ligou por intenção expirada'; end if;

  -- 8. Entradas inválidas são recusadas pela própria função.
  begin
    perform public.registar_reuniao('BOOKING_PAID', 'u5', null, null, null, null, null);
    raise exception '8: aceitou evento não suportado';
  exception when sqlstate '22023' then null;
  end;
  begin
    perform public.registar_reuniao('BOOKING_CREATED', 'u5', 'nao-e-hash', null, null, null, null);
    raise exception '8: aceitou ref malformado';
  exception when sqlstate '22023' then null;
  end;
end $$;

-- 11–15. Achados da revisão ECC (0012): ordem, próxima acção, validação, limpeza.
insert into public.deals (id, contact_id, acquisition_channel)
values ('00000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-0000000000c1', 'directo'),
       ('00000000-0000-0000-0000-0000000000d3', '00000000-0000-0000-0000-0000000000c1', 'directo');
insert into public.reunioes_intencoes (ref_hash, deal_id)
values (repeat('e', 64), '00000000-0000-0000-0000-0000000000d2'),
       (repeat('f', 64), '00000000-0000-0000-0000-0000000000d3');

do $$
declare r jsonb; n int; d timestamptz;
begin
  -- 11. A remarcação chega ANTES da marcação original: a original nasce
  --     remarcada, não conta como marcação nova, não fica nas próximas.
  r := public.registar_reuniao('BOOKING_RESCHEDULED', 'u8', repeat('e', 64), now() + interval '6 days', null, null, 'u7');
  select count(*) into n from public.analytics_events where name = 'meeting_booked';
  r := public.registar_reuniao('BOOKING_CREATED', 'u7', repeat('e', 64), now() + interval '4 days', null, null, null);
  if r->>'estado' <> 'remarcada' or (r->>'mudou')::boolean then raise exception '11: %', r; end if;
  if (select count(*) from public.analytics_events where name = 'meeting_booked') <> n then
    raise exception '11: a original contou como marcação nova';
  end if;
  select next_action_at into d from public.deals where id = '00000000-0000-0000-0000-0000000000d2';
  if d < now() + interval '5 days' then raise exception '11: next_action_at voltou à data antiga'; end if;

  -- 12. Cancelar a única reunião futura limpa a próxima acção.
  r := public.registar_reuniao('BOOKING_CANCELLED', 'u8', null, null, null, null, null);
  if (select next_action_at from public.deals where id = '00000000-0000-0000-0000-0000000000d2') is not null then
    raise exception '12: next_action_at ficou com uma reunião cancelada';
  end if;

  -- 13. Uma data posta pela equipa não é pisada por uma marcação.
  update public.deals set next_action_at = now() + interval '10 days' where id = '00000000-0000-0000-0000-0000000000d3';
  select next_action_at into d from public.deals where id = '00000000-0000-0000-0000-0000000000d3';
  r := public.registar_reuniao('BOOKING_CREATED', 'u10', repeat('f', 64), now() + interval '2 days', null, null, null);
  if (select next_action_at from public.deals where id = '00000000-0000-0000-0000-0000000000d3') <> d then
    raise exception '13: a data da equipa foi pisada';
  end if;

  -- 14. uid anterior igual ao próprio, ou vazio: recusado.
  begin
    perform public.registar_reuniao('BOOKING_RESCHEDULED', 'u11', null, null, null, null, 'u11');
    raise exception '14: aceitou uid anterior igual ao próprio';
  exception when sqlstate '22023' then null;
  end;
  begin
    perform public.registar_reuniao('BOOKING_RESCHEDULED', 'u11', null, null, null, null, '');
    raise exception '14: aceitou uid anterior vazio';
  exception when sqlstate '22023' then null;
  end;

  -- 15. As intenções expiradas desaparecem na inserção seguinte.
  if exists (select 1 from public.reunioes_intencoes where expires_at < now()) then
    raise exception '15: ficaram intenções expiradas';
  end if;
end $$;

-- 9. Direitos: anon e authenticated não executam a função nem tocam nas intenções.
set local role anon;
do $$ begin
  perform public.registar_reuniao('BOOKING_CREATED', 'x', null, null, null, null, null);
  raise exception '9: anon executou a função';
exception when insufficient_privilege then null; end $$;
do $$ begin
  perform 1 from public.reunioes;
  raise exception '9: anon leu reunioes';
exception when insufficient_privilege then null; end $$;
reset role;

set local role authenticated;
do $$ begin
  perform public.registar_reuniao('BOOKING_CREATED', 'x', null, null, null, null, null);
  raise exception '9: authenticated executou a função';
exception when insufficient_privilege then null; end $$;
do $$ begin
  perform 1 from public.reunioes_intencoes;
  raise exception '9: authenticated leu intenções';
exception when insufficient_privilege then null; end $$;
do $$ begin
  insert into public.reunioes (cal_uid, estado) values ('x', 'marcada');
  raise exception '9: authenticated escreveu em reunioes';
exception when insufficient_privilege then null; end $$;
-- Nem TRUNCATE, que a RLS não trava (os privilégios por omissão do Supabase
-- concediam-no; o esboço do QA imita-os).
do $$ begin
  truncate public.reunioes;
  raise exception '9: authenticated fez truncate de reunioes';
exception when insufficient_privilege then null; end $$;
-- Sem perfil de equipa, a RLS devolve zero linhas (não erro).
do $$ declare n int; begin
  select count(*) into n from public.reunioes;
  if n <> 0 then raise exception '9: authenticated sem papel viu % reuniões', n; end if;
end $$;
reset role;

-- 10. A chave de serviço executa a função e cria intenções.
set local role service_role;
do $$ declare r jsonb; begin
  insert into public.reunioes_intencoes (ref_hash, deal_id)
  values (repeat('d', 64), '00000000-0000-0000-0000-0000000000d1');
  r := public.registar_reuniao('BOOKING_CREATED', 'u6', repeat('d', 64), now() + interval '2 days', null, null, null);
  if not (r->>'ligada')::boolean then raise exception '10: service_role não ligou %', r; end if;
end $$;
reset role;

select 'reunioes-comportamento: tudo verde' as resultado;
rollback;
