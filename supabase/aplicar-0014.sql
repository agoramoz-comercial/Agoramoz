-- ============================================================================
-- APLICAR NO SQL EDITOR DO SUPABASE — projecto nixltrbdplqjadfytryd
-- ============================================================================
-- Conteúdo igual a migrations/0014_inqueritos_limites.sql (um teste garante-o).
-- Repetível: pode correr as vezes que quiser. Exige a 0013 já aplicada.
--
-- O que muda: só a função que verifica um inquérito antes de o gravar. Passa
-- a aceitar até 200 perguntas e 50 secções (antes: 50 blocos ao todo). Nada
-- do que já está gravado muda.
--
-- Enquanto não correr isto, gravar um inquérito com mais de 50 blocos falha
-- com «inquérito inválido»; o resto funciona como hoje.
--
-- Depois, corra verificar-estado.sql: a linha 25 tem de dizer «ok».
-- ============================================================================

-- ============================================================================
-- 0014 — Inquéritos: limites do Microsoft Forms (200 perguntas + 50 secções)
-- ============================================================================
-- Até aqui, perguntas e secções partilhavam um tecto de 50 blocos. Como no
-- Microsoft Forms, as secções deixam de contar para as perguntas: o zod
-- (lib/inqueritos/spec.ts) passa a aceitar 200 perguntas com resposta e 50
-- secções. Esta rede por baixo acompanha: até 250 blocos e o dobro dos bytes
-- do zod (o texto do jsonb leva espaços que o JSON.stringify não leva).
--
-- Só muda esta função. É repetível: pode correr as vezes que quiser.
-- ============================================================================

create or replace function public.spec_de_inquerito_valido(p_spec jsonb)
returns boolean
language sql
immutable
set search_path = public, pg_catalog
as $$
  select jsonb_typeof(p_spec) = 'object'
     and p_spec->>'schemaVersion' = 'survey.v1'
     and jsonb_typeof(p_spec->'perguntas') = 'array'
     -- 200 perguntas com resposta + 50 secções (o zod conta cada uma à parte).
     and jsonb_array_length(p_spec->'perguntas') between 1 and 250
     -- Bytes do texto, não `pg_column_size`: esse mede o valor comprimido.
     and octet_length(p_spec::text) <= 524288
     and not exists (
       select 1 from jsonb_array_elements(p_spec->'perguntas') p
       where jsonb_typeof(p) <> 'object' or coalesce(p->>'chave', '') !~ '^[a-z0-9_]{1,40}$'
     )
     -- Chaves repetidas partiriam a gravação (unique response_id, question_key).
     and (select count(distinct p->>'chave') = count(*)
            from jsonb_array_elements(p_spec->'perguntas') p)
     -- O mesmo tecto do CHECK de consent_records.consent_text.
     and coalesce(length(p_spec->'contacto'->>'textoConsentimento'), 0) <= 4000;
$$;

revoke all on function public.spec_de_inquerito_valido(jsonb) from public, anon, authenticated;
