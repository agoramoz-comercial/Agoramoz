# GAPS — o que falta, o que bloqueia, o que diverge

## 1. Bloqueadores — não posso avançar sem isto

| # | Lacuna | Porque bloqueia |
|---|---|---|
| **B-01** | **`AGORAMOZX` está `INACTIVE`.** A ligação expirou por timeout; **não consegui inventariar o esquema** | Não sei que tabelas existem. Escrever migrações às cegas arrisca colidir com objetos existentes. A instrução é explícita: não inventar tabelas |
| **B-02** | **Plano do Supabase por confirmar** | No plano gratuito os projetos pausam por inatividade — foi o que os deixou a ambos `INACTIVE`. Com a captura de leads dependente da base, uma pausa derruba o funil em silêncio, que é exactamente o que este trabalho existe para eliminar |
| **B-03** | **URL e autenticação do n8n na VPS desconhecidos** | Não posso verificar alcançabilidade a partir da Vercel nem desenhar a autenticação do consumidor |
| **B-04** | **Sem fornecedor de IA** | O n8n tem uma única credencial, do tipo `smtp`. Sem credencial de IA não há camada de redação. Implemento a interface e testes com mock; **não simulo integração real** |
| **B-05** | **Sem acesso de escrita a produção** | Não executo migrações em produção sem acesso e autorização explícita |

## 2. Divergências entre o pedido e o repositório

| # | Divergência | Detalhe |
|---|---|---|
| **G-01** | O pedido pressupõe esquema a adaptar; **o repositório não tem base de dados nenhuma** | Zero referências a Supabase, Postgres, Prisma ou Drizzle. A única menção a n8n é um comentário em `route.ts` |
| **G-02** | O pedido pede «não alterar nomes de variáveis»; **não há variáveis de base de dados para preservar** | As 4 env vars existentes são públicas ou de runtime |
| **G-03** | O pedido pede testes em várias categorias; **não existe runner nem um único teste** | `@playwright/test` está instalado mas sem ficheiros nem script. É preciso escolher e instalar um runner unitário |
| **G-04** | O pedido assume função de scoring a reutilizar; ela existe e é pura, **mas não é versionada** | `scoreLead` não emite `scoring_version` |
| **G-05** | O pedido fala em workflows n8n exportados; **não existe nenhum no repositório** | O workflow «Radar de Concursos» vive só na instância |
| **G-06** | **T-02: o `tier` chega ao browser**, contra a regra escrita em `lead-score.ts:9` | Corrigir é alteração de comportamento observável (D-15) — precisa da sua confirmação |

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
