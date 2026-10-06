# Espaço CEnO — Opportunity Operating System v1

Ambiente de trabalho privado da Chief Energy Officer no `/admin`
(`/admin/energia`). Implementa o documento «Sistema de Originação,
Estruturação e Conversão de Oportunidades»:

- radar de mercado;
- base única de stakeholders;
- pipeline de 12 etapas com critérios de passagem;
- score de qualificação 8×0–5;
- sala de oportunidade com 12 pastas;
- Opportunity Memo;
- scorecard;
- manual.

Decisão em [D-36](DECISIONS.md).

## Quem vê o quê

| Quem | Vê o espaço | Lê os dados | Escreve |
|---|---|---|---|
| Conta com linha em `acessos_modulo` (`energia`) e perfil activo | Sim | Só as linhas com `dono` = ela | Só por RPC, só nas suas linhas |
| Admin, comercial ou leitura sem o módulo | Não: `/admin/energia` dá 404 e o menu não mostra a entrada | 0 linhas (RLS) | `42501` em todas as RPC |
| Outra conta com o módulo | O seu próprio espaço, vazio | Só as suas | `P0002` nas linhas de outra pessoa |
| `anon` | Não | Não | Não |

O `audit_log` (que toda a equipa lê) leva só `ceno.<acção>` e o id, nunca
conteúdo. A governança com o CEO faz-se pelo **Opportunity Memo**: a vista de
impressão (`/admin/energia/oportunidades/<id>/memo`) gera um PDF para o
comité. Partilha-se o memo, não a conta.

## Regras que a base impõe (0017)

- Uma oportunidade activa (etapas 0–10) exige próxima acção e data.
- A etapa ≥ 4 exige os 8 critérios avaliados e total ≥ 24.
- «Perdida» exige motivo.
- A primeira passagem à etapa 4 cria as 12 pastas da sala.
- Cada mudança de etapa fica registada (`ceno_registos`, tipo `fase`).
- Um valor potencial sem evidência não se grava.
- Duas janelas abertas não se sobrepõem em silêncio (`revisao`, erro `40001`).

As probabilidades por etapa (`lib/energia/modelo.ts`, `PROBABILIDADE`) são um
**pressuposto de referência**, não dado medido. Ajustar quando houver
histórico de conversões: a probabilidade de uma etapa é igual a quantas
oportunidades que a atingiram chegaram a acordo, a dividir por quantas a
atingiram.

## Conta e palavra-passe

- A conta cria-se no Supabase Dashboard. A palavra-passe inicial é
  **provisória**: com `trocar_palavra_passe = true` em `app_metadata`, o
  middleware leva todos os pedidos do `/admin` para `/admin/conta` até ela
  escolher outra.
- **Regras da palavra-passe nova:** 12 a 72 caracteres, diferente da actual.
  A troca reautentica a pessoa e depois limpa a marca no servidor, com a
  chave de serviço.
- Qualquer conta da equipa pode usar «Mudar palavra-passe» no menu.
- Nenhuma palavra-passe entra no Git, nos logs ou neste documento.

## Activação (fundador, SQL Editor)

1. Aplicar `supabase/aplicar-0017-parte1.sql` e depois `aplicar-0017-parte2.sql`.
2. Correr `supabase/verificar-estado.sql`: a linha 29 (`espaço`) deve dizer `ok`.
3. **Authentication → Add user:** o email, a palavra-passe provisória e
   «Auto confirm user».
4. Correr o bloco abaixo, com o email no lugar de `<email>`:

```sql
begin;
insert into public.profiles (id, role, display_name)
select id, 'comercial', '<nome>' from auth.users where email = '<email>'
on conflict (id) do update set role = excluded.role, active = true;

insert into public.acessos_modulo (user_id, modulo)
select id, 'energia' from auth.users where email = '<email>'
on conflict do nothing;

update auth.users
   set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"trocar_palavra_passe": true}'::jsonb
 where email = '<email>';
commit;
```

5. Ela entra em `/admin/entrar` e escolhe a palavra-passe definitiva.

**Retirar o acesso:**

```sql
delete from public.acessos_modulo where user_id = '<id>' and modulo = 'energia';
```

Os dados ficam guardados e deixam de estar visíveis.

## Código

| Peça | Onde |
|---|---|
| Migração, regras, RPC | `supabase/migrations/0017_espaco_ceno.sql` |
| Teste de comportamento (Postgres local) | `.qa/energia-comportamento.sql` |
| Etapas, critérios, prioridade, scorecard, alertas | `lib/energia/modelo.ts` |
| Validação dos formulários | `lib/energia/formularios.ts` |
| Leitura e normalização | `lib/energia/leitura.ts` |
| Acções | `lib/admin/energia-actions.ts` |
| Acesso por módulo | `lib/auth/modulos.ts` |
| Troca de palavra-passe | `lib/auth/palavra-passe.ts`, `lib/auth/actions.ts`, `middleware.ts` |
| Páginas | `app/admin/(painel)/energia/**`, `components/admin/energia/*` |
| QA visual | `/qa/energia?vista=…` (só com `ADMIN_PREVIEW=on`) e `.qa/energia-admin.mjs` |

## Fase 2 (não activa)

**Opportunity Intelligence Agent**, sempre com aprovação humana. Faria:

- briefings antes das reuniões;
- resumo das actas;
- comparação de cada oportunidade com os critérios;
- lista dos documentos em falta;
- primeira versão do memo.

**Condições para a construir:**

- validar o processo durante as 4 semanas do plano;
- decidir o fornecedor de IA;
- retirar a PII antes de qualquer pedido ao fornecedor.

As automações por email ou formulário ficam também para a fase 2.
