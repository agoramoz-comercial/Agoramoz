# GAPS — o que falta, o que bloqueia, o que diverge

## 1. Bloqueadores — não posso avançar sem isto

| # | Lacuna | Porque bloqueia |
|---|---|---|
| ~~B-01~~ | **RESOLVIDO.** Restaurei o `AGORAMOZX` (`restore_project`), ficou `ACTIVE_HEALTHY`, e inventariei: `public` com **zero tabelas**, **zero migrações**, só os esquemas próprios do Supabase. Sem herança nem risco de colisão. As migrações 0001–0005 estão aplicadas e verificadas | — |
| **B-02** | **Plano do Supabase por confirmar** | Migrou com a base. O projeto novo é `nixltrbdplqjadfytryd`, noutra conta; se estiver em plano gratuito, a pausa por inactividade viaja com ele. **Agora com a persistência ligada, uma pausa é o formulário a devolver 503 a toda a gente** — deixou de ser risco de perda silenciosa e passou a risco de indisponibilidade visível, que é melhor mas não é aceitável |
| **B-03** | **Autenticação do consumidor n8n** | *Parcialmente resolvido:* a instância é alcançável por MCP nesta sessão — um workflow, inactivo, e uma única credencial. O que falta não é o URL: é decidir como é que o n8n se autentica a ler a fila **sem receber a chave de serviço da base**. A hipótese a avaliar é um endpoint na Vercel com segredo partilhado, que mantém a chave num só sítio |
| **B-04** | **Sem fornecedor de IA** | O n8n tem uma única credencial, do tipo `smtp`. Sem credencial de IA não há camada de redação. Implemento a interface e testes com mock; **não simulo integração real** |
| **B-05** | ~~Sem acesso de escrita a produção~~ | **Resolvido.** Migrações 0001–0007 aplicadas ao AGORAMOZX com autorização explícita, e invariantes provadas por violação tentada em transações abortadas |
| **B-06** | **Publicação automática parada** | Descoberto em 2026-09-24: `agoramoz.com` servia o commit `bdc9b59`, e os 19 commits seguintes nunca foram construídos — nenhum deployment existe para eles. Uma criação manual de deployment a partir do mesmo `ref` funciona, pelo que a ligação ao GitHub está viva e o que falha é o gatilho. **Enquanto não for reposto, cada push precisa de publicação manual** |
| **B-07** | **Verificação de ponta a ponta por fazer** | Nenhuma submissão real chegou a passar por HTTP até à base. Tudo o resto foi provado — esquema, invariantes, arranque da aplicação — mas o percurso completo do formulário só se prova submetendo |

## 2. Divergências entre o pedido e o repositório

| # | Divergência | Detalhe |
|---|---|---|
| **G-01** | O pedido pressupõe esquema a adaptar; **o repositório não tem base de dados nenhuma** | Zero referências a Supabase, Postgres, Prisma ou Drizzle. A única menção a n8n é um comentário em `route.ts` |
| **G-02** | O pedido pede «não alterar nomes de variáveis»; **não há variáveis de base de dados para preservar** | As 4 env vars existentes são públicas ou de runtime |
| **G-03** | O pedido pede testes em várias categorias; **não existe runner nem um único teste** | `@playwright/test` está instalado mas sem ficheiros nem script. É preciso escolher e instalar um runner unitário |
| **G-04** | O pedido assume função de scoring a reutilizar; ela existe e é pura, **mas não é versionada** | `scoreLead` não emite `scoring_version` |
| **G-05** | O pedido fala em workflows n8n exportados; **não existe nenhum no repositório** | O workflow «Radar de Concursos» vive só na instância |
| **G-06** | **T-02: o `tier` chega ao browser**, contra a regra escrita em `lead-score.ts:9` | Corrigir é alteração de comportamento observável (D-15) — precisa da sua confirmação |

## 2-bis. Estado da base de dados

Aplicado e verificado no `AGORAMOZX` (eu-west-1):

- 19 tabelas em `public`, **RLS ligada em todas**, com políticas.
- Migrações `0001`–`0005` em `supabase/migrations/`, registadas na base.
- Ingestão transacional provada: duas chamadas com a mesma chave de
  idempotência produziram exactamente 1 resposta, 1 contacto, 1 organização,
  1 oportunidade, 1 diagnóstico e 1 evento de outbox.
- **Dez invariantes testadas por tentativa de violação; dez bloquearam.**
- Seed de produção: questionário `diagnostico-estrategico` v1 publicado.
- Dados de teste removidos. O `audit_log` manteve a linha do teste porque é
  append-only e não se deixa apagar — que é exactamente o que se pretendia.

**Por ligar:** a rota ainda não chama a RPC. É o Lote 5.

## 3. Lacunas de qualidade que herdamos

| # | Lacuna | Risco |
|---|---|---|
| Q-01 | Zero testes automatizados | Qualquer alteração pode regredir sem aviso |
| Q-02 | `.qa/` fora de Git (`/.qa/` no `.gitignore`) | O arnês que validou o site perde-se com o contentor |
| Q-03 | Sem CSP | XSS tem superfície maior do que precisa |
| Q-04 | Sem validação de configuração no arranque | Uma env var em falta falha tarde, em produção |
| Q-05 | Sem `middleware.ts` | Não há ponto único para proteger `/admin` |
| Q-06 | Sem observabilidade estruturada | `console.info` com PII (`company`) é o que existe |

## 4. Decisões de negócio que ainda não tenho

Assumi o mais conservador e registei em `DECISIONS.md`. Cada uma é reversível,
mas convém confirmá-las antes de haver dados reais:

- papéis e quem os tem (D-09);
- que questionários criam oportunidade (D-10);
- regra de associação a organização (D-11);
- prazos de retenção por categoria (D-13) — **não invento números**;
- se o `tier` deixa de ser devolvido ao cliente (D-15).

## 5. Fora de escopo, por instrução

- `Civicportal` — não inspecionado, não alterado.
- Qualquer projeto externo ao repositório `Agoramoz` e ao projeto Vercel `agoramoz`.

## 6. O que não afirmo

- **Não declaro conformidade legal.** Os dados ficam na UE e o consentimento é
  capturado, mas não houve revisão qualificada. O regime moçambicano aplicável
  a leads locais não foi verificado em fonte primária.
- **Não declaro testes executados.** Nenhum teste existe ainda; quando
  existirem, registo comando, saída e evidência.
- **Não declaro o esquema do `AGORAMOZX`.** Não o consegui ler.
