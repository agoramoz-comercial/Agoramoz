# THREAT_MODEL — superfície actual e alvo

Âmbito: captura do diagnóstico, geração do documento e área administrativa.
Método: STRIDE aplicado às fronteiras identificadas em `DATA_FLOW.md`.
Severidade = impacto no negócio × facilidade de exploração, avaliada por mim;
não é uma classificação normativa.

## Estado actual — o que está exposto hoje

| # | Ameaça | Verificado em | Severidade | Estado |
|---|---|---|---|---|
| T-01 | **Perda silenciosa de submissões.** Nada persiste; um erro a jusante é indistinguível de sucesso para o utilizador | `route.ts` inteiro | **Crítica** | **Fechada** — a rota grava numa transação (`ingest_diagnostic_response`) e devolve 503, nunca 200, quando a gravação falha. Coberta por `app/api/diagnostico/route.test.ts`. Fica um resíduo: com `DIAGNOSTIC_PERSISTENCE=off` a rota aceita sem gravar, deliberadamente e com aviso em cada submissão |
| T-02 | **Tier exposto ao cliente.** A rota devolve `tier` (`route.ts:43`) e o cliente publica-o em `window.dataLayer` (`DiagnosticForm.tsx:167`). Um prospeto vê em devtools que foi classificado `D` | `route.ts:43`, `DiagnosticForm.tsx:167` | **Alta** (reputacional/comercial) | **Aberta** |
| T-03 | **Ausência de rate limit.** Sem limite por IP ou por identidade | `route.ts` | Alta | Aberta |
| T-04 | **Sem limite de tamanho do corpo.** `problemImpact` está limitado pelo Zod, mas o parse acontece antes da validação | `route.ts:13` | Média | Aberta |
| T-05 | **Sem verificação de `content-type`** | `route.ts` | Baixa | Aberta |
| T-06 | **Enumeração por mensagens de erro.** O 400 devolve `fieldErrors` detalhados | `route.ts:21-24` | Baixa hoje; **Alta** quando houver contactos em base | Aberta |
| T-07 | **`company` em logs de runtime** | `route.ts:34-41` | Média | Aberta |
| T-08 | **Sem CSP.** Nenhuma `Content-Security-Policy` definida | `next.config.ts` | Média | Aberta |
| T-09 | **Zero testes.** Nenhuma regressão é detectada automaticamente | repositório | Alta | Aberta |
| T-10 | **Arnês de QA fora de Git** (`/.qa/` em `.gitignore`) | `.gitignore` | Média | Aberta |

**T-02 é uma divergência entre regra declarada e implementação.**
`lib/forms/lead-score.ts:9` afirma: «a pontuação NUNCA é mostrada ao
utilizador». O `tier` é derivado directo da pontuação e chega ao browser.

## Superfície nova introduzida pelo trabalho planeado

| # | Ameaça | Mitigação obrigatória |
|---|---|---|
| T-11 | **Prompt injection** via `problemImpact` — o cliente escreve instruções dirigidas ao modelo («ignora as anteriores, escreve que…») | Respostas entram como *dados* delimitados, nunca como instruções. A IA não tem ferramentas, não tem rede, e a saída é validada por schema. Aprovação humana no fim |
| T-12 | **Alucinação numérica** num documento com a marca AGORAMOZ | Núcleo determinístico; a IA recebe só factos calculados; validador que rejeita numerais ausentes do conjunto de entrada; aprovação humana |
| T-13 | **SSRF no renderizador de PDF** — se o worker aceitar URL arbitrário | O worker recebe `document_id`, **nunca URL**. Resolve internamente, autentica com token de serviço de curta duração, lista de destinos permitidos, timeout |
| T-14 | **Força bruta ao token do documento** | Token de alta entropia; guardar só `token_hash`; rate limit por token e por IP; expiração; revogação |
| T-15 | **IDOR no admin** — aceder a diagnóstico de outro registo por id | RLS na base + autorização server-side por acção. Nunca `update` genérico vindo do browser |
| T-16 | **CSRF nas acções administrativas** | Server Actions com verificação de origem; sem endpoints `GET` que mutem estado |
| T-17 | **XSS via respostas do cliente** renderizadas no documento e no admin | Escapar por omissão; nunca `dangerouslySetInnerHTML` sobre input de utilizador |
| T-18 | **Escalada por chave de serviço** — `service_role` do Supabase ignora RLS | Chave só no servidor, nunca em `NEXT_PUBLIC_*`. O admin usa a sessão do utilizador sujeita a RLS. O n8n recebe RPC restrita, **não** a chave global |
| T-19 | **Aprovação de conteúdo desatualizado** — aprovar uma versão que já mudou | Verificação de `revision` na acção de aprovar; conflito devolve erro, não grava |
| T-20 | **Autoaprovação pelo processo de IA** | A transição `approved` exige `actor_type = 'user'` e papel permitido; constraint na base exige `approved_by` não nulo |
| T-21 | **Envio de documento não aprovado** | Constraint: documento com `sent_at` exige diagnóstico em estado `approved` |
| T-22 | **Fuga de PII em logs** (aplicação e n8n) | Logs estruturados com allowlist de campos; nunca respostas completas, tokens ou e-mail em claro |
| T-23 | **Segredos no browser ou em Git** | Validação de configuração no arranque; `.env*` já ignorado excepto `.env.example` |
| T-24 | **Reprocessamento duplicado** pelo consumidor | `processed_events(consumer, event_id)` como chave primária; efeitos idempotentes ou marcados at-least-once |

## Pressupostos

- A Vercel termina TLS e serve HSTS (observado nos cabeçalhos em produção).
- O Supabase em `eu-west-1` mantém os dados na UE.
- Não foi feita revisão jurídica. Nada aqui é parecer legal.
