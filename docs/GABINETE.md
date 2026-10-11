# Gabinete do Fundador — Work Operating System v1

Ambiente de trabalho privado do fundador no `/admin` (`/admin/gabinete`).
Implementa a parte pessoal do documento «AGORAMOZ Work Operating System»:

- os três chapéus (Founder, CEO, CTO) em cada decisão;
- cinco registos: decisões, prioridades, projectos, tesouraria e capacidade;
- dois painéis: CEO e CTO;
- o manual (matriz de autoridade, reuniões, fontes oficiais, plano de 30 dias,
  o que não fazer, riscos).

A métrica crítica do documento está no topo do Painel CEO: **percentagem de
decisões recorrentes resolvidas sem o fundador**. Sem decisões recorrentes
fechadas, o painel diz o que falta registar — nunca mostra um 0 % inventado.

Decisão em [D-37](DECISIONS.md).

## Quem vê o quê

| Quem | Vê o gabinete | Lê os dados | Escreve |
|---|---|---|---|
| Conta com linha em `acessos_modulo` (`direcao`) e perfil activo | Sim | Só as linhas com `dono` = ele | Só por RPC, só nas suas linhas |
| Admin, comercial ou leitura sem o módulo (incluindo a CEnO) | Não: `/admin/gabinete` dá 404 e o menu não mostra a entrada | 0 linhas (RLS) | `42501` em todas as RPC |
| Outra conta com o módulo | O seu próprio gabinete, vazio | Só as suas | `P0002` nas linhas de outra pessoa |
| `anon` | Não | Não | Não |

O `audit_log` leva só `gabinete.<acção>` e o id, nunca conteúdo, e a
política `audit_log_select` esconde-o da equipa (`entity_type in ('ceno',
'gabinete')`). O Espaço CEnO e o Gabinete são independentes: ter um módulo não
dá o outro.

## Regras que a base impõe (0018)

- **Decisão:** em aberto exige responsável e data de revisão; «Decidida» exige
  o texto da decisão e quem decidiu (fundador ou delegada).
- **Prioridades:** uma por tipo e por trimestre (`AAAA-T1..4`) — no máximo
  cinco: empresarial, comercial, operacional, tecnológica, liderança pessoal.
- **Projecto:**
  - fases do ciclo público (diagnóstico → arquitectura → protótipo →
    implementação → activação → evolução), mais encerrado e suspenso;
  - implementação, activação e evolução exigem os **sete critérios de
    prontidão** (contrato, escopo, responsável, capacidade, aceitação,
    dependências, pagamento) — a base diz quais faltam;
  - um projecto activo exige próxima acção e data;
  - recebida ≤ faturada ≤ contratada; margem bruta = contratada − custos
    variáveis (coluna gerada).
- **Tesouraria:** valor > 0; um saldo é uma fotografia numa data; recebimentos
  e pagamentos ficam previstos até terem data efectiva. **Sem câmbio entre
  moedas** — cada soma é por moeda.
- **Capacidade:** horas por semana entre 0 e 80; só se aloca a pessoas e
  projectos do mesmo dono.
- Duas janelas abertas não se sobrepõem em silêncio (`revisao`, erro `40001`).

## O que os painéis calculam (`lib/gabinete/modelo.ts`, testado)

| Indicador | Definição |
|---|---|
| Delegação | Recorrentes decididas com «delegada» ÷ recorrentes decididas |
| Caixa | Último saldo registado + recebido − pago com data efectiva posterior, por moeda. Sem saldo, não há caixa |
| 30 dias | Previstos até hoje + 30; vencidos = previstos com data já passada |
| Receita e margem | Somas dos projectos (suspensos fora), por moeda |
| Pipeline | Oportunidades do CRM por fase — **contagem**: o CRM não regista valor |
| Em risco | Projecto activo com risco alto, próxima acção atrasada ou margem negativa |
| Capacidade | Alocações em vigor a projectos activos ÷ horas das pessoas activas |
| Higiene | Activos com responsável, escopo, próxima acção e data ÷ activos |

## Activação (fundador, SQL Editor)

1. Aplicar `supabase/aplicar-0018-parte1.sql` e depois `aplicar-0018-parte2.sql`.
2. Correr `supabase/verificar-estado.sql`: a linha 30 (`gabinete`) deve dizer `ok`.
3. Correr o bloco abaixo, com o email no lugar de `<email>`. Não rebaixa um
   perfil existente: só cria o perfil `admin` se ainda não houver.

```sql
begin;
insert into public.profiles (id, role, display_name)
select id, 'admin', '<nome>' from auth.users where lower(email) = lower('<email>')
on conflict (id) do nothing;

insert into public.acessos_modulo (user_id, modulo)
select id, 'direcao' from auth.users where lower(email) = lower('<email>')
on conflict do nothing;
commit;
```

4. Sair e voltar a entrar no `/admin`: aparece «Gabinete».

**Retirar o acesso:**

```sql
delete from public.acessos_modulo where user_id = '<id>' and modulo = 'direcao';
```

Os dados ficam guardados e deixam de estar visíveis.

## Código

| Peça | Onde |
|---|---|
| Migração, regras, RPC | `supabase/migrations/0018_gabinete.sql` (+ `aplicar-0018-parte1/2.sql`) |
| Teste de comportamento (Postgres local) | `.qa/gabinete-comportamento.sql` |
| Vocabulários, painéis, métricas | `lib/gabinete/modelo.ts` |
| Validação dos formulários | `lib/gabinete/formularios.ts` (+ `lib/forms/campos.ts`) |
| Leitura | `lib/gabinete/leitura.ts`, `lib/gabinete/dados.ts` |
| Acções | `lib/admin/gabinete-actions.ts` |
| Páginas | `app/admin/(painel)/gabinete/**`, `components/admin/gabinete/*` |
| Peças partilhadas com o CEnO | `components/admin/espaco/*` (rascunhos com prefixo `gabinete:`) |
| QA visual | `/qa/gabinete?vista=…` (só com `ADMIN_PREVIEW=on`, fora da Vercel) e `.qa/gabinete-admin.mjs` |

## Fora da v1 (de propósito)

O documento recomenda **não construir uma plataforma personalizada agora**.
Por isso a v1 só tem registos dentro do admin que já existe:

- sem integrações nem automações (Teams, SharePoint, Planner, Power BI);
- os ficheiros vivem no SharePoint ou no Drive; o projecto guarda a ligação;
- o registo técnico (releases, incidentes, dívida técnica, ADR) e a agenda
  estratégica ficam para a v2, se a v1 for usada todas as semanas durante o
  plano de 30 dias.
