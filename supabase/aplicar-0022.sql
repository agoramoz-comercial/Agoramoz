-- APLICAR NO SQL EDITOR DO SUPABASE — projecto nixltrbdplqjadfytryd
-- 0022 numa só parte: Cursos AGORAMOZ (gerados das fontes, verificados, publicados)
-- Pressupõe a 0006 aplicada (exigir_papel, is_staff, audit_log). Não precisa da 0020 nem da 0021.
-- Este ficheiro é a migração 0022 palavra por palavra (um teste garante-o).
-- É repetível: pode correr as vezes que quiser.
-- 1. No GitHub, botão «Copy raw file» (ou Raw, Ctrl+A, Ctrl+C).
-- 2. SQL Editor: consulta NOVA e vazia, colar, Run. Esperado: «Success».
-- 3. Depois, correr o verificar-estado.sql: a linha 34 tem de dizer «ok».
-- ===== fim do cabeçalho: daqui para baixo é a migração 0022, sem alterações =====
-- ============================================================================
-- 0022 — Cursos AGORAMOZ: gerados das fontes, verificados, publicados
-- ============================================================================
-- Decisão do fundador (17/11/2026): a AGORAMOZ cria cursos a partir das
-- fontes que carrega; a IA (motor ZabaEdu) escreve, o verificador de
-- lib/cursos decide o que fica, e o público vê os cursos publicados em
-- /cursos, com «o que vai aprender» e o documento para descarregar.
--
-- 1. `cursos`: uma linha por curso — o conteúdo (o JSON de lib/cursos/
--    modelo.ts, com o relatório de verificação) e as fontes partidas em
--    passagens, que servem para verificar e refazer e NUNCA são publicadas
--    (a página pública lê só colunas escolhidas, pelo servidor).
-- 2. O endereço (`slug`) fixa-se na criação; um igual leva sufixo (-2, -3…).
--    Mudar o conteúdo não muda o endereço de um curso já partilhado.
-- 3. O padrão de 0006/0019/0020: lê a equipa; escrevem `admin` e `comercial`
--    só pelas funções, com revisão, `lock_timeout` e auditoria na mesma
--    transacção. A auditoria leva o título, o estado e as contagens — nunca
--    o conteúdo nem as fontes.
--
-- Idempotente: pode correr mais do que uma vez.
-- ============================================================================

set lock_timeout = '5s';


-- ---------------------------------------------------------------------------
-- Tabela
-- ---------------------------------------------------------------------------

create table if not exists public.cursos (
  id uuid primary key default extensions.gen_random_uuid(),
  slug text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) between 1 and 80),
  titulo text not null check (length(trim(titulo)) between 1 and 160),
  estado text not null default 'rascunho' check (estado in ('rascunho', 'publicado', 'arquivado')),
  conteudo jsonb not null
    check (jsonb_typeof(conteudo) = 'object' and octet_length(conteudo::text) <= 524288),
  fontes jsonb not null
    check (jsonb_typeof(fontes) = 'array' and octet_length(fontes::text) <= 2000000),
  revisao integer not null default 1 check (revisao >= 1),
  publicado_em timestamptz,
  criado_por uuid not null default auth.uid() references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists cursos_slug_unico on public.cursos (slug);
create index if not exists cursos_publicados_idx on public.cursos (publicado_em desc) where estado = 'publicado';

drop trigger if exists cursos_set_updated_at on public.cursos;
create trigger cursos_set_updated_at
  before update on public.cursos
  for each row execute function public.set_updated_at();

alter table public.cursos enable row level security;

drop policy if exists cursos_select on public.cursos;
create policy cursos_select on public.cursos
  for select to authenticated using (public.is_staff());

revoke all on public.cursos from public, anon, authenticated;
grant select on public.cursos to authenticated;


-- ---------------------------------------------------------------------------
-- O mínimo que a base exige; o resto valida-o a aplicação (zod)
-- ---------------------------------------------------------------------------

create or replace function public.validar_curso(p_conteudo jsonb, p_fontes jsonb)
returns void
language plpgsql
immutable
set search_path = pg_catalog, public
as $$
begin
  if p_conteudo is null or jsonb_typeof(p_conteudo) is distinct from 'object' then
    raise exception 'Conteúdo inválido.' using errcode = '22023';
  end if;
  if octet_length(p_conteudo::text) > 524288 then
    raise exception 'O curso é grande de mais para guardar.' using errcode = '22023';
  end if;
  if (p_conteudo ->> 'versao') is distinct from '1' then
    raise exception 'Formato de curso desconhecido.' using errcode = '22023';
  end if;
  if length(trim(coalesce(p_conteudo ->> 'titulo', ''))) not between 1 and 160 then
    raise exception 'O curso precisa de título.' using errcode = '22023';
  end if;
  if coalesce(p_conteudo ->> 'slug', '') !~ '^[a-z0-9]+(-[a-z0-9]+)*$' or length(p_conteudo ->> 'slug') > 80 then
    raise exception 'Endereço do curso inválido.' using errcode = '22023';
  end if;
  if jsonb_typeof(p_conteudo -> 'modulos') is distinct from 'array' or jsonb_array_length(p_conteudo -> 'modulos') = 0 then
    raise exception 'O curso não tem módulos.' using errcode = '22023';
  end if;
  if jsonb_typeof(p_conteudo -> 'verificacao') is distinct from 'object' then
    raise exception 'O curso não traz o relatório de verificação.' using errcode = '22023';
  end if;
  if p_fontes is null or jsonb_typeof(p_fontes) is distinct from 'array' or jsonb_array_length(p_fontes) = 0 then
    raise exception 'O curso não tem fontes.' using errcode = '22023';
  end if;
  if octet_length(p_fontes::text) > 2000000 then
    raise exception 'As fontes são grandes de mais para guardar.' using errcode = '22023';
  end if;
end;
$$;


-- ---------------------------------------------------------------------------
-- Guardar: cria (p_id nulo) ou substitui o conteúdo de um curso
-- ---------------------------------------------------------------------------

create or replace function public.guardar_curso(
  p_id uuid,
  p_revisao integer,
  p_conteudo jsonb,
  p_fontes jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
set lock_timeout = '4s'
as $$
declare
  v_c public.cursos;
  v_base text;
  v_slug text;
  v_n integer := 1;
  v_conteudo jsonb;
begin
  perform public.exigir_papel(array['admin', 'comercial']::public.user_role[]);
  perform public.validar_curso(p_conteudo, p_fontes);

  if p_id is null then
    v_base := p_conteudo ->> 'slug';
    v_slug := v_base;
    while exists (select 1 from public.cursos where slug = v_slug) loop
      v_n := v_n + 1;
      v_slug := left(v_base, 76) || '-' || v_n;
    end loop;
    v_conteudo := jsonb_set(p_conteudo, '{slug}', to_jsonb(v_slug));
    insert into public.cursos (slug, titulo, conteudo, fontes, criado_por)
    values (v_slug, trim(p_conteudo ->> 'titulo'), v_conteudo, p_fontes, auth.uid())
    returning * into v_c;
  else
    select * into v_c from public.cursos where id = p_id for update;
    if not found then
      raise exception 'Curso inexistente.' using errcode = 'P0002';
    end if;
    if v_c.revisao is distinct from p_revisao then
      raise exception 'O curso mudou entretanto. Recarregue e volte a tentar.' using errcode = '40001';
    end if;
    -- O endereço não muda: pode já ter sido partilhado.
    v_conteudo := jsonb_set(p_conteudo, '{slug}', to_jsonb(v_c.slug));
    update public.cursos
       set titulo = trim(p_conteudo ->> 'titulo'),
           conteudo = v_conteudo,
           fontes = p_fontes,
           revisao = v_c.revisao + 1
     where id = v_c.id
    returning * into v_c;
  end if;

  insert into public.audit_log (actor_id, actor_type, action, entity_type, entity_id, before, after)
  values (auth.uid(), 'user', case when p_id is null then 'curso.criado' else 'curso.guardado' end,
          'curso', v_c.id::text, null,
          jsonb_build_object('titulo', v_c.titulo, 'slug', v_c.slug, 'estado', v_c.estado,
                             'modulos', jsonb_array_length(p_conteudo -> 'modulos'),
                             'fontes', jsonb_array_length(p_fontes)));

  return jsonb_build_object('id', v_c.id, 'slug', v_c.slug, 'revisao', v_c.revisao, 'estado', v_c.estado);
end;
$$;


-- ---------------------------------------------------------------------------
-- Estado: rascunho ⇄ publicado; arquivado a qualquer altura
-- ---------------------------------------------------------------------------

create or replace function public.mudar_estado_curso(
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
  v_c public.cursos;
begin
  perform public.exigir_papel(array['admin', 'comercial']::public.user_role[]);

  if p_estado is null or p_estado not in ('rascunho', 'publicado', 'arquivado') then
    raise exception 'Estado inválido.' using errcode = '22023';
  end if;

  select * into v_c from public.cursos where id = p_id for update;
  if not found then
    raise exception 'Curso inexistente.' using errcode = 'P0002';
  end if;
  if v_c.revisao is distinct from p_revisao then
    raise exception 'O curso mudou entretanto. Recarregue e volte a tentar.' using errcode = '40001';
  end if;
  if v_c.estado = p_estado then
    return jsonb_build_object('id', v_c.id, 'estado', v_c.estado, 'revisao', v_c.revisao, 'slug', v_c.slug);
  end if;
  -- Publica-se só o que traz o relatório de verificação com pelo menos uma afirmação aceite.
  if p_estado = 'publicado' and coalesce((v_c.conteudo #>> '{verificacao,aceites}')::integer, 0) < 1 then
    raise exception 'Este curso não tem conteúdo verificado para publicar.' using errcode = '22023';
  end if;

  update public.cursos
     set estado = p_estado,
         revisao = v_c.revisao + 1,
         publicado_em = case when p_estado = 'publicado' then coalesce(v_c.publicado_em, now()) else v_c.publicado_em end
   where id = p_id;

  insert into public.audit_log (actor_id, actor_type, action, entity_type, entity_id, before, after)
  values (auth.uid(), 'user', 'curso.estado', 'curso', p_id::text,
          jsonb_build_object('estado', v_c.estado), jsonb_build_object('estado', p_estado));

  return jsonb_build_object('id', p_id, 'estado', p_estado, 'revisao', v_c.revisao + 1, 'slug', v_c.slug);
end;
$$;


-- ---------------------------------------------------------------------------
-- Direitos
-- ---------------------------------------------------------------------------

revoke all on function public.guardar_curso(uuid, integer, jsonb, jsonb) from public, anon;
grant execute on function public.guardar_curso(uuid, integer, jsonb, jsonb) to authenticated;
revoke all on function public.mudar_estado_curso(uuid, integer, text) from public, anon;
grant execute on function public.mudar_estado_curso(uuid, integer, text) to authenticated;
revoke all on function public.validar_curso(jsonb, jsonb) from public, anon, authenticated;

reset lock_timeout;

notify pgrst, 'reload schema';
