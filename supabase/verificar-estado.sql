-- ============================================================================
-- Verificação de estado — 0009 e 0010
-- ============================================================================
-- SÓ LEITURA. Não cria, não altera e não apaga nada. Pode correr as vezes que
-- quiser, com o site a funcionar.
--
-- UMA SÓ INSTRUÇÃO, de propósito: o SQL Editor do Supabase mostra apenas o
-- resultado da última, e numa versão anterior deste ficheiro as três linhas
-- que decidem o deploy ficavam escondidas atrás de uma contagem de colunas.
--
-- Copie a tabela inteira e envie. As linhas 18, 19 e 20 são as decisivas
-- para 0009/0010; a linha 21 para 0011.
-- ============================================================================

with objecto(ordem, tipo, nome, achado) as (
  select 1, 'função', 'utm_limpo',
         (select count(*)::int from pg_proc p join pg_namespace n on n.oid = p.pronamespace
          where n.nspname = 'public' and p.proname = 'utm_limpo')
  union all select 2, 'tabela', 'response_attribution',
         (select count(*)::int from pg_class c join pg_namespace n on n.oid = c.relnamespace
          where n.nspname = 'public' and c.relname = 'response_attribution' and c.relkind = 'r')
  union all select 3, 'política', 'response_attribution_select',
         (select count(*)::int from pg_policies where schemaname = 'public' and policyname = 'response_attribution_select')
  union all select 4, 'coluna', 'deals.acquisition_channel',
         (select count(*)::int from information_schema.columns
          where table_schema = 'public' and table_name = 'deals' and column_name = 'acquisition_channel')
  union all select 5, 'coluna', 'deals.acquisition_campaign',
         (select count(*)::int from information_schema.columns
          where table_schema = 'public' and table_name = 'deals' and column_name = 'acquisition_campaign')
  union all select 6, 'função', 'bloquear_atribuicao_da_oportunidade',
         (select count(*)::int from pg_proc p join pg_namespace n on n.oid = p.pronamespace
          where n.nspname = 'public' and p.proname = 'bloquear_atribuicao_da_oportunidade')
  union all select 7, 'gatilho', 'deals_atribuicao_imutavel',
         (select count(*)::int from pg_trigger where tgname = 'deals_atribuicao_imutavel' and not tgisinternal)
  union all select 8, 'tabela', 'analytics_events',
         (select count(*)::int from pg_class c join pg_namespace n on n.oid = c.relnamespace
          where n.nspname = 'public' and c.relname = 'analytics_events' and c.relkind = 'r')
  union all select 9, 'política', 'analytics_events_select',
         (select count(*)::int from pg_policies where schemaname = 'public' and policyname = 'analytics_events_select')
  union all select 10, 'função', 'registar_oportunidade_criada',
         (select count(*)::int from pg_proc p join pg_namespace n on n.oid = p.pronamespace
          where n.nspname = 'public' and p.proname = 'registar_oportunidade_criada')
  union all select 11, 'gatilho', 'deals_evento_criada',
         (select count(*)::int from pg_trigger where tgname = 'deals_evento_criada' and not tgisinternal)
  union all select 12, 'função', 'registar_oportunidade_ganha',
         (select count(*)::int from pg_proc p join pg_namespace n on n.oid = p.pronamespace
          where n.nspname = 'public' and p.proname = 'registar_oportunidade_ganha')
  union all select 13, 'gatilho', 'deals_evento_ganha',
         (select count(*)::int from pg_trigger where tgname = 'deals_evento_ganha' and not tgisinternal)
  union all select 14, 'função', 'registar_documento_visto',
         (select count(*)::int from pg_proc p join pg_namespace n on n.oid = p.pronamespace
          where n.nspname = 'public' and p.proname = 'registar_documento_visto')
  union all select 15, 'gatilho', 'documents_evento_visto',
         (select count(*)::int from pg_trigger where tgname = 'documents_evento_visto' and not tgisinternal)
  union all select 16, 'vista', 'funil_aquisicao',
         (select count(*)::int from pg_class c join pg_namespace n on n.oid = c.relnamespace
          where n.nspname = 'public' and c.relname = 'funil_aquisicao' and c.relkind = 'v')
)
select ordem, tipo, nome as objecto,
       case when achado = 0 then 'EM FALTA'
            when achado = 1 then 'ok'
            else achado || ' copias - sobrecarga' end as estado
from objecto

union all
select 17, 'tabela', 'colunas de response_attribution',
       (select count(*) from information_schema.columns
        where table_schema = 'public' and table_name = 'response_attribution')::text
       || ' de 11'

-- As tres linhas que decidem o deploy. A aplicacao ja envia `p_attribution`;
-- enquanto a funcao tiver 16 argumentos, o formulario parte em producao.
union all
select 18, 'função', 'ingest_diagnostic_response — quantas versoes',
       (select count(*)::text from pg_proc p join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public' and p.proname = 'ingest_diagnostic_response')
union all
select 19, 'função', 'ingest_diagnostic_response — argumentos',
       coalesce((select string_agg(p.pronargs::text, ' e ' order by p.pronargs)
                 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                 where n.nspname = 'public' and p.proname = 'ingest_diagnostic_response'), 'NAO EXISTE')
union all
select 20, 'função', 'ingest_diagnostic_response — tem p_attribution',
       coalesce((select case when bool_or(pg_get_function_identity_arguments(p.oid) like '%p_attribution%')
                             then 'SIM - pode publicar' else 'NAO - nao publicar' end
                 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                 where n.nspname = 'public' and p.proname = 'ingest_diagnostic_response'), 'NAO EXISTE')
-- 0011: a restrição de país aceita os treze mercados. Procura 'ca', o último
-- código acrescentado — se estiver, a restrição é a nova.
union all
select 21, 'restrição', 'organisations — aceita os 13 mercados (0011)',
       case when exists (
         select 1 from pg_constraint
         where conname = 'organisations_country_code_check'
           and pg_get_constraintdef(oid) like '%''ca''%'
       ) then 'ok' else 'EM FALTA - correr aplicar-0011.sql' end
-- 0012: reuniões do Cal.com. As duas tabelas e a função, só executável pela
-- chave de serviço.
union all
select 22, 'função', 'registar_reuniao e tabelas de reuniões (0012)',
       case when to_regclass('public.reunioes') is not null
             and to_regclass('public.reunioes_intencoes') is not null
             and exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                         where n.nspname = 'public' and p.proname = 'registar_reuniao')
             and not has_function_privilege('anon',
                   'public.registar_reuniao(text, text, text, timestamptz, timestamptz, text, text)', 'execute')
            then 'ok' else 'EM FALTA - correr aplicar-0012.sql' end
order by ordem;
