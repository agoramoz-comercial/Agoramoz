-- ============================================================================
-- QA da 0023 — News: país, fotografia, análise profunda. Postgres local
-- descartável (NUNCA em produção), com 0001–0023 sobre stubs mínimos:
--
--   psql … -v ON_ERROR_STOP=1 -f .qa/news-0023-comportamento.sql
--
-- Cada bloco levanta excepção se o comportamento não for o esperado.
-- Dados sintéticos; a transacção é desfeita no fim.
-- ============================================================================
begin;
insert into auth.users (id) values ('00000000-0000-0000-0000-00000000cc01'), ('00000000-0000-0000-0000-00000000cc02');
insert into public.profiles (id, role, display_name) values
  ('00000000-0000-0000-0000-00000000cc01', 'comercial', 'QA Redacção'),
  ('00000000-0000-0000-0000-00000000cc02', 'leitura', 'QA Leitura');
create temporary table qa (chave text primary key, valor text);
grant all on qa to public;

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000cc01', true);
do $$
declare v_id uuid; r int; ok boolean;
begin
  v_id := public.criar_artigo('tarifa-qa-0023', 'pt', 'Tarifa portuária sobe', null, 'economia', 'high',
    '{"titulo":{"titulo":"x"},"resumo":["a"]}'::jsonb, null, null);
  insert into qa values ('id', v_id::text);
  -- 1. Sem país, não publica.
  begin
    perform public.publicar_artigo(v_id, 1);
    raise exception '1: publicou sem país';
  exception when sqlstate '22023' then null;
  end;
  -- 2. País fora da lista recusado; país válido aceite (revisão sobe).
  begin
    perform public.definir_pais_artigo(v_id, 1, 'xx');
    raise exception '2: aceitou país inválido';
  exception when check_violation then null;
  end;
  r := public.definir_pais_artigo(v_id, 1, 'mz');
  if r <> 2 then raise exception '2: revisão %', r; end if;
  -- 3. Revisão antiga recusada.
  begin
    perform public.guardar_profunda_artigo(v_id, 1, '{"versao":1}'::jsonb);
    raise exception '3: aceitou revisão antiga';
  exception when sqlstate '40001' then null;
  end;
  r := public.guardar_profunda_artigo(v_id, 2, '{"versao":1}'::jsonb);
  -- 4. Fotografia fora da pasta do artigo recusada; na pasta, aceite; alt obrigatório.
  begin
    perform public.definir_imagem_artigo(v_id, r, '00000000-0000-0000-0000-000000000000/abcdefgh12', 'Foto', null);
    raise exception '4: aceitou fotografia de outro artigo';
  exception when sqlstate '22023' then null;
  end;
  begin
    perform public.definir_imagem_artigo(v_id, r, v_id::text || '/abcdefgh12', ' ', null);
    raise exception '4: aceitou fotografia sem texto alternativo';
  exception when check_violation then null;
  end;
  r := public.definir_imagem_artigo(v_id, r, v_id::text || '/abcdefgh12', 'Porto de Maputo ao fim da tarde', 'Agência QA');
  -- 5. Agora publica; a auditoria não leva o conteúdo da análise profunda.
  r := public.publicar_artigo(v_id, r);
  if (select estado from public.news_artigos where id = v_id) <> 'publicado' then raise exception '5: não publicou'; end if;
  -- 6. Retirar a fotografia limpa alt e crédito.
  r := public.definir_imagem_artigo(v_id, r, null, 'x', 'y');
  if (select imagem_alt is not null or imagem_credito is not null from public.news_artigos where id = v_id) then
    raise exception '6: ficou alt/crédito sem fotografia';
  end if;
  -- 7. Bucket: a redacção escreve na pasta das notícias.
  insert into storage.objects (bucket_id, name) values ('news-imagens', v_id::text || '/abcdefgh12.webp');
end $$;

-- 8. Leitura (papel «leitura») não escreve nem carrega fotografias.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000cc02', true);
do $$
begin
  begin
    perform public.definir_pais_artigo((select valor::uuid from qa where chave = 'id'), 99, 'pt');
    raise exception '8: leitura escreveu';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into storage.objects (bucket_id, name) values ('news-imagens', 'x/abcdefgh12.webp');
    raise exception '8: leitura carregou fotografia';
  exception when insufficient_privilege then null;
  end;
end $$;

-- 5b. A auditoria da análise profunda não leva o conteúdo (lida como dono).
reset role;
do $$
begin
  if not exists (select 1 from public.audit_log where action = 'news.guardar_profunda') then
    raise exception '5b: sem auditoria';
  end if;
  if exists (select 1 from public.audit_log where action = 'news.guardar_profunda' and after::text like '%versao%') then
    raise exception '5b: auditoria com conteúdo';
  end if;
end $$;

-- 9. Público (chave de serviço): a lista e o artigo trazem país e fotografia.
reset role;
set local role service_role;
do $$
declare j jsonb; l record;
begin
  select * into l from public.artigos_publicados('pt', null, 10, null) where slug = 'tarifa-qa-0023';
  if l.pais <> 'mz' then raise exception '9: lista sem país'; end if;
  j := public.artigo_publicado('tarifa-qa-0023');
  if j->>'pais' <> 'mz' or not (j ? 'analise_profunda') or not (j ? 'imagem_caminho') then
    raise exception '9: artigo sem os campos novos: %', j;
  end if;
end $$;
-- 10. anon não lê a lista.
reset role;
set local role anon;
do $$
begin
  begin
    perform public.artigos_publicados('pt', null, 10, null);
    raise exception '10: anon leu';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
select 'news-0023: todos os blocos passaram' as resultado;
rollback;
