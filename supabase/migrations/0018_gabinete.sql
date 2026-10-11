-- ============================================================================
-- 0018 — Gabinete do Fundador: o Work Operating System do Founder/CEO/CTO
-- ============================================================================
-- Um espaço no /admin que SÓ o dono vê (módulo `direcao`): decisões por
-- chapéu (Founder, CEO, CTO), prioridades do trimestre, portfólio de
-- projectos com margem, tesouraria (caixa, recebimentos, pagamentos) e
-- capacidade da equipa.
--
-- Privacidade: o mesmo desenho do Espaço CEnO (0017), que esta migração
-- pressupõe aplicada — `acessos_modulo`, `tem_modulo`, `exigir_modulo`.
-- 1. O acesso é uma linha em `acessos_modulo` com `modulo = 'direcao'`.
-- 2. Cada linha tem `dono`; a RLS só devolve as linhas do próprio, com o
--    módulo e a palavra-passe provisória já trocada.
-- 3. Não há políticas de escrita: escreve-se só por estas funções.
-- 4. O `audit_log` leva só a acção e o id, e a equipa não lê estas linhas.
--
-- Os valores financeiros são os que o dono registar. Nenhuma conversão de
-- moeda é feita na base: cada valor fica na sua moeda.
--
-- Idempotente: pode correr mais do que uma vez.
-- ============================================================================


-- ---------------------------------------------------------------------------
-- Módulo `direcao`
-- ---------------------------------------------------------------------------

alter table public.acessos_modulo drop constraint if exists acessos_modulo_modulo_check;
alter table public.acessos_modulo
  add constraint acessos_modulo_modulo_check check (modulo in ('energia', 'direcao'));


-- ---------------------------------------------------------------------------
-- Decisões — por chapéu, com responsável, indicador e data de revisão
-- ---------------------------------------------------------------------------

create table if not exists public.gab_decisoes (
  id uuid primary key default extensions.gen_random_uuid(),
  dono uuid not null default auth.uid() references auth.users(id) on delete restrict,
  titulo text not null check (length(trim(titulo)) between 3 and 200),
  contexto text check (contexto is null or length(trim(contexto)) between 1 and 2000),
  chapeu text not null check (chapeu in ('founder', 'ceo', 'cto')),
  estado text not null default 'exige_minha' check (estado in (
    'exige_minha', 'delegavel', 'precisa_info', 'aguarda_externa', 'eliminar', 'decidida')),
  decisao text check (decisao is null or length(trim(decisao)) between 1 and 2000),
  responsavel text check (responsavel is null or length(trim(responsavel)) between 1 and 120),
  consultados text check (consultados is null or length(trim(consultados)) between 1 and 300),
  indicador text check (indicador is null or length(trim(indicador)) between 1 and 200),
  data_revisao date,
  -- A métrica crítica: decisões recorrentes que deixaram de passar pelo fundador.
  recorrente boolean not null default false,
  quem_decidiu text check (quem_decidiu is null or quem_decidiu in ('fundador', 'delegada')),
  decidida_em timestamptz,
  revisao integer not null default 1 check (revisao >= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Uma decisão em aberto tem dono e data para voltar a ela.
  constraint gab_decisoes_aberta_tem_dono
    check (estado in ('decidida', 'eliminar') or (responsavel is not null and data_revisao is not null)),
  -- Decidida: o que se decidiu e quem decidiu.
  constraint gab_decisoes_decidida_completa
    check (estado <> 'decidida' or (decisao is not null and quem_decidiu is not null and decidida_em is not null))
);

create index if not exists gab_decisoes_dono_idx on public.gab_decisoes (dono, estado, data_revisao);

drop trigger if exists gab_decisoes_set_updated_at on public.gab_decisoes;
create trigger gab_decisoes_set_updated_at
  before update on public.gab_decisoes
  for each row execute function public.set_updated_at();


-- ---------------------------------------------------------------------------
-- Prioridades — cinco resultados por trimestre, um por tipo
-- ---------------------------------------------------------------------------

create table if not exists public.gab_prioridades (
  id uuid primary key default extensions.gen_random_uuid(),
  dono uuid not null default auth.uid() references auth.users(id) on delete restrict,
  trimestre text not null check (trimestre ~ '^20[0-9]{2}-T[1-4]$'),
  tipo text not null check (tipo in ('empresarial', 'comercial', 'operacional', 'tecnologica', 'lideranca')),
  resultado text not null check (length(trim(resultado)) between 3 and 300),
  indicador text check (indicador is null or length(trim(indicador)) between 1 and 200),
  meta text check (meta is null or length(trim(meta)) between 1 and 200),
  estado text not null default 'em_curso' check (estado in ('em_curso', 'em_risco', 'concluida', 'abandonada')),
  nota text check (nota is null or length(trim(nota)) between 1 and 1000),
  revisao integer not null default 1 check (revisao >= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- No máximo cinco por trimestre: uma por tipo, por construção.
  constraint gab_prioridades_uma_por_tipo unique (dono, trimestre, tipo)
);

drop trigger if exists gab_prioridades_set_updated_at on public.gab_prioridades;
create trigger gab_prioridades_set_updated_at
  before update on public.gab_prioridades
  for each row execute function public.set_updated_at();


-- ---------------------------------------------------------------------------
-- Projectos — o ciclo público (diagnóstico → evolução), com receita e margem
-- ---------------------------------------------------------------------------

create table if not exists public.gab_projetos (
  id uuid primary key default extensions.gen_random_uuid(),
  dono uuid not null default auth.uid() references auth.users(id) on delete restrict,
  nome text not null check (length(trim(nome)) between 3 and 160),
  cliente text check (cliente is null or length(trim(cliente)) between 1 and 160),
  fase text not null default 'diagnostico' check (fase in (
    'diagnostico', 'arquitetura', 'prototipo', 'implementacao', 'ativacao', 'evolucao',
    'encerrado', 'suspenso')),
  responsavel text check (responsavel is null or length(trim(responsavel)) between 1 and 120),
  sponsor text check (sponsor is null or length(trim(sponsor)) between 1 and 120),
  resultado text check (resultado is null or length(trim(resultado)) between 1 and 1000),
  escopo text check (escopo is null or length(trim(escopo)) between 1 and 2000),
  moeda text not null default 'MZN' check (moeda in ('MZN', 'USD', 'EUR')),
  receita_contratada numeric(16, 2) check (receita_contratada is null or receita_contratada >= 0),
  receita_faturada numeric(16, 2) check (receita_faturada is null or receita_faturada >= 0),
  receita_recebida numeric(16, 2) check (receita_recebida is null or receita_recebida >= 0),
  custos_variaveis numeric(16, 2) check (custos_variaveis is null or custos_variaveis >= 0),
  -- Margem bruta = receita (contratada) menos custos variáveis directos.
  margem_bruta numeric(16, 2) generated always as (receita_contratada - custos_variaveis) stored,
  -- Os sete critérios para entrar em implementação.
  pronto_contrato boolean not null default false,
  pronto_escopo boolean not null default false,
  pronto_responsavel boolean not null default false,
  pronto_capacidade boolean not null default false,
  pronto_aceitacao boolean not null default false,
  pronto_dependencias boolean not null default false,
  pronto_pagamento boolean not null default false,
  risco text not null default 'baixo' check (risco in ('baixo', 'medio', 'alto')),
  proxima_accao text check (proxima_accao is null or length(trim(proxima_accao)) between 1 and 300),
  proxima_data date,
  ligacao text check (ligacao is null or (length(ligacao) <= 2048 and ligacao ~ '^https://[^\s/]+' and ligacao !~ '\s')),
  revisao integer not null default 1 check (revisao >= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint gab_projetos_faturada_ate_contratada
    check (receita_faturada is null or receita_contratada is null or receita_faturada <= receita_contratada),
  constraint gab_projetos_recebida_ate_faturada
    check (receita_recebida is null or receita_faturada is null or receita_recebida <= receita_faturada),
  -- Nenhum projecto activo sem próxima acção e data.
  constraint gab_projetos_activo_tem_accao
    check (fase in ('encerrado', 'suspenso') or (proxima_accao is not null and proxima_data is not null)),
  -- Não se implementa sem os sete critérios (e não se perdem depois).
  constraint gab_projetos_pronto_para_implementar
    check (fase not in ('implementacao', 'ativacao', 'evolucao')
           or (pronto_contrato and pronto_escopo and pronto_responsavel and pronto_capacidade
               and pronto_aceitacao and pronto_dependencias and pronto_pagamento))
);

create index if not exists gab_projetos_dono_idx on public.gab_projetos (dono, fase, proxima_data);

drop trigger if exists gab_projetos_set_updated_at on public.gab_projetos;
create trigger gab_projetos_set_updated_at
  before update on public.gab_projetos
  for each row execute function public.set_updated_at();


-- ---------------------------------------------------------------------------
-- Tesouraria — saldos (fotografias), recebimentos e pagamentos
-- ---------------------------------------------------------------------------

create table if not exists public.gab_tesouraria (
  id uuid primary key default extensions.gen_random_uuid(),
  dono uuid not null default auth.uid() references auth.users(id) on delete restrict,
  tipo text not null check (tipo in ('saldo', 'recebimento', 'pagamento')),
  descricao text not null check (length(trim(descricao)) between 1 and 200),
  projeto_id uuid references public.gab_projetos(id) on delete restrict,
  valor numeric(16, 2) not null check (valor >= 0),
  moeda text not null default 'MZN' check (moeda in ('MZN', 'USD', 'EUR')),
  data_prevista date not null,
  -- Nula = ainda previsto. Um saldo é um facto numa data: tem sempre data efectiva.
  data_efectiva date,
  revisao integer not null default 1 check (revisao >= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint gab_tesouraria_movimento_positivo check (tipo = 'saldo' or valor > 0),
  constraint gab_tesouraria_saldo_e_facto check (tipo <> 'saldo' or data_efectiva is not null)
);

create index if not exists gab_tesouraria_dono_idx on public.gab_tesouraria (dono, tipo, data_prevista);
create index if not exists gab_tesouraria_projeto_idx on public.gab_tesouraria (projeto_id) where projeto_id is not null;

drop trigger if exists gab_tesouraria_set_updated_at on public.gab_tesouraria;
create trigger gab_tesouraria_set_updated_at
  before update on public.gab_tesouraria
  for each row execute function public.set_updated_at();


-- ---------------------------------------------------------------------------
-- Capacidade — pessoas e horas por semana alocadas a projectos
-- ---------------------------------------------------------------------------

create table if not exists public.gab_pessoas (
  id uuid primary key default extensions.gen_random_uuid(),
  dono uuid not null default auth.uid() references auth.users(id) on delete restrict,
  nome text not null check (length(trim(nome)) between 1 and 80),
  funcao text check (funcao is null or length(trim(funcao)) between 1 and 80),
  area text not null default 'tecnologia' check (area in (
    'gestao', 'comercial', 'tecnologia', 'operacoes', 'energia', 'outro')),
  horas_semana numeric(4, 1) not null check (horas_semana between 0 and 80),
  activa boolean not null default true,
  revisao integer not null default 1 check (revisao >= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists gab_pessoas_dono_idx on public.gab_pessoas (dono, activa);

drop trigger if exists gab_pessoas_set_updated_at on public.gab_pessoas;
create trigger gab_pessoas_set_updated_at
  before update on public.gab_pessoas
  for each row execute function public.set_updated_at();

create table if not exists public.gab_alocacoes (
  pessoa_id uuid not null references public.gab_pessoas(id) on delete cascade,
  projeto_id uuid not null references public.gab_projetos(id) on delete cascade,
  dono uuid not null default auth.uid() references auth.users(id) on delete restrict,
  horas_semana numeric(4, 1) not null check (horas_semana > 0 and horas_semana <= 80),
  ate date,
  updated_at timestamptz not null default now(),
  primary key (pessoa_id, projeto_id)
);

create index if not exists gab_alocacoes_projeto_idx on public.gab_alocacoes (projeto_id);
create index if not exists gab_alocacoes_dono_idx on public.gab_alocacoes (dono);

drop trigger if exists gab_alocacoes_set_updated_at on public.gab_alocacoes;
create trigger gab_alocacoes_set_updated_at
  before update on public.gab_alocacoes
  for each row execute function public.set_updated_at();


-- ---------------------------------------------------------------------------
-- RLS: só o dono, e só com o módulo. Sem escrita directa.
-- ---------------------------------------------------------------------------

do $$
declare t text;
begin
  foreach t in array array['gab_decisoes', 'gab_prioridades', 'gab_projetos', 'gab_tesouraria',
                           'gab_pessoas', 'gab_alocacoes'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from public, anon, authenticated, service_role', t);
    execute format('grant select on public.%I to authenticated', t);
    execute format('drop policy if exists %I on public.%I', t || '_select', t);
    execute format(
      'create policy %I on public.%I for select to authenticated using (dono = (select auth.uid()) and (select public.tem_modulo(''direcao'')))',
      t || '_select', t);
  end loop;
end;
$$;

-- O `audit_log` (legível pela equipa) deixa de mostrar também o gabinete.
drop policy if exists audit_log_select on public.audit_log;
create policy audit_log_select on public.audit_log
  for select to authenticated
  using (public.is_staff() and entity_type is distinct from 'ceno' and entity_type is distinct from 'gabinete');


-- ---------------------------------------------------------------------------
-- Funções de escrita
-- ---------------------------------------------------------------------------

-- Cria (p_id nulo) ou altera uma decisão.
create or replace function public.guardar_decisao(
  p_id uuid,
  p_revisao integer,
  p_titulo text,
  p_contexto text,
  p_chapeu text,
  p_estado text,
  p_decisao text,
  p_responsavel text,
  p_consultados text,
  p_indicador text,
  p_data_revisao date,
  p_recorrente boolean,
  p_quem_decidiu text
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  d public.gab_decisoes;
  v_id uuid;
  v_estado text := coalesce(p_estado, 'exige_minha');
begin
  perform public.exigir_modulo('direcao');

  if v_estado = 'decidida' and (nullif(trim(p_decisao), '') is null or p_quem_decidiu is null) then
    raise exception 'Para fechar a decisão, escreva o que se decidiu e quem decidiu.' using errcode = '22023';
  end if;
  if v_estado not in ('decidida', 'eliminar')
     and (nullif(trim(p_responsavel), '') is null or p_data_revisao is null) then
    raise exception 'Uma decisão em aberto precisa de responsável e data de revisão.' using errcode = '22023';
  end if;

  if p_id is null then
    insert into public.gab_decisoes
      (dono, titulo, contexto, chapeu, estado, decisao, responsavel, consultados, indicador, data_revisao,
       recorrente, quem_decidiu, decidida_em)
    values
      (auth.uid(), trim(p_titulo), nullif(trim(p_contexto), ''), p_chapeu, v_estado, nullif(trim(p_decisao), ''),
       nullif(trim(p_responsavel), ''), nullif(trim(p_consultados), ''), nullif(trim(p_indicador), ''),
       p_data_revisao, coalesce(p_recorrente, false),
       case when v_estado = 'decidida' then p_quem_decidiu end,
       case when v_estado = 'decidida' then now() end)
    returning id into v_id;
  else
    select * into d from public.gab_decisoes where id = p_id and dono = auth.uid() for update;
    if not found then
      raise exception 'Decisão não encontrada.' using errcode = 'P0002';
    end if;
    if d.revisao is distinct from p_revisao then
      raise exception 'O registo mudou entretanto.' using errcode = '40001';
    end if;
    update public.gab_decisoes
       set titulo = trim(p_titulo),
           contexto = nullif(trim(p_contexto), ''),
           chapeu = p_chapeu,
           estado = v_estado,
           decisao = nullif(trim(p_decisao), ''),
           responsavel = nullif(trim(p_responsavel), ''),
           consultados = nullif(trim(p_consultados), ''),
           indicador = nullif(trim(p_indicador), ''),
           data_revisao = p_data_revisao,
           recorrente = coalesce(p_recorrente, false),
           quem_decidiu = case when v_estado = 'decidida' then p_quem_decidiu end,
           -- A data em que ficou decidida não muda a cada edição.
           decidida_em = case when v_estado = 'decidida' then coalesce(d.decidida_em, now()) end,
           revisao = revisao + 1
     where id = p_id;
    v_id := p_id;
  end if;

  insert into public.audit_log (actor_id, actor_type, action, entity_type, entity_id)
  values (auth.uid(), 'user', 'gabinete.guardar_decisao', 'gabinete', v_id::text);
  return v_id;
end;
$$;

-- Cria (p_id nulo) ou altera uma prioridade do trimestre.
create or replace function public.guardar_prioridade(
  p_id uuid,
  p_revisao integer,
  p_trimestre text,
  p_tipo text,
  p_resultado text,
  p_indicador text,
  p_meta text,
  p_estado text,
  p_nota text
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  p public.gab_prioridades;
  v_id uuid;
begin
  perform public.exigir_modulo('direcao');

  if p_id is null then
    if exists (select 1 from public.gab_prioridades
                where dono = auth.uid() and trimestre = p_trimestre and tipo = p_tipo) then
      raise exception 'Já existe uma prioridade deste tipo neste trimestre: edite essa em vez de criar outra.'
        using errcode = '22023';
    end if;
    insert into public.gab_prioridades (dono, trimestre, tipo, resultado, indicador, meta, estado, nota)
    values (auth.uid(), p_trimestre, p_tipo, trim(p_resultado), nullif(trim(p_indicador), ''),
            nullif(trim(p_meta), ''), coalesce(p_estado, 'em_curso'), nullif(trim(p_nota), ''))
    returning id into v_id;
  else
    select * into p from public.gab_prioridades where id = p_id and dono = auth.uid() for update;
    if not found then
      raise exception 'Prioridade não encontrada.' using errcode = 'P0002';
    end if;
    if p.revisao is distinct from p_revisao then
      raise exception 'O registo mudou entretanto.' using errcode = '40001';
    end if;
    if exists (select 1 from public.gab_prioridades
                where dono = auth.uid() and trimestre = p_trimestre and tipo = p_tipo and id <> p_id) then
      raise exception 'Já existe uma prioridade deste tipo neste trimestre: edite essa em vez de criar outra.'
        using errcode = '22023';
    end if;
    update public.gab_prioridades
       set trimestre = p_trimestre,
           tipo = p_tipo,
           resultado = trim(p_resultado),
           indicador = nullif(trim(p_indicador), ''),
           meta = nullif(trim(p_meta), ''),
           estado = coalesce(p_estado, 'em_curso'),
           nota = nullif(trim(p_nota), ''),
           revisao = revisao + 1
     where id = p_id;
    v_id := p_id;
  end if;

  insert into public.audit_log (actor_id, actor_type, action, entity_type, entity_id)
  values (auth.uid(), 'user', 'gabinete.guardar_prioridade', 'gabinete', v_id::text);
  return v_id;
end;
$$;

-- Cria (p_id nulo) ou altera um projecto. `p_prontidao` são os sete critérios,
-- por esta ordem: contrato, escopo, responsável, capacidade, aceitação,
-- dependências, pagamento.
create or replace function public.guardar_projeto(
  p_id uuid,
  p_revisao integer,
  p_nome text,
  p_cliente text,
  p_fase text,
  p_responsavel text,
  p_sponsor text,
  p_resultado text,
  p_escopo text,
  p_moeda text,
  p_receita_contratada numeric,
  p_receita_faturada numeric,
  p_receita_recebida numeric,
  p_custos_variaveis numeric,
  p_prontidao boolean[],
  p_risco text,
  p_proxima_accao text,
  p_proxima_data date,
  p_ligacao text
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  o public.gab_projetos;
  v_id uuid;
  v_fase text := coalesce(p_fase, 'diagnostico');
  v_falta text[] := array[]::text[];
  v_nomes text[] := array['contrato', 'escopo aprovado', 'responsável', 'capacidade reservada',
                          'critérios de aceitação', 'dependências', 'condições de pagamento'];
  i integer;
begin
  perform public.exigir_modulo('direcao');

  if p_prontidao is null or array_length(p_prontidao, 1) is distinct from 7 then
    raise exception 'Critérios de prontidão inválidos.' using errcode = '22023';
  end if;
  if v_fase in ('implementacao', 'ativacao', 'evolucao') then
    for i in 1..7 loop
      if not coalesce(p_prontidao[i], false) then
        v_falta := v_falta || v_nomes[i];
      end if;
    end loop;
    if array_length(v_falta, 1) > 0 then
      raise exception 'Para implementar falta: %.', array_to_string(v_falta, ', ') using errcode = '22023';
    end if;
  end if;
  if v_fase not in ('encerrado', 'suspenso')
     and (nullif(trim(p_proxima_accao), '') is null or p_proxima_data is null) then
    raise exception 'Um projecto activo precisa de próxima acção e data.' using errcode = '22023';
  end if;
  if (p_receita_faturada is not null and p_receita_contratada is not null and p_receita_faturada > p_receita_contratada)
     or (p_receita_recebida is not null and p_receita_faturada is not null and p_receita_recebida > p_receita_faturada) then
    raise exception 'A receita recebida não pode passar a faturada, nem a faturada a contratada.' using errcode = '22023';
  end if;

  if p_id is null then
    insert into public.gab_projetos
      (dono, nome, cliente, fase, responsavel, sponsor, resultado, escopo, moeda,
       receita_contratada, receita_faturada, receita_recebida, custos_variaveis,
       pronto_contrato, pronto_escopo, pronto_responsavel, pronto_capacidade, pronto_aceitacao,
       pronto_dependencias, pronto_pagamento, risco, proxima_accao, proxima_data, ligacao)
    values
      (auth.uid(), trim(p_nome), nullif(trim(p_cliente), ''), v_fase, nullif(trim(p_responsavel), ''),
       nullif(trim(p_sponsor), ''), nullif(trim(p_resultado), ''), nullif(trim(p_escopo), ''),
       coalesce(p_moeda, 'MZN'), p_receita_contratada, p_receita_faturada, p_receita_recebida, p_custos_variaveis,
       coalesce(p_prontidao[1], false), coalesce(p_prontidao[2], false), coalesce(p_prontidao[3], false),
       coalesce(p_prontidao[4], false), coalesce(p_prontidao[5], false), coalesce(p_prontidao[6], false),
       coalesce(p_prontidao[7], false), coalesce(p_risco, 'baixo'), nullif(trim(p_proxima_accao), ''),
       p_proxima_data, nullif(trim(p_ligacao), ''))
    returning id into v_id;
  else
    select * into o from public.gab_projetos where id = p_id and dono = auth.uid() for update;
    if not found then
      raise exception 'Projecto não encontrado.' using errcode = 'P0002';
    end if;
    if o.revisao is distinct from p_revisao then
      raise exception 'O registo mudou entretanto.' using errcode = '40001';
    end if;
    update public.gab_projetos
       set nome = trim(p_nome),
           cliente = nullif(trim(p_cliente), ''),
           fase = v_fase,
           responsavel = nullif(trim(p_responsavel), ''),
           sponsor = nullif(trim(p_sponsor), ''),
           resultado = nullif(trim(p_resultado), ''),
           escopo = nullif(trim(p_escopo), ''),
           moeda = coalesce(p_moeda, 'MZN'),
           receita_contratada = p_receita_contratada,
           receita_faturada = p_receita_faturada,
           receita_recebida = p_receita_recebida,
           custos_variaveis = p_custos_variaveis,
           pronto_contrato = coalesce(p_prontidao[1], false),
           pronto_escopo = coalesce(p_prontidao[2], false),
           pronto_responsavel = coalesce(p_prontidao[3], false),
           pronto_capacidade = coalesce(p_prontidao[4], false),
           pronto_aceitacao = coalesce(p_prontidao[5], false),
           pronto_dependencias = coalesce(p_prontidao[6], false),
           pronto_pagamento = coalesce(p_prontidao[7], false),
           risco = coalesce(p_risco, 'baixo'),
           proxima_accao = nullif(trim(p_proxima_accao), ''),
           proxima_data = p_proxima_data,
           ligacao = nullif(trim(p_ligacao), ''),
           revisao = revisao + 1
     where id = p_id;
    v_id := p_id;
  end if;

  insert into public.audit_log (actor_id, actor_type, action, entity_type, entity_id)
  values (auth.uid(), 'user', 'gabinete.guardar_projeto', 'gabinete', v_id::text);
  return v_id;
end;
$$;

-- Cria (p_id nulo) ou altera um movimento de tesouraria. Um saldo é sempre um
-- facto na sua data (data efectiva = data indicada).
create or replace function public.guardar_movimento(
  p_id uuid,
  p_revisao integer,
  p_tipo text,
  p_descricao text,
  p_projeto uuid,
  p_valor numeric,
  p_moeda text,
  p_data_prevista date,
  p_data_efectiva date
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  m public.gab_tesouraria;
  v_id uuid;
  v_efectiva date := case when p_tipo = 'saldo' then p_data_prevista else p_data_efectiva end;
begin
  perform public.exigir_modulo('direcao');

  -- Realizado é passado: uma data efectiva futura contaria como caixa o que ainda não entrou.
  if v_efectiva > (now() at time zone 'Africa/Maputo')::date then
    raise exception 'A data efectiva (ou do saldo) não pode ser futura.' using errcode = '22023';
  end if;

  if p_projeto is not null then
    perform 1 from public.gab_projetos where id = p_projeto and dono = auth.uid() for key share;
    if not found then
      raise exception 'Projecto não encontrado.' using errcode = 'P0002';
    end if;
  end if;

  if p_id is null then
    insert into public.gab_tesouraria (dono, tipo, descricao, projeto_id, valor, moeda, data_prevista, data_efectiva)
    values (auth.uid(), p_tipo, trim(p_descricao), p_projeto, p_valor, coalesce(p_moeda, 'MZN'),
            p_data_prevista, v_efectiva)
    returning id into v_id;
  else
    select * into m from public.gab_tesouraria where id = p_id and dono = auth.uid() for update;
    if not found then
      raise exception 'Movimento não encontrado.' using errcode = 'P0002';
    end if;
    if m.revisao is distinct from p_revisao then
      raise exception 'O registo mudou entretanto.' using errcode = '40001';
    end if;
    update public.gab_tesouraria
       set tipo = p_tipo,
           descricao = trim(p_descricao),
           projeto_id = p_projeto,
           valor = p_valor,
           moeda = coalesce(p_moeda, 'MZN'),
           data_prevista = p_data_prevista,
           data_efectiva = v_efectiva,
           revisao = revisao + 1
     where id = p_id;
    v_id := p_id;
  end if;

  insert into public.audit_log (actor_id, actor_type, action, entity_type, entity_id)
  values (auth.uid(), 'user', 'gabinete.guardar_movimento', 'gabinete', v_id::text);
  return v_id;
end;
$$;

-- Cria (p_id nulo) ou altera uma pessoa da equipa (para a capacidade).
create or replace function public.guardar_pessoa(
  p_id uuid,
  p_revisao integer,
  p_nome text,
  p_funcao text,
  p_area text,
  p_horas_semana numeric,
  p_activa boolean
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  s public.gab_pessoas;
  v_id uuid;
begin
  perform public.exigir_modulo('direcao');

  if p_id is null then
    insert into public.gab_pessoas (dono, nome, funcao, area, horas_semana, activa)
    values (auth.uid(), trim(p_nome), nullif(trim(p_funcao), ''), coalesce(p_area, 'tecnologia'),
            p_horas_semana, coalesce(p_activa, true))
    returning id into v_id;
  else
    select * into s from public.gab_pessoas where id = p_id and dono = auth.uid() for update;
    if not found then
      raise exception 'Pessoa não encontrada.' using errcode = 'P0002';
    end if;
    if s.revisao is distinct from p_revisao then
      raise exception 'O registo mudou entretanto.' using errcode = '40001';
    end if;
    update public.gab_pessoas
       set nome = trim(p_nome),
           funcao = nullif(trim(p_funcao), ''),
           area = coalesce(p_area, 'tecnologia'),
           horas_semana = p_horas_semana,
           activa = coalesce(p_activa, true),
           revisao = revisao + 1
     where id = p_id;
    v_id := p_id;
  end if;

  insert into public.audit_log (actor_id, actor_type, action, entity_type, entity_id)
  values (auth.uid(), 'user', 'gabinete.guardar_pessoa', 'gabinete', v_id::text);
  return v_id;
end;
$$;

-- Aloca (ou actualiza) horas por semana de uma pessoa a um projecto.
create or replace function public.guardar_alocacao(
  p_pessoa uuid,
  p_projeto uuid,
  p_horas_semana numeric,
  p_ate date
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  perform public.exigir_modulo('direcao');

  -- Bloquear os pais primeiro, sempre pela mesma ordem (pessoa, projecto).
  perform 1 from public.gab_pessoas where id = p_pessoa and dono = auth.uid() for no key update;
  if not found then
    raise exception 'Pessoa não encontrada.' using errcode = 'P0002';
  end if;
  perform 1 from public.gab_projetos where id = p_projeto and dono = auth.uid() for no key update;
  if not found then
    raise exception 'Projecto não encontrado.' using errcode = 'P0002';
  end if;

  insert into public.gab_alocacoes (pessoa_id, projeto_id, dono, horas_semana, ate)
  values (p_pessoa, p_projeto, auth.uid(), p_horas_semana, p_ate)
  on conflict (pessoa_id, projeto_id)
  do update set horas_semana = excluded.horas_semana, ate = excluded.ate;

  insert into public.audit_log (actor_id, actor_type, action, entity_type, entity_id)
  values (auth.uid(), 'user', 'gabinete.guardar_alocacao', 'gabinete', p_projeto::text);
end;
$$;

create or replace function public.remover_alocacao(p_pessoa uuid, p_projeto uuid)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  perform public.exigir_modulo('direcao');

  delete from public.gab_alocacoes
   where pessoa_id = p_pessoa and projeto_id = p_projeto and dono = auth.uid();
  if not found then
    raise exception 'Alocação não encontrada.' using errcode = 'P0002';
  end if;

  insert into public.audit_log (actor_id, actor_type, action, entity_type, entity_id)
  values (auth.uid(), 'user', 'gabinete.remover_alocacao', 'gabinete', p_projeto::text);
end;
$$;


-- ---------------------------------------------------------------------------
-- Direitos: só utilizadores autenticados (e a guarda decide o resto).
-- ---------------------------------------------------------------------------

revoke all on function public.guardar_decisao(uuid, integer, text, text, text, text, text, text, text, text, date, boolean, text) from public, anon;
revoke all on function public.guardar_prioridade(uuid, integer, text, text, text, text, text, text, text) from public, anon;
revoke all on function public.guardar_projeto(uuid, integer, text, text, text, text, text, text, text, text, numeric, numeric, numeric, numeric, boolean[], text, text, date, text) from public, anon;
revoke all on function public.guardar_movimento(uuid, integer, text, text, uuid, numeric, text, date, date) from public, anon;
revoke all on function public.guardar_pessoa(uuid, integer, text, text, text, numeric, boolean) from public, anon;
revoke all on function public.guardar_alocacao(uuid, uuid, numeric, date) from public, anon;
revoke all on function public.remover_alocacao(uuid, uuid) from public, anon;
grant execute on function public.guardar_decisao(uuid, integer, text, text, text, text, text, text, text, text, date, boolean, text) to authenticated;
grant execute on function public.guardar_prioridade(uuid, integer, text, text, text, text, text, text, text) to authenticated;
grant execute on function public.guardar_projeto(uuid, integer, text, text, text, text, text, text, text, text, numeric, numeric, numeric, numeric, boolean[], text, text, date, text) to authenticated;
grant execute on function public.guardar_movimento(uuid, integer, text, text, uuid, numeric, text, date, date) to authenticated;
grant execute on function public.guardar_pessoa(uuid, integer, text, text, text, numeric, boolean) to authenticated;
grant execute on function public.guardar_alocacao(uuid, uuid, numeric, date) to authenticated;
grant execute on function public.remover_alocacao(uuid, uuid) to authenticated;

-- As funções de escrita desistem de esperar por um lock ao fim de 4 s (0016).
alter function public.guardar_decisao(uuid, integer, text, text, text, text, text, text, text, text, date, boolean, text) set lock_timeout = '4s';
alter function public.guardar_prioridade(uuid, integer, text, text, text, text, text, text, text) set lock_timeout = '4s';
alter function public.guardar_projeto(uuid, integer, text, text, text, text, text, text, text, text, numeric, numeric, numeric, numeric, boolean[], text, text, date, text) set lock_timeout = '4s';
alter function public.guardar_movimento(uuid, integer, text, text, uuid, numeric, text, date, date) set lock_timeout = '4s';
alter function public.guardar_pessoa(uuid, integer, text, text, text, numeric, boolean) set lock_timeout = '4s';
alter function public.guardar_alocacao(uuid, uuid, numeric, date) set lock_timeout = '4s';
alter function public.remover_alocacao(uuid, uuid) set lock_timeout = '4s';

notify pgrst, 'reload schema';
