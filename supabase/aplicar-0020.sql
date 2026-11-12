-- APLICAR NO SQL EDITOR DO SUPABASE — projecto nixltrbdplqjadfytryd
-- 0020 numa só parte: propostas guardadas, com versões, ligadas ao Pipeline
-- Pressupõe a 0019 aplicada (linha 31 do verificar-estado em «ok»).
-- Este ficheiro é a migração 0020 palavra por palavra (um teste garante-o).
-- É repetível: pode correr as vezes que quiser.
-- 1. No GitHub, botão «Copy raw file» (ou Raw, Ctrl+A, Ctrl+C).
-- 2. SQL Editor: consulta NOVA e vazia, colar, Run. Esperado: «Success».
-- 3. Depois, correr o verificar-estado.sql: a linha 32 tem de dizer «ok».
-- ===== fim do cabeçalho: daqui para baixo é a migração 0020, sem alterações =====
-- ============================================================================
-- 0020 — Propostas: guardadas, com versões, ligadas ao Pipeline
-- ============================================================================
-- Decisão do fundador (12/11/2026): as propostas do criador editorial
-- (/admin/propostas) passam a ficar na base, ligadas a uma oportunidade e com
-- histórico de versões; e pode colar-se o texto de uma proposta para o
-- desenho editorial ser gerado a partir dele.
--
-- O padrão é o de 0006/0019: nenhuma escrita directa; funções `security
-- definer` que verificam o papel, derivam o autor de `auth.uid()` e escrevem
-- a auditoria na mesma transacção.
--
-- 1. `propostas`: uma linha por proposta, com o estado e os dados que a
--    lista mostra (projecto, cliente, total, moeda, oportunidade).
-- 2. `propostas_versoes`: cada gravação é uma versão NOVA e imutável — o
--    conteúdo (o JSON do editor), o texto colado de onde veio, se veio, e
--    uma nota. Não há função que altere ou apague uma versão.
-- 3. O total é calculado AQUI, a partir das fases do conteúdo: o que a lista
--    e o Pipeline mostram não depende de a aplicação o ter somado bem.
-- 4. Lêem todos os da equipa (como o Pipeline); escrevem `admin` e
--    `comercial`; `leitura` só lê.
-- 5. A auditoria leva o id, a versão, o total e o estado — nunca o conteúdo.
-- 6. Ligada a uma oportunidade, cada versão nova e cada mudança de estado
--    ficam também na cronologia da oportunidade (`activities`, tipo
--    `proposta`).
--
-- Idempotente: pode correr mais do que uma vez.
-- ============================================================================

set lock_timeout = '5s';


-- ---------------------------------------------------------------------------
-- Tabelas
-- ---------------------------------------------------------------------------

create table if not exists public.propostas (
  id uuid primary key default extensions.gen_random_uuid(),
  deal_id uuid references public.deals(id) on delete set null,
  projeto text not null check (length(trim(projeto)) between 1 and 120),
  cliente text not null check (length(trim(cliente)) between 1 and 120),
  estado text not null default 'rascunho'
    check (estado in ('rascunho', 'enviada', 'aceite', 'recusada', 'arquivada')),
  moeda text not null check (moeda in ('MZN', 'USD', 'EUR')),
  total numeric(16, 2) not null check (total >= 0 and total <> 'NaN'::numeric),
  versao_actual integer not null default 1 check (versao_actual >= 1),
  revisao integer not null default 1 check (revisao >= 1),
  criada_por uuid not null default auth.uid() references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists propostas_recentes_idx on public.propostas (updated_at desc);
create index if not exists propostas_por_oportunidade_idx on public.propostas (deal_id) where deal_id is not null;

drop trigger if exists propostas_set_updated_at on public.propostas;
create trigger propostas_set_updated_at
  before update on public.propostas
  for each row execute function public.set_updated_at();

create table if not exists public.propostas_versoes (
  proposta_id uuid not null references public.propostas(id) on delete cascade,
  versao integer not null check (versao >= 1),
  -- O JSON do editor (lib/propostas/modelo.ts). 64 KB chega a uma proposta
  -- cheia com folga; mais do que isso não é uma proposta.
  conteudo jsonb not null
    check (jsonb_typeof(conteudo) = 'object' and octet_length(conteudo::text) <= 65536),
  texto_colado text check (texto_colado is null or length(texto_colado) between 1 and 60000),
  nota text check (nota is null or length(trim(nota)) between 1 and 300),
  moeda text not null check (moeda in ('MZN', 'USD', 'EUR')),
  total numeric(16, 2) not null check (total >= 0 and total <> 'NaN'::numeric),
  criada_por uuid not null default auth.uid() references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (proposta_id, versao)
);


-- ---------------------------------------------------------------------------
-- Leitura: toda a equipa; escrita: só pelas funções
-- ---------------------------------------------------------------------------

alter table public.propostas enable row level security;
alter table public.propostas_versoes enable row level security;

drop policy if exists propostas_select on public.propostas;
create policy propostas_select on public.propostas
  for select to authenticated using (public.is_staff());

drop policy if exists propostas_versoes_select on public.propostas_versoes;
create policy propostas_versoes_select on public.propostas_versoes
  for select to authenticated using (public.is_staff());

revoke all on public.propostas from public, anon, authenticated;
revoke all on public.propostas_versoes from public, anon, authenticated;
grant select on public.propostas to authenticated;
grant select on public.propostas_versoes to authenticated;


-- ---------------------------------------------------------------------------
-- O total e a validação do conteúdo, na base
-- ---------------------------------------------------------------------------

-- A soma das fases. Um valor que não seja um número finito e não negativo
-- recusa a gravação inteira.
create or replace function public.total_da_proposta(p_conteudo jsonb)
returns numeric
language plpgsql
immutable
set search_path = pg_catalog, public
as $$
declare
  v_total numeric := 0;
  v_fase jsonb;
  v_valor numeric;
begin
  if jsonb_typeof(p_conteudo -> 'fases') is distinct from 'array' then
    raise exception 'Proposta sem lista de fases.' using errcode = '22023';
  end if;
  if jsonb_array_length(p_conteudo -> 'fases') > 8 then
    raise exception 'No máximo oito fases.' using errcode = '22023';
  end if;
  for v_fase in select * from jsonb_array_elements(p_conteudo -> 'fases') loop
    if jsonb_typeof(v_fase -> 'valor') is distinct from 'number' then
      raise exception 'Fase sem valor numérico.' using errcode = '22023';
    end if;
    v_valor := (v_fase ->> 'valor')::numeric;
    if v_valor < 0 or v_valor > 1e12 then
      raise exception 'Valor de fase inválido.' using errcode = '22023';
    end if;
    v_total := v_total + v_valor;
  end loop;
  return round(v_total, 2);
end;
$$;

-- O mínimo que a base exige do conteúdo; o resto do formato valida-o a
-- aplicação (zod) antes de chamar, e volta a validá-lo ao ler.
create or replace function public.validar_conteudo_proposta(p_conteudo jsonb)
returns void
language plpgsql
immutable
set search_path = pg_catalog, public
as $$
begin
  if p_conteudo is null or jsonb_typeof(p_conteudo) is distinct from 'object' then
    raise exception 'Conteúdo inválido.' using errcode = '22023';
  end if;
  if octet_length(p_conteudo::text) > 65536 then
    raise exception 'A proposta é grande de mais para guardar.' using errcode = '22023';
  end if;
  if (p_conteudo ->> 'versao') is distinct from '1' then
    raise exception 'Formato de proposta desconhecido.' using errcode = '22023';
  end if;
  if length(trim(coalesce(p_conteudo ->> 'projeto', ''))) not between 1 and 120 then
    raise exception 'A proposta precisa do nome do projecto.' using errcode = '22023';
  end if;
  if length(trim(coalesce(p_conteudo ->> 'cliente', ''))) not between 1 and 120 then
    raise exception 'A proposta precisa do cliente.' using errcode = '22023';
  end if;
  if coalesce(p_conteudo ->> 'moeda', '') not in ('MZN', 'USD', 'EUR') then
    raise exception 'Moeda inválida.' using errcode = '22023';
  end if;
end;
$$;


-- ---------------------------------------------------------------------------
-- Guardar: cria a proposta (p_id nulo) ou acrescenta-lhe uma versão
-- ---------------------------------------------------------------------------

create or replace function public.guardar_proposta(
  p_id uuid,
  p_revisao integer,
  p_deal_id uuid,
  p_conteudo jsonb,
  p_texto_colado text,
  p_nota text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
set lock_timeout = '4s'
as $$
declare
  v_papel public.user_role;
  v_total numeric;
  v_moeda text;
  v_texto text := nullif(trim(coalesce(p_texto_colado, '')), '');
  v_nota text := nullif(trim(coalesce(p_nota, '')), '');
  v_p public.propostas;
  v_versao integer;
  v_id uuid;
begin
  v_papel := public.exigir_papel(array['admin', 'comercial']::public.user_role[]);

  perform public.validar_conteudo_proposta(p_conteudo);
  v_total := public.total_da_proposta(p_conteudo);
  v_moeda := p_conteudo ->> 'moeda';

  if v_texto is not null and length(v_texto) > 60000 then
    raise exception 'O texto colado é grande de mais (máximo 60 000 caracteres).' using errcode = '22023';
  end if;
  if v_nota is not null and length(v_nota) > 300 then
    raise exception 'A nota tem no máximo 300 caracteres.' using errcode = '22023';
  end if;
  if p_deal_id is not null and not exists (select 1 from public.deals where id = p_deal_id) then
    raise exception 'Oportunidade inexistente.' using errcode = 'P0002';
  end if;

  if p_id is null then
    insert into public.propostas (deal_id, projeto, cliente, moeda, total, criada_por)
    values (p_deal_id, trim(p_conteudo ->> 'projeto'), trim(p_conteudo ->> 'cliente'), v_moeda, v_total, auth.uid())
    returning * into v_p;
    v_versao := 1;
  else
    select * into v_p from public.propostas where id = p_id for update;
    if not found then
      raise exception 'Proposta inexistente.' using errcode = 'P0002';
    end if;
    if v_p.revisao is distinct from p_revisao then
      raise exception 'A proposta mudou entretanto. Recarregue e volte a tentar.' using errcode = '40001';
    end if;
    if v_p.estado in ('aceite', 'recusada', 'arquivada') then
      raise exception 'Esta proposta está fechada. Para a mudar, volte a pô-la em rascunho.' using errcode = '22023';
    end if;

    -- Gravar o mesmo conteúdo outra vez não é uma versão nova.
    if p_deal_id is not distinct from v_p.deal_id and exists (
         select 1 from public.propostas_versoes
          where proposta_id = v_p.id and versao = v_p.versao_actual and conteudo = p_conteudo) then
      return jsonb_build_object('id', v_p.id, 'versao', v_p.versao_actual, 'revisao', v_p.revisao, 'nova', false);
    end if;

    v_versao := v_p.versao_actual + 1;
    update public.propostas
       set deal_id = p_deal_id,
           projeto = trim(p_conteudo ->> 'projeto'),
           cliente = trim(p_conteudo ->> 'cliente'),
           moeda = v_moeda,
           total = v_total,
           versao_actual = v_versao,
           revisao = v_p.revisao + 1
     where id = v_p.id
    returning * into v_p;
  end if;

  v_id := v_p.id;
  insert into public.propostas_versoes (proposta_id, versao, conteudo, texto_colado, nota, moeda, total, criada_por)
  values (v_id, v_versao, p_conteudo, v_texto, v_nota, v_moeda, v_total, auth.uid());

  if p_deal_id is not null then
    insert into public.activities (deal_id, activity_type, actor_id, actor_type, metadata)
    values (p_deal_id, 'proposta', auth.uid(), 'user',
            jsonb_build_object('proposta_id', v_id, 'versao', v_versao, 'total', v_total, 'moeda', v_moeda));
  end if;

  insert into public.audit_log (actor_id, actor_type, action, entity_type, entity_id, before, after)
  values (auth.uid(), 'user', case when v_versao = 1 then 'proposta.criada' else 'proposta.versao' end,
          'proposta', v_id::text, null,
          jsonb_build_object('versao', v_versao, 'total', v_total, 'moeda', v_moeda, 'deal_id', p_deal_id));

  return jsonb_build_object('id', v_id, 'versao', v_versao, 'revisao', v_p.revisao, 'nova', true);
end;
$$;


-- ---------------------------------------------------------------------------
-- Estado: rascunho → enviada → aceite / recusada; arquivada a qualquer altura
-- ---------------------------------------------------------------------------

create or replace function public.mudar_estado_proposta(
  p_id uuid,
  p_revisao integer,
  p_estado text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
set lock_timeout = '4s'
as $$
declare
  v_p public.propostas;
begin
  perform public.exigir_papel(array['admin', 'comercial']::public.user_role[]);

  if p_estado is null or p_estado not in ('rascunho', 'enviada', 'aceite', 'recusada', 'arquivada') then
    raise exception 'Estado inválido.' using errcode = '22023';
  end if;

  select * into v_p from public.propostas where id = p_id for update;
  if not found then
    raise exception 'Proposta inexistente.' using errcode = 'P0002';
  end if;
  if v_p.revisao is distinct from p_revisao then
    raise exception 'A proposta mudou entretanto. Recarregue e volte a tentar.' using errcode = '40001';
  end if;
  if v_p.estado = p_estado then
    return jsonb_build_object('id', v_p.id, 'estado', v_p.estado, 'revisao', v_p.revisao);
  end if;
  -- Aceite ou recusada só depois de enviada: uma resposta pressupõe um envio.
  if p_estado in ('aceite', 'recusada') and v_p.estado <> 'enviada' then
    raise exception 'Só uma proposta enviada pode ser aceite ou recusada.' using errcode = '22023';
  end if;

  update public.propostas set estado = p_estado, revisao = v_p.revisao + 1 where id = p_id;

  if v_p.deal_id is not null then
    insert into public.activities (deal_id, activity_type, actor_id, actor_type, metadata)
    values (v_p.deal_id, 'proposta', auth.uid(), 'user',
            jsonb_build_object('proposta_id', p_id, 'versao', v_p.versao_actual, 'estado', p_estado));
  end if;

  insert into public.audit_log (actor_id, actor_type, action, entity_type, entity_id, before, after)
  values (auth.uid(), 'user', 'proposta.estado', 'proposta', p_id::text,
          jsonb_build_object('estado', v_p.estado), jsonb_build_object('estado', p_estado));

  return jsonb_build_object('id', p_id, 'estado', p_estado, 'revisao', v_p.revisao + 1);
end;
$$;


-- ---------------------------------------------------------------------------
-- Direitos
-- ---------------------------------------------------------------------------

revoke all on function public.guardar_proposta(uuid, integer, uuid, jsonb, text, text) from public, anon;
grant execute on function public.guardar_proposta(uuid, integer, uuid, jsonb, text, text) to authenticated;
revoke all on function public.mudar_estado_proposta(uuid, integer, text) from public, anon;
grant execute on function public.mudar_estado_proposta(uuid, integer, text) to authenticated;
-- As auxiliares só servem as funções acima.
revoke all on function public.total_da_proposta(jsonb) from public, anon, authenticated;
revoke all on function public.validar_conteudo_proposta(jsonb) from public, anon, authenticated;

reset lock_timeout;

notify pgrst, 'reload schema';
