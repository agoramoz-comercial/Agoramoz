-- ============================================================================
-- 0010 — Eventos analíticos de primeira parte
-- ============================================================================
-- Até aqui, `track()` escrevia em `window.dataLayer` e **nada o lia**: não
-- havia GTM instalado nem qualquer outro consumidor. Os eventos morriam com o
-- separador. Medir sem destino é não medir.
--
-- Porque é na nossa base e não no GA4, em três pontos concretos:
--
--  · o CSP tem `connect-src 'self'` e `script-src` sem terceiros, e está a
--    caminho de deixar de ser só relatório. O GA4 obrigava a reabri-lo.
--  · `/privacidade` promete hoje, por escrito, que a medição «é agregada e não
--    identifica visitantes individualmente». O GA4 traz cookies, obrigava a um
--    banner e a reescrever essa frase.
--  · e a decisiva: o pedido é um painel que ligue perfil, website, diagnóstico
--    e CRM. Isso é uma JUNÇÃO, e uma junção precisa dos dois lados na mesma
--    base. O GA4 nunca saberia se o negócio fechou.
--
-- NÃO EXISTE IDENTIFICADOR DE VISITANTE. Sem cookie, sem `visitor_id`, sem
-- identificador de sessão. A junção ao CRM é por CANAL, que já vive em
-- `response_attribution` e em `deals`. Perde-se o percurso de uma pessoa
-- concreta; mantém-se a resposta à pergunta que decide orçamento — que canal
-- traz negócios — e mantém-se verdadeira a frase já publicada.
--
-- Os eventos de negócio nascem em GATILHOS, não no browser. Um `deal_won` que
-- qualquer browser pudesse enviar não serviria para medir nada. E o gatilho
-- apanha todos os caminhos até à fase `ganho`, incluindo uma correcção feita à
-- mão em SQL — coisa que editar a função de mudança de fase não apanharia.
-- ============================================================================


-- ---------------------------------------------------------------------------
-- analytics_events
-- ---------------------------------------------------------------------------

create table public.analytics_events (
  id bigint generated always as identity primary key,

  name text not null check (name ~ '^[a-z][a-z0-9_]{2,59}$'),
  occurred_at timestamptz not null default now(),

  channel text not null default 'desconhecido'
    check (channel in ('gbp','organico','directo','social','referencia','campanha','desconhecido')),
  campaign text check (campaign is null or campaign ~ '^[a-z0-9._-]{1,64}$'),
  path text check (path is null or path ~ '^(/[a-z0-9/_-]{0,119}|\(privado\))$'),

  -- Limitado em tamanho: sem tecto, uma versão futura do cliente podia começar
  -- a enviar objectos grandes e esta tabela crescia sem ninguém reparar. O
  -- schema da rota já é uma união estrita; isto é a rede por baixo.
  props jsonb not null default '{}'::jsonb check (pg_column_size(props) <= 2048),

  origin text not null check (origin in ('browser','servidor')),
  created_at timestamptz not null default now()
);

create index analytics_events_nome_idx on public.analytics_events (name, occurred_at desc);
create index analytics_events_canal_idx on public.analytics_events (channel, name, occurred_at desc);

alter table public.analytics_events enable row level security;

-- Leitura para a equipa. **Sem política de inserção**: só a chave de serviço e
-- as funções `security definer` escrevem, exactamente como em `responses`.
create policy analytics_events_select on public.analytics_events
  for select to authenticated using (public.is_staff());


-- ---------------------------------------------------------------------------
-- Eventos de servidor
-- ---------------------------------------------------------------------------
-- `security definer` é necessário: a tabela tem RLS ligada e nenhuma política
-- de inserção, pelo que o gatilho tem de correr com os direitos do dono.

create or replace function public.registar_oportunidade_criada()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  insert into public.analytics_events (name, channel, campaign, origin, props)
  values ('deal_created', new.acquisition_channel, new.acquisition_campaign, 'servidor',
          jsonb_build_object('deal_id', new.id, 'tier', new.tier));
  return new;
end;
$$;

create trigger deals_evento_criada
  after insert on public.deals
  for each row execute function public.registar_oportunidade_criada();


create or replace function public.registar_oportunidade_ganha()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  -- `is distinct from` e não `<>`: uma fase anterior nula tem de contar como
  -- mudança, senão a primeira transição para `ganho` passava despercebida.
  if new.stage = 'ganho' and old.stage is distinct from 'ganho' then
    insert into public.analytics_events (name, channel, campaign, origin, props)
    values ('deal_won', new.acquisition_channel, new.acquisition_campaign, 'servidor',
            jsonb_build_object('deal_id', new.id, 'tier', new.tier));
  end if;
  return new;
end;
$$;

create trigger deals_evento_ganha
  after update of stage on public.deals
  for each row execute function public.registar_oportunidade_ganha();


-- `documents.confirmed_view_at` já existe desde 0003, com a distinção certa
-- entre «o servidor recebeu um GET» e «uma pessoa leu». O evento nasce da
-- passagem de nulo a não-nulo.
--
-- NOTA: não existe ainda rota que sirva documentos, pelo que este gatilho não
-- dispara hoje. Fica escrito porque é aqui que pertence, e para que a rota,
-- quando existir, não tenha de se lembrar de emitir o evento. O canal fica
-- `desconhecido` — não se sabe, nesse momento, por onde a pessoa chegou.
create or replace function public.registar_documento_visto()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  if new.confirmed_view_at is not null and old.confirmed_view_at is null then
    insert into public.analytics_events (name, origin, props)
    values ('document_confirmed_view', 'servidor', jsonb_build_object('document_id', new.id));
  end if;
  return new;
end;
$$;

create trigger documents_evento_visto
  after update of confirmed_view_at on public.documents
  for each row execute function public.registar_documento_visto();


revoke all on function public.registar_oportunidade_criada() from public, anon, authenticated;
revoke all on function public.registar_oportunidade_ganha() from public, anon, authenticated;
revoke all on function public.registar_documento_visto() from public, anon, authenticated;


-- ---------------------------------------------------------------------------
-- funil_aquisicao — o painel que liga perfil, website, diagnóstico e CRM
-- ---------------------------------------------------------------------------
-- Uma VISTA e não uma função: nenhum dos testes de guarda existentes muda de
-- âmbito (`rpc.test.ts` procura funções em 0006; `migracoes.test.ts` procura
-- `language sql`), e uma vista lê-se com o cliente normal do admin.
--
-- `security_invoker = true` faz as políticas `is_staff()` das tabelas de base
-- aplicarem-se a quem consulta. Sem isto, a vista corria com os direitos do
-- dono e furava a RLS — que é a forma clássica de uma vista de relatório se
-- tornar uma fuga de dados.
--
-- As três últimas colunas vêm de tabelas do servidor, não do browser: se o
-- JavaScript falhar, submissões, oportunidades e ganhos continuam certos e só
-- as duas primeiras ficam subcontadas. O ecrã diz isto.

create view public.funil_aquisicao with (security_invoker = true) as
select canal, mes,
       sum(vistas)        as vistas,
       sum(iniciados)     as iniciados,
       sum(submissoes)    as submissoes,
       sum(oportunidades) as oportunidades,
       sum(ganhos)        as ganhos
from (
  select channel as canal, date_trunc('month', occurred_at)::date as mes,
         count(*) as vistas, 0 as iniciados, 0 as submissoes, 0 as oportunidades, 0 as ganhos
    from public.analytics_events where name = 'gbp_landing_view' group by 1, 2
  union all
  select channel, date_trunc('month', occurred_at)::date, 0, count(*), 0, 0, 0
    from public.analytics_events where name = 'diagnostic_started' group by 1, 2
  union all
  select channel, date_trunc('month', created_at)::date, 0, 0, count(*), 0, 0
    from public.response_attribution group by 1, 2
  union all
  select acquisition_channel, date_trunc('month', created_at)::date, 0, 0, 0, count(*), 0
    from public.deals group by 1, 2
  union all
  select acquisition_channel, date_trunc('month', updated_at)::date, 0, 0, 0, 0, count(*)
    from public.deals where stage = 'ganho' group by 1, 2
) f
group by canal, mes;

revoke all on public.funil_aquisicao from public, anon;
grant select on public.funil_aquisicao to authenticated;
