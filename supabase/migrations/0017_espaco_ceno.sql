-- ============================================================================
-- 0017 — Espaço CEnO: o sistema de oportunidades da Chief Energy Officer
-- ============================================================================
-- Um espaço de trabalho no /admin que SÓ a dona vê: radar de mercado e
-- pipeline (a mesma tabela — o sinal é a etapa 0), base única de
-- stakeholders, score de qualificação, Opportunity Memo, sala documental e
-- registo de decisões.
--
-- Privacidade, por construção:
-- 1. O acesso ao espaço é uma linha em `acessos_modulo`, que só o dono da
--    base (SQL Editor) concede. Sem ela, nada — nem o admin.
-- 2. Cada linha tem `dono`; a RLS só devolve linhas com `dono = auth.uid()`.
--    Não há políticas de escrita: escreve-se só por estas funções, que
--    verificam o módulo e o dono.
-- 3. O `audit_log` é legível por toda a equipa: aqui leva só a acção e o id,
--    NUNCA conteúdo.
--
-- `dono` referencia auth.users com `on delete restrict`: apagar a conta não
-- apaga em silêncio o trabalho dela.
--
-- Idempotente: pode correr mais do que uma vez.
-- ============================================================================


-- ---------------------------------------------------------------------------
-- Acesso por módulo
-- ---------------------------------------------------------------------------

create table if not exists public.acessos_modulo (
  user_id uuid not null references auth.users(id) on delete cascade,
  modulo text not null check (modulo in ('energia')),
  concedido_em timestamptz not null default now(),
  primary key (user_id, modulo)
);

alter table public.acessos_modulo enable row level security;
revoke all on public.acessos_modulo from public, anon, authenticated, service_role;
grant select on public.acessos_modulo to authenticated;
drop policy if exists acessos_modulo_select on public.acessos_modulo;
create policy acessos_modulo_select on public.acessos_modulo
  for select to authenticated using (user_id = (select auth.uid()));

-- Quem está a pedir tem o módulo, um perfil activo, e já trocou a
-- palavra-passe provisória? A marca `trocar_palavra_passe` vem no JWT
-- (app_metadata, que o utilizador não edita). Sem esta condição, quem tivesse
-- a palavra-passe provisória lia o espaço pela API sem passar pelo site.
create or replace function public.tem_modulo(p_modulo text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_catalog
as $$
  select exists (
    select 1
      from public.acessos_modulo a
      join public.profiles p on p.id = a.user_id
     where a.user_id = auth.uid() and a.modulo = p_modulo and p.active
  )
  and coalesce(auth.jwt() -> 'app_metadata' ->> 'trocar_palavra_passe', 'false') <> 'true';
$$;

revoke all on function public.tem_modulo(text) from public, anon;
grant execute on function public.tem_modulo(text) to authenticated;

-- A guarda das funções de escrita: equipa activa E módulo concedido.
create or replace function public.exigir_modulo(p_modulo text)
returns void
language plpgsql
stable
security definer
set search_path = public, pg_catalog
as $$
begin
  perform public.exigir_papel(array['admin', 'comercial']::public.user_role[]);
  if not public.tem_modulo(p_modulo) then
    raise exception 'Sem acesso.' using errcode = '42501';
  end if;
end;
$$;

-- Guarda interna, como `exigir_papel`: só é chamada de dentro das funções.
revoke all on function public.exigir_modulo(text) from public, anon, authenticated;

-- A ordem das etapas do pipeline (as terminais ficam fora da escada).
create or replace function public.ceno_ordem_fase(p_fase text)
returns integer
language sql
immutable
set search_path = public, pg_catalog
as $$
  select case p_fase
    when 'sinal' then 0 when 'contacto' then 1 when 'descoberta' then 2
    when 'problema_validado' then 3 when 'qualificada' then 4 when 'estruturacao' then 5
    when 'preparacao' then 6 when 'proposta' then 7 when 'negociacao' then 8
    when 'acordo' then 9 when 'execucao' then 10 when 'valor_realizado' then 11
    else null end;
$$;

revoke all on function public.ceno_ordem_fase(text) from public, anon;
grant execute on function public.ceno_ordem_fase(text) to authenticated;


-- ---------------------------------------------------------------------------
-- Stakeholders — a base única (contactos, investidores, parceiros, clientes)
-- ---------------------------------------------------------------------------

create table if not exists public.ceno_stakeholders (
  id uuid primary key default extensions.gen_random_uuid(),
  dono uuid not null default auth.uid() references auth.users(id) on delete restrict,
  organizacao text not null check (length(trim(organizacao)) between 1 and 160),
  pessoa text check (pessoa is null or length(trim(pessoa)) between 1 and 120),
  cargo text check (cargo is null or length(trim(cargo)) between 1 and 120),
  pais text check (pais is null or length(trim(pais)) between 1 and 60),
  sector text check (sector is null or length(trim(sector)) between 1 and 80),
  tipo text not null check (tipo in (
    'empresa_alvo', 'promotor', 'investidor', 'banco', 'consultor_tecnico', 'fornecedor_tecnologico',
    'epc_operador', 'regulador', 'associacao', 'parceiro_jv', 'introducer', 'decisor_cliente')),
  interesse text check (interesse is null or length(trim(interesse)) between 1 and 1000),
  poder_decisao smallint check (poder_decisao is null or poder_decisao between 1 and 5),
  relacao text not null default 'nova'
    check (relacao in ('nova', 'em_construcao', 'activa', 'forte', 'inactiva')),
  ultima_interacao date,
  proxima_accao text check (proxima_accao is null or length(trim(proxima_accao)) between 1 and 300),
  proxima_data date,
  origem_dados text check (origem_dados is null or length(trim(origem_dados)) between 1 and 300),
  consentimento boolean not null default false,
  responsavel text check (responsavel is null or length(trim(responsavel)) between 1 and 120),
  activo boolean not null default true,
  revisao integer not null default 1 check (revisao >= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- «Manter relação» não é uma próxima acção: activo exige acção e data.
  constraint ceno_stakeholders_activo_tem_accao
    check (not activo or (proxima_accao is not null and proxima_data is not null))
);

create index if not exists ceno_stakeholders_dono_idx on public.ceno_stakeholders (dono, organizacao);

drop trigger if exists ceno_stakeholders_set_updated_at on public.ceno_stakeholders;
create trigger ceno_stakeholders_set_updated_at
  before update on public.ceno_stakeholders
  for each row execute function public.set_updated_at();


-- ---------------------------------------------------------------------------
-- Oportunidades — radar (etapa 0) e pipeline (1–11)
-- ---------------------------------------------------------------------------

create table if not exists public.ceno_oportunidades (
  id uuid primary key default extensions.gen_random_uuid(),
  dono uuid not null default auth.uid() references auth.users(id) on delete restrict,
  titulo text not null check (length(trim(titulo)) between 3 and 160),
  organizacao text check (organizacao is null or length(trim(organizacao)) between 1 and 160),
  sector text not null check (sector in (
    'solar', 'eolica', 'hidrica', 'gas', 'petroleo', 'mineracao', 'eficiencia', 'redes',
    'infraestrutura', 'outro')),
  problema text check (problema is null or length(trim(problema)) between 1 and 2000),
  fonte text check (fonte is null or fonte in (
    'evento', 'indicacao', 'pesquisa', 'parceiro', 'edital', 'inbound', 'outro')),
  urgencia text not null default 'media' check (urgencia in ('baixa', 'media', 'alta')),
  valor_min numeric(16, 2) check (valor_min is null or valor_min >= 0),
  valor_max numeric(16, 2) check (valor_max is null or valor_max >= 0),
  moeda text not null default 'USD' check (moeda in ('MZN', 'USD', 'EUR')),
  valor_evidencia text check (valor_evidencia is null or length(trim(valor_evidencia)) between 1 and 500),
  fase text not null default 'sinal' check (fase in (
    'sinal', 'contacto', 'descoberta', 'problema_validado', 'qualificada', 'estruturacao',
    'preparacao', 'proposta', 'negociacao', 'acordo', 'execucao', 'valor_realizado',
    'perdida', 'arquivada')),
  fase_desde timestamptz not null default now(),
  -- Score de qualificação: oito critérios de 0 a 5; nulo = ainda não avaliado.
  c_dor smallint check (c_dor between 0 and 5),
  c_urgencia smallint check (c_urgencia between 0 and 5),
  c_decisor smallint check (c_decisor between 0 and 5),
  c_capacidade smallint check (c_capacidade between 0 and 5),
  c_adequacao smallint check (c_adequacao between 0 and 5),
  c_controlo smallint check (c_controlo between 0 and 5),
  c_informacao smallint check (c_informacao between 0 and 5),
  c_valor smallint check (c_valor between 0 and 5),
  score_total smallint generated always as (
    c_dor + c_urgencia + c_decisor + c_capacidade + c_adequacao + c_controlo + c_informacao + c_valor
  ) stored,
  prioridade text generated always as (
    case
      when (c_dor + c_urgencia + c_decisor + c_capacidade + c_adequacao + c_controlo + c_informacao + c_valor) is null then null
      when (c_dor + c_urgencia + c_decisor + c_capacidade + c_adequacao + c_controlo + c_informacao + c_valor) >= 32 then 'A'
      when (c_dor + c_urgencia + c_decisor + c_capacidade + c_adequacao + c_controlo + c_informacao + c_valor) >= 24 then 'B'
      when (c_dor + c_urgencia + c_decisor + c_capacidade + c_adequacao + c_controlo + c_informacao + c_valor) >= 16 then 'incubacao'
      else 'abandonar'
    end
  ) stored,
  proxima_accao text check (proxima_accao is null or length(trim(proxima_accao)) between 1 and 300),
  proxima_data date,
  responsavel text check (responsavel is null or length(trim(responsavel)) between 1 and 120),
  memo jsonb not null default '{}'::jsonb
    check (jsonb_typeof(memo) = 'object' and octet_length(memo::text) <= 65536),
  motivo_perda text check (motivo_perda is null or length(trim(motivo_perda)) between 3 and 500),
  ultima_actividade timestamptz not null default now(),
  revisao integer not null default 1 check (revisao >= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ceno_oportunidades_valor_ordem
    check (valor_min is null or valor_max is null or valor_max >= valor_min),
  -- Um valor sem evidência é pipeline inflacionado.
  constraint ceno_oportunidades_valor_com_evidencia
    check ((valor_min is null and valor_max is null) or valor_evidencia is not null),
  -- Nenhuma oportunidade activa sem próxima acção e data.
  constraint ceno_oportunidades_activa_tem_accao
    check (fase in ('valor_realizado', 'perdida', 'arquivada')
           or (proxima_accao is not null and proxima_data is not null)),
  constraint ceno_oportunidades_perdida_tem_motivo
    check (fase <> 'perdida' or motivo_perda is not null)
);

create index if not exists ceno_oportunidades_dono_idx on public.ceno_oportunidades (dono, fase, proxima_data);
create index if not exists ceno_oportunidades_dono_prox_idx on public.ceno_oportunidades (dono, proxima_data);

drop trigger if exists ceno_oportunidades_set_updated_at on public.ceno_oportunidades;
create trigger ceno_oportunidades_set_updated_at
  before update on public.ceno_oportunidades
  for each row execute function public.set_updated_at();


-- ---------------------------------------------------------------------------
-- Ligações, registo e sala documental
-- ---------------------------------------------------------------------------

create table if not exists public.ceno_oportunidade_stakeholders (
  oportunidade_id uuid not null references public.ceno_oportunidades(id) on delete cascade,
  stakeholder_id uuid not null references public.ceno_stakeholders(id) on delete cascade,
  dono uuid not null default auth.uid() references auth.users(id) on delete restrict,
  papel text not null check (papel in ('decisor', 'sponsor', 'influenciador', 'parceiro', 'investidor')),
  created_at timestamptz not null default now(),
  primary key (oportunidade_id, stakeholder_id)
);

create index if not exists ceno_op_st_stakeholder_idx on public.ceno_oportunidade_stakeholders (stakeholder_id);

create table if not exists public.ceno_registos (
  id bigint generated always as identity primary key,
  dono uuid not null default auth.uid() references auth.users(id) on delete restrict,
  oportunidade_id uuid not null references public.ceno_oportunidades(id) on delete cascade,
  tipo text not null check (tipo in ('nota', 'reuniao', 'decisao', 'fase', 'documento')),
  decisao text check (decisao is null or decisao in ('avancar', 'corrigir', 'incubar', 'abandonar')),
  corpo text check (corpo is null or length(trim(corpo)) between 1 and 4000),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  ocorreu_em timestamptz not null default now(),
  constraint ceno_registos_decisao_tem_valor check (tipo <> 'decisao' or decisao is not null)
);

create index if not exists ceno_registos_oportunidade_idx on public.ceno_registos (oportunidade_id, ocorreu_em desc);
create index if not exists ceno_registos_dono_idx on public.ceno_registos (dono, tipo);

-- As doze pastas da sala de oportunidade (sem ficheiros: cada pasta aponta
-- para onde o documento vive — SharePoint, Drive — por https).
create table if not exists public.ceno_documentos (
  oportunidade_id uuid not null references public.ceno_oportunidades(id) on delete cascade,
  pasta smallint not null check (pasta between 1 and 12),
  dono uuid not null default auth.uid() references auth.users(id) on delete restrict,
  estado text not null default 'em_falta' check (estado in ('em_falta', 'em_curso', 'pronto')),
  ligacao text check (ligacao is null or (length(ligacao) <= 2048 and ligacao ~ '^https://[^\s/]+' and ligacao !~ '\s')),
  nota text check (nota is null or length(trim(nota)) between 1 and 300),
  updated_at timestamptz not null default now(),
  primary key (oportunidade_id, pasta)
);

drop trigger if exists ceno_documentos_set_updated_at on public.ceno_documentos;
create trigger ceno_documentos_set_updated_at
  before update on public.ceno_documentos
  for each row execute function public.set_updated_at();


-- ---------------------------------------------------------------------------
-- RLS: só a dona, e só com o módulo. Sem escrita directa.
-- ---------------------------------------------------------------------------

do $$
declare t text;
begin
  foreach t in array array['ceno_stakeholders', 'ceno_oportunidades', 'ceno_oportunidade_stakeholders',
                           'ceno_registos', 'ceno_documentos'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from public, anon, authenticated, service_role', t);
    execute format('grant select on public.%I to authenticated', t);
    execute format('drop policy if exists %I on public.%I', t || '_select', t);
    execute format(
      'create policy %I on public.%I for select to authenticated using (dono = (select auth.uid()) and (select public.tem_modulo(''energia'')))',
      t || '_select', t);
  end loop;
end;
$$;


-- O `audit_log` é legível por toda a equipa (0001). As linhas do espaço só têm
-- a acção e o id, mas até isso diria que o espaço existe e quando é usado:
-- ficam fora da leitura pela API. O dono da base (SQL Editor) vê tudo.
drop policy if exists audit_log_select on public.audit_log;
create policy audit_log_select on public.audit_log
  for select to authenticated
  using (public.is_staff() and entity_type is distinct from 'ceno');


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
  -- Numa etapa já qualificada (4+), o score não pode descer abaixo do mínimo:
  -- primeiro volta-se a etapa, com registo, e depois reavalia-se.
  if public.ceno_ordem_fase(o.fase) >= 4
     and coalesce(p_dor + p_urgencia + p_decisor + p_capacidade + p_adequacao + p_controlo + p_informacao + p_valor, -1) < 24 then
    raise exception 'Esta oportunidade já está qualificada: o score tem de ficar em 24 ou mais.' using errcode = '22023';
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

  if octet_length(p_memo::text) > 65536 then
    raise exception 'O memo é demasiado longo. Encurte algumas secções.' using errcode = '22023';
  end if;

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

  -- Bloquear a oportunidade primeiro, na mesma ordem que mudar_fase_ceno: sem
  -- isto, a chave estrangeira e o «on conflict» das pastas cruzam-se (deadlock).
  perform 1 from public.ceno_oportunidades where id = p_oportunidade and dono = auth.uid() for no key update;
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
  -- Bloquear a oportunidade primeiro, na mesma ordem que mudar_fase_ceno: sem
  -- isto, a chave estrangeira e o «on conflict» das pastas cruzam-se (deadlock).
  perform 1 from public.ceno_oportunidades where id = p_oportunidade and dono = auth.uid() for no key update;
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

  -- Bloquear a oportunidade primeiro, na mesma ordem que mudar_fase_ceno: sem
  -- isto, a chave estrangeira e o «on conflict» das pastas cruzam-se (deadlock).
  perform 1 from public.ceno_oportunidades where id = p_oportunidade and dono = auth.uid() for no key update;
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
