


-- APLICAR NO SQL EDITOR DO SUPABASE — projecto nixltrbdplqjadfytryd
-- 0017 em DUAS PARTES — PARTE 1 de 2: acesso por módulo, tabelas e RLS do Espaço CEnO
-- As duas partes juntas são a migração 0017 palavra por palavra (um teste
-- garante-o). Ambas são repetíveis: pode correr cada uma as vezes que quiser.
-- 1. No GitHub, botão «Copy raw file» (ou Raw, Ctrl+A, Ctrl+C).
-- 2. SQL Editor: consulta NOVA e vazia, colar, Run. Esperado: «Success».
-- 3. Depois, a PARTE 2 (aplicar-0017-parte2.sql), da mesma forma.
-- ===== fim do cabeçalho: daqui para baixo é a migração 0017, sem alterações =====
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


