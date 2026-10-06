-- ============================================================================
-- APLICAR NO SQL EDITOR DO SUPABASE — projecto nixltrbdplqjadfytryd
-- ============================================================================
-- Conteúdo igual a migrations/0015_news.sql (um teste garante-o).
-- Repetível: pode correr as vezes que quiser. Exige a 0001–0014 já aplicadas.
--
-- O que cria: o AGORAMOZ News como jornal — artigos (rascunho → publicado),
-- gostos anónimos, partilhas e os anúncios do «outdoor» com impressões e
-- cliques. Nada do que já existe muda.
--
-- Depois, corra verificar-estado.sql: as linhas 26 e 27 têm de dizer «ok».
-- Só então ponha NEWS_BLOG=on na Vercel.
-- ============================================================================

-- ============================================================================
-- 0015 — AGORAMOZ News: redacção interna, jornal público, gostos, partilhas e
--        publicidade «outdoor» medida
-- ============================================================================
-- A equipa analisa notícias no /admin; cada análise pode virar um RASCUNHO de
-- artigo, que só fica público depois de alguém o publicar (aprovação humana).
-- Os leitores do jornal dão gosto (anónimo, um por browser) e partilham.
-- Os anúncios são da AGORAMOZ (v1): cada impressão e cada clique conta, e o
-- clique leva ao destino guardado AQUI — nunca a um destino vindo do URL.
--
-- Privacidade: nenhum dado pessoal. O «um por browser» é um hash de um token
-- aleatório guardado no browser do leitor (não é cookie, não liga artigos
-- entre si porque o hash leva o id do artigo/anúncio).
--
-- Escritas: a equipa por funções `security definer` com `exigir_papel`; o
-- público só pelas funções concedidas à chave de serviço (rotas da API).
--
-- Idempotente: pode correr mais do que uma vez.
-- ============================================================================


-- ---------------------------------------------------------------------------
-- news_artigos — os artigos do jornal (rascunho → publicado → arquivado)
-- ---------------------------------------------------------------------------

create table if not exists public.news_artigos (
  id uuid primary key default extensions.gen_random_uuid(),
  slug text not null unique
    check (length(slug) between 3 and 90 and slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  idioma text not null default 'pt' check (idioma in ('pt', 'en')),
  estado text not null default 'rascunho' check (estado in ('rascunho', 'publicado', 'arquivado')),
  revisao integer not null default 1 check (revisao >= 1),
  titulo text not null check (length(trim(titulo)) between 3 and 200),
  entrada text check (entrada is null or length(trim(entrada)) between 1 and 400),
  seccao text not null default 'economia'
    check (seccao in ('mercados', 'energia', 'tecnologia', 'economia', 'negocios', 'politica')),
  prioridade text check (prioridade is null or prioridade in ('critical', 'high', 'medium', 'monitor')),
  analise jsonb not null
    check (jsonb_typeof(analise) = 'object' and octet_length(analise::text) <= 262144),
  nota_editorial text check (nota_editorial is null or length(trim(nota_editorial)) between 1 and 2000),
  fonte_nome text check (fonte_nome is null or length(trim(fonte_nome)) between 1 and 120),
  fonte_url text,
  autor_id uuid references auth.users(id) on delete set null,
  publicado_em timestamptz,
  gostos integer not null default 0 check (gostos >= 0),
  partilhas integer not null default 0 check (partilhas >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint news_artigos_publicado_tem_data check (estado <> 'publicado' or publicado_em is not null)
);

create index if not exists news_artigos_jornal_idx
  on public.news_artigos (idioma, publicado_em desc) where estado = 'publicado';
create index if not exists news_artigos_seccao_idx
  on public.news_artigos (seccao, publicado_em desc) where estado = 'publicado';

-- A fonte é um endereço https, sem espaços (regra com nome, reaplicada em
-- cada execução para corrigir bases onde a versão anterior já existia).
alter table public.news_artigos drop constraint if exists news_artigos_fonte_url_check;
alter table public.news_artigos drop constraint if exists news_artigos_fonte_url_valida;
alter table public.news_artigos add constraint news_artigos_fonte_url_valida check (
  fonte_url is null or (length(fonte_url) <= 2048 and fonte_url ~ '^https://[^\s/]+' and fonte_url !~ '\s')
);

-- `updated_at` é a data editorial (o `dateModified` do artigo e o `lastmod`
-- do sitemap): um gosto ou uma partilha NÃO o mexem — só as edições.
drop trigger if exists news_artigos_set_updated_at on public.news_artigos;
create trigger news_artigos_set_updated_at
  before update on public.news_artigos
  for each row
  when (old.gostos is not distinct from new.gostos and old.partilhas is not distinct from new.partilhas)
  execute function public.set_updated_at();

create index if not exists news_artigos_autor_idx on public.news_artigos (autor_id);

alter table public.news_artigos enable row level security;
revoke all on public.news_artigos from public, anon, authenticated, service_role;
grant select on public.news_artigos to authenticated;
drop policy if exists news_artigos_select on public.news_artigos;
create policy news_artigos_select on public.news_artigos
  for select to authenticated using (public.is_staff());


-- ---------------------------------------------------------------------------
-- news_gostos — um gosto por browser e por artigo (só o hash)
-- ---------------------------------------------------------------------------

create table if not exists public.news_gostos (
  artigo_id uuid not null references public.news_artigos(id) on delete cascade,
  chave_hash text not null check (chave_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now(),
  primary key (artigo_id, chave_hash)
);

alter table public.news_gostos enable row level security;
revoke all on public.news_gostos from public, anon, authenticated, service_role;


-- ---------------------------------------------------------------------------
-- news_anuncios — o «outdoor»: anúncios da AGORAMOZ com contadores
-- ---------------------------------------------------------------------------

create table if not exists public.news_anuncios (
  id uuid primary key default extensions.gen_random_uuid(),
  -- O slug é a `utm_campaign` do clique: liga o anúncio às conversões.
  slug text not null unique
    check (length(slug) between 3 and 64 and slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  titulo text not null check (length(trim(titulo)) between 3 and 80),
  mensagem text check (mensagem is null or length(trim(mensagem)) between 1 and 160),
  ticker text check (ticker is null or length(trim(ticker)) between 1 and 160),
  cta text not null check (length(trim(cta)) between 2 and 28),
  -- A regra do destino está em `news_anuncios_destino_valido`, abaixo.
  destino text not null,
  tema text not null default 'tinta' check (tema in ('tinta', 'sinal', 'crescimento', 'energia')),
  activo boolean not null default false,
  inicio timestamptz,
  fim timestamptz,
  peso integer not null default 1 check (peso between 1 and 10),
  revisao integer not null default 1 check (revisao >= 1),
  impressoes bigint not null default 0 check (impressoes >= 0),
  alcance_unico bigint not null default 0 check (alcance_unico >= 0),
  cliques bigint not null default 0 check (cliques >= 0),
  cliques_unicos bigint not null default 0 check (cliques_unicos >= 0),
  autor_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint news_anuncios_periodo check (fim is null or inicio is null or fim > inicio)
);

-- Um caminho do próprio site (nunca `//host`, que o browser leva para fora)
-- ou um endereço https sem credenciais nem query. Só a equipa o escreve, e o
-- clique lê-o daqui: um URL partilhado nunca escolhe para onde se vai.
-- A mesma regra de `destinoSeguro` (lib/news/anuncios.ts).
alter table public.news_anuncios drop constraint if exists news_anuncios_destino_check;
alter table public.news_anuncios drop constraint if exists news_anuncios_destino_valido;
alter table public.news_anuncios add constraint news_anuncios_destino_valido check (
  (destino ~ '^/[a-z0-9/_-]{0,119}$' and destino !~ '//')
  or (length(destino) <= 300 and destino ~ '^https://[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+(/[A-Za-z0-9/_.~%-]*)?$')
);

-- Os contadores (impressões, cliques) não são uma edição do anúncio.
drop trigger if exists news_anuncios_set_updated_at on public.news_anuncios;
create trigger news_anuncios_set_updated_at
  before update on public.news_anuncios
  for each row
  when (old.impressoes is not distinct from new.impressoes
        and old.alcance_unico is not distinct from new.alcance_unico
        and old.cliques is not distinct from new.cliques
        and old.cliques_unicos is not distinct from new.cliques_unicos)
  execute function public.set_updated_at();

create index if not exists news_anuncios_autor_idx on public.news_anuncios (autor_id);

alter table public.news_anuncios enable row level security;
revoke all on public.news_anuncios from public, anon, authenticated, service_role;
grant select on public.news_anuncios to authenticated;
drop policy if exists news_anuncios_select on public.news_anuncios;
create policy news_anuncios_select on public.news_anuncios
  for select to authenticated using (public.is_staff());

-- Que lugar da página converte: impressões e cliques por posição.
create table if not exists public.news_anuncio_posicoes (
  anuncio_id uuid not null references public.news_anuncios(id) on delete cascade,
  posicao text not null check (posicao in ('topo', 'feed', 'artigo', 'fim')),
  impressoes bigint not null default 0 check (impressoes >= 0),
  cliques bigint not null default 0 check (cliques >= 0),
  primary key (anuncio_id, posicao)
);

alter table public.news_anuncio_posicoes enable row level security;
revoke all on public.news_anuncio_posicoes from public, anon, authenticated, service_role;
grant select on public.news_anuncio_posicoes to authenticated;
drop policy if exists news_anuncio_posicoes_select on public.news_anuncio_posicoes;
create policy news_anuncio_posicoes_select on public.news_anuncio_posicoes
  for select to authenticated using (public.is_staff());

-- «Pessoas únicas» sem identificar ninguém: um hash por anúncio e por tipo.
create table if not exists public.news_anuncio_vistos (
  anuncio_id uuid not null references public.news_anuncios(id) on delete cascade,
  tipo text not null check (tipo in ('impressao', 'clique')),
  chave_hash text not null check (chave_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now(),
  primary key (anuncio_id, tipo, chave_hash)
);

-- Para poder purgar por idade (alcance «único» numa janela, ver docs/NEWS.md).
create index if not exists news_anuncio_vistos_created_idx on public.news_anuncio_vistos (created_at);

alter table public.news_anuncio_vistos enable row level security;
revoke all on public.news_anuncio_vistos from public, anon, authenticated, service_role;


-- ---------------------------------------------------------------------------
-- Acções da equipa (admin e comercial)
-- ---------------------------------------------------------------------------

create or replace function public.criar_artigo(
  p_slug text,
  p_idioma text,
  p_titulo text,
  p_entrada text,
  p_seccao text,
  p_prioridade text,
  p_analise jsonb,
  p_fonte_nome text,
  p_fonte_url text
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_id uuid;
begin
  perform public.exigir_papel(array['admin', 'comercial']::public.user_role[]);

  insert into public.news_artigos
    (slug, idioma, titulo, entrada, seccao, prioridade, analise, fonte_nome, fonte_url, autor_id)
  values
    (p_slug, p_idioma, trim(p_titulo), nullif(trim(p_entrada), ''), p_seccao, p_prioridade,
     p_analise, nullif(trim(p_fonte_nome), ''), nullif(trim(p_fonte_url), ''), auth.uid())
  returning id into v_id;

  insert into public.audit_log (actor_id, actor_type, action, entity_type, entity_id, after)
  values (auth.uid(), 'user', 'news.criar_artigo', 'news_artigo', v_id::text,
          jsonb_build_object('slug', p_slug, 'seccao', p_seccao));
  return v_id;
end;
$$;

create or replace function public.guardar_artigo(
  p_id uuid,
  p_revisao integer,
  p_slug text,
  p_titulo text,
  p_entrada text,
  p_seccao text,
  p_nota text,
  p_fonte_nome text,
  p_fonte_url text
)
returns integer
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  a public.news_artigos;
begin
  perform public.exigir_papel(array['admin', 'comercial']::public.user_role[]);

  select * into a from public.news_artigos where id = p_id for update;
  if not found then
    raise exception 'Artigo não encontrado.' using errcode = 'P0002';
  end if;
  if a.revisao is distinct from p_revisao then
    raise exception 'O artigo mudou entretanto.' using errcode = '40001';
  end if;
  -- Um link já partilhado não pode deixar de funcionar.
  if a.publicado_em is not null and p_slug is distinct from a.slug then
    raise exception 'O endereço de um artigo já publicado não muda.' using errcode = '22023';
  end if;

  update public.news_artigos
     set slug = p_slug,
         titulo = trim(p_titulo),
         entrada = nullif(trim(p_entrada), ''),
         seccao = p_seccao,
         nota_editorial = nullif(trim(p_nota), ''),
         fonte_nome = nullif(trim(p_fonte_nome), ''),
         fonte_url = nullif(trim(p_fonte_url), ''),
         revisao = revisao + 1
   where id = p_id;

  insert into public.audit_log (actor_id, actor_type, action, entity_type, entity_id, before, after)
  values (auth.uid(), 'user', 'news.guardar_artigo', 'news_artigo', p_id::text,
          jsonb_build_object('slug', a.slug, 'titulo', a.titulo),
          jsonb_build_object('slug', p_slug, 'titulo', trim(p_titulo)));
  return a.revisao + 1;
end;
$$;

create or replace function public.publicar_artigo(p_id uuid, p_revisao integer)
returns integer
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  a public.news_artigos;
begin
  perform public.exigir_papel(array['admin', 'comercial']::public.user_role[]);

  select * into a from public.news_artigos where id = p_id for update;
  if not found then
    raise exception 'Artigo não encontrado.' using errcode = 'P0002';
  end if;
  if a.revisao is distinct from p_revisao then
    raise exception 'O artigo mudou entretanto.' using errcode = '40001';
  end if;
  if a.estado = 'publicado' then
    raise exception 'O artigo já está publicado.' using errcode = '22023';
  end if;

  update public.news_artigos
     set estado = 'publicado',
         publicado_em = coalesce(publicado_em, now()),
         revisao = revisao + 1
   where id = p_id;

  insert into public.audit_log (actor_id, actor_type, action, entity_type, entity_id, before, after)
  values (auth.uid(), 'user', 'news.publicar_artigo', 'news_artigo', p_id::text,
          jsonb_build_object('estado', a.estado), jsonb_build_object('estado', 'publicado'));
  return a.revisao + 1;
end;
$$;

create or replace function public.arquivar_artigo(p_id uuid, p_revisao integer)
returns integer
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  a public.news_artigos;
begin
  perform public.exigir_papel(array['admin', 'comercial']::public.user_role[]);

  select * into a from public.news_artigos where id = p_id for update;
  if not found then
    raise exception 'Artigo não encontrado.' using errcode = 'P0002';
  end if;
  if a.revisao is distinct from p_revisao then
    raise exception 'O artigo mudou entretanto.' using errcode = '40001';
  end if;
  if a.estado <> 'publicado' then
    raise exception 'Só um artigo publicado pode ser arquivado.' using errcode = '22023';
  end if;

  update public.news_artigos set estado = 'arquivado', revisao = revisao + 1 where id = p_id;

  insert into public.audit_log (actor_id, actor_type, action, entity_type, entity_id, before, after)
  values (auth.uid(), 'user', 'news.arquivar_artigo', 'news_artigo', p_id::text,
          jsonb_build_object('estado', a.estado), jsonb_build_object('estado', 'arquivado'));
  return a.revisao + 1;
end;
$$;

-- Cria (p_id nulo) ou altera um anúncio. Um anúncio novo nasce desligado.
create or replace function public.guardar_anuncio(
  p_id uuid,
  p_revisao integer,
  p_slug text,
  p_titulo text,
  p_mensagem text,
  p_ticker text,
  p_cta text,
  p_destino text,
  p_tema text,
  p_inicio timestamptz,
  p_fim timestamptz,
  p_peso integer
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  n public.news_anuncios;
  v_id uuid;
begin
  perform public.exigir_papel(array['admin', 'comercial']::public.user_role[]);

  if p_id is null then
    insert into public.news_anuncios
      (slug, titulo, mensagem, ticker, cta, destino, tema, inicio, fim, peso, autor_id)
    values
      (p_slug, trim(p_titulo), nullif(trim(p_mensagem), ''), nullif(trim(p_ticker), ''),
       trim(p_cta), p_destino, p_tema, p_inicio, p_fim, p_peso, auth.uid())
    returning id into v_id;
    insert into public.audit_log (actor_id, actor_type, action, entity_type, entity_id, after)
    values (auth.uid(), 'user', 'news.criar_anuncio', 'news_anuncio', v_id::text,
            jsonb_build_object('slug', p_slug, 'destino', p_destino));
    return v_id;
  end if;

  select * into n from public.news_anuncios where id = p_id for update;
  if not found then
    raise exception 'Anúncio não encontrado.' using errcode = 'P0002';
  end if;
  if n.revisao is distinct from p_revisao then
    raise exception 'O anúncio mudou entretanto.' using errcode = '40001';
  end if;

  update public.news_anuncios
     set slug = p_slug,
         titulo = trim(p_titulo),
         mensagem = nullif(trim(p_mensagem), ''),
         ticker = nullif(trim(p_ticker), ''),
         cta = trim(p_cta),
         destino = p_destino,
         tema = p_tema,
         inicio = p_inicio,
         fim = p_fim,
         peso = p_peso,
         revisao = revisao + 1
   where id = p_id;

  insert into public.audit_log (actor_id, actor_type, action, entity_type, entity_id, before, after)
  values (auth.uid(), 'user', 'news.guardar_anuncio', 'news_anuncio', p_id::text,
          jsonb_build_object('slug', n.slug, 'destino', n.destino),
          jsonb_build_object('slug', p_slug, 'destino', p_destino));
  return p_id;
end;
$$;

create or replace function public.definir_anuncio_activo(p_id uuid, p_activo boolean)
returns void
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  n public.news_anuncios;
begin
  perform public.exigir_papel(array['admin', 'comercial']::public.user_role[]);

  select * into n from public.news_anuncios where id = p_id for update;
  if not found then
    raise exception 'Anúncio não encontrado.' using errcode = 'P0002';
  end if;

  update public.news_anuncios set activo = p_activo, revisao = revisao + 1 where id = p_id;

  insert into public.audit_log (actor_id, actor_type, action, entity_type, entity_id, before, after)
  values (auth.uid(), 'user', 'news.activar_anuncio', 'news_anuncio', p_id::text,
          jsonb_build_object('activo', n.activo), jsonb_build_object('activo', p_activo));
end;
$$;

revoke all on function public.criar_artigo(text, text, text, text, text, text, jsonb, text, text) from public, anon;
revoke all on function public.guardar_artigo(uuid, integer, text, text, text, text, text, text, text) from public, anon;
revoke all on function public.publicar_artigo(uuid, integer) from public, anon;
revoke all on function public.arquivar_artigo(uuid, integer) from public, anon;
revoke all on function public.guardar_anuncio(uuid, integer, text, text, text, text, text, text, text, timestamptz, timestamptz, integer) from public, anon;
revoke all on function public.definir_anuncio_activo(uuid, boolean) from public, anon;
grant execute on function public.criar_artigo(text, text, text, text, text, text, jsonb, text, text) to authenticated;
grant execute on function public.guardar_artigo(uuid, integer, text, text, text, text, text, text, text) to authenticated;
grant execute on function public.publicar_artigo(uuid, integer) to authenticated;
grant execute on function public.arquivar_artigo(uuid, integer) to authenticated;
grant execute on function public.guardar_anuncio(uuid, integer, text, text, text, text, text, text, text, timestamptz, timestamptz, integer) to authenticated;
grant execute on function public.definir_anuncio_activo(uuid, boolean) to authenticated;


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
