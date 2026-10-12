
-- APLICAR NO SQL EDITOR DO SUPABASE — projecto nixltrbdplqjadfytryd
-- 0019 em TRÊS PARTES — PARTE 1 de 3: colunas novas das oportunidades, vista, próxima acção e valor
-- Pressupõe a 0018 aplicada (linha 30 do verificar-estado em «ok»).
-- As três partes juntas são a migração 0019 palavra por palavra (um teste
-- garante-o). Todas são repetíveis: pode correr cada uma as vezes que quiser.
-- 1. No GitHub, botão «Copy raw file» (ou Raw, Ctrl+A, Ctrl+C).
-- 2. SQL Editor: consulta NOVA e vazia, colar, Run. Esperado: «Success».
-- 3. Depois, a PARTE 2 (aplicar-0019-parte2.sql), da mesma forma.
-- ===== fim do cabeçalho: daqui para baixo é a migração 0019, sem alterações =====
-- ============================================================================
-- 0019 — CRM operacional: próxima acção, valor, fecho, motivo de perda
-- ============================================================================
-- O CRM partilhado deixa de ser um registo e passa a dizer o que fazer a
-- seguir. Decisões do fundador (11/10/2026):
--   * cada oportunidade tem valor e moeda (MZN/EUR/BRL/USD), data prevista de
--     fecho e próxima acção com data;
--   * «perdido» exige um motivo de uma lista fechada;
--   * o responsável é manual («Atribuir a mim»); sem distribuição automática;
--   * aprovar um diagnóstico leva a oportunidade de `novo` a `qualificacao`;
--     rejeitá-lo leva-a a `perdido` com motivo `nao_qualificado`.
--
-- O padrão é o de 0006: nenhuma escrita directa; funções `security definer`
-- que verificam o papel, derivam o autor de `auth.uid()` e escrevem a
-- auditoria na mesma transacção. As assinaturas que a aplicação já usa
-- (`mudar_fase_oportunidade`, `registar_actividade`, `aprovar_diagnostico`,
-- `rejeitar_diagnostico`) mantêm-se: muda o corpo, não a chamada.
--
-- Idempotente: pode correr mais do que uma vez.
-- ============================================================================

-- Se uma transacção longa segurar `deals`, desistir em vez de ficar na fila e
-- bloquear todo o tráfego atrás da migração. Repetir mais tarde.
set lock_timeout = '5s';


-- ---------------------------------------------------------------------------
-- Colunas novas em `deals`
-- ---------------------------------------------------------------------------

alter table public.deals
  add column if not exists proxima_accao text
    check (proxima_accao is null or length(trim(proxima_accao)) between 1 and 200),
  add column if not exists valor numeric(14, 2) check (valor is null or valor >= 0),
  add column if not exists moeda text check (moeda is null or moeda in ('MZN', 'EUR', 'BRL', 'USD')),
  add column if not exists data_prevista_fecho date,
  add column if not exists motivo_perda text check (motivo_perda is null or motivo_perda in (
    'preco', 'timing', 'concorrente', 'sem_orcamento', 'sem_decisor', 'nao_qualificado', 'outro')),
  add column if not exists motivo_perda_nota text
    check (motivo_perda_nota is null or length(trim(motivo_perda_nota)) between 1 and 500),
  add column if not exists revisao integer not null default 1 check (revisao >= 1),
  add column if not exists fase_desde timestamptz;

-- Há quanto tempo está nesta fase: para as que já existiam, a última mudança
-- de fase registada na cronologia, ou a criação. Só preenche o que está vazio,
-- por isso repetir a migração não muda nada.
-- Sem o gatilho de `updated_at`: preencher uma coluna nova não é «mexer» na
-- oportunidade, e a data da última alteração de cada uma tem de se manter.
alter table public.deals disable trigger deals_set_updated_at;
update public.deals d
   set fase_desde = coalesce(
         (select max(a.occurred_at) from public.activities a
           where a.deal_id = d.id and a.activity_type = 'fase'),
         d.created_at)
 where d.fase_desde is null;
alter table public.deals enable trigger deals_set_updated_at;
alter table public.deals alter column fase_desde set default now();
alter table public.deals alter column fase_desde set not null;

-- Valor sem moeda (ou moeda sem valor) não se soma a nada.
alter table public.deals drop constraint if exists deals_valor_com_moeda;
alter table public.deals
  add constraint deals_valor_com_moeda check ((valor is null) = (moeda is null));

-- `numeric` aceita NaN, e um NaN estraga qualquer soma do pipeline.
alter table public.deals drop constraint if exists deals_valor_finito;
alter table public.deals
  add constraint deals_valor_finito check (valor is null or valor <> 'NaN'::numeric);

-- Uma próxima acção tem data; uma data sem acção não diz o que fazer.
alter table public.deals drop constraint if exists deals_proxima_accao_com_data;
alter table public.deals
  add constraint deals_proxima_accao_com_data check (proxima_accao is null or next_action_at is not null);

-- O motivo só existe numa oportunidade perdida. (Que «perdido» o exija é
-- garantido pelas funções: as perdidas antes desta migração não o têm.)
alter table public.deals drop constraint if exists deals_motivo_so_se_perdido;
alter table public.deals
  add constraint deals_motivo_so_se_perdido check (motivo_perda is null or stage = 'perdido');

-- A fila de cada pessoa: abertas por responsável e pela próxima data.
create index if not exists deals_abertas_por_dono_idx
  on public.deals (owner_id, next_action_at)
  where stage not in ('ganho', 'perdido');
create index if not exists deals_abertas_por_data_idx
  on public.deals (next_action_at)
  where stage not in ('ganho', 'perdido');

-- `fase_desde` acompanha qualquer mudança de fase, venha de onde vier.
create or replace function public.deals_marca_fase()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if new.stage is distinct from old.stage then
    new.fase_desde := now();
  end if;
  return new;
end;
$$;

drop trigger if exists deals_marca_fase on public.deals;
create trigger deals_marca_fase
  before update of stage on public.deals
  for each row execute function public.deals_marca_fase();


-- ---------------------------------------------------------------------------
-- Vista de leitura do pipeline
-- ---------------------------------------------------------------------------
-- A data da última actividade de cada oportunidade, calculada na base: pedi-la
-- ao PostgREST com centenas de ids no URL passaria o limite do pedido.
-- `security_invoker`: quem lê a vista vê o que veria em `deals` (RLS).

-- Apagar antes de criar: `d.*` expande-se na criação, e uma coluna nova em
-- `deals` faria o `create or replace` falhar numa repetição.
drop view if exists public.crm_oportunidades;
create view public.crm_oportunidades
with (security_invoker = true)
as
select d.*,
       (select max(a.occurred_at) from public.activities a where a.deal_id = d.id) as ultima_actividade
  from public.deals d;

revoke all on public.crm_oportunidades from public, anon;
grant select on public.crm_oportunidades to authenticated;


-- ---------------------------------------------------------------------------
-- Próxima acção
-- ---------------------------------------------------------------------------

create or replace function public.definir_proxima_accao(
  p_deal_id uuid,
  p_revisao integer,
  p_accao text,
  p_quando timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
set lock_timeout = '4s'
as $$
declare
  d public.deals;
  v_accao text := nullif(trim(coalesce(p_accao, '')), '');
begin
  perform public.exigir_papel(array['admin', 'comercial']::public.user_role[]);

  -- As duas juntas, ou nenhuma (limpar).
  if (v_accao is null) <> (p_quando is null) then
    raise exception 'A próxima acção precisa de descrição e de data.' using errcode = '22023';
  end if;

  select * into d from public.deals where id = p_deal_id for update;
  if not found then
    raise exception 'Oportunidade inexistente.' using errcode = 'P0002';
  end if;
  if d.revisao is distinct from p_revisao then
    raise exception 'A oportunidade mudou entretanto. Recarregue e volte a tentar.' using errcode = '40001';
  end if;
  if d.stage in ('ganho', 'perdido') and v_accao is not null then
    raise exception 'Uma oportunidade fechada não tem próxima acção.' using errcode = '22023';
  end if;

  update public.deals
     set proxima_accao = left(v_accao, 200), next_action_at = p_quando, revisao = d.revisao + 1
   where id = p_deal_id;

  insert into public.activities (deal_id, activity_type, body, actor_id, actor_type, metadata)
  values (p_deal_id, 'proxima_accao', left(v_accao, 200), auth.uid(), 'user',
          jsonb_build_object('quando', p_quando));

  insert into public.audit_log (actor_id, actor_type, action, entity_type, entity_id, before, after)
  values (auth.uid(), 'user', 'oportunidade.proxima_accao', 'deal', p_deal_id::text,
          jsonb_build_object('proxima_accao', d.proxima_accao, 'next_action_at', d.next_action_at),
          jsonb_build_object('proxima_accao', left(v_accao, 200), 'next_action_at', p_quando));

  return jsonb_build_object('id', p_deal_id, 'revisao', d.revisao + 1);
end;
$$;


-- ---------------------------------------------------------------------------
-- Valor, moeda e data prevista de fecho
-- ---------------------------------------------------------------------------

create or replace function public.guardar_oportunidade_crm(
  p_deal_id uuid,
  p_revisao integer,
  p_valor numeric,
  p_moeda text,
  p_data_prevista_fecho date
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
set lock_timeout = '4s'
as $$
declare
  d public.deals;
begin
  perform public.exigir_papel(array['admin', 'comercial']::public.user_role[]);

  if p_valor = 'NaN'::numeric or p_valor < 0 then
    raise exception 'Valor inválido.' using errcode = '22023';
  end if;
  if (p_valor is null) <> (nullif(trim(coalesce(p_moeda, '')), '') is null) then
    raise exception 'O valor precisa de moeda (e a moeda de valor).' using errcode = '22023';
  end if;

  select * into d from public.deals where id = p_deal_id for update;
  if not found then
    raise exception 'Oportunidade inexistente.' using errcode = 'P0002';
  end if;
  if d.revisao is distinct from p_revisao then
    raise exception 'A oportunidade mudou entretanto. Recarregue e volte a tentar.' using errcode = '40001';
  end if;

  update public.deals
     set valor = p_valor,
         moeda = nullif(trim(coalesce(p_moeda, '')), ''),
         data_prevista_fecho = p_data_prevista_fecho,
         revisao = d.revisao + 1
   where id = p_deal_id;

  insert into public.activities (deal_id, activity_type, actor_id, actor_type, metadata)
  values (p_deal_id, 'dados', auth.uid(), 'user',
          jsonb_build_object('valor', p_valor, 'moeda', p_moeda, 'data_prevista_fecho', p_data_prevista_fecho));

  insert into public.audit_log (actor_id, actor_type, action, entity_type, entity_id, before, after)
  values (auth.uid(), 'user', 'oportunidade.dados', 'deal', p_deal_id::text,
          jsonb_build_object('valor', d.valor, 'moeda', d.moeda, 'data_prevista_fecho', d.data_prevista_fecho),
          jsonb_build_object('valor', p_valor, 'moeda', p_moeda, 'data_prevista_fecho', p_data_prevista_fecho));

  return jsonb_build_object('id', p_deal_id, 'revisao', d.revisao + 1);
end;
$$;


reset lock_timeout;


