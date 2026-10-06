


-- APLICAR NO SQL EDITOR DO SUPABASE — projecto nixltrbdplqjadfytryd
-- Conteúdo igual a migrations/0016_news_prazos.sql (um teste garante-o).
-- Repetível. Exige a 0015 aplicada. Não muda dados nem permissões.
-- No GitHub, botão «Copy raw file»; no SQL Editor, consulta NOVA e vazia, colar, Run.
-- Depois, verificar-estado.sql: a linha 28 tem de dizer «ok».
-- ============================================================================
-- 0016 — Prazos: nenhuma chamada do News fica presa à espera de um lock, e
--        nenhuma consulta da chave de serviço fica pendurada para sempre
-- ============================================================================
-- A 2026-10-06 o pool de ligações da API (PostgREST) esgotou (PGRST003) e
-- ficou esgotado durante horas: consultas da chave de serviço à espera,
-- sem prazo, seguraram as ligações — e o resto do site (analítica,
-- diagnóstico) deixou de conseguir falar com a base.
--
-- 1. Cada função da 0015 desiste de esperar por um lock ao fim de 4 s
--    (erro 55P03) e liberta a ligação, em vez de esperar indefinidamente.
-- 2. A chave de serviço passa a ter um tecto de 15 s por consulta (o anon e o
--    authenticated já têm o seu, definido pelo Supabase). Se o projecto não
--    deixar alterar o papel, a migração avisa e continua.
--
-- Repetível. Não muda dados nem permissões.
-- ============================================================================

alter function public.criar_artigo(text, text, text, text, text, text, jsonb, text, text) set lock_timeout = '4s';
alter function public.guardar_artigo(uuid, integer, text, text, text, text, text, text, text) set lock_timeout = '4s';
alter function public.publicar_artigo(uuid, integer) set lock_timeout = '4s';
alter function public.arquivar_artigo(uuid, integer) set lock_timeout = '4s';
alter function public.guardar_anuncio(uuid, integer, text, text, text, text, text, text, text, timestamptz, timestamptz, integer) set lock_timeout = '4s';
alter function public.definir_anuncio_activo(uuid, boolean) set lock_timeout = '4s';
alter function public.artigos_publicados(text, text, integer, timestamptz) set lock_timeout = '4s';
alter function public.artigo_publicado(text) set lock_timeout = '4s';
alter function public.gostar_artigo(text, text) set lock_timeout = '4s';
alter function public.partilhar_artigo(text, text) set lock_timeout = '4s';
alter function public.anuncios_activos() set lock_timeout = '4s';
alter function public.registar_impressoes(jsonb, text) set lock_timeout = '4s';
alter function public.registar_clique_anuncio(uuid, text, text) set lock_timeout = '4s';

do $$
begin
  execute 'alter role service_role set statement_timeout = ''15s''';
exception
  when insufficient_privilege then
    raise notice 'service_role: sem permissão para definir statement_timeout (os prazos das funções ficam na mesma).';
end;
$$;

-- A API relê a configuração dos papéis e o esquema.
notify pgrst, 'reload config';
notify pgrst, 'reload schema';
