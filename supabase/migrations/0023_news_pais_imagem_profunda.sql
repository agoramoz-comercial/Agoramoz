-- ============================================================================
-- 0023 — News: país afectado, fotografia e análise profunda ZABATAINA 3000
-- ============================================================================
-- 1. `news_artigos` ganha colunas opcionais (os artigos antigos continuam a
--    abrir tal como estavam):
--    - `pais`: o país que a notícia afecta directamente (mz, pt, br e os dez
--      mercados globais de content/registry.ts). Obrigatório para PUBLICAR;
--    - `imagem_caminho`, `imagem_alt`, `imagem_credito`: a fotografia. O
--      caminho é a base sem extensão: existe `<base>.webp` (site) e
--      `<base>.jpg` (revista em PDF) no bucket `news-imagens`;
--    - `analise_profunda`: a camada ZABATAINA 3000 (Kimi), validada no
--      servidor antes de chegar aqui; `null` quando não houve.
-- 2. Três funções novas, com revisão, `lock_timeout` e auditoria, no padrão da
--    0015: `definir_pais_artigo`, `definir_imagem_artigo`,
--    `guardar_profunda_artigo`. `publicar_artigo` passa a exigir o país.
-- 3. As leituras públicas (`artigos_publicados`, `artigo_publicado`) passam a
--    devolver o país e a fotografia; o artigo, também a análise profunda.
-- 4. Bucket `news-imagens`: leitura pública (as fotos são publicadas no
--    jornal), escrita só de `admin` e `comercial`, até 2 MB, webp/jpeg.
--
-- Idempotente: pode correr mais do que uma vez.
-- ============================================================================

alter table public.news_artigos add column if not exists pais text;
alter table public.news_artigos add column if not exists imagem_caminho text;
alter table public.news_artigos add column if not exists imagem_alt text;
alter table public.news_artigos add column if not exists imagem_credito text;
alter table public.news_artigos add column if not exists analise_profunda jsonb;

alter table public.news_artigos drop constraint if exists news_artigos_pais_valido;
alter table public.news_artigos add constraint news_artigos_pais_valido check (
  pais is null or pais in ('mz', 'pt', 'br', 'ch', 'sg', 'us', 'uk', 'de', 'fr', 'ae', 'sa', 'za', 'ca')
);
alter table public.news_artigos drop constraint if exists news_artigos_imagem_valida;
alter table public.news_artigos add constraint news_artigos_imagem_valida check (
  (imagem_caminho is null and imagem_alt is null and imagem_credito is null)
  or (
    imagem_caminho ~ '^[0-9a-f-]{36}/[a-z0-9]{8,32}$'
    and imagem_alt is not null and length(trim(imagem_alt)) between 3 and 300
    and (imagem_credito is null or length(trim(imagem_credito)) between 1 and 160)
  )
);
alter table public.news_artigos drop constraint if exists news_artigos_profunda_valida;
alter table public.news_artigos add constraint news_artigos_profunda_valida check (
  analise_profunda is null
  or (jsonb_typeof(analise_profunda) = 'object' and octet_length(analise_profunda::text) <= 131072)
);

-- ---------------------------------------------------------------------------
-- Escritas da redacção
-- ---------------------------------------------------------------------------

create or replace function public.definir_pais_artigo(p_id uuid, p_revisao integer, p_pais text)
returns integer
language plpgsql
security definer
set search_path = public, pg_catalog
set lock_timeout = '4s'
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
  if p_pais is null then
    raise exception 'Escolha o país que a notícia afecta.' using errcode = '22023';
  end if;

  update public.news_artigos set pais = p_pais, revisao = revisao + 1 where id = p_id;

  insert into public.audit_log (actor_id, actor_type, action, entity_type, entity_id, before, after)
  values (auth.uid(), 'user', 'news.definir_pais', 'news_artigo', p_id::text,
          jsonb_build_object('pais', a.pais), jsonb_build_object('pais', p_pais));
  return a.revisao + 1;
end;
$$;

create or replace function public.definir_imagem_artigo(
  p_id uuid,
  p_revisao integer,
  p_caminho text,
  p_alt text,
  p_credito text
)
returns integer
language plpgsql
security definer
set search_path = public, pg_catalog
set lock_timeout = '4s'
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
  -- A fotografia de um artigo vive na pasta com o id dele.
  if p_caminho is not null and split_part(p_caminho, '/', 1) <> p_id::text then
    raise exception 'Fotografia inválida.' using errcode = '22023';
  end if;

  update public.news_artigos
     set imagem_caminho = p_caminho,
         imagem_alt = case when p_caminho is null then null else nullif(trim(p_alt), '') end,
         imagem_credito = case when p_caminho is null then null else nullif(trim(p_credito), '') end,
         revisao = revisao + 1
   where id = p_id;

  insert into public.audit_log (actor_id, actor_type, action, entity_type, entity_id, before, after)
  values (auth.uid(), 'user', 'news.definir_imagem', 'news_artigo', p_id::text,
          jsonb_build_object('imagem', a.imagem_caminho), jsonb_build_object('imagem', p_caminho));
  return a.revisao + 1;
end;
$$;

create or replace function public.guardar_profunda_artigo(p_id uuid, p_revisao integer, p_profunda jsonb)
returns integer
language plpgsql
security definer
set search_path = public, pg_catalog
set lock_timeout = '4s'
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

  update public.news_artigos set analise_profunda = p_profunda, revisao = revisao + 1 where id = p_id;

  -- Na auditoria, só se houve camada e o país: nunca o conteúdo.
  insert into public.audit_log (actor_id, actor_type, action, entity_type, entity_id, before, after)
  values (auth.uid(), 'user', 'news.guardar_profunda', 'news_artigo', p_id::text,
          jsonb_build_object('tinha', a.analise_profunda is not null),
          jsonb_build_object('tem', p_profunda is not null, 'pais', a.pais));
  return a.revisao + 1;
end;
$$;

create or replace function public.publicar_artigo(p_id uuid, p_revisao integer)
returns integer
language plpgsql
security definer
set search_path = public, pg_catalog
set lock_timeout = '4s'
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
  if a.pais is null then
    raise exception 'Escolha o país que a notícia afecta antes de publicar.' using errcode = '22023';
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

-- ---------------------------------------------------------------------------
-- Leituras públicas (só a chave de serviço)
-- ---------------------------------------------------------------------------

-- O tipo devolvido muda: a função antiga sai primeiro.
drop function if exists public.artigos_publicados(text, text, integer, timestamptz);
create function public.artigos_publicados(
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
  partilhas integer,
  pais text,
  imagem_caminho text,
  imagem_alt text
)
language sql
stable
security definer
set search_path = public, pg_catalog
set lock_timeout = '4s'
as $$
  select a.id, a.slug, a.idioma, a.titulo, a.entrada, a.seccao, a.prioridade,
         a.publicado_em, a.updated_at, a.gostos, a.partilhas,
         a.pais, a.imagem_caminho, a.imagem_alt
    from public.news_artigos a
   where a.estado = 'publicado'
     and a.idioma = p_idioma
     and (p_seccao is null or a.seccao = p_seccao)
     and (p_antes is null or a.publicado_em < p_antes)
   order by a.publicado_em desc
   limit least(greatest(coalesce(p_limite, 30), 1), 100);
$$;

create or replace function public.artigo_publicado(p_slug text)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_catalog
set lock_timeout = '4s'
as $$
  select jsonb_build_object(
           'id', a.id, 'slug', a.slug, 'idioma', a.idioma, 'titulo', a.titulo,
           'entrada', a.entrada, 'seccao', a.seccao, 'prioridade', a.prioridade,
           'analise', a.analise, 'nota_editorial', a.nota_editorial,
           'fonte_nome', a.fonte_nome, 'fonte_url', a.fonte_url,
           'publicado_em', a.publicado_em, 'actualizado_em', a.updated_at,
           'gostos', a.gostos, 'partilhas', a.partilhas,
           'pais', a.pais, 'imagem_caminho', a.imagem_caminho,
           'imagem_alt', a.imagem_alt, 'imagem_credito', a.imagem_credito,
           'analise_profunda', a.analise_profunda)
    from public.news_artigos a
   where a.slug = p_slug and a.estado = 'publicado';
$$;

revoke all on function public.definir_pais_artigo(uuid, integer, text) from public, anon;
revoke all on function public.definir_imagem_artigo(uuid, integer, text, text, text) from public, anon;
revoke all on function public.guardar_profunda_artigo(uuid, integer, jsonb) from public, anon;
grant execute on function public.definir_pais_artigo(uuid, integer, text) to authenticated;
grant execute on function public.definir_imagem_artigo(uuid, integer, text, text, text) to authenticated;
grant execute on function public.guardar_profunda_artigo(uuid, integer, jsonb) to authenticated;

revoke all on function public.artigos_publicados(text, text, integer, timestamptz) from public, anon, authenticated;
revoke all on function public.artigo_publicado(text) from public, anon, authenticated;
grant execute on function public.artigos_publicados(text, text, integer, timestamptz) to service_role;
grant execute on function public.artigo_publicado(text) to service_role;

-- ---------------------------------------------------------------------------
-- Fotografias: bucket público para leitura, escrita só da redacção
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('news-imagens', 'news-imagens', true, 2097152, array['image/webp', 'image/jpeg'])
on conflict (id) do update
  set public = true,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists news_imagens_inserir on storage.objects;
create policy news_imagens_inserir on storage.objects for insert to authenticated
  with check (
    bucket_id = 'news-imagens'
    and public.current_role_of(auth.uid()) in ('admin', 'comercial')
  );
drop policy if exists news_imagens_actualizar on storage.objects;
create policy news_imagens_actualizar on storage.objects for update to authenticated
  using (
    bucket_id = 'news-imagens'
    and public.current_role_of(auth.uid()) in ('admin', 'comercial')
  );
drop policy if exists news_imagens_apagar on storage.objects;
create policy news_imagens_apagar on storage.objects for delete to authenticated
  using (
    bucket_id = 'news-imagens'
    and public.current_role_of(auth.uid()) in ('admin', 'comercial')
  );

notify pgrst, 'reload schema';
