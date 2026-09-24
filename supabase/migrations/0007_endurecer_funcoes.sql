-- ============================================================================
-- 0007 — Endurecer funções: search_path fixo e superfície REST mínima
-- ============================================================================
-- Origem: o linter de segurança do Supabase, corrido logo a seguir a 0006.
-- Duas famílias de aviso, ambas legítimas, ambas de migrações anteriores
-- minhas — não de 0006.
--
-- 1. Funções de gatilho sem `search_path` fixo. Não são `security definer`,
--    pelo que o risco é menor do que nas outras, mas a regra que escrevi em
--    0001 — «`search_path` fixo em todas as funções» — não foi aplicada a
--    elas. Uma regra que só vale para metade dos casos não é uma regra.
--
-- 2. Funções expostas em `/rest/v1/rpc/...` a quem não precisa delas. O
--    PostgREST publica toda a função do esquema `public` para quem tiver
--    EXECUTE, e `create function` concede EXECUTE a PUBLIC por omissão. O
--    caso que interessa é `current_role_of(uuid)`: com EXECUTE para `anon`,
--    um visitante anónimo podia sondar, identificador a identificador, se
--    alguém é da equipa e com que papel.
--
-- `alter function ... set search_path` em vez de reescrever os corpos: a
-- alteração é exactamente a que se pretende, e os gatilhos que dependem
-- destas funções ficam intactos.
-- ============================================================================

alter function public.set_updated_at() set search_path = public, pg_catalog;
alter function public.deny_mutation() set search_path = public, pg_catalog;
alter function public.bloquear_versao_publicada() set search_path = public, pg_catalog;
alter function public.bloquear_resposta_crua() set search_path = public, pg_catalog;
alter function public.validar_transicao_diagnostico() set search_path = public, pg_catalog;

-- ---------------------------------------------------------------------------
-- Superfície REST
-- ---------------------------------------------------------------------------

-- Funções de gatilho. Nenhuma precisa de ser chamável por ninguém: os
-- gatilhos correm no contexto da tabela, não por invocação do cliente.
revoke all on function public.set_updated_at() from public, anon, authenticated;
revoke all on function public.deny_mutation() from public, anon, authenticated;
revoke all on function public.bloquear_versao_publicada() from public, anon, authenticated;
revoke all on function public.bloquear_resposta_crua() from public, anon, authenticated;
revoke all on function public.validar_transicao_diagnostico() from public, anon, authenticated;
revoke all on function public.exigir_diagnostico_aprovado() from public, anon, authenticated;

-- Auxiliares de autorização. `authenticated` MANTÉM execução: as políticas de
-- RLS chamam-nas dentro das consultas de quem está autenticado, e sem EXECUTE
-- as políticas passariam a falhar em vez de avaliar. `anon` não tem política
-- nenhuma neste esquema, pelo que não tem nada que as chamar.
revoke all on function public.current_role_of(uuid) from public, anon;
revoke all on function public.is_staff() from public, anon;
revoke all on function public.is_admin() from public, anon;
grant execute on function public.current_role_of(uuid) to authenticated;
grant execute on function public.is_staff() to authenticated;
grant execute on function public.is_admin() to authenticated;

-- Guarda interna de 0006. É chamada pelas funções de escrita, que são
-- `security definer` e correm com os direitos do dono — não precisam do
-- EXECUTE de quem as invocou. Retirá-la da API elimina uma entrada que não
-- servia para nada a não ser aparecer.
revoke all on function public.exigir_papel(public.user_role[]) from public, anon, authenticated;

-- NOTA sobre `public.rls_auto_enable()`: é um gatilho de evento do próprio
-- Supabase (dono `postgres`, já com `search_path` fixo), que liga RLS
-- automaticamente em tabelas novas. Não é nossa e não se mexe.
