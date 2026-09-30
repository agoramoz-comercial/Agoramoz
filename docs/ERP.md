# ERP — a porta preparada

**Estado:** preparado, não ligado. Decisão do fundador: o CRM é o interno
(`deals`, `activities`); o ERP recebe o que o CRM decide quando houver um ERP
escolhido.

## O que existe

| Peça | Onde | O que faz |
|---|---|---|
| Contrato `ErpAdaptador` | `lib/erp/porta.ts` | `verificar()` (credenciais, sem escrever) e `registarGanho(oportunidade)` (devolve a referência do lado do ERP) |
| `OportunidadeGanha` | `lib/erp/porta.ts` | só `id`, `ganhaEm` e `organizacaoId` — **sem PII** |
| Configuração | `lib/config/env.ts` | `ERP_PROVIDER=off\|http`; `http` exige `ERP_URL` (https) e `ERP_API_KEY` (≥ 20 caracteres). A mensagem de erro nunca traz o valor da chave |
| Estado no painel | `estadoErp()` → cartão «ERP» em `/admin` | `off` → «Por ligar»; `http` → «Configurado, sem adaptador. Nada é enviado.» |
| Testes | `lib/erp/porta.test.ts` | validação da configuração e o contrato com um duplo de teste |

## O que NÃO existe, de propósito

- **Nenhum adaptador.** Qual ERP, que API, que campos, que regras de facturação
  e de IVA: nada disso foi dado. Simular uma integração seria mostrar no painel
  números que não vieram de lado nenhum.
- **Nenhum envio.** Mesmo com `ERP_PROVIDER=http`, nenhum código chama o ERP.

## Para ligar um ERP

1. Escolher o sistema e obter a documentação da API e uma conta de testes.
2. Escrever `lib/erp/<sistema>.ts` que implemente `ErpAdaptador`:
   - `verificar()` faz uma leitura inofensiva (ex.: a empresa autenticada);
   - `registarGanho()` cria o registo **idempotente pelo `id` da
     oportunidade**, para que um reenvio não duplique a factura.
3. Chamar o adaptador a partir da passagem de uma oportunidade a `ganho`, por
   uma linha em `outbox_events` (a fila que já existe, com repetições e «sem
   saída»), nunca directamente no pedido do utilizador.
4. Guardar a referência devolvida numa coluna nova (migração própria), para o
   painel mostrar quantos ganhos seguiram para o ERP.
5. Pôr `ERP_PROVIDER`, `ERP_URL` e `ERP_API_KEY` na Vercel (só servidor).
6. Testar com a conta de testes; só depois em produção, com aprovação humana.

## Segurança

- A chave vive só no servidor (`serverEnv`); nunca no browser, em logs ou em
  respostas de erro.
- `https` obrigatório.
- O que sai para o ERP é o mínimo: identificador, data e organização. Dados de
  contacto só se o ERP os exigir para facturar, e com a base legal registada.
