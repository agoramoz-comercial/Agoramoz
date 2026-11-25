-- APLICAR NO SQL EDITOR DO SUPABASE — projecto nixltrbdplqjadfytryd
-- 0024 numa só parte: agentes ZABATAINA no Mapa AEOS (propostas e aprovações)
-- Pressupõe a 0006 aplicada (exigir_papel) e a 0001 (audit_log, is_staff).
-- Este ficheiro é a migração 0024 palavra por palavra (um teste garante-o).
-- É repetível: pode correr as vezes que quiser.
-- 1. No GitHub, botão «Copy raw file» (ou Raw, Ctrl+A, Ctrl+C).
-- 2. SQL Editor: consulta NOVA e vazia, colar, Run. Esperado: «Success».
-- 3. Depois, correr o verificar-estado.sql: a linha 36 tem de dizer «ok».
-- ===== fim do cabeçalho: daqui para baixo é a migração 0024, sem alterações =====
-- ============================================================================
-- 0024 — Agentes ZABATAINA no Mapa AEOS: propostas e aprovações
-- ============================================================================
-- Os agentes analisam e propõem. As propostas internas (tarefa, rascunho)
-- ficam «registada»; as externas, financeiras, de publicação ou irreversíveis
-- ficam «precisa_aprovacao» e só um admin as aprova ou recusa. Aprovar só
-- regista a decisão: nada é executado aqui. Escrita só pelas funções, com
-- auditoria. Repetível.
set lock_timeout = '5s';

create table if not exists public.agentes_accoes (
  id uuid primary key default extensions.gen_random_uuid(),
  agente text not null check (agente ~ '^AG-[0-9]{2}$'),
  tipo text not null check (tipo in ('tarefa_interna', 'rascunho_interno', 'comunicacao_externa',
                                     'accao_financeira', 'publicacao', 'alteracao_irreversivel')),
  titulo text not null check (length(trim(titulo)) between 3 and 140),
  descricao text not null default '' check (length(descricao) <= 800),
  alvo text check (alvo is null or length(alvo) <= 80),
  estado text not null check (estado in ('registada', 'precisa_aprovacao', 'aprovada', 'recusada')),
  nota_decisao text check (nota_decisao is null or length(nota_decisao) <= 400),
  criado_por uuid not null default auth.uid() references auth.users(id) on delete restrict,
  decidido_por uuid references auth.users(id) on delete restrict,
  decidido_em timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists agentes_accoes_estado_idx on public.agentes_accoes (estado, created_at desc);

alter table public.agentes_accoes enable row level security;

drop policy if exists agentes_accoes_select on public.agentes_accoes;
create policy agentes_accoes_select on public.agentes_accoes
  for select to authenticated using (public.is_staff());

revoke all on public.agentes_accoes from public, anon, authenticated;
grant select on public.agentes_accoes to authenticated;

create or replace function public.propor_accao_agente(
  p_agente text,
  p_tipo text,
  p_titulo text,
  p_descricao text,
  p_alvo text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
set lock_timeout = '4s'
as $$
declare
  v_id uuid;
  v_estado text;
begin
  perform public.exigir_papel(array['admin', 'comercial']::public.user_role[]);
  -- A classe decide-se pelo tipo, aqui, e nunca pelo que o modelo diga.
  v_estado := case when p_tipo in ('tarefa_interna', 'rascunho_interno') then 'registada' else 'precisa_aprovacao' end;
  insert into public.agentes_accoes (agente, tipo, titulo, descricao, alvo, estado)
  values (p_agente, p_tipo, trim(p_titulo), coalesce(p_descricao, ''), p_alvo, v_estado)
  returning id into v_id;

  insert into public.audit_log (actor_id, actor_type, action, entity_type, entity_id, before, after)
  values (auth.uid(), 'user', 'agente.propor', 'agente_accao', v_id::text, null,
          jsonb_build_object('agente', p_agente, 'tipo', p_tipo, 'estado', v_estado));

  return jsonb_build_object('id', v_id, 'estado', v_estado);
end;
$$;

create or replace function public.decidir_accao_agente(
  p_id uuid,
  p_decisao text,
  p_nota text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
set lock_timeout = '4s'
as $$
declare
  v_a public.agentes_accoes;
begin
  perform public.exigir_papel(array['admin']::public.user_role[]);
  if p_decisao is null or p_decisao not in ('aprovada', 'recusada') then
    raise exception 'Decisão inválida.' using errcode = '22023';
  end if;
  select * into v_a from public.agentes_accoes where id = p_id for update;
  if not found then
    raise exception 'Proposta inexistente.' using errcode = 'P0002';
  end if;
  if v_a.estado <> 'precisa_aprovacao' then
    raise exception 'Esta proposta já não espera decisão.' using errcode = '40001';
  end if;

  update public.agentes_accoes
     set estado = p_decisao, nota_decisao = nullif(trim(coalesce(p_nota, '')), ''),
         decidido_por = auth.uid(), decidido_em = now()
   where id = p_id;

  insert into public.audit_log (actor_id, actor_type, action, entity_type, entity_id, before, after)
  values (auth.uid(), 'user', 'agente.decidir', 'agente_accao', p_id::text,
          jsonb_build_object('estado', v_a.estado), jsonb_build_object('estado', p_decisao));

  return jsonb_build_object('id', p_id, 'estado', p_decisao);
end;
$$;

revoke all on function public.propor_accao_agente(text, text, text, text, text) from public, anon;
revoke all on function public.decidir_accao_agente(uuid, text, text) from public, anon;
grant execute on function public.propor_accao_agente(text, text, text, text, text) to authenticated;
grant execute on function public.decidir_accao_agente(uuid, text, text) to authenticated;

notify pgrst, 'reload schema';
