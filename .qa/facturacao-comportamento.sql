-- ============================================================================
-- QA da 0021 — Facturação interna. Postgres local descartável (NUNCA em
-- produção), com 0001–0021 aplicadas sobre os stubs mínimos da Supabase:
--
--   psql … -v ON_ERROR_STOP=1 -f .qa/facturacao-comportamento.sql
--
-- Cada bloco levanta excepção se o comportamento não for o esperado. Dados
-- sintéticos; a transacção é desfeita no fim.
--   ff01 — comercial; ff02 — leitura
-- ============================================================================

begin;

insert into auth.users (id) values
  ('00000000-0000-0000-0000-0000000000f1'),
  ('00000000-0000-0000-0000-0000000000f2');
insert into public.profiles (id, role, display_name) values
  ('00000000-0000-0000-0000-0000000000f1', 'comercial', 'QA Comercial'),
  ('00000000-0000-0000-0000-0000000000f2', 'leitura', 'QA Leitura');
insert into public.contacts (id, name, email, normalized_email) values
  ('00000000-0000-0000-0000-0000000000c9', 'Pessoa Sintética', 'qa@sintetica.test', 'qa@sintetica.test');
insert into public.deals (id, contact_id, stage, valor, moeda) values
  ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000c9', 'ganho', 1735000, 'MZN'),
  ('00000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-0000000000c9', 'ganho', 5000, 'USD'),
  ('00000000-0000-0000-0000-0000000000d3', '00000000-0000-0000-0000-0000000000c9', 'proposta', 100, 'MZN');

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000f1', true);
select set_config('request.jwt.claims', '{}', true);

-- ff-1: marcar como facturada; cronologia e auditoria.
do $$
declare r jsonb;
begin
  r := public.marcar_facturada('00000000-0000-0000-0000-0000000000d1', null, 'FT 2026/001', current_date, 1735000, 'MZN', 'Primeira');
  if r ->> 'estado' <> 'facturada' or (r ->> 'revisao')::int <> 1 then raise exception 'ff-1: %', r; end if;
end $$;
reset role;
do $$
begin
  if not exists (select 1 from public.activities where deal_id = '00000000-0000-0000-0000-0000000000d1' and activity_type = 'facturada') then
    raise exception 'ff-1 cronologia';
  end if;
  if not exists (select 1 from public.audit_log where action = 'facturacao.registar' and entity_id = '00000000-0000-0000-0000-0000000000d1') then
    raise exception 'ff-1 auditoria';
  end if;
end $$;
set local role authenticated;

-- ff-2: regras — só ganhas, sem duplicar número, sem data futura, sem facturar duas vezes.
do $$
begin
  begin perform public.marcar_facturada('00000000-0000-0000-0000-0000000000d3', null, 'FT 2026/009', current_date, 100, 'MZN', null); raise exception 'ff-2 não ganha';
  exception when sqlstate '22023' then null; end;
  begin perform public.marcar_facturada('00000000-0000-0000-0000-0000000000d2', null, ' ft 2026/001 ', current_date, 5000, 'USD', null); raise exception 'ff-2 número repetido';
  exception when sqlstate '22023' then null; end;
  begin perform public.marcar_facturada('00000000-0000-0000-0000-0000000000d2', null, 'FT 2026/002', current_date + 30, 5000, 'USD', null); raise exception 'ff-2 data futura';
  exception when sqlstate '22023' then null; end;
  begin perform public.marcar_facturada('00000000-0000-0000-0000-0000000000d2', null, 'FT 2026/002', current_date, 'NaN'::numeric, 'USD', null); raise exception 'ff-2 NaN';
  exception when sqlstate '22023' then null; end;
  begin perform public.marcar_facturada('00000000-0000-0000-0000-0000000000d1', 1, 'FT 2026/003', current_date, 1, 'MZN', null); raise exception 'ff-2 facturar duas vezes';
  exception when sqlstate '22023' then null; end;
end $$;

-- ff-3: anular exige motivo e revisão; volta a «por facturar»; o número fica livre.
do $$
declare r jsonb;
begin
  begin perform public.anular_facturacao('00000000-0000-0000-0000-0000000000d1', 1, 'x'); raise exception 'ff-3 motivo curto';
  exception when sqlstate '22023' then null; end;
  begin perform public.anular_facturacao('00000000-0000-0000-0000-0000000000d1', 9, 'Erro no valor'); raise exception 'ff-3 revisão';
  exception when sqlstate '40001' then null; end;
  r := public.anular_facturacao('00000000-0000-0000-0000-0000000000d1', 1, 'Erro no valor');
  if r ->> 'estado' <> 'anulada' then raise exception 'ff-3: %', r; end if;
  -- O número da anulada pode servir outra factura.
  perform public.marcar_facturada('00000000-0000-0000-0000-0000000000d2', null, 'FT 2026/001', current_date, 5000, 'USD', null);
  -- E a anulada volta a facturar, com a revisão certa.
  r := public.marcar_facturada('00000000-0000-0000-0000-0000000000d1', 2, 'FT 2026/004', current_date, 1700000, 'MZN', 'Corrigida');
  if (r ->> 'revisao')::int <> 3 then raise exception 'ff-3 refacturar: %', r; end if;
end $$;

-- ff-4: sem escrita directa; exportação registada.
do $$
begin
  begin insert into public.facturacao (deal_id, numero_factura, data_factura, valor, moeda) values ('00000000-0000-0000-0000-0000000000d3', 'x', current_date, 1, 'MZN'); raise exception 'ff-4 insert';
  exception when insufficient_privilege then null; end;
  begin update public.facturacao set valor = 0; raise exception 'ff-4 update';
  exception when insufficient_privilege then null; end;
  perform public.registar_exportacao_facturacao(2, '{"estado":"todas"}'::jsonb);
end $$;

-- ff-5: `leitura` lê mas não regista.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000f2', true);
do $$
begin
  if (select count(*) from public.facturacao) <> 2 then raise exception 'ff-5 leitura não lê'; end if;
  begin perform public.anular_facturacao('00000000-0000-0000-0000-0000000000d2', 1, 'Tentativa'); raise exception 'ff-5 leitura anulou';
  exception when sqlstate '42501' then null; end;
end $$;

-- ff-6: anónimo não lê nem executa.
reset role;
set local role anon;
do $$
begin
  begin perform 1 from public.facturacao; raise exception 'ff-6 anon lê';
  exception when insufficient_privilege then null; end;
  begin perform public.marcar_facturada(null, null, 'x', current_date, 1, 'MZN', null); raise exception 'ff-6 anon executa';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

select 'facturacao-comportamento: tudo certo' as resultado;
rollback;
