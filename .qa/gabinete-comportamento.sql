-- ============================================================================
-- QA da 0018 — Gabinete do Fundador. Postgres local descartável (NUNCA em
-- produção), com a 0017 já aplicada:
--
--   psql … -v ON_ERROR_STOP=1 -f .qa/gabinete-comportamento.sql
--
-- Cada bloco levanta excepção se o comportamento não for o esperado. Dados
-- sintéticos; a transacção é desfeita no fim.
--   dd01 — o dono do gabinete (admin, com o módulo `direcao`)
--   dd02 — outro administrador SEM o módulo
--   dd03 — a dona do Espaço CEnO (comercial, só com `energia`)
--   dd04 — outra pessoa COM `direcao` (o módulo não abre o gabinete alheio)
-- ============================================================================

begin;

insert into auth.users (id) values
  ('00000000-0000-0000-0000-00000000dd01'),
  ('00000000-0000-0000-0000-00000000dd02'),
  ('00000000-0000-0000-0000-00000000dd03'),
  ('00000000-0000-0000-0000-00000000dd04');
insert into public.profiles (id, role, display_name) values
  ('00000000-0000-0000-0000-00000000dd01', 'admin', 'QA Fundador'),
  ('00000000-0000-0000-0000-00000000dd02', 'admin', 'QA Admin'),
  ('00000000-0000-0000-0000-00000000dd03', 'comercial', 'QA Energia'),
  ('00000000-0000-0000-0000-00000000dd04', 'admin', 'QA Outro');
insert into public.acessos_modulo (user_id, modulo) values
  ('00000000-0000-0000-0000-00000000dd01', 'direcao'),
  ('00000000-0000-0000-0000-00000000dd03', 'energia'),
  ('00000000-0000-0000-0000-00000000dd04', 'direcao');

create temporary table qa (chave text primary key, valor text);
grant all on qa to public;

-- ---------------------------------------------------------------------------
-- A. O dono trabalha no gabinete
-- ---------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000dd01', true);
select set_config('request.jwt.claims', '{}', true);

do $$
declare v_dec uuid; v_pri uuid; v_proj uuid; v_pes uuid; v_mov uuid; r int;
begin
  if not public.tem_modulo('direcao') then raise exception 'A0: o dono não tem o módulo'; end if;
  if public.tem_modulo('energia') then raise exception 'A0b: o dono vê o módulo de energia'; end if;

  -- 1. Decisão em aberto sem responsável/data: recusada; com eles, aceite.
  begin
    perform public.guardar_decisao(null, null, 'Escolher CRM', null, 'ceo', 'exige_minha', null,
      null, null, null, null, false, null);
    raise exception '1: decisão aberta sem responsável';
  exception when sqlstate '22023' then null;
  end;
  v_dec := public.guardar_decisao(null, null, 'Escolher CRM', 'Contexto', 'ceo', 'exige_minha', null,
    'Gerson', 'Sheinaz', 'Pipeline registado', '2026-10-14', true, null);
  insert into qa values ('dec', v_dec::text);

  -- 2. Fechar sem dizer o quê e quem: recusado; com isso, fica a data.
  begin
    perform public.guardar_decisao(v_dec, 1, 'Escolher CRM', null, 'ceo', 'decidida', null,
      'Gerson', null, null, '2026-10-14', true, null);
    raise exception '2: decidida sem decisão';
  exception when sqlstate '22023' then null;
  end;
  perform public.guardar_decisao(v_dec, 1, 'Escolher CRM', null, 'ceo', 'decidida', 'Listas primeiro',
    'Operações', null, null, null, true, 'delegada');
  if (select decidida_em is null or quem_decidiu <> 'delegada' from public.gab_decisoes where id = v_dec) then
    raise exception '2b: decisão fechada sem data ou sem quem';
  end if;

  -- 3. Revisão desactualizada: 40001.
  begin
    perform public.guardar_decisao(v_dec, 1, 'Outra', null, 'ceo', 'eliminar', null,
      null, null, null, null, false, null);
    raise exception '3: revisão desactualizada aceite';
  exception when sqlstate '40001' then null;
  end;

  -- 4. Prioridades: uma por tipo e trimestre.
  v_pri := public.guardar_prioridade(null, null, '2026-T4', 'comercial', 'Dez diagnósticos vendidos',
    'Diagnósticos/mês', '10', 'em_curso', null);
  begin
    perform public.guardar_prioridade(null, null, '2026-T4', 'comercial', 'Outra comercial',
      null, null, 'em_curso', null);
    raise exception '4: duas prioridades comerciais no mesmo trimestre';
  exception when sqlstate '22023' then null;
  end;
  begin
    perform public.guardar_prioridade(null, null, '2026-T5', 'empresarial', 'Trimestre inválido',
      null, null, 'em_curso', null);
    raise exception '4b: trimestre inválido aceite';
  exception when check_violation then null;
  end;

  -- 5. Projecto: não entra em implementação sem os sete critérios.
  v_proj := public.guardar_projeto(null, null, 'Portal do cliente', 'Cliente QA', 'arquitetura',
    'Gerson', null, null, null, 'MZN', 500000, 100000, 50000, 200000,
    array[true, true, true, false, false, true, true], 'medio', 'Rever arquitetura', '2026-10-10', null);
  insert into qa values ('proj', v_proj::text);
  begin
    perform public.guardar_projeto(v_proj, 1, 'Portal do cliente', 'Cliente QA', 'implementacao',
      'Gerson', null, null, null, 'MZN', 500000, 100000, 50000, 200000,
      array[true, true, true, false, false, true, true], 'medio', 'Arrancar', '2026-10-10', null);
    raise exception '5: implementação sem prontidão';
  exception when sqlstate '22023' then
    if sqlerrm not like '%capacidade reservada%critérios de aceitação%' then
      raise exception '5b: a mensagem não diz o que falta: %', sqlerrm;
    end if;
  end;
  perform public.guardar_projeto(v_proj, 1, 'Portal do cliente', 'Cliente QA', 'implementacao',
    'Gerson', null, null, null, 'MZN', 500000, 100000, 50000, 200000,
    array[true, true, true, true, true, true, true], 'medio', 'Arrancar', '2026-10-10', null);
  if (select margem_bruta from public.gab_projetos where id = v_proj) <> 300000 then
    raise exception '5c: margem bruta errada';
  end if;

  -- 6. Receita: recebida ≤ faturada ≤ contratada.
  begin
    perform public.guardar_projeto(null, null, 'Inconsistente', null, 'diagnostico', null, null, null, null,
      'USD', 100, 200, null, null, array[false, false, false, false, false, false, false], 'baixo',
      'x', '2026-10-10', null);
    raise exception '6: faturada acima da contratada';
  exception when sqlstate '22023' then null;
  end;

  -- 7. Tesouraria: saldo é facto na data; recebimento previsto.
  v_mov := public.guardar_movimento(null, null, 'saldo', 'Banco', null, 250000, 'MZN', '2026-10-01', null);
  if (select data_efectiva from public.gab_tesouraria where id = v_mov) <> '2026-10-01' then
    raise exception '7: saldo sem data efectiva';
  end if;
  perform public.guardar_movimento(null, null, 'recebimento', 'Fatura 1', v_proj, 50000, 'MZN', '2026-10-20', null);
  begin
    perform public.guardar_movimento(null, null, 'pagamento', 'Zero', null, 0, 'MZN', '2026-10-20', null);
    raise exception '7b: pagamento de zero aceite';
  exception when check_violation then null;
  end;

  -- 8. Capacidade: pessoa, alocação, actualização.
  v_pes := public.guardar_pessoa(null, null, 'Dev QA', 'Programador', 'tecnologia', 40, true);
  insert into qa values ('pes', v_pes::text);
  perform public.guardar_alocacao(v_pes, v_proj, 20, null);
  perform public.guardar_alocacao(v_pes, v_proj, 30, '2026-12-31');
  if (select horas_semana from public.gab_alocacoes where pessoa_id = v_pes and projeto_id = v_proj) <> 30 then
    raise exception '8: alocação não actualizada';
  end if;

  -- 9. O audit_log não leva conteúdo.
  if exists (select 1 from public.audit_log where action like 'gabinete.%' and (before is not null or after is not null)) then
    raise exception '9: conteúdo no audit_log';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- B. Administrador SEM o módulo: não vê nada e não escreve
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000dd02', true);

do $$
declare v_proj uuid := (select valor::uuid from qa where chave = 'proj');
begin
  if (select count(*) from public.gab_decisoes) <> 0
     or (select count(*) from public.gab_prioridades) <> 0
     or (select count(*) from public.gab_projetos) <> 0
     or (select count(*) from public.gab_tesouraria) <> 0
     or (select count(*) from public.gab_pessoas) <> 0
     or (select count(*) from public.gab_alocacoes) <> 0 then
    raise exception 'B1: o admin vê o gabinete';
  end if;
  if exists (select 1 from public.audit_log where entity_type = 'gabinete') then
    raise exception 'B2: o admin vê a actividade do gabinete no audit_log';
  end if;
  begin
    perform public.guardar_movimento(null, null, 'saldo', 'Intruso', null, 1, 'MZN', '2026-10-01', null);
    raise exception 'B3: admin sem módulo escreveu';
  exception when sqlstate '42501' then null;
  end;
  begin
    perform public.remover_alocacao((select valor::uuid from qa where chave = 'pes'), v_proj);
    raise exception 'B4: admin sem módulo removeu';
  exception when sqlstate '42501' then null;
  end;
end;
$$;

-- ---------------------------------------------------------------------------
-- C. A dona do CEnO (só `energia`) também não entra
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000dd03', true);

do $$
begin
  if public.tem_modulo('direcao') then raise exception 'C1: energia abre o gabinete'; end if;
  if (select count(*) from public.gab_projetos) <> 0 then raise exception 'C2: energia lê o gabinete'; end if;
  begin
    perform public.guardar_pessoa(null, null, 'X', null, 'outro', 1, true);
    raise exception 'C3: energia escreveu no gabinete';
  exception when sqlstate '42501' then null;
  end;
end;
$$;

-- ---------------------------------------------------------------------------
-- D. Outra conta COM `direcao`: tem o seu gabinete, não o do dono
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000dd04', true);

do $$
declare v_proj uuid := (select valor::uuid from qa where chave = 'proj');
        v_pes uuid := (select valor::uuid from qa where chave = 'pes');
        v_meu uuid;
begin
  if (select count(*) from public.gab_projetos) <> 0 then raise exception 'D1: vê projectos alheios'; end if;
  begin
    perform public.guardar_projeto(v_proj, 2, 'Roubado', null, 'diagnostico', null, null, null, null, 'MZN',
      null, null, null, null, array[false, false, false, false, false, false, false], 'baixo', 'x', '2026-10-10', null);
    raise exception 'D2: alterou projecto alheio';
  exception when sqlstate 'P0002' then null;
  end;
  begin
    perform public.guardar_movimento(null, null, 'recebimento', 'Ligar a alheio', v_proj, 1, 'MZN', '2026-10-10', null);
    raise exception 'D3: ligou movimento a projecto alheio';
  exception when sqlstate 'P0002' then null;
  end;
  v_meu := public.guardar_pessoa(null, null, 'Minha', null, 'gestao', 10, true);
  begin
    perform public.guardar_alocacao(v_meu, v_proj, 5, null);
    raise exception 'D4: alocou a projecto alheio';
  exception when sqlstate 'P0002' then null;
  end;
  begin
    perform public.remover_alocacao(v_pes, v_proj);
    raise exception 'D5: removeu alocação alheia';
  exception when sqlstate 'P0002' then null;
  end;
end;
$$;

-- ---------------------------------------------------------------------------
-- E. Palavra-passe provisória por trocar: o gabinete fecha, mesmo pela API
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000dd01', true);
select set_config('request.jwt.claims', '{"app_metadata": {"trocar_palavra_passe": true}}', true);

do $$
begin
  if public.tem_modulo('direcao') then raise exception 'E1: troca pendente mantém o módulo'; end if;
  if (select count(*) from public.gab_decisoes) <> 0 then raise exception 'E2: troca pendente ainda lê'; end if;
  begin
    perform public.guardar_pessoa(null, null, 'X', null, 'outro', 1, true);
    raise exception 'E3: troca pendente escreveu';
  exception when sqlstate '42501' then null;
  end;
end;
$$;

select set_config('request.jwt.claims', '{}', true);

do $$
declare v_proj uuid := (select valor::uuid from qa where chave = 'proj');
        v_pes uuid := (select valor::uuid from qa where chave = 'pes');
begin
  if (select count(*) from public.gab_decisoes) <> 1 or (select count(*) from public.gab_projetos) <> 1
     or (select count(*) from public.gab_tesouraria) <> 2 or (select count(*) from public.gab_alocacoes) <> 1 then
    raise exception 'E4: o dono não vê exactamente o que registou';
  end if;
  perform public.remover_alocacao(v_pes, v_proj);
  if exists (select 1 from public.gab_alocacoes) then raise exception 'E5: alocação não removida'; end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- F. Direitos e visibilidade da auditoria
-- ---------------------------------------------------------------------------
reset role;

do $$
begin
  if has_function_privilege('anon', 'public.guardar_projeto(uuid, integer, text, text, text, text, text, text, text, text, numeric, numeric, numeric, numeric, boolean[], text, text, date, text)', 'execute')
     or has_function_privilege('anon', 'public.guardar_movimento(uuid, integer, text, text, uuid, numeric, text, date, date)', 'execute')
     or has_table_privilege('authenticated', 'public.gab_tesouraria', 'insert')
     or has_table_privilege('authenticated', 'public.gab_projetos', 'update')
     or has_table_privilege('anon', 'public.gab_decisoes', 'select') then
    raise exception 'F1: direitos a mais';
  end if;
  if not exists (select 1 from public.audit_log where entity_type = 'gabinete') then
    raise exception 'F2: o dono da base deixou de ver a auditoria do gabinete';
  end if;
  if exists (select 1 from public.acessos_modulo where modulo not in ('energia', 'direcao')) then
    raise exception 'F3: módulo desconhecido';
  end if;
end;
$$;

select 'gabinete-comportamento: tudo verde' as resultado;
rollback;
