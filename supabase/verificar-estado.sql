-- ============================================================================
-- Verificação de estado — 0009 e 0010
-- ============================================================================
-- SÓ LEITURA. Não cria, não altera e não apaga nada. Pode correr as vezes que
-- quiser, com o site a funcionar.
--
-- Porque existe: `aplicar-0009-0010.sql` não está dentro de uma transacção, e
-- falhou em `create table public.response_attribution` — a linha 88 de 624. Um
-- erro nessa linha não diz nada sobre as 536 seguintes. Isto diz.
--
-- Copie o resultado inteiro e envie. A linha que decide o deploy é a
-- `ingest_diagnostic_response`: a aplicação já envia `p_attribution`, e
-- enquanto a função tiver 16 argumentos o formulário parte em produção.
-- ============================================================================

with esperado(ordem, objecto, tipo) as (values
  ( 1, 'utm_limpo',                            'função'),
  ( 2, 'response_attribution',                 'tabela'),
  ( 3, 'response_attribution_select',          'política'),
  ( 4, 'deals.acquisition_channel',            'coluna'),
  ( 5, 'deals.acquisition_campaign',           'coluna'),
  ( 6, 'bloquear_atribuicao_da_oportunidade',  'função'),
  ( 7, 'deals_atribuicao_imutavel',            'gatilho'),
  ( 8, 'ingest_diagnostic_response',           'função'),
  ( 9, 'analytics_events',                     'tabela'),
  (10, 'analytics_events_select',              'política'),
  (11, 'registar_oportunidade_criada',         'função'),
  (12, 'deals_evento_criada',                  'gatilho'),
  (13, 'registar_oportunidade_ganha',          'função'),
  (14, 'deals_evento_ganha',                   'gatilho'),
  (15, 'registar_documento_visto',             'função'),
  (16, 'documents_evento_visto',               'gatilho'),
  (17, 'funil_aquisicao',                      'vista')
),
factos as (
  select e.ordem, e.objecto, e.tipo,
    case e.objecto
      when 'utm_limpo' then (select count(*)::int from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                             where n.nspname = 'public' and p.proname = 'utm_limpo')
      when 'response_attribution' then (select count(*)::int from pg_class c join pg_namespace n on n.oid = c.relnamespace
                             where n.nspname = 'public' and c.relname = 'response_attribution' and c.relkind = 'r')
      when 'response_attribution_select' then (select count(*)::int from pg_policies
                             where schemaname = 'public' and policyname = 'response_attribution_select')
      when 'deals.acquisition_channel' then (select count(*)::int from information_schema.columns
                             where table_schema = 'public' and table_name = 'deals' and column_name = 'acquisition_channel')
      when 'deals.acquisition_campaign' then (select count(*)::int from information_schema.columns
                             where table_schema = 'public' and table_name = 'deals' and column_name = 'acquisition_campaign')
      when 'bloquear_atribuicao_da_oportunidade' then (select count(*)::int from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                             where n.nspname = 'public' and p.proname = 'bloquear_atribuicao_da_oportunidade')
      when 'deals_atribuicao_imutavel' then (select count(*)::int from pg_trigger where tgname = 'deals_atribuicao_imutavel' and not tgisinternal)
      when 'ingest_diagnostic_response' then (select count(*)::int from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                             where n.nspname = 'public' and p.proname = 'ingest_diagnostic_response')
      when 'analytics_events' then (select count(*)::int from pg_class c join pg_namespace n on n.oid = c.relnamespace
                             where n.nspname = 'public' and c.relname = 'analytics_events' and c.relkind = 'r')
      when 'analytics_events_select' then (select count(*)::int from pg_policies
                             where schemaname = 'public' and policyname = 'analytics_events_select')
      when 'registar_oportunidade_criada' then (select count(*)::int from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                             where n.nspname = 'public' and p.proname = 'registar_oportunidade_criada')
      when 'deals_evento_criada' then (select count(*)::int from pg_trigger where tgname = 'deals_evento_criada' and not tgisinternal)
      when 'registar_oportunidade_ganha' then (select count(*)::int from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                             where n.nspname = 'public' and p.proname = 'registar_oportunidade_ganha')
      when 'deals_evento_ganha' then (select count(*)::int from pg_trigger where tgname = 'deals_evento_ganha' and not tgisinternal)
      when 'registar_documento_visto' then (select count(*)::int from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                             where n.nspname = 'public' and p.proname = 'registar_documento_visto')
      when 'documents_evento_visto' then (select count(*)::int from pg_trigger where tgname = 'documents_evento_visto' and not tgisinternal)
      when 'funil_aquisicao' then (select count(*)::int from pg_class c join pg_namespace n on n.oid = c.relnamespace
                             where n.nspname = 'public' and c.relname = 'funil_aquisicao' and c.relkind = 'v')
    end as quantos
  from esperado e
)
select ordem, tipo, objecto,
       case when quantos = 0 then '✗ EM FALTA'
            when quantos = 1 then '✓ existe'
            else '⚠ ' || quantos || ' cópias — sobrecarga' end as estado,
       coalesce((
         select string_agg(pg_get_function_identity_arguments(p.oid), '  ||  ')
         from pg_proc p join pg_namespace n on n.oid = p.pronamespace
         where n.nspname = 'public' and p.proname = factos.objecto
       ), '') as argumentos
from factos
order by ordem;

-- Linha decisiva, isolada: quantos argumentos tem a função de ingestão, e se
-- `p_attribution` está entre eles. Enquanto disser 16 e `nao`, NÃO publicar.
select p.pronargs as n_argumentos,
       case when pg_get_function_identity_arguments(p.oid) like '%p_attribution%'
            then 'sim' else 'NAO' end as tem_p_attribution
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname = 'ingest_diagnostic_response';

-- Colunas de `response_attribution`, para saber se a tabela ficou completa ou
-- a meio. Devem ser 11.
select count(*) as colunas_em_response_attribution
from information_schema.columns
where table_schema = 'public' and table_name = 'response_attribution';
