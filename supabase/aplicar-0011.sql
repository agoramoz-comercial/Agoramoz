-- ============================================================================
-- APLICAR NO SQL EDITOR DO SUPABASE — projecto nixltrbdplqjadfytryd
-- ============================================================================
-- Conteúdo igual a migrations/0011_mercados_globais.sql. Repetível: pode
-- correr as vezes que quiser. Só alarga — não há janela de indisponibilidade.
--
-- Depois, corra verificar-estado.sql: a linha 21 tem de dizer «ok».
-- ============================================================================

alter table public.organisations
  drop constraint if exists organisations_country_code_check;

alter table public.organisations
  add constraint organisations_country_code_check
  check (country_code is null or country_code in ('mz','pt','br','ch','sg','us','uk','de','fr','ae','sa','za','ca'));
