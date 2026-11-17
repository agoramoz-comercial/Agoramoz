-- ============================================================================
-- QA da 0022 — Cursos. Postgres local descartável (NUNCA em produção), com
-- 0001–0022 aplicadas sobre os stubs mínimos da Supabase:
--
--   psql … -v ON_ERROR_STOP=1 -f .qa/cursos-comportamento.sql
--
-- Cada bloco levanta excepção se o comportamento não for o esperado. Dados
-- sintéticos; a transacção é desfeita no fim.
--   cc01 — comercial; cc02 — leitura
-- ============================================================================

begin;

insert into auth.users (id) values
  ('00000000-0000-0000-0000-0000000000a1'),
  ('00000000-0000-0000-0000-0000000000a2');
insert into public.profiles (id, role, display_name) values
  ('00000000-0000-0000-0000-0000000000a1', 'comercial', 'QA Comercial'),
  ('00000000-0000-0000-0000-0000000000a2', 'leitura', 'QA Leitura');

create temporary table qa_curso (k text primary key, v jsonb);
grant all on qa_curso to authenticated;
insert into qa_curso values
  ('conteudo', '{"versao":1,"slug":"gestao-de-stock","titulo":"Gestão de stock","modulos":[{"titulo":"M"}],"verificacao":{"aceites":5,"retirados":1}}'),
  ('vazio', '{"versao":1,"slug":"sem-nada","titulo":"Sem nada","modulos":[{"titulo":"M"}],"verificacao":{"aceites":0,"retirados":9}}'),
  ('fontes', '[{"id":"F1","titulo":"Manual","tipo":"texto","passagens":[{"id":"F1.1","texto":"Texto de exemplo."}]}]');

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a1', true);
select set_config('request.jwt.claims', '{}', true);

-- cc-1: criar; o mesmo endereço leva sufixo; guardar mantém o endereço.
do $$
declare a jsonb; b jsonb; c jsonb; fontes jsonb := (select v from qa_curso where k = 'fontes'); cont jsonb := (select v from qa_curso where k = 'conteudo');
begin
  a := public.guardar_curso(null, null, cont, fontes);
  if a ->> 'slug' <> 'gestao-de-stock' or (a ->> 'revisao')::int <> 1 or a ->> 'estado' <> 'rascunho' then raise exception 'cc-1 criar: %', a; end if;
  b := public.guardar_curso(null, null, cont, fontes);
  if b ->> 'slug' <> 'gestao-de-stock-2' then raise exception 'cc-1 sufixo: %', b; end if;
  if (select conteudo ->> 'slug' from public.cursos where id = (b ->> 'id')::uuid) <> 'gestao-de-stock-2' then raise exception 'cc-1 slug no conteúdo'; end if;
  c := public.guardar_curso((a ->> 'id')::uuid, 1, jsonb_set(cont, '{slug}', '"outro-endereco"'), fontes);
  if c ->> 'slug' <> 'gestao-de-stock' or (c ->> 'revisao')::int <> 2 then raise exception 'cc-1 endereço fixo: %', c; end if;
  -- revisão desactualizada
  begin perform public.guardar_curso((a ->> 'id')::uuid, 1, cont, fontes); raise exception 'cc-1 revisão';
  exception when sqlstate '40001' then null; end;
end $$;

-- cc-2: validação mínima na base.
do $$
declare fontes jsonb := (select v from qa_curso where k = 'fontes'); cont jsonb := (select v from qa_curso where k = 'conteudo');
begin
  begin perform public.guardar_curso(null, null, cont - 'verificacao', fontes); raise exception 'cc-2 sem verificação';
  exception when sqlstate '22023' then null; end;
  begin perform public.guardar_curso(null, null, cont, '[]'::jsonb); raise exception 'cc-2 sem fontes';
  exception when sqlstate '22023' then null; end;
  begin perform public.guardar_curso(null, null, jsonb_set(cont, '{slug}', '"Mau Slug"'), fontes); raise exception 'cc-2 slug';
  exception when sqlstate '22023' then null; end;
  begin perform public.guardar_curso(null, null, jsonb_set(cont, '{versao}', '2'), fontes); raise exception 'cc-2 versão';
  exception when sqlstate '22023' then null; end;
end $$;

-- cc-3: publicar; só com conteúdo verificado; publicado_em fica na primeira vez.
do $$
declare id1 uuid := (select id from public.cursos where slug = 'gestao-de-stock'); r jsonb; vid uuid; t timestamptz;
begin
  r := public.mudar_estado_curso(id1, 2, 'publicado');
  if r ->> 'estado' <> 'publicado' or (r ->> 'revisao')::int <> 3 then raise exception 'cc-3 publicar: %', r; end if;
  t := (select publicado_em from public.cursos where id = id1);
  if t is null then raise exception 'cc-3 publicado_em'; end if;
  perform public.mudar_estado_curso(id1, 3, 'rascunho');
  perform public.mudar_estado_curso(id1, 4, 'publicado');
  if (select publicado_em from public.cursos where id = id1) <> t then raise exception 'cc-3 publicado_em mudou'; end if;
  begin perform public.mudar_estado_curso(id1, 5, 'apagado'); raise exception 'cc-3 estado inválido';
  exception when sqlstate '22023' then null; end;
  vid := (public.guardar_curso(null, null, (select v from qa_curso where k = 'vazio'), (select v from qa_curso where k = 'fontes')) ->> 'id')::uuid;
  begin perform public.mudar_estado_curso(vid, 1, 'publicado'); raise exception 'cc-3 publicou sem conteúdo verificado';
  exception when sqlstate '22023' then null; end;
end $$;

-- cc-4: sem escrita directa.
do $$
begin
  begin insert into public.cursos (slug, titulo, conteudo, fontes) values ('x', 'x', '{}', '[]'); raise exception 'cc-4 insert';
  exception when insufficient_privilege then null; end;
  begin update public.cursos set estado = 'publicado'; raise exception 'cc-4 update';
  exception when insufficient_privilege then null; end;
  begin perform public.validar_curso('{}'::jsonb, '[]'::jsonb); raise exception 'cc-4 auxiliar executável';
  exception when insufficient_privilege then null; end;
end $$;

reset role;
do $$
begin
  if (select count(*) from public.audit_log where entity_type = 'curso') < 6 then raise exception 'cc-4 auditoria'; end if;
  if exists (select 1 from public.audit_log where entity_type = 'curso' and (after ? 'conteudo' or after::text like '%Texto de exemplo%')) then
    raise exception 'cc-4 auditoria com conteúdo';
  end if;
end $$;
set local role authenticated;

-- cc-5: `leitura` lê mas não escreve.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a2', true);
do $$
begin
  if (select count(*) from public.cursos) <> 3 then raise exception 'cc-5 leitura não lê'; end if;
  begin perform public.guardar_curso(null, null, (select v from qa_curso where k = 'conteudo'), (select v from qa_curso where k = 'fontes')); raise exception 'cc-5 leitura escreveu';
  exception when sqlstate '42501' then null; end;
end $$;

-- cc-6: anónimo não lê nem executa.
reset role;
set local role anon;
do $$
begin
  begin perform 1 from public.cursos; raise exception 'cc-6 anon lê';
  exception when insufficient_privilege then null; end;
  begin perform public.guardar_curso(null, null, '{}'::jsonb, '[]'::jsonb); raise exception 'cc-6 anon executa';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

select 'cursos-comportamento: tudo certo' as resultado;
rollback;
