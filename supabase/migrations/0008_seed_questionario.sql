-- ============================================================================
-- 0008 — O questionário público
-- ============================================================================
-- Isto não é dado de exemplo. É estado sem o qual a aplicação não funciona:
-- `ingest_diagnostic_response` procura uma versão publicada pelo slug e, se
-- não a encontrar, levanta `23503` — o que se traduz em 503 para **todas** as
-- submissões do formulário.
--
-- Porque é que esta migração existe: até aqui, este questionário existia
-- apenas na base em produção, inserido à mão. O repositório não o criava.
-- Consequência: a base **não podia ser reconstruída a partir do código**, e
-- qualquer projeto novo — outra conta, outra região, um ambiente de testes —
-- nascia estruturalmente completo e funcionalmente morto, com a causa num
-- sítio onde ninguém pensaria em procurar.
--
-- Idempotente por `where not exists`: aplicar duas vezes não duplica nada, e
-- aplicar sobre a base actual, que já os tem, não faz nada.
-- ============================================================================

insert into public.questionnaires (slug, name, kind, creates_deal, active)
select 'diagnostico-estrategico', 'Diagnóstico Estratégico', 'diagnostic', true, true
where not exists (
  select 1 from public.questionnaires where slug = 'diagnostico-estrategico'
);

-- `spec` aponta para a fonte de verdade das perguntas em vez de a duplicar.
-- Duplicar o schema do formulário aqui criaria duas definições que divergiriam
-- à primeira alteração; `schema_version` é o que liga uma resposta gravada à
-- forma exacta do formulário que a produziu.
insert into public.questionnaire_versions
  (questionnaire_id, version, spec, schema_version, published_at)
select q.id, 1,
       '{"fonte": "lib/forms/lead-schema.ts", "passos": 5}'::jsonb,
       'lead-schema.v1',
       now()
from public.questionnaires q
where q.slug = 'diagnostico-estrategico'
  and not exists (
    select 1 from public.questionnaire_versions v
    where v.questionnaire_id = q.id and v.version = 1
  );
