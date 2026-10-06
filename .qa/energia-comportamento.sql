-- ============================================================================
-- QA da 0017 — Espaço CEnO. Postgres local descartável (NUNCA em produção):
--
--   psql … -v ON_ERROR_STOP=1 -f .qa/energia-comportamento.sql
--
-- Cada bloco levanta excepção se o comportamento não for o esperado. Dados
-- sintéticos; a transacção é desfeita no fim.
--   cc01 — a dona do espaço (comercial, com o módulo `energia`)
--   cc02 — um administrador SEM o módulo
--   cc03 — outra pessoa COM o módulo (prova que o módulo não abre o espaço alheio)
--   cc04 — papel `leitura` COM o módulo (lê o seu espaço, não escreve)
-- ============================================================================

begin;

insert into auth.users (id) values
  ('00000000-0000-0000-0000-00000000cc01'),
  ('00000000-0000-0000-0000-00000000cc02'),
  ('00000000-0000-0000-0000-00000000cc03'),
  ('00000000-0000-0000-0000-00000000cc04');
insert into public.profiles (id, role, display_name) values
  ('00000000-0000-0000-0000-00000000cc01', 'comercial', 'QA Dona'),
  ('00000000-0000-0000-0000-00000000cc02', 'admin', 'QA Admin'),
  ('00000000-0000-0000-0000-00000000cc03', 'comercial', 'QA Outra'),
  ('00000000-0000-0000-0000-00000000cc04', 'leitura', 'QA Leitura');
insert into public.acessos_modulo (user_id, modulo) values
  ('00000000-0000-0000-0000-00000000cc01', 'energia'),
  ('00000000-0000-0000-0000-00000000cc03', 'energia'),
  ('00000000-0000-0000-0000-00000000cc04', 'energia');

create temporary table qa (chave text primary key, valor text);
grant all on qa to public;

-- ---------------------------------------------------------------------------
-- A. A dona trabalha no espaço
-- ---------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000cc01', true);

do $$
declare v_st uuid; v_op uuid; r int;
begin
  if not public.tem_modulo('energia') then raise exception 'A0: a dona não tem o módulo'; end if;

  -- 1. Stakeholder activo sem próxima acção é recusado; com acção, entra.
  begin
    perform public.guardar_stakeholder(null, null, 'Promotor Solar QA', 'Ana QA', 'Directora', 'Moçambique',
      'solar', 'promotor', null, 4::smallint, 'nova', null, null, null, 'Evento QA', false, 'Sheinaz', true);
    raise exception '1: activo sem acção aceite';
  exception when check_violation then null;
  end;
  v_st := public.guardar_stakeholder(null, null, 'Promotor Solar QA', 'Ana QA', 'Directora', 'Moçambique',
    'solar', 'promotor', 'Financiar 20 MW', 4::smallint, 'nova', '2026-10-01', 'Enviar resumo do projecto',
    '2026-10-10', 'Evento QA', false, 'Sheinaz', true);
  insert into qa values ('st', v_st::text);

  -- 2. Oportunidade: sem próxima acção não entra; valor sem evidência não entra.
  begin
    perform public.guardar_oportunidade(null, null, 'Parque solar QA', 'Promotor Solar QA', 'solar',
      'Precisa de capital', 'evento', 'alta', null, null, 'USD', null, null, null, 'Sheinaz');
    raise exception '2: sem acção aceite';
  exception when check_violation then null;
  end;
  begin
    perform public.guardar_oportunidade(null, null, 'Parque solar QA', 'Promotor Solar QA', 'solar',
      'Precisa de capital', 'evento', 'alta', 100000, 250000, 'USD', null, 'Ligar ao promotor', '2026-10-08', 'Sheinaz');
    raise exception '2: valor sem evidência aceite';
  exception when check_violation then null;
  end;
  v_op := public.guardar_oportunidade(null, null, 'Parque solar QA', 'Promotor Solar QA', 'solar',
    'Precisa de capital', 'evento', 'alta', 100000, 250000, 'USD', 'Proposta de honorários semelhante (QA)',
    'Ligar ao promotor', '2026-10-08', 'Sheinaz');
  insert into qa values ('op', v_op::text);
  if (select fase || '/' || revisao from public.ceno_oportunidades where id = v_op) <> 'sinal/1' then
    raise exception '2: não nasceu no sinal';
  end if;

  -- 3. Qualificar sem score é recusado; com 20 (incubação) também; com 30 (B) passa e abre a sala.
  begin
    perform public.mudar_fase_ceno(v_op, 1, 'qualificada', null, null);
    raise exception '3: qualificada sem score';
  exception when sqlstate '22023' then null;
  end;
  r := public.avaliar_oportunidade(v_op, 1, 3::smallint, 3::smallint, 2::smallint, 2::smallint,
    3::smallint, 2::smallint, 3::smallint, 2::smallint);
  if (select prioridade from public.ceno_oportunidades where id = v_op) <> 'incubacao' then
    raise exception '3: prioridade com 20';
  end if;
  begin
    perform public.mudar_fase_ceno(v_op, r, 'qualificada', null, null);
    raise exception '3: qualificada com 20';
  exception when sqlstate '22023' then null;
  end;
  r := public.avaliar_oportunidade(v_op, r, 4::smallint, 4::smallint, 4::smallint, 3::smallint,
    4::smallint, 4::smallint, 3::smallint, 4::smallint);
  if (select score_total || prioridade from public.ceno_oportunidades where id = v_op) <> '30B' then
    raise exception '3: score/prioridade com 30';
  end if;
  r := public.mudar_fase_ceno(v_op, r, 'qualificada', 'Comité aprovou', null);
  if (select count(*) from public.ceno_documentos where oportunidade_id = v_op) <> 12 then
    raise exception '3: sala documental não aberta';
  end if;
  if not exists (select 1 from public.ceno_registos where oportunidade_id = v_op and tipo = 'fase'
                 and metadata ->> 'para' = 'qualificada') then
    raise exception '3: mudança de fase sem registo';
  end if;

  -- 4. Revisão antiga: 40001.
  begin
    perform public.mudar_fase_ceno(v_op, 1, 'estruturacao', null, null);
    raise exception '4: revisão antiga aceite';
  exception when sqlstate '40001' then null;
  end;

  -- 5. Memo: secção desconhecida é recusada; as conhecidas gravam.
  begin
    perform public.guardar_memo_ceno(v_op, r, '{"segredo": "x"}'::jsonb);
    raise exception '5: secção desconhecida aceite';
  exception when sqlstate '22023' then null;
  end;
  r := public.guardar_memo_ceno(v_op, r, '{"oportunidade": "Parque solar de 20 MW", "riscos": "Licença ambiental"}'::jsonb);

  -- 6. Ligar stakeholder, registar decisão, pasta com ligação http é recusada, https entra.
  perform public.ligar_stakeholder(v_op, v_st, 'decisor');
  perform public.registar_ceno(v_op, 'decisao', 'avancar', 'Comité: avançar para estruturação.');
  begin
    perform public.guardar_documento_ceno(v_op, 5::smallint, 'em_curso', 'http://inseguro.test/x', null);
    raise exception '6: ligação http aceite';
  exception when check_violation then null;
  end;
  perform public.guardar_documento_ceno(v_op, 5::smallint, 'em_curso', 'https://exemplo.sharepoint.test/modelo', 'v1');

  -- 7. Perdida exige motivo.
  begin
    perform public.mudar_fase_ceno(v_op, r, 'perdida', null, null);
    raise exception '7: perdida sem motivo';
  exception when sqlstate '22023' then null;
  end;

  -- 8. O audit_log (legível pela equipa) não leva conteúdo.
  if exists (select 1 from public.audit_log where action like 'ceno.%' and (before is not null or after is not null)) then
    raise exception '8: conteúdo no audit_log';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- B. Um administrador SEM o módulo: não vê nada, não escreve nada
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000cc02', true);

do $$
declare v_op uuid := (select valor::uuid from qa where chave = 'op');
begin
  if public.tem_modulo('energia') then raise exception 'B0: admin tem o módulo'; end if;
  if (select count(*) from public.ceno_oportunidades) <> 0
     or (select count(*) from public.ceno_stakeholders) <> 0
     or (select count(*) from public.ceno_registos) <> 0
     or (select count(*) from public.ceno_documentos) <> 0
     or (select count(*) from public.ceno_oportunidade_stakeholders) <> 0
     or (select count(*) from public.acessos_modulo) <> 0 then
    raise exception 'B1: o admin vê dados do espaço';
  end if;
  begin
    perform public.guardar_oportunidade(null, null, 'Intrusa', null, 'gas', null, null, 'baixa',
      null, null, 'USD', null, 'x', '2026-10-09', null);
    raise exception 'B2: admin sem módulo escreveu';
  exception when sqlstate '42501' then null;
  end;
  begin
    perform public.registar_ceno(v_op, 'nota', null, 'espreitar');
    raise exception 'B3: admin escreveu no registo dela';
  exception when sqlstate '42501' then null;
  end;
end;
$$;

-- ---------------------------------------------------------------------------
-- C. Outra pessoa COM o módulo: tem o seu espaço, não o dela
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000cc03', true);

do $$
declare v_op uuid := (select valor::uuid from qa where chave = 'op');
begin
  if (select count(*) from public.ceno_oportunidades) <> 0 then
    raise exception 'C1: outra pessoa vê as oportunidades dela';
  end if;
  begin
    perform public.registar_ceno(v_op, 'nota', null, 'espreitar');
    raise exception 'C2: escreveu na oportunidade dela';
  exception when sqlstate 'P0002' then null;
  end;
  begin
    perform public.guardar_memo_ceno(v_op, 99, '{}'::jsonb);
    raise exception 'C3: tocou no memo dela';
  exception when sqlstate 'P0002' then null;
  end;
end;
$$;

-- ---------------------------------------------------------------------------
-- E. Revisões ECC: leitura não escreve; palavra-passe provisória fecha o
--    espaço mesmo pela API; o audit_log não mostra o espaço à equipa; o score
--    de uma oportunidade qualificada não desce abaixo de 24.
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000cc04', true);

do $$
begin
  begin
    perform public.guardar_oportunidade(null, null, 'Leitura', null, 'gas', null, null, 'baixa',
      null, null, 'USD', null, 'x', '2026-10-09', null);
    raise exception 'E1: leitura escreveu no espaço';
  exception when sqlstate '42501' then null;
  end;
end;
$$;

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000cc01', true);
select set_config('request.jwt.claims', '{"app_metadata": {"trocar_palavra_passe": true}}', true);

do $$
declare v_op uuid := (select valor::uuid from qa where chave = 'op');
begin
  if public.tem_modulo('energia') then raise exception 'E2: troca pendente mantém o módulo'; end if;
  if (select count(*) from public.ceno_oportunidades) <> 0 then
    raise exception 'E3: troca pendente ainda lê pela API';
  end if;
  begin
    perform public.registar_ceno(v_op, 'nota', null, 'antes de trocar');
    raise exception 'E4: troca pendente escreveu';
  exception when sqlstate '42501' then null;
  end;
end;
$$;

select set_config('request.jwt.claims', '{"app_metadata": {"trocar_palavra_passe": false}}', true);

do $$
declare v_op uuid := (select valor::uuid from qa where chave = 'op'); r int;
begin
  if not public.tem_modulo('energia') then raise exception 'E5: depois de trocar, sem módulo'; end if;
  r := (select revisao from public.ceno_oportunidades where id = v_op);
  begin
    perform public.avaliar_oportunidade(v_op, r, 0::smallint, 0::smallint, 0::smallint, 0::smallint,
      0::smallint, 0::smallint, 0::smallint, 0::smallint);
    raise exception 'E6: score de uma qualificada desceu abaixo de 24';
  exception when sqlstate '22023' then null;
  end;
  begin
    perform public.guardar_memo_ceno(v_op, r, jsonb_build_object(
      'oportunidade', repeat('ç', 4000), 'organizacao', repeat('ç', 4000), 'problema', repeat('ç', 4000),
      'solucao', repeat('ç', 4000), 'valor', repeat('ç', 4000), 'receita', repeat('ç', 4000),
      'recursos', repeat('ç', 4000), 'dependencias', repeat('ç', 4000), 'riscos', repeat('ç', 4000)));
    raise exception 'E7: memo acima de 64 KB aceite';
  exception when sqlstate '22023' then null;
  end;
end;
$$;

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000cc02', true);

do $$
begin
  if exists (select 1 from public.audit_log where entity_type = 'ceno') then
    raise exception 'E8: a equipa vê a actividade do espaço no audit_log';
  end if;
end;
$$;

reset role;
do $$
begin
  if not exists (select 1 from public.audit_log where entity_type = 'ceno') then
    raise exception 'E9: o dono da base deixou de ver a auditoria do espaço';
  end if;
end;
$$;
set local role authenticated;

-- ---------------------------------------------------------------------------
-- D. Direitos: o visitante anónimo não executa nada; o perfil inactivo perde o acesso
-- ---------------------------------------------------------------------------
reset role;

do $$
begin
  if has_function_privilege('anon', 'public.guardar_oportunidade(uuid, integer, text, text, text, text, text, text, numeric, numeric, text, text, text, date, text)', 'execute')
     or has_function_privilege('anon', 'public.tem_modulo(text)', 'execute')
     or has_function_privilege('authenticated', 'public.exigir_modulo(text)', 'execute')
     or has_table_privilege('authenticated', 'public.ceno_oportunidades', 'insert')
     or has_table_privilege('authenticated', 'public.ceno_oportunidades', 'update')
     or has_table_privilege('authenticated', 'public.acessos_modulo', 'insert') then
    raise exception 'D1: direitos a mais';
  end if;
end;
$$;

update public.profiles set active = false where id = '00000000-0000-0000-0000-00000000cc01';
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000cc01', true);

do $$
begin
  if public.tem_modulo('energia') then raise exception 'D2: perfil inactivo mantém o módulo'; end if;
  if (select count(*) from public.ceno_oportunidades) <> 0 then
    raise exception 'D3: perfil inactivo ainda lê';
  end if;
end;
$$;

reset role;
select 'energia-comportamento: tudo verde' as resultado;
rollback;
