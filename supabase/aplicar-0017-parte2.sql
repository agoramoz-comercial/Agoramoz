


-- APLICAR NO SQL EDITOR DO SUPABASE — projecto nixltrbdplqjadfytryd
-- 0017 em DUAS PARTES — PARTE 2 de 2: funções de escrita do Espaço CEnO (exige a parte 1)
-- As duas partes juntas são a migração 0017 palavra por palavra (um teste
-- garante-o). Ambas são repetíveis: pode correr cada uma as vezes que quiser.
-- 1. No GitHub, botão «Copy raw file» (ou Raw, Ctrl+A, Ctrl+C).
-- 2. SQL Editor: consulta NOVA e vazia, colar, Run. Esperado: «Success».
-- 3. Depois, verificar-estado.sql: a linha 29 tem de dizer «ok».
-- ===== fim do cabeçalho: daqui para baixo é a migração 0017, sem alterações =====
-- ---------------------------------------------------------------------------
-- Funções de escrita
-- ---------------------------------------------------------------------------

-- Cria (p_id nulo) ou altera um stakeholder.
create or replace function public.guardar_stakeholder(
  p_id uuid,
  p_revisao integer,
  p_organizacao text,
  p_pessoa text,
  p_cargo text,
  p_pais text,
  p_sector text,
  p_tipo text,
  p_interesse text,
  p_poder smallint,
  p_relacao text,
  p_ultima date,
  p_proxima_accao text,
  p_proxima_data date,
  p_origem text,
  p_consentimento boolean,
  p_responsavel text,
  p_activo boolean
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  s public.ceno_stakeholders;
  v_id uuid;
begin
  perform public.exigir_modulo('energia');

  if p_id is null then
    insert into public.ceno_stakeholders
      (dono, organizacao, pessoa, cargo, pais, sector, tipo, interesse, poder_decisao, relacao,
       ultima_interacao, proxima_accao, proxima_data, origem_dados, consentimento, responsavel, activo)
    values
      (auth.uid(), trim(p_organizacao), nullif(trim(p_pessoa), ''), nullif(trim(p_cargo), ''),
       nullif(trim(p_pais), ''), nullif(trim(p_sector), ''), p_tipo, nullif(trim(p_interesse), ''),
       p_poder, coalesce(p_relacao, 'nova'), p_ultima, nullif(trim(p_proxima_accao), ''), p_proxima_data,
       nullif(trim(p_origem), ''), coalesce(p_consentimento, false), nullif(trim(p_responsavel), ''),
       coalesce(p_activo, true))
    returning id into v_id;
  else
    select * into s from public.ceno_stakeholders where id = p_id and dono = auth.uid() for update;
    if not found then
      raise exception 'Stakeholder não encontrado.' using errcode = 'P0002';
    end if;
    if s.revisao is distinct from p_revisao then
      raise exception 'O registo mudou entretanto.' using errcode = '40001';
    end if;
    update public.ceno_stakeholders
       set organizacao = trim(p_organizacao),
           pessoa = nullif(trim(p_pessoa), ''),
           cargo = nullif(trim(p_cargo), ''),
           pais = nullif(trim(p_pais), ''),
           sector = nullif(trim(p_sector), ''),
           tipo = p_tipo,
           interesse = nullif(trim(p_interesse), ''),
           poder_decisao = p_poder,
           relacao = coalesce(p_relacao, 'nova'),
           ultima_interacao = p_ultima,
           proxima_accao = nullif(trim(p_proxima_accao), ''),
           proxima_data = p_proxima_data,
           origem_dados = nullif(trim(p_origem), ''),
           consentimento = coalesce(p_consentimento, false),
           responsavel = nullif(trim(p_responsavel), ''),
           activo = coalesce(p_activo, true),
           revisao = revisao + 1
     where id = p_id;
    v_id := p_id;
  end if;

  insert into public.audit_log (actor_id, actor_type, action, entity_type, entity_id)
  values (auth.uid(), 'user', 'ceno.guardar_stakeholder', 'ceno', v_id::text);
  return v_id;
end;
$$;

-- Cria (p_id nulo; nasce na etapa «sinal») ou altera os dados de base.
create or replace function public.guardar_oportunidade(
  p_id uuid,
  p_revisao integer,
  p_titulo text,
  p_organizacao text,
  p_sector text,
  p_problema text,
  p_fonte text,
  p_urgencia text,
  p_valor_min numeric,
  p_valor_max numeric,
  p_moeda text,
  p_valor_evidencia text,
  p_proxima_accao text,
  p_proxima_data date,
  p_responsavel text
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  o public.ceno_oportunidades;
  v_id uuid;
begin
  perform public.exigir_modulo('energia');

  if p_id is null then
    insert into public.ceno_oportunidades
      (dono, titulo, organizacao, sector, problema, fonte, urgencia, valor_min, valor_max, moeda,
       valor_evidencia, proxima_accao, proxima_data, responsavel)
    values
      (auth.uid(), trim(p_titulo), nullif(trim(p_organizacao), ''), p_sector, nullif(trim(p_problema), ''),
       p_fonte, coalesce(p_urgencia, 'media'), p_valor_min, p_valor_max, coalesce(p_moeda, 'USD'),
       nullif(trim(p_valor_evidencia), ''), nullif(trim(p_proxima_accao), ''), p_proxima_data,
       nullif(trim(p_responsavel), ''))
    returning id into v_id;
  else
    select * into o from public.ceno_oportunidades where id = p_id and dono = auth.uid() for update;
    if not found then
      raise exception 'Oportunidade não encontrada.' using errcode = 'P0002';
    end if;
    if o.revisao is distinct from p_revisao then
      raise exception 'O registo mudou entretanto.' using errcode = '40001';
    end if;
    update public.ceno_oportunidades
       set titulo = trim(p_titulo),
           organizacao = nullif(trim(p_organizacao), ''),
           sector = p_sector,
           problema = nullif(trim(p_problema), ''),
           fonte = p_fonte,
           urgencia = coalesce(p_urgencia, 'media'),
           valor_min = p_valor_min,
           valor_max = p_valor_max,
           moeda = coalesce(p_moeda, 'USD'),
           valor_evidencia = nullif(trim(p_valor_evidencia), ''),
           proxima_accao = nullif(trim(p_proxima_accao), ''),
           proxima_data = p_proxima_data,
           responsavel = nullif(trim(p_responsavel), ''),
           ultima_actividade = now(),
           revisao = revisao + 1
     where id = p_id;
    v_id := p_id;
  end if;

  insert into public.audit_log (actor_id, actor_type, action, entity_type, entity_id)
  values (auth.uid(), 'user', 'ceno.guardar_oportunidade', 'ceno', v_id::text);
  return v_id;
end;
$$;

-- O score de qualificação. Devolve a revisão nova.
create or replace function public.avaliar_oportunidade(
  p_id uuid,
  p_revisao integer,
  p_dor smallint,
  p_urgencia smallint,
  p_decisor smallint,
  p_capacidade smallint,
  p_adequacao smallint,
  p_controlo smallint,
  p_informacao smallint,
  p_valor smallint
)
returns integer
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  o public.ceno_oportunidades;
begin
  perform public.exigir_modulo('energia');

  select * into o from public.ceno_oportunidades where id = p_id and dono = auth.uid() for update;
  if not found then
    raise exception 'Oportunidade não encontrada.' using errcode = 'P0002';
  end if;
  if o.revisao is distinct from p_revisao then
    raise exception 'O registo mudou entretanto.' using errcode = '40001';
  end if;

  update public.ceno_oportunidades
     set c_dor = p_dor, c_urgencia = p_urgencia, c_decisor = p_decisor, c_capacidade = p_capacidade,
         c_adequacao = p_adequacao, c_controlo = p_controlo, c_informacao = p_informacao, c_valor = p_valor,
         ultima_actividade = now(),
         revisao = revisao + 1
   where id = p_id;

  insert into public.audit_log (actor_id, actor_type, action, entity_type, entity_id)
  values (auth.uid(), 'user', 'ceno.avaliar_oportunidade', 'ceno', p_id::text);
  return o.revisao + 1;
end;
$$;

-- Mudar de etapa, com os critérios de passagem. Devolve a revisão nova.
create or replace function public.mudar_fase_ceno(
  p_id uuid,
  p_revisao integer,
  p_fase text,
  p_nota text,
  p_motivo text
)
returns integer
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  o public.ceno_oportunidades;
  v_score smallint;
begin
  perform public.exigir_modulo('energia');

  if p_fase is null or (public.ceno_ordem_fase(p_fase) is null and p_fase not in ('perdida', 'arquivada')) then
    raise exception 'Etapa inválida.' using errcode = '22023';
  end if;

  select * into o from public.ceno_oportunidades where id = p_id and dono = auth.uid() for update;
  if not found then
    raise exception 'Oportunidade não encontrada.' using errcode = 'P0002';
  end if;
  if o.revisao is distinct from p_revisao then
    raise exception 'O registo mudou entretanto.' using errcode = '40001';
  end if;
  if o.fase = p_fase then
    raise exception 'A oportunidade já está nesta etapa.' using errcode = '22023';
  end if;

  -- Da etapa «qualificada» em diante: os oito critérios avaliados e score ≥ 24 (B ou A).
  v_score := o.score_total;
  if public.ceno_ordem_fase(p_fase) >= 4 and (v_score is null or v_score < 24) then
    raise exception 'Para qualificar, avalie os oito critérios: o score tem de ser pelo menos 24 (prioridade B).'
      using errcode = '22023';
  end if;
  if p_fase = 'perdida' and (p_motivo is null or length(trim(p_motivo)) < 3) then
    raise exception 'Indique o motivo da perda.' using errcode = '22023';
  end if;

  update public.ceno_oportunidades
     set fase = p_fase,
         fase_desde = now(),
         motivo_perda = case when p_fase = 'perdida' then trim(p_motivo) else motivo_perda end,
         ultima_actividade = now(),
         revisao = revisao + 1
   where id = p_id;

  -- Qualificada: a sala documental abre-se com as doze pastas.
  if public.ceno_ordem_fase(p_fase) >= 4 then
    insert into public.ceno_documentos (oportunidade_id, pasta, dono)
    select p_id, n, auth.uid() from generate_series(1, 12) as n
    on conflict (oportunidade_id, pasta) do nothing;
  end if;

  insert into public.ceno_registos (dono, oportunidade_id, tipo, corpo, metadata)
  values (auth.uid(), p_id, 'fase', nullif(trim(p_nota), ''),
          jsonb_build_object('de', o.fase, 'para', p_fase));

  insert into public.audit_log (actor_id, actor_type, action, entity_type, entity_id)
  values (auth.uid(), 'user', 'ceno.mudar_fase', 'ceno', p_id::text);
  return o.revisao + 1;
end;
$$;

-- O Opportunity Memo: só as doze secções conhecidas, texto até 4000 cada.
create or replace function public.guardar_memo_ceno(p_id uuid, p_revisao integer, p_memo jsonb)
returns integer
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  o public.ceno_oportunidades;
  v_chave text;
  v_valor jsonb;
begin
  perform public.exigir_modulo('energia');

  if p_memo is null or jsonb_typeof(p_memo) <> 'object' then
    raise exception 'Memo inválido.' using errcode = '22023';
  end if;
  for v_chave, v_valor in select * from jsonb_each(p_memo) loop
    if v_chave not in ('oportunidade', 'organizacao', 'problema', 'solucao', 'valor', 'receita',
                       'recursos', 'dependencias', 'riscos', 'proxima_decisao', 'responsavel', 'prazo') then
      raise exception 'Secção do memo desconhecida.' using errcode = '22023';
    end if;
    if jsonb_typeof(v_valor) <> 'string' or length(v_valor #>> '{}') > 4000 then
      raise exception 'Secção do memo inválida.' using errcode = '22023';
    end if;
  end loop;

  select * into o from public.ceno_oportunidades where id = p_id and dono = auth.uid() for update;
  if not found then
    raise exception 'Oportunidade não encontrada.' using errcode = 'P0002';
  end if;
  if o.revisao is distinct from p_revisao then
    raise exception 'O registo mudou entretanto.' using errcode = '40001';
  end if;

  update public.ceno_oportunidades
     set memo = p_memo, ultima_actividade = now(), revisao = revisao + 1
   where id = p_id;

  insert into public.audit_log (actor_id, actor_type, action, entity_type, entity_id)
  values (auth.uid(), 'user', 'ceno.guardar_memo', 'ceno', p_id::text);
  return o.revisao + 1;
end;
$$;

create or replace function public.ligar_stakeholder(p_oportunidade uuid, p_stakeholder uuid, p_papel text)
returns void
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  perform public.exigir_modulo('energia');

  perform 1 from public.ceno_oportunidades where id = p_oportunidade and dono = auth.uid();
  if not found then
    raise exception 'Oportunidade não encontrada.' using errcode = 'P0002';
  end if;
  perform 1 from public.ceno_stakeholders where id = p_stakeholder and dono = auth.uid();
  if not found then
    raise exception 'Stakeholder não encontrado.' using errcode = 'P0002';
  end if;

  insert into public.ceno_oportunidade_stakeholders (oportunidade_id, stakeholder_id, dono, papel)
  values (p_oportunidade, p_stakeholder, auth.uid(), p_papel)
  on conflict (oportunidade_id, stakeholder_id) do update set papel = excluded.papel;

  update public.ceno_oportunidades set ultima_actividade = now() where id = p_oportunidade;

  insert into public.audit_log (actor_id, actor_type, action, entity_type, entity_id)
  values (auth.uid(), 'user', 'ceno.ligar_stakeholder', 'ceno', p_oportunidade::text);
end;
$$;

create or replace function public.desligar_stakeholder(p_oportunidade uuid, p_stakeholder uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  perform public.exigir_modulo('energia');

  delete from public.ceno_oportunidade_stakeholders
   where oportunidade_id = p_oportunidade and stakeholder_id = p_stakeholder and dono = auth.uid();
  if not found then
    raise exception 'Ligação não encontrada.' using errcode = 'P0002';
  end if;

  insert into public.audit_log (actor_id, actor_type, action, entity_type, entity_id)
  values (auth.uid(), 'user', 'ceno.desligar_stakeholder', 'ceno', p_oportunidade::text);
end;
$$;

-- Nota, reunião (ata) ou decisão do comité.
create or replace function public.registar_ceno(p_oportunidade uuid, p_tipo text, p_decisao text, p_corpo text)
returns bigint
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_id bigint;
begin
  perform public.exigir_modulo('energia');

  if p_tipo not in ('nota', 'reuniao', 'decisao') then
    raise exception 'Tipo de registo inválido.' using errcode = '22023';
  end if;
  perform 1 from public.ceno_oportunidades where id = p_oportunidade and dono = auth.uid();
  if not found then
    raise exception 'Oportunidade não encontrada.' using errcode = 'P0002';
  end if;

  insert into public.ceno_registos (dono, oportunidade_id, tipo, decisao, corpo)
  values (auth.uid(), p_oportunidade, p_tipo, case when p_tipo = 'decisao' then p_decisao end,
          nullif(trim(p_corpo), ''))
  returning id into v_id;

  update public.ceno_oportunidades set ultima_actividade = now() where id = p_oportunidade;

  insert into public.audit_log (actor_id, actor_type, action, entity_type, entity_id)
  values (auth.uid(), 'user', 'ceno.registar', 'ceno', p_oportunidade::text);
  return v_id;
end;
$$;

-- Uma pasta da sala documental: estado, ligação https e nota.
create or replace function public.guardar_documento_ceno(
  p_oportunidade uuid,
  p_pasta smallint,
  p_estado text,
  p_ligacao text,
  p_nota text
)
returns void
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  perform public.exigir_modulo('energia');

  perform 1 from public.ceno_oportunidades where id = p_oportunidade and dono = auth.uid();
  if not found then
    raise exception 'Oportunidade não encontrada.' using errcode = 'P0002';
  end if;

  insert into public.ceno_documentos (oportunidade_id, pasta, dono, estado, ligacao, nota)
  values (p_oportunidade, p_pasta, auth.uid(), p_estado, nullif(trim(p_ligacao), ''), nullif(trim(p_nota), ''))
  on conflict (oportunidade_id, pasta)
    do update set estado = excluded.estado, ligacao = excluded.ligacao, nota = excluded.nota;

  insert into public.ceno_registos (dono, oportunidade_id, tipo, metadata)
  values (auth.uid(), p_oportunidade, 'documento', jsonb_build_object('pasta', p_pasta, 'estado', p_estado));

  update public.ceno_oportunidades set ultima_actividade = now() where id = p_oportunidade;

  insert into public.audit_log (actor_id, actor_type, action, entity_type, entity_id)
  values (auth.uid(), 'user', 'ceno.guardar_documento', 'ceno', p_oportunidade::text);
end;
$$;

revoke all on function public.guardar_stakeholder(uuid, integer, text, text, text, text, text, text, text, smallint, text, date, text, date, text, boolean, text, boolean) from public, anon;
revoke all on function public.guardar_oportunidade(uuid, integer, text, text, text, text, text, text, numeric, numeric, text, text, text, date, text) from public, anon;
revoke all on function public.avaliar_oportunidade(uuid, integer, smallint, smallint, smallint, smallint, smallint, smallint, smallint, smallint) from public, anon;
revoke all on function public.mudar_fase_ceno(uuid, integer, text, text, text) from public, anon;
revoke all on function public.guardar_memo_ceno(uuid, integer, jsonb) from public, anon;
revoke all on function public.ligar_stakeholder(uuid, uuid, text) from public, anon;
revoke all on function public.desligar_stakeholder(uuid, uuid) from public, anon;
revoke all on function public.registar_ceno(uuid, text, text, text) from public, anon;
revoke all on function public.guardar_documento_ceno(uuid, smallint, text, text, text) from public, anon;
grant execute on function public.guardar_stakeholder(uuid, integer, text, text, text, text, text, text, text, smallint, text, date, text, date, text, boolean, text, boolean) to authenticated;
grant execute on function public.guardar_oportunidade(uuid, integer, text, text, text, text, text, text, numeric, numeric, text, text, text, date, text) to authenticated;
grant execute on function public.avaliar_oportunidade(uuid, integer, smallint, smallint, smallint, smallint, smallint, smallint, smallint, smallint) to authenticated;
grant execute on function public.mudar_fase_ceno(uuid, integer, text, text, text) to authenticated;
grant execute on function public.guardar_memo_ceno(uuid, integer, jsonb) to authenticated;
grant execute on function public.ligar_stakeholder(uuid, uuid, text) to authenticated;
grant execute on function public.desligar_stakeholder(uuid, uuid) to authenticated;
grant execute on function public.registar_ceno(uuid, text, text, text) to authenticated;
grant execute on function public.guardar_documento_ceno(uuid, smallint, text, text, text) to authenticated;

-- As funções de escrita desistem de esperar por um lock ao fim de 4 s (0016).
alter function public.guardar_stakeholder(uuid, integer, text, text, text, text, text, text, text, smallint, text, date, text, date, text, boolean, text, boolean) set lock_timeout = '4s';
alter function public.guardar_oportunidade(uuid, integer, text, text, text, text, text, text, numeric, numeric, text, text, text, date, text) set lock_timeout = '4s';
alter function public.avaliar_oportunidade(uuid, integer, smallint, smallint, smallint, smallint, smallint, smallint, smallint, smallint) set lock_timeout = '4s';
alter function public.mudar_fase_ceno(uuid, integer, text, text, text) set lock_timeout = '4s';
alter function public.guardar_memo_ceno(uuid, integer, jsonb) set lock_timeout = '4s';
alter function public.ligar_stakeholder(uuid, uuid, text) set lock_timeout = '4s';
alter function public.desligar_stakeholder(uuid, uuid) set lock_timeout = '4s';
alter function public.registar_ceno(uuid, text, text, text) set lock_timeout = '4s';
alter function public.guardar_documento_ceno(uuid, smallint, text, text, text) set lock_timeout = '4s';

notify pgrst, 'reload schema';
