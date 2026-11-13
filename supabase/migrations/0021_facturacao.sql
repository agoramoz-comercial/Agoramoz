-- ============================================================================
-- 0021 — Facturação interna: a fila «A facturar», sem ERP
-- ============================================================================
-- Decisão do fundador (13/11/2026): ainda não há ERP. As oportunidades
-- ganhas no Pipeline passam a seguir para uma fila interna «A facturar» no
-- admin, onde se marcam como facturadas (número, data, valor e moeda da
-- factura emitida fora daqui) e se exportam para o contabilista. Quando
-- houver ERP, o adaptador lê a mesma tabela (docs/ERP.md).
--
-- 1. Uma oportunidade ganha sem linha em `facturacao` está «por facturar» —
--    a fila não precisa de ser alimentada, nasce da fase `ganho`.
-- 2. `facturacao` guarda a factura emitida (uma por oportunidade). Anular
--    não apaga: o registo fica, com o motivo, e a oportunidade volta à fila.
-- 3. O mesmo número de factura não se usa duas vezes (anuladas à parte).
-- 4. O padrão de 0006/0019: lê a equipa; escrevem `admin` e `comercial` só
--    pelas funções, com revisão, `lock_timeout`, cronologia da oportunidade
--    e auditoria na mesma transacção. Esta base NÃO emite facturas: regista
--    as que foram emitidas.
--
-- Pressupõe a 0019 (`deals.revisao`, `deals.valor`, `deals.moeda`).
-- Idempotente: pode correr mais do que uma vez.
-- ============================================================================

set lock_timeout = '5s';


-- ---------------------------------------------------------------------------
-- Tabela
-- ---------------------------------------------------------------------------

create table if not exists public.facturacao (
  deal_id uuid primary key references public.deals(id) on delete restrict,
  estado text not null default 'facturada' check (estado in ('facturada', 'anulada')),
  numero_factura text not null check (length(trim(numero_factura)) between 1 and 60),
  data_factura date not null,
  valor numeric(14, 2) not null check (valor >= 0 and valor <> 'NaN'::numeric),
  moeda text not null check (moeda in ('MZN', 'EUR', 'BRL', 'USD')),
  nota text check (nota is null or length(trim(nota)) between 1 and 300),
  motivo_anulacao text check (motivo_anulacao is null or length(trim(motivo_anulacao)) between 3 and 300),
  revisao integer not null default 1 check (revisao >= 1),
  registada_por uuid not null default auth.uid() references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Anulada tem motivo; facturada não.
  constraint facturacao_anulada_tem_motivo check ((estado = 'anulada') = (motivo_anulacao is not null))
);

-- Um número de factura só serve uma factura válida.
create unique index if not exists facturacao_numero_unico
  on public.facturacao (lower(trim(numero_factura)))
  where estado = 'facturada';
create index if not exists facturacao_data_idx on public.facturacao (data_factura desc);

drop trigger if exists facturacao_set_updated_at on public.facturacao;
create trigger facturacao_set_updated_at
  before update on public.facturacao
  for each row execute function public.set_updated_at();

alter table public.facturacao enable row level security;

drop policy if exists facturacao_select on public.facturacao;
create policy facturacao_select on public.facturacao
  for select to authenticated using (public.is_staff());

revoke all on public.facturacao from public, anon, authenticated;
grant select on public.facturacao to authenticated;


-- ---------------------------------------------------------------------------
-- Marcar como facturada (ou voltar a facturar uma anulada)
-- ---------------------------------------------------------------------------

create or replace function public.marcar_facturada(
  p_deal_id uuid,
  p_revisao integer,
  p_numero text,
  p_data date,
  p_valor numeric,
  p_moeda text,
  p_nota text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
set lock_timeout = '4s'
as $$
declare
  d public.deals;
  f public.facturacao;
  v_numero text := trim(coalesce(p_numero, ''));
  v_nota text := nullif(trim(coalesce(p_nota, '')), '');
  v_revisao integer;
begin
  perform public.exigir_papel(array['admin', 'comercial']::public.user_role[]);

  if length(v_numero) not between 1 and 60 then
    raise exception 'Indique o número da factura (até 60 caracteres).' using errcode = '22023';
  end if;
  if p_data is null or p_data > (now() at time zone 'Africa/Maputo')::date then
    raise exception 'A data da factura não pode estar no futuro.' using errcode = '22023';
  end if;
  if p_valor is null or p_valor = 'NaN'::numeric or p_valor < 0 or p_valor > 1e12 then
    raise exception 'Valor da factura inválido.' using errcode = '22023';
  end if;
  if p_moeda is null or p_moeda not in ('MZN', 'EUR', 'BRL', 'USD') then
    raise exception 'Moeda inválida.' using errcode = '22023';
  end if;
  if v_nota is not null and length(v_nota) > 300 then
    raise exception 'A nota tem no máximo 300 caracteres.' using errcode = '22023';
  end if;

  select * into d from public.deals where id = p_deal_id for update;
  if not found then
    raise exception 'Oportunidade inexistente.' using errcode = 'P0002';
  end if;
  if d.stage <> 'ganho' then
    raise exception 'Só uma oportunidade ganha segue para facturação.' using errcode = '22023';
  end if;

  if exists (select 1 from public.facturacao
              where estado = 'facturada' and lower(trim(numero_factura)) = lower(v_numero) and deal_id <> p_deal_id) then
    raise exception 'Este número de factura já está registado noutra oportunidade.' using errcode = '22023';
  end if;

  select * into f from public.facturacao where deal_id = p_deal_id for update;
  if found then
    if f.estado = 'facturada' then
      raise exception 'Esta oportunidade já está facturada. Para corrigir, anule e volte a registar.' using errcode = '22023';
    end if;
    if f.revisao is distinct from p_revisao then
      raise exception 'O registo mudou entretanto. Recarregue e volte a tentar.' using errcode = '40001';
    end if;
    update public.facturacao
       set estado = 'facturada', numero_factura = v_numero, data_factura = p_data, valor = round(p_valor, 2),
           moeda = p_moeda, nota = v_nota, motivo_anulacao = null, revisao = f.revisao + 1, registada_por = auth.uid()
     where deal_id = p_deal_id;
    v_revisao := f.revisao + 1;
  else
    if p_revisao is not null then
      raise exception 'O registo mudou entretanto. Recarregue e volte a tentar.' using errcode = '40001';
    end if;
    insert into public.facturacao (deal_id, numero_factura, data_factura, valor, moeda, nota, registada_por)
    values (p_deal_id, v_numero, p_data, round(p_valor, 2), p_moeda, v_nota, auth.uid());
    v_revisao := 1;
  end if;

  insert into public.activities (deal_id, activity_type, actor_id, actor_type, metadata)
  values (p_deal_id, 'facturada', auth.uid(), 'user',
          jsonb_build_object('numero', v_numero, 'data', p_data, 'valor', round(p_valor, 2), 'moeda', p_moeda));

  insert into public.audit_log (actor_id, actor_type, action, entity_type, entity_id, before, after)
  values (auth.uid(), 'user', 'facturacao.registar', 'deal', p_deal_id::text,
          case when f.deal_id is null then null else jsonb_build_object('estado', f.estado) end,
          jsonb_build_object('numero', v_numero, 'data', p_data, 'valor', round(p_valor, 2), 'moeda', p_moeda));

  return jsonb_build_object('deal_id', p_deal_id, 'estado', 'facturada', 'revisao', v_revisao);
end;
$$;


-- ---------------------------------------------------------------------------
-- Anular: o registo fica, com o motivo; a oportunidade volta a «por facturar»
-- ---------------------------------------------------------------------------

create or replace function public.anular_facturacao(
  p_deal_id uuid,
  p_revisao integer,
  p_motivo text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
set lock_timeout = '4s'
as $$
declare
  f public.facturacao;
  v_motivo text := trim(coalesce(p_motivo, ''));
begin
  perform public.exigir_papel(array['admin', 'comercial']::public.user_role[]);

  if length(v_motivo) not between 3 and 300 then
    raise exception 'Diga porque anula (entre 3 e 300 caracteres).' using errcode = '22023';
  end if;

  select * into f from public.facturacao where deal_id = p_deal_id for update;
  if not found then
    raise exception 'Esta oportunidade não tem factura registada.' using errcode = 'P0002';
  end if;
  if f.revisao is distinct from p_revisao then
    raise exception 'O registo mudou entretanto. Recarregue e volte a tentar.' using errcode = '40001';
  end if;
  if f.estado = 'anulada' then
    return jsonb_build_object('deal_id', p_deal_id, 'estado', 'anulada', 'revisao', f.revisao);
  end if;

  update public.facturacao
     set estado = 'anulada', motivo_anulacao = v_motivo, revisao = f.revisao + 1
   where deal_id = p_deal_id;

  insert into public.activities (deal_id, activity_type, actor_id, actor_type, metadata, body)
  values (p_deal_id, 'facturacao_anulada', auth.uid(), 'user', jsonb_build_object('numero', f.numero_factura), v_motivo);

  insert into public.audit_log (actor_id, actor_type, action, entity_type, entity_id, before, after)
  values (auth.uid(), 'user', 'facturacao.anular', 'deal', p_deal_id::text,
          jsonb_build_object('estado', 'facturada', 'numero', f.numero_factura),
          jsonb_build_object('estado', 'anulada'));

  return jsonb_build_object('deal_id', p_deal_id, 'estado', 'anulada', 'revisao', f.revisao + 1);
end;
$$;


-- ---------------------------------------------------------------------------
-- Exportação para o contabilista: registada antes de sair
-- ---------------------------------------------------------------------------

create or replace function public.registar_exportacao_facturacao(
  p_linhas integer,
  p_filtros jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
set lock_timeout = '4s'
as $$
begin
  perform public.exigir_papel(array['admin', 'comercial']::public.user_role[]);
  if p_linhas is null or p_linhas < 0 or p_linhas > 100000 then
    raise exception 'Número de linhas inválido.' using errcode = '22023';
  end if;
  if p_filtros is not null and (jsonb_typeof(p_filtros) <> 'object' or octet_length(p_filtros::text) > 1000) then
    raise exception 'Filtros inválidos.' using errcode = '22023';
  end if;
  insert into public.audit_log (actor_id, actor_type, action, entity_type, entity_id, after)
  values (auth.uid(), 'user', 'facturacao.exportar', 'facturacao', 'lista',
          jsonb_build_object('linhas', p_linhas, 'filtros', coalesce(p_filtros, '{}'::jsonb)));
end;
$$;


-- ---------------------------------------------------------------------------
-- Direitos
-- ---------------------------------------------------------------------------

revoke all on function public.marcar_facturada(uuid, integer, text, date, numeric, text, text) from public, anon;
grant execute on function public.marcar_facturada(uuid, integer, text, date, numeric, text, text) to authenticated;
revoke all on function public.anular_facturacao(uuid, integer, text) from public, anon;
grant execute on function public.anular_facturacao(uuid, integer, text) to authenticated;
revoke all on function public.registar_exportacao_facturacao(integer, jsonb) from public, anon;
grant execute on function public.registar_exportacao_facturacao(integer, jsonb) to authenticated;

reset lock_timeout;

notify pgrst, 'reload schema';
