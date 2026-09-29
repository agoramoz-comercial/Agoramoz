-- ============================================================================
-- 0011 — O diagnóstico aceita os dez mercados de expansão
-- ============================================================================
-- `organisations.country_code` só aceitava 'mz', 'pt' e 'br' desde 0002. Um
-- lead suíço, com o formulário alargado, partiria aqui: a ingestão insere o
-- país da organização, e a restrição recusava-o.
--
-- ESTA MIGRAÇÃO SÓ ALARGA. Todos os valores que eram válidos continuam
-- válidos, e pode correr duas vezes.
--
-- ORDEM: aplicar ANTES do deploy do formulário alargado. Com o deploy primeiro,
-- os três mercados actuais continuam a funcionar, mas um lead global com
-- domínio de email empresarial falha dentro da RPC — a inserção da
-- organização viola a restrição antiga, a transacção aborta, e a pessoa vê um
-- 503. Com email de domínio público não se cria organização e passa. Falha
-- inconsistente é pior do que falha: correr isto primeiro.
--
-- REPETÍVEL: `drop constraint if exists` antes de criar. O nome é o que o
-- PostgreSQL gera para uma CHECK em linha — `<tabela>_<coluna>_check` —,
-- confirmado numa base local antes de escrever isto.
-- ============================================================================

alter table public.organisations
  drop constraint if exists organisations_country_code_check;

alter table public.organisations
  add constraint organisations_country_code_check
  check (country_code is null or country_code in ('mz','pt','br','ch','sg','us','uk','de','fr','ae','sa','za','ca'));
