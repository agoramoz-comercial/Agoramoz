# CURRENT_STATE — estado verificado do repositório

Levantamento por inspeção directa em 2026-09-24, no commit `2406f34`
(branch `claude/sleepy-bell-593hi6`). Cada afirmação aqui tem origem num
comando de leitura. O que não foi verificado está marcado como tal.

## 1. Stack

| Item | Valor observado | Fonte |
|---|---|---|
| Framework | Next.js `16.3.5`, App Router | `package.json` |
| React | `^19.2.0` | `package.json` |
| Gestor de pacotes | pnpm `10.33.0`, `pnpm-lock.yaml` presente | `package.json` |
| Linguagem | TypeScript `^5.9.3` | `package.json` |
| Estilos | Tailwind CSS v4 (`@tailwindcss/postcss`) | `package.json` |
| Validação | Zod `^4.1.13` | `package.json` |
| Formulários | react-hook-form + `@hookform/resolvers` | `package.json` |
| Movimento | GSAP `^3.15.0`, `@gsap/react`, Lenis | `package.json` |
| Sem `src/` | App Router na raiz | `ls` |

## 2. Scripts disponíveis

```
dev         next dev
build       next build
start       next start
lint        eslint .
typecheck   tsc --noEmit
```

**Não existe script `test`.**

## 3. Testes

**Zero ficheiros de teste no repositório.** Procura por `*.test.*` e `*.spec.*`
fora de `node_modules` devolveu vazio.

| Runner | Estado |
|---|---|
| vitest | ausente |
| jest | ausente |
| tsx | ausente |
| `@playwright/test` | **instalado** (`^1.63.0`) mas sem ficheiros de teste nem script que o invoque |
| `@axe-core/playwright` | instalado, idem |

O Playwright é usado apenas por scripts avulsos em `.qa/`.

## 4. `.qa/` não está versionado

`.gitignore` contém `/.qa/`. O arnês que validou o site (ligações por ecrã,
axe, CLS, LCP, contraste, provas de copy) **existe só neste contentor e não
está em Git**. Perde-se quando o contentor for reciclado.

## 5. Rota de ingestão — `app/api/diagnostico/route.ts`

44 linhas. Comportamento verificado:

1. `await request.json()` — em erro devolve 400
2. `leadSchema.safeParse` — em erro devolve 400 **com `fieldErrors`**
3. Honeypot: se `parsed.data.fax` existir → 202 `{ ok: true }`
4. `scoreLead(parsed.data)` → `{ score, tier, reasons }`
5. `console.info('[lead]', { country, sector, company, score, tier, reasons })`
6. Devolve `{ ok: true, tier }` com 200

O que **não** faz:
- não persiste nada;
- não verifica `content-type`;
- não impõe limite de tamanho do corpo;
- não aplica rate limit;
- não gera nem aceita chave de idempotência;
- não gera `correlation_id`;
- não declara `runtime`, `dynamic`, `maxDuration` nem `revalidate`;
- não chama serviço externo nenhum.

O comentário no topo descreve-a como «stub acordado para esta fase». A única
menção a n8n em todo o repositório está nesse comentário — **não existe
integração**.

## 6. Validação — `lib/forms/lead-schema.ts`

Schema Zod partilhado entre cliente e servidor (o ficheiro não tem
`'use client'`, e o comentário diz que é intencional para as validações não
divergirem).

Campos: `country` (`mz|pt|br`), `sector`, `company`, `companySize`,
`currentWebsite?`, `processToImprove[]`, `problemImpact` (20–1500),
`decisionTimeframe`, `investmentBand`, `decisionRole`, `name`, `workEmail`,
`phone`, `consent` (literal `true`), `fax?` (honeypot, sem limite de
comprimento por decisão documentada).

Exporta também `STEP_SCHEMAS` e `STEP_FIELDS` para o formulário por passos.

## 7. Scoring — `lib/forms/lead-score.ts`

Função pura `scoreLead(input): { score, tier, reasons }`. Sem dependências de
runtime. Pesos explícitos por faixa de investimento (lida de
`COUNTRIES[...].investmentBands`), dimensão, prazo, papel, clareza do problema,
âmbito e maturidade digital. Tier: `>=70 A`, `>=50 B`, `>=30 C`, senão `D`.

**Não tem versionamento.** Não existe `scoring_version` nem `ruleset_version`.

## 8. Autenticação e middleware

**Não existe `middleware.ts`.** Não existe nenhuma dependência de autenticação
(`next-auth`, `clerk`, `auth0`, `supabase` — nenhuma presente). Não há área
administrativa nem qualquer rota protegida.

## 9. Variáveis de ambiente referenciadas em código

```
NEXT_PUBLIC_SITE_URL
NEXT_PUBLIC_MOTION_DEBUG
NODE_ENV
VERCEL_ENV
```

`.env.example` documenta as duas primeiras. **Nenhum segredo é referenciado em
código hoje.** Não há validação de configuração no arranque.

## 10. Cabeçalhos de segurança — `next.config.ts`

Aplicados a `/:path*`:
`X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`,
`X-Frame-Options: SAMEORIGIN`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`.

**Ausentes:** `Content-Security-Policy`, `Strict-Transport-Security` (a Vercel
serve HSTS, observado nos cabeçalhos de resposta em produção), `X-Robots-Tag`
para áreas privadas.

Não existe `vercel.json`.

## 11. Primitivos de UI reutilizáveis para o admin

`components/ui/`: Accordion, Badge, Button, Card, ChipGroup, ChromeText,
Container, ContourField, DitherMark, Eyebrow, Section, SectionHeading,
SkipLink, SocialLinks.
`components/form/`: DiagnosticForm, Field.

`app/globals.css` tem 499 linhas de tokens de design (superfícies, contraste
calculado, tipografia). O admin pode reutilizá-los sem duplicação.

## 12. Infraestrutura externa observada

| Serviço | Estado verificado |
|---|---|
| Vercel | site em produção; domínio `agoramoz.com` a servir (200), `www` a 308 |
| Supabase | 2 projetos, **ambos `INACTIVE`**: `AGORAMOZX` (eu-west-1) e `Civicportal` (eu-west-2). Ligação a `AGORAMOZX` expirou por timeout — **esquema por inventariar** |
| n8n | 1 workflow («Radar de Concursos»), **inativo**. **Uma única credencial: SMTP**. Sem credencial de IA, de armazenamento ou de base de dados |
| Hostinger | caixa `comercial@agoramoz.com` ativa, 42 mensagens |

**Não inspecionei o `Civicportal`** — está fora de escopo por instrução.
