# DATA_FLOW — fluxo de dados actual e alvo

## 1. Fluxo actual (verificado)

```
Navegador                        Vercel (Node runtime)
────────────                     ─────────────────────
DiagnosticForm.tsx
  rascunho parcial
  → sessionStorage
    (6 campos, allowlist)

  submit
  fetch POST /api/diagnostico  ──►  route.ts
    Content-Type: application/json     1. request.json()
    body: TODOS os campos do form      2. leadSchema.safeParse()
                                       3. honeypot `fax` → 202
                                       4. scoreLead()
                                       5. console.info('[lead]', {...})
                                       6. 200 { ok: true, tier }
  ◄────────────────────────────────────┘
  data.tier
  → track({ name:'form_completed', tier })
  → window.dataLayer.push(...)      ← GTM consome, se existir
```

### Onde os dados param hoje

| Destino | Conteúdo | Persistência |
|---|---|---|
| `sessionStorage` do cliente | 6 campos não sensíveis (allowlist em `DiagnosticForm.tsx`; `investmentBand` deliberadamente excluído) | até fechar o separador |
| Logs de runtime da Vercel | `country`, `sector`, **`company`**, `score`, `tier`, `reasons` | retenção da plataforma |
| `window.dataLayer` | `tier` | sessão do browser + destinos GTM |
| **Base de dados** | **nada** | **nenhuma** |

**Conclusão factual: uma submissão válida não é guardada em lado nenhum
recuperável.** O único vestígio duradouro é uma linha de log que não contém nem
o nome, nem o e-mail, nem o telefone, nem as respostas — ou seja, nem sequer
serve para recuperar o lead.

## 2. Dados pessoais em trânsito

Recolhidos pelo formulário e enviados no corpo do POST:
`name`, `workEmail`, `phone`, `company`, `currentWebsite`, `problemImpact`
(texto livre, até 1500 caracteres, pode conter qualquer coisa), mais o contexto
comercial.

`consent` é capturado como literal `true`. **O texto do consentimento e a data
não são guardados** — só o booleano chega ao servidor e é descartado.

## 3. Fluxo alvo

```
Navegador          Vercel                        Postgres (Supabase)        n8n (VPS)
──────────         ──────                        ───────────────────        ─────────
 submit ─────────► route.ts
                   • content-type
                   • limite de tamanho
                   • rate limit
                   • anti-automação
                   • Zod
                   • normalização
                   • correlation_id
                   • idempotency_key
                   • score (ruleset versionado)
                        │
                        └─ RPC transacional ────► BEGIN
                                                   contacts   (upsert)
                                                   organisations (se houver evidência)
                                                   consent_records
                                                   responses  (imutável)
                                                   response_answers
                                                   diagnostics (computed)
                                                   deals      (por política)
                                                   outbox_events
                                                 COMMIT
                        ◄──────────────────────── ids, score, tier, duplicate?
                   200 { ok, correlation_id }
 ◄──────────────────┘
                   (opcional, DEPOIS do commit)
                   trigger best-effort ─────────────────────────────────────► webhook
                                                                               │
                                            claim_events(...) ◄────────────────┘
                                            FOR UPDATE SKIP LOCKED
                                                   │
                                            processa efeito
                                            (SMTP / IA / PDF)
                                                   │
                                            complete_event / fail_event
```

### Invariante central

O pedido público **termina no COMMIT**. Nada externo é chamado antes disso.
Se o n8n estiver em baixo, os eventos acumulam em `outbox_events` e são
processados quando voltar. Se a VPS desaparecer, os dados continuam em Postgres.

## 4. Fronteiras de confiança

| Fronteira | Entrada | Tratamento obrigatório |
|---|---|---|
| Browser → rota | corpo JSON | Zod, limite de tamanho, rate limit. **Dados não confiáveis** |
| Rota → Postgres | argumentos da RPC | tipos fortes, constraints na base |
| Postgres → n8n | payload do evento | n8n não confia no payload para autorizar nada |
| Respostas do cliente → IA | `problemImpact` e afins | **texto hostil por defeito**: pode conter instruções dirigidas ao modelo |
| IA → documento | JSON estruturado | validação por schema + validador numérico + aprovação humana |
| Documento → cliente | token | alta entropia, só `token_hash` guardado, expiração, revogação |

## 5. PII por categoria

| Categoria | Campos | Minimização proposta |
|---|---|---|
| Identificação | `name`, `workEmail`, `phone` | necessários ao seguimento comercial |
| Organização | `company`, `currentWebsite` | necessários |
| Conteúdo livre | `problemImpact` | pode conter PII de terceiros — nunca em logs |
| Técnica | IP, user-agent | **só hash**, nunca em claro |
| Derivada | `score`, `tier`, `reasons` | interna; ver GAPS-01 |
