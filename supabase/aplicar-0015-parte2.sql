-- ============================================================================
-- APLICAR NO SQL EDITOR DO SUPABASE — projecto nixltrbdplqjadfytryd
-- 0015 em DUAS PARTES — PARTE 2 de 2: caminho público, direitos e recarga
-- ============================================================================
-- Correr DEPOIS da parte 1. Cria as funções públicas do jornal (lista,
-- artigo, gosto, partilha, anúncios, impressões, clique), fecha os direitos
-- e recarrega a cache da API (notify pgrst) no fim.
--
-- 1. Abrir este ficheiro em «Raw», Ctrl+A, Ctrl+C.
-- 2. SQL Editor: consulta NOVA e vazia, colar, Run. Esperado: «Success».
-- 3. Depois, correr verificar-estado.sql (linhas 26 e 27 em «ok»).
-- ===== fim do cabeçalho: daqui para baixo é a migração 0015, sem alterações =====
-- ---------------------------------------------------------------------------
-- Caminho público (só a chave de serviço, pelas rotas da API)
-- ---------------------------------------------------------------------------

-- A lista do jornal: só publicados, sem a análise inteira.
create or replace function public.artigos_publicados(
  p_idioma text,
  p_seccao text,
  p_limite integer,
  p_antes timestamptz
)
returns table (
  id uuid,
  slug text,
  idioma text,
  titulo text,
  entrada text,
  seccao text,
  prioridade text,
  publicado_em timestamptz,
  actualizado_em timestamptz,
  gostos integer,
  partilhas integer
)
language sql
stable
security definer
set search_path = public, pg_catalog
as $$
  select a.id, a.slug, a.idioma, a.titulo, a.entrada, a.seccao, a.prioridade,
         a.publicado_em, a.updated_at, a.gostos, a.partilhas
    from public.news_artigos a
   where a.estado = 'publicado'
     and a.idioma = p_idioma
     and (p_seccao is null or a.seccao = p_seccao)
     and (p_antes is null or a.publicado_em < p_antes)
   order by a.publicado_em desc
   limit least(greatest(coalesce(p_limite, 30), 1), 100);
$$;

-- Um artigo publicado, com a análise. Rascunhos e arquivados não existem aqui.
create or replace function public.artigo_publicado(p_slug text)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_catalog
as $$
  select jsonb_build_object(
           'id', a.id, 'slug', a.slug, 'idioma', a.idioma, 'titulo', a.titulo,
           'entrada', a.entrada, 'seccao', a.seccao, 'prioridade', a.prioridade,
           'analise', a.analise, 'nota_editorial', a.nota_editorial,
           'fonte_nome', a.fonte_nome, 'fonte_url', a.fonte_url,
           'publicado_em', a.publicado_em, 'actualizado_em', a.updated_at,
           'gostos', a.gostos, 'partilhas', a.partilhas)
    from public.news_artigos a
   where a.slug = p_slug and a.estado = 'publicado';
$$;

-- Gosto idempotente: o mesmo browser no mesmo artigo conta uma vez.
create or replace function public.gostar_artigo(p_slug text, p_chave_hash text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_id uuid;
  v_novo integer;
  v_total integer;
begin
  if p_chave_hash is null or p_chave_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'Chave inválida.' using errcode = '22023';
  end if;
  select id into v_id from public.news_artigos where slug = p_slug and estado = 'publicado';
  if v_id is null then
    raise exception 'Artigo não encontrado.' using errcode = 'P0002';
  end if;

  insert into public.news_gostos (artigo_id, chave_hash) values (v_id, p_chave_hash)
  on conflict do nothing;
  get diagnostics v_novo = row_count;

  if v_novo > 0 then
    update public.news_artigos set gostos = gostos + 1 where id = v_id returning gostos into v_total;
  else
    select gostos into v_total from public.news_artigos where id = v_id;
  end if;
  return jsonb_build_object('gostos', v_total, 'novo', v_novo > 0);
end;
$$;

create or replace function public.partilhar_artigo(p_slug text, p_canal text)
returns integer
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_total integer;
begin
  if p_canal is null or p_canal not in ('linkedin', 'whatsapp', 'x', 'facebook', 'email', 'copiar', 'nativo') then
    raise exception 'Canal inválido.' using errcode = '22023';
  end if;
  update public.news_artigos set partilhas = partilhas + 1
   where slug = p_slug and estado = 'publicado'
  returning partilhas into v_total;
  if v_total is null then
    raise exception 'Artigo não encontrado.' using errcode = 'P0002';
  end if;
  return v_total;
end;
$$;

-- Os anúncios que podem aparecer agora, sem o destino (o clique passa pela rota).
create or replace function public.anuncios_activos()
returns table (
  id uuid,
  slug text,
  titulo text,
  mensagem text,
  ticker text,
  cta text,
  tema text,
  peso integer
)
language sql
stable
security definer
set search_path = public, pg_catalog
as $$
  select n.id, n.slug, n.titulo, n.mensagem, n.ticker, n.cta, n.tema, n.peso
    from public.news_anuncios n
   where n.activo
     and (n.inicio is null or n.inicio <= now())
     and (n.fim is null or n.fim > now())
   order by n.peso desc, n.created_at
   limit 12;
$$;

-- Impressões em lote: [{ "id": uuid, "posicao": "topo" }, …], no máximo 8.
create or replace function public.registar_impressoes(p_itens jsonb, p_chave_hash text)
returns integer
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_par record;
  v_id uuid;
  v_posicao text;
  v_novo integer;
  v_contados integer := 0;
begin
  if jsonb_typeof(p_itens) <> 'array' or jsonb_array_length(p_itens) > 8 then
    raise exception 'Pedido inválido.' using errcode = '22023';
  end if;
  if p_chave_hash is not null and p_chave_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'Chave inválida.' using errcode = '22023';
  end if;

  -- Cada (anúncio, lugar) conta UMA vez por lote, e os pares são tratados por
  -- ordem fixa: dois lotes concorrentes bloqueiam as linhas na mesma ordem
  -- (sem deadlock), e repetir o mesmo id no lote não multiplica impressões.
  for v_par in
    select distinct e->>'id' as id, e->>'posicao' as posicao
      from jsonb_array_elements(p_itens) e
     where jsonb_typeof(e) = 'object'
       and (e->>'id') ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
       and (e->>'posicao') in ('topo', 'feed', 'artigo', 'fim')
     order by 1, 2
  loop
    v_id := v_par.id::uuid;
    v_posicao := v_par.posicao;
    -- Só anúncios no ar contam: um id inventado não cria nada.
    perform 1 from public.news_anuncios n
     where n.id = v_id and n.activo
       and (n.inicio is null or n.inicio <= now()) and (n.fim is null or n.fim > now());
    if not found then
      continue;
    end if;

    v_novo := 0;
    if p_chave_hash is not null then
      insert into public.news_anuncio_vistos (anuncio_id, tipo, chave_hash)
      values (v_id, 'impressao', p_chave_hash) on conflict do nothing;
      get diagnostics v_novo = row_count;
    end if;
    update public.news_anuncios
       set impressoes = impressoes + 1, alcance_unico = alcance_unico + v_novo
     where id = v_id;
    insert into public.news_anuncio_posicoes (anuncio_id, posicao, impressoes)
    values (v_id, v_posicao, 1)
    on conflict (anuncio_id, posicao)
      do update set impressoes = public.news_anuncio_posicoes.impressoes + 1;
    v_contados := v_contados + 1;
  end loop;
  return v_contados;
end;
$$;

-- O clique: conta e devolve o destino GUARDADO. Nulo quando o anúncio não
-- está no ar (a rota manda então para o jornal).
create or replace function public.registar_clique_anuncio(p_id uuid, p_posicao text, p_chave_hash text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  n public.news_anuncios;
  v_novo integer := 0;
begin
  if p_chave_hash is not null and p_chave_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'Chave inválida.' using errcode = '22023';
  end if;
  select * into n from public.news_anuncios
   where id = p_id and activo
     and (inicio is null or inicio <= now()) and (fim is null or fim > now());
  if not found then
    return null;
  end if;

  if p_chave_hash is not null then
    insert into public.news_anuncio_vistos (anuncio_id, tipo, chave_hash)
    values (p_id, 'clique', p_chave_hash) on conflict do nothing;
    get diagnostics v_novo = row_count;
  end if;
  update public.news_anuncios
     set cliques = cliques + 1, cliques_unicos = cliques_unicos + v_novo
   where id = p_id;
  if p_posicao in ('topo', 'feed', 'artigo', 'fim') then
    insert into public.news_anuncio_posicoes (anuncio_id, posicao, cliques)
    values (p_id, p_posicao, 1)
    on conflict (anuncio_id, posicao)
      do update set cliques = public.news_anuncio_posicoes.cliques + 1;
  end if;
  return jsonb_build_object('destino', n.destino, 'slug', n.slug);
end;
$$;

revoke all on function public.artigos_publicados(text, text, integer, timestamptz) from public, anon, authenticated;
revoke all on function public.artigo_publicado(text) from public, anon, authenticated;
revoke all on function public.gostar_artigo(text, text) from public, anon, authenticated;
revoke all on function public.partilhar_artigo(text, text) from public, anon, authenticated;
revoke all on function public.anuncios_activos() from public, anon, authenticated;
revoke all on function public.registar_impressoes(jsonb, text) from public, anon, authenticated;
revoke all on function public.registar_clique_anuncio(uuid, text, text) from public, anon, authenticated;
grant execute on function public.artigos_publicados(text, text, integer, timestamptz) to service_role;
grant execute on function public.artigo_publicado(text) to service_role;
grant execute on function public.gostar_artigo(text, text) to service_role;
grant execute on function public.partilhar_artigo(text, text) to service_role;
grant execute on function public.anuncios_activos() to service_role;
grant execute on function public.registar_impressoes(jsonb, text) to service_role;
grant execute on function public.registar_clique_anuncio(uuid, text, text) to service_role;

notify pgrst, 'reload schema';
