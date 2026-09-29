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

## 1-bis. Lacunas factuais de identidade e SEO (2026-09-24)

Levantadas ao ligar o SEO avançado e o Perfil de Empresa. **Nenhuma foi
resolvida por invenção.**

| # | Lacuna | O que bloqueia |
|---|---|---|
| **B-08** | Sem morada, coordenadas nem horário | `LocalBusiness`. É provavelmente o correcto — a empresa é de área de serviço, confirmado pelo fundador. Fica registado e **provado pelo compilador**: `localBusinessNode` não aceita factos `'unknown'`, e uma tentativa de o chamar produz três erros TS2322 |
| **B-09** | Sem Search Console e sem Analytics | Não se sabe que consultas trazem visitas. O encaixe fica pronto por variável de ambiente; criar as propriedades é do lado do dono |
| **B-10** | **O LinkedIn da empresa lista duas localizações**, e a segunda é `Avellino Way, Mountain View, California 94043` — o endereço de exemplo do próprio LinkedIn | Não bloqueia código. Contradiz qualquer morada que venhamos a publicar e corrói a correspondência perfil↔website que o `sameAs` existe para construir. **Corrige-se no LinkedIn.** O guarda `motivoDePlaceholder` impede que este valor entre no repositório |
| **B-11** | Sem nome legal registado, NUIT, data de fundação, número de colaboradores | `Organization.legalName` e `identifier` ficam omitidos — omitir é a acção correcta, emitir `null` seria afirmar que não existem |
| **B-12** | Sem clientes, depoimentos, casos ou métricas citáveis | Não bloqueia: `content/types.ts` já os torna irrepresentáveis. Limita permanentemente o que a prova pode dizer, e a página de perfil é construída para estar correcta sem eles |
| **B-13** | Sem rota de documentos | `document_confirmed_view` fica definido sem emissor. A coluna `documents.confirmed_view_at` já existe desde 0003. Depende de B-03/B-04 |
| **B-14** | Sem Facebook, YouTube, X, TikTok, sem certificações | `sameAs` e credenciais mais fracos do que podiam ser. O tipo já os aceita |
| **B-16** | **Sem superfície de marcação de reunião** | `meeting_requested` fica definido e **não é disparado**. O caminho para falar connosco é o diagnóstico, e `diagnostic_submitted` já o mede; dispará-lo no clique de WhatsApp produziria um número com aparência de procura que duplicava `whatsapp_clicked`. O nome fica reservado para o dia em que existir uma agenda a sério |
| **B-15** | **Primeiro toque entre sessões por decidir** | A atribuição usa `sessionStorage`, e portanto morre com o separador. `localStorage` daria primeiro toque a 90 dias — mas é um identificador persistente por dispositivo, e `/privacidade` promete hoje, por escrito, que «a medição de utilização é agregada e não identifica visitantes individualmente». Estender a janela exige essa decisão **e** a edição da política. Não foi assumido em silêncio |
| **B-17** | **Os dois retratos dos fundadores estão em registos diferentes** | A fotografia de Gerson é de interior, com chapéu e óculos de sol; a de Sheinaz é um retrato de estúdio. O tratamento monocromático com níveis emparelhados — gama calculada a partir da mediana do rosto, não do sujeito — aproxima-os o suficiente para lerem como um par, e o enquadramento comum alinha a linha dos olhos. **Não os iguala.** Resolve-se com uma fotografia no mesmo registo da segunda, não em código. Registado, não bloqueante |
| **B-18** | **Este repositório é PÚBLICO** | Verificado na API do GitHub: `"private": false`. Todo o código, os `docs/` e este próprio ficheiro são legíveis por qualquer pessoa — incluindo o registo de que não há clientes nem casos. Os documentos de estratégia (ICP, metas de receita, análise de concorrentes) ficam **fora** do repositório por causa disto. Decisão de visibilidade é sua; registo o facto porque condiciona tudo o que aqui se escreve |
| **B-19** | **«Cape Town» na lista de mercados globais** | Cape Town é uma cidade, não um país. Resolvido como **África do Sul** — que a pesquisa de mercado chama «a âncora africana lógica». Na mesma lista, Portugal aparecia duas vezes: uma como mercado actual e outra no nível global; o lugar no global passou ao **Canadá**, por constar do scorecard de 27 países da pesquisa. Não foi assumido em silêncio |
| **B-20** | **Faixas de investimento dos dez mercados globais por validar** | Escritas como constantes na moeda nativa (`content/global/*.ts`), arredondadas a partir das faixas em euros de Portugal — **nunca convertidas por taxa de câmbio**, que envelhece e passa a mentir. Os pesos seguem a escala dos três mercados (6/14/20/25/4), pelo que a pontuação significa o mesmo em todo o lado. **Os valores são uma decisão comercial que não tomei**: CHF 5 000/15 000/50 000, USD 5 500/16 000/55 000, GBP 4 000/13 000/45 000, AED e SAR 20 000/60 000/200 000, ZAR 100 000/300 000/1 000 000, SGD e CAD 7 500/22 000/75 000, EUR 5 000/15 000/50 000. Confirmar antes de campanhas nesses países |
| **B-21** | **Consentimento dos dez mercados globais sem revisão jurídica** | Cada mercado tem texto em PT e EN com os direitos de acesso, retificação, oposição e eliminação e **o regime aplicável pelo nome** (nLPD, PDPA, UK GDPR, DSGVO/BDSG, RGPD, PDPL dos EAU e da Arábia Saudita, POPIA, PIPEDA e Lei 25 do Quebec, CCPA/CPRA e equivalentes estaduais nos EUA). Não declara conformidade e não foi revisto por jurista em nenhuma das jurisdições. **Revisão qualificada antes de tráfego pago para esses mercados** |
| **B-22** | **O formulário de diagnóstico continua só em português** | O visitante das páginas `/en/global/*` chega ao formulário com o mercado pré-selecionado, mas as perguntas estão em português. Lote E. Medir antes de traduzir: se os leads globais abandonam no passo 1, a tradução passa à frente |
| **B-23** | **As páginas inglesas saem com `<html lang="pt">`** | O conteúdo inglês está marcado com `<div lang="en">` (WCAG 3.1.2, idioma das partes), e o cabeçalho e rodapé — que estão em português — ficam `pt`, o que é correcto. Um `lang` de documento por idioma exige um layout-raiz por idioma. Lote E, junto com a home inglesa: até lá, o «Home» do trilho inglês aponta a `/`, e um teste impede ligações a páginas inglesas que não existem |

## 2. Divergências entre o pedido e o repositório

| # | Divergência | Detalhe |
|---|---|---|
| **G-01** | O pedido pressupõe esquema a adaptar; **o repositório não tem base de dados nenhuma** | Zero referências a Supabase, Postgres, Prisma ou Drizzle. A única menção a n8n é um comentário em `route.ts` |
| **G-02** | O pedido pede «não alterar nomes de variáveis»; **não há variáveis de base de dados para preservar** | As 4 env vars existentes são públicas ou de runtime |
| **G-03** | O pedido pede testes em várias categorias; **não existe runner nem um único teste** | `@playwright/test` está instalado mas sem ficheiros nem script. É preciso escolher e instalar um runner unitário |
| **G-04** | O pedido assume função de scoring a reutilizar; ela existe e é pura, **mas não é versionada** | `scoreLead` não emite `scoring_version` |
| **G-05** | O pedido fala em workflows n8n exportados; **não existe nenhum no repositório** | O workflow «Radar de Concursos» vive só na instância |
| **G-07** | O pedido fala em `ingest_lead`; **a função chama-se `ingest_diagnostic_response`** | Usei a que existe. Criar um `ingest_lead` seria um segundo caminho de ingestão com a sua própria idempotência, o seu próprio registo de consentimento e os seus próprios defeitos |
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
