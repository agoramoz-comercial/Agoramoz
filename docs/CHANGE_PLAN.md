# CHANGE_PLAN — alterações por ficheiro

Ordem de execução com critério de passagem e rollback por lote. Nenhum lote
avança sem o anterior verificado. Lotes 1–3 **não dependem** dos bloqueadores
B-01/B-03/B-04 e podem começar já.

---

## Lote 0 — Fundação de qualidade (sem base de dados)

| Ficheiro | Ação | Porquê |
|---|---|---|
| `package.json` | **alterar** — acrescentar `vitest` + script `test`, `test:watch`, `test:e2e` | Q-01/G-03: não há como testar nada hoje |
| `vitest.config.ts` | **criar** | ambiente node, cobertura dos módulos puros |
| `.gitignore` | **alterar** — remover `/.qa/`, ignorar só os artefactos (`.qa/*.png`, `.qa/*.json`) | Q-02: preservar o arnês, descartar o lixo binário |
| `lib/forms/lead-score.test.ts` | **criar** | fixar o comportamento actual **antes** de lhe tocar |
| `lib/forms/lead-schema.test.ts` | **criar** | limites: 20/1500 caracteres, honeypot, `consent` falso |

**Passagem:** `pnpm typecheck && pnpm lint && pnpm test` verde, com saída registada.
**Rollback:** reverter o commit; nada em produção muda.

---

## Lote 1 — Configuração e segurança de borda

| Ficheiro | Ação | Porquê |
|---|---|---|
| `lib/config/env.ts` | **criar** | Q-04: validar env com Zod no arranque; falhar cedo e claro; **nunca** imprimir valores |
| `.env.example` | **alterar** | documentar os nomes novos (sem valores) |
| `next.config.ts` | **alterar** | T-08: CSP; `X-Robots-Tag: noindex` para `/admin` e `/diagnostico/[token]` |
| `middleware.ts` | **criar** | Q-05: ponto único para proteger `/admin`; inicialmente só nega tudo |

**Passagem:** build verde; cabeçalhos verificados na resposta; `/admin` devolve 401/redirect.
**Rollback:** `next.config.ts` e `middleware.ts` são reversíveis isoladamente. CSP entra primeiro em `Report-Only`.

---

## Lote 2 — Endurecer a rota actual (ainda sem persistência)

| Ficheiro | Ação | Porquê |
|---|---|---|
| `app/api/diagnostico/route.ts` | **alterar** | T-03/T-04/T-05/T-06/T-07: content-type, limite de tamanho, rate limit, resposta de erro genérica, `correlation_id`, remover `company` dos logs |
| `lib/http/rate-limit.ts` | **criar** | interface + implementação em memória; adaptador persistente quando houver base |
| `lib/log/logger.ts` | **criar** | log estruturado com allowlist de campos |
| `app/api/diagnostico/route.test.ts` | **criar** | cobrir cada guarda |

**Ainda não resolve T-01.** A rota continua sem persistir — mas deixa de ser
abusável e deixa de vazar PII para os logs.
**Passagem:** testes das guardas verdes; submissão real continua a funcionar.
**Rollback:** ficheiro único, revertível.

---

## Lote 3 — Motor determinístico (puro, sem I/O)

| Ficheiro | Ação |
|---|---|
| `lib/diagnostic/types.ts` | **criar** — tipos de finding, evidência, severidade |
| `lib/diagnostic/normalize.ts` | **criar** — e-mail em minúsculas, telefone, domínio, `input_fingerprint` |
| `lib/diagnostic/score.ts` | **criar** — envolve `scoreLead` e acrescenta `scoring_version` (G-04). **Não altera os pesos** |
| `lib/diagnostic/rules.ts` | **criar** — cada regra com `rule_id`, `version`, condição, evidências, severidade, prioridade |
| `lib/diagnostic/evidence.ts` | **criar** — bundle com proveniência por facto |
| `lib/diagnostic/transitions.ts` | **criar** — máquina de estados; transições inválidas lançam |
| `lib/diagnostic/validate-draft.ts` | **criar** — schema, `evidence_ids`, numerais, moeda, percentagens, datas, termos proibidos, comprimentos |
| `lib/diagnostic/*.test.ts` | **criar** — limites de cada regra, injeção de prompt, numerais inventados |

Tudo puro e testável sem base de dados, sem rede, sem IA.
**Passagem:** cobertura das regras; teste que rejeita numeral ausente da entrada.
**Rollback:** módulo novo, sem consumidores ainda.

---

## Lote 4 — Base de dados — **BLOQUEADO por B-01, B-02, B-05**

Não escrevo migrações antes de inventariar o esquema de `AGORAMOZX`.

Quando desbloquear: `supabase/migrations/NNNN_*.sql` aditivas, RLS ligada em
todas as tabelas, grants mínimos, constraints das invariantes, e a RPC de
ingestão transacional. Cada migração com procedimento de rollback.
Primeiro em staging, nunca directo a produção.

---

## Lote 5 — Ligar a rota à base
`route.ts` passa a chamar a RPC. `DiagnosticForm.tsx` deixa de receber `tier`
(D-15, carece de confirmação). Testes de integração: atomicidade, rollback,
idempotência, RLS, n8n desligado e recuperado.

---

## Lote 6 — Consumidor n8n, documento, PDF, admin
Só depois de B-03 e B-04. Workflows exportados para `n8n/` no repositório (G-05).

---

## Ficheiros que **não** vou tocar

`content/**` (copy aprovada), `components/sections/**`, `components/motion/**`,
`lib/webgl/**`, `app/globals.css` — salvo necessidade justificada.
E nada relacionado com `Civicportal`.
