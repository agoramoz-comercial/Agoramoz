-- ============================================================================
-- 0025 — Mapa AEOS: agentes CODEFORGE (CF01–CF20) e WIE-X (WX01–WX12)
-- ============================================================================
-- A 0024 só aceitava códigos ZABATAINA (AG-NN) em agentes_accoes.agente.
-- Alarga o CHECK para AG-NN, CFNN e WXNN. Mesmas regras de aprovação: a classe
-- (registada / precisa_aprovacao) continua a ser decidida pelo tipo, no servidor.
-- Idempotente: pode correr mais do que uma vez.
do $$
declare
  c record;
begin
  for c in
    select con.conname
      from pg_constraint con
     where con.conrelid = 'public.agentes_accoes'::regclass
       and con.contype = 'c'
       and pg_get_constraintdef(con.oid) like '%agente%~%'
  loop
    execute format('alter table public.agentes_accoes drop constraint %I', c.conname);
  end loop;
end $$;

alter table public.agentes_accoes
  add constraint agentes_accoes_agente_check
  check (agente ~ '^(AG-[0-9]{2}|CF[0-9]{2}|WX[0-9]{2})$');
