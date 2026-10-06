-- ============================================================================
-- QA da 0015 — AGORAMOZ News: redacção, jornal público, gostos, partilhas e
-- anúncios. Postgres local descartável (NUNCA em produção):
--
--   psql … -v ON_ERROR_STOP=1 -f .qa/news-comportamento.sql
--
-- Cada bloco levanta excepção se o comportamento não for o esperado. Dados
-- sintéticos; a transacção é desfeita no fim.
-- ============================================================================

begin;

insert into auth.users (id) values
  ('00000000-0000-0000-0000-00000000bb01'),
  ('00000000-0000-0000-0000-00000000bb02');
insert into public.profiles (id, role, display_name) values
  ('00000000-0000-0000-0000-00000000bb01', 'comercial', 'QA Redacção'),
  ('00000000-0000-0000-0000-00000000bb02', 'leitura', 'QA Leitura');

create temporary table qa (chave text primary key, valor text);
grant all on qa to public;

-- ---------------------------------------------------------------------------
-- A. Redacção (comercial)
-- ---------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000bb01', true);

do $$
declare v_id uuid; v_anuncio uuid; r int;
begin
  -- 1. Criar um rascunho a partir de uma análise.
  v_id := public.criar_artigo('petroleo-sobe-qa1', 'pt', 'Petróleo sobe e Moçambique ganha margem',
    'O Brent passou dos 90 dólares.', 'energia', 'high',
    '{"titulo":{"titulo":"x"},"resumo":["a"]}'::jsonb, 'Fonte QA', 'https://exemplo.test/noticia');
  insert into qa values ('artigo', v_id::text);
  if (select estado || '/' || revisao from public.news_artigos where id = v_id) <> 'rascunho/1' then
    raise exception '1: rascunho mal criado';
  end if;
  if not exists (select 1 from public.audit_log where entity_id = v_id::text and action = 'news.criar_artigo') then
    raise exception '1: sem auditoria';
  end if;

  -- 2. Guardar com revisão certa sobe a revisão; com a antiga, 40001.
  r := public.guardar_artigo(v_id, 1, 'petroleo-sobe-qa1', 'Petróleo sobe: a margem de Moçambique',
    'Entrada revista.', 'energia', 'Nota da redacção.', 'Fonte QA', 'https://exemplo.test/noticia');
  if r <> 2 then raise exception '2: revisão %', r; end if;
  begin
    perform public.guardar_artigo(v_id, 1, 'petroleo-sobe-qa1', 'X x x', null, 'energia', null, null, null);
    raise exception '2: revisão antiga aceite';
  exception when sqlstate '40001' then null;
  end;

  -- 3. Publicar grava a data; o endereço deixa de poder mudar.
  r := public.publicar_artigo(v_id, 2);
  if (select estado from public.news_artigos where id = v_id) <> 'publicado'
     or (select publicado_em from public.news_artigos where id = v_id) is null then
    raise exception '3: publicação';
  end if;
  begin
    perform public.guardar_artigo(v_id, r, 'outro-endereco', 'Petróleo sobe', null, 'energia', null, null, null);
    raise exception '3: slug de artigo publicado mudou';
  exception when sqlstate '22023' then null;
  end;

  -- 4. Fonte que não é https: recusada pela tabela.
  begin
    perform public.criar_artigo('fonte-http-qa', 'pt', 'Título QA', null, 'economia', null,
      '{}'::jsonb, null, 'http://inseguro.test');
    raise exception '4: fonte http aceite';
  exception when check_violation then null;
  end;

  -- 5. Anúncio: nasce desligado; destino javascript:/http recusado.
  v_anuncio := public.guardar_anuncio(null, null, 'agentes-ia-qa', 'Agentes de IA', 'Automatize hoje.',
    'AGRM ▲ AGENTES IA', 'Ver solução', '/solucoes/agentes-ia', 'sinal', null, null, 5);
  insert into qa values ('anuncio', v_anuncio::text);
  if (select activo from public.news_anuncios where id = v_anuncio) then
    raise exception '5: anúncio nasceu ligado';
  end if;
  foreach r in array array[1, 2, 3, 4, 5, 6] loop
    begin
      perform public.guardar_anuncio(null, null, 'mau-' || r, 'Mau destino', null, null, 'Ir',
        (array['javascript:alert(1)', 'http://inseguro.test', '//evil.test', '//evil', '//134744072',
               '/solucoes//evil'])[r], 'tinta', null, null, 1);
      raise exception '5: destino malicioso % aceite', r;
    exception when check_violation then null;
    end;
  end loop;
  perform public.definir_anuncio_activo(v_anuncio, true);
end $$;

-- Leitura não publica nem cria.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000bb02', true);
do $$
begin
  begin
    perform public.criar_artigo('leitura-qa', 'pt', 'Título QA', null, 'economia', null, '{}'::jsonb, null, null);
    raise exception 'B: leitura criou artigo';
  exception when sqlstate '42501' then null;
  end;
  begin
    perform public.publicar_artigo((select valor::uuid from qa where chave = 'artigo'), 3);
    raise exception 'B: leitura publicou';
  exception when sqlstate '42501' then null;
  end;
end $$;

-- Autenticado não chama o caminho público.
do $$
begin
  begin
    perform public.gostar_artigo('petroleo-sobe-qa1', repeat('a', 64));
    raise exception 'B: authenticated executou gostar_artigo';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

-- ---------------------------------------------------------------------------
-- C. Caminho público (chave de serviço)
-- ---------------------------------------------------------------------------
set local role service_role;
do $$
declare j jsonb; n int;
begin
  -- 6. Gosto idempotente por chave; outra chave soma.
  j := public.gostar_artigo('petroleo-sobe-qa1', repeat('a', 64));
  if (j->>'gostos')::int <> 1 or not (j->>'novo')::boolean then raise exception '6: primeiro gosto %', j; end if;
  j := public.gostar_artigo('petroleo-sobe-qa1', repeat('a', 64));
  if (j->>'gostos')::int <> 1 or (j->>'novo')::boolean then raise exception '6: gosto repetido somou %', j; end if;
  j := public.gostar_artigo('petroleo-sobe-qa1', repeat('b', 64));
  if (j->>'gostos')::int <> 2 then raise exception '6: segundo browser %', j; end if;
  begin
    perform public.gostar_artigo('petroleo-sobe-qa1', 'nao-e-hash');
    raise exception '6: chave inválida aceite';
  exception when sqlstate '22023' then null;
  end;

  -- 7. Partilha conta por canal válido.
  n := public.partilhar_artigo('petroleo-sobe-qa1', 'linkedin');
  if n <> 1 then raise exception '7: partilha %', n; end if;
  begin
    perform public.partilhar_artigo('petroleo-sobe-qa1', 'telegrama');
    raise exception '7: canal inválido aceite';
  exception when sqlstate '22023' then null;
  end;

  -- 8. O jornal mostra o publicado e esconde rascunhos.
  if (select count(*) from public.artigos_publicados('pt', null, 30, null)) <> 1 then
    raise exception '8: lista do jornal';
  end if;
  if public.artigo_publicado('petroleo-sobe-qa1') is null then raise exception '8: artigo publicado'; end if;
  if (select count(*) from public.artigos_publicados('pt', 'mercados', 30, null)) <> 0 then
    raise exception '8: filtro por secção';
  end if;

  -- 9. Anúncios: impressões em lote, alcance único, clique devolve o destino guardado.
  if (select count(*) from public.anuncios_activos()) <> 1 then raise exception '9: anúncios activos'; end if;
  n := public.registar_impressoes(jsonb_build_array(
         jsonb_build_object('id', (select valor from qa where chave = 'anuncio'), 'posicao', 'topo'),
         jsonb_build_object('id', 'nao-e-uuid', 'posicao', 'topo'),
         jsonb_build_object('id', (select valor from qa where chave = 'anuncio'), 'posicao', 'lateral'),
         jsonb_build_object('id', '00000000-0000-0000-0000-000000000000', 'posicao', 'feed')),
       repeat('d', 64));
  if n <> 1 then raise exception '9: impressões contadas %', n; end if;
  perform public.registar_impressoes(jsonb_build_array(
    jsonb_build_object('id', (select valor from qa where chave = 'anuncio'), 'posicao', 'feed')), repeat('d', 64));
  j := public.registar_clique_anuncio((select valor::uuid from qa where chave = 'anuncio'), 'topo', repeat('d', 64));
  if j->>'destino' <> '/solucoes/agentes-ia' then raise exception '9: destino %', j; end if;
  perform public.registar_clique_anuncio((select valor::uuid from qa where chave = 'anuncio'), 'topo', repeat('d', 64));
  begin
    perform public.registar_impressoes((select jsonb_agg(jsonb_build_object('id', 'x', 'posicao', 'topo'))
                                          from generate_series(1, 9)), null);
    raise exception '9: lote grande aceite';
  exception when sqlstate '22023' then null;
  end;
  -- Anúncio desconhecido: sem destino.
  if public.registar_clique_anuncio('00000000-0000-0000-0000-000000000000', 'topo', null) is not null then
    raise exception '9: anúncio inexistente devolveu destino';
  end if;
end $$;
reset role;

-- Os contadores (lidos como dono: a chave de serviço não lê as tabelas).
do $$
begin
  if (select impressoes || '/' || alcance_unico || '/' || cliques || '/' || cliques_unicos
        from public.news_anuncios where id = (select valor::uuid from qa where chave = 'anuncio'))
     <> '2/1/2/1' then
    raise exception '9: impressões/alcance/cliques/únicos';
  end if;
  if (select impressoes || '/' || cliques from public.news_anuncio_posicoes
       where anuncio_id = (select valor::uuid from qa where chave = 'anuncio') and posicao = 'topo') <> '1/2' then
    raise exception '9: por posição';
  end if;
  if has_table_privilege('service_role', 'public.news_anuncios', 'select') then
    raise exception '9: a chave de serviço lê a tabela directamente';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- D. anon não executa nada; quem não é equipa não lê tabelas
-- ---------------------------------------------------------------------------
do $$
begin
  if has_function_privilege('anon', 'public.gostar_artigo(text, text)', 'execute')
     or has_function_privilege('anon', 'public.artigo_publicado(text)', 'execute')
     or has_function_privilege('anon', 'public.registar_clique_anuncio(uuid, text, text)', 'execute')
     or has_function_privilege('anon', 'public.criar_artigo(text, text, text, text, text, text, jsonb, text, text)', 'execute')
     or has_table_privilege('anon', 'public.news_artigos', 'select')
     or has_table_privilege('authenticated', 'public.news_gostos', 'select') then
    raise exception 'D: direitos a mais';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- E. Revisão ECC: data editorial, lote de impressões, transições e revisão nula
-- ---------------------------------------------------------------------------
-- Data editorial antiga (como dono, sem o gatilho) para ver se os contadores a mexem.
alter table public.news_artigos disable trigger news_artigos_set_updated_at;
update public.news_artigos set updated_at = '2020-01-01T00:00:00Z'
 where id = (select valor::uuid from qa where chave = 'artigo');
alter table public.news_artigos enable trigger news_artigos_set_updated_at;

set local role service_role;
do $$
declare n int;
begin
  perform public.gostar_artigo('petroleo-sobe-qa1', repeat('e', 64));
  perform public.partilhar_artigo('petroleo-sobe-qa1', 'whatsapp');
  -- O mesmo anúncio três vezes no mesmo lugar e no mesmo lote conta uma vez.
  n := public.registar_impressoes(jsonb_build_array(
         jsonb_build_object('id', (select valor from qa where chave = 'anuncio'), 'posicao', 'artigo'),
         jsonb_build_object('id', (select valor from qa where chave = 'anuncio'), 'posicao', 'artigo'),
         jsonb_build_object('id', (select valor from qa where chave = 'anuncio'), 'posicao', 'artigo')),
       null);
  if n <> 1 then raise exception 'E: lote repetido contou %', n; end if;
end $$;
reset role;

do $$
begin
  if (select updated_at from public.news_artigos where id = (select valor::uuid from qa where chave = 'artigo'))
     <> '2020-01-01T00:00:00Z'::timestamptz then
    raise exception 'E: gosto/partilha mexeu na data editorial';
  end if;
end $$;

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000bb01', true);
do $$
declare v_id uuid; v_rev int;
begin
  v_id := (select valor::uuid from qa where chave = 'artigo');
  v_rev := (select revisao from public.news_artigos where id = v_id);
  -- Publicar o que já está publicado: recusado.
  begin
    perform public.publicar_artigo(v_id, v_rev);
    raise exception 'E: publicou duas vezes';
  exception when sqlstate '22023' then null;
  end;
  -- Revisão nula não salta o bloqueio optimista.
  begin
    perform public.arquivar_artigo(v_id, null);
    raise exception 'E: revisão nula aceite';
  exception when sqlstate '40001' then null;
  end;
  -- Arquivar um rascunho: recusado.
  v_id := public.criar_artigo('rascunho-qa-e', 'pt', 'Rascunho QA', null, 'economia', null,
    '{"titulo":{"titulo":"x"}}'::jsonb, null, null);
  begin
    perform public.arquivar_artigo(v_id, 1);
    raise exception 'E: arquivou um rascunho';
  exception when sqlstate '22023' then null;
  end;
  -- Fonte com espaços: recusada.
  begin
    perform public.criar_artigo('fonte-espaco-qa', 'pt', 'Título QA', null, 'economia', null,
      '{}'::jsonb, null, 'https://exemplo.test/a b');
    raise exception 'E: fonte com espaço aceite';
  exception when check_violation then null;
  end;
end $$;
reset role;

select 'news-comportamento: tudo verde' as resultado;
rollback;
