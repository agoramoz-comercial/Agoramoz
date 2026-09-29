# Plano — bilingue, nível global e reescrita comercial

> Continuação do trabalho no `agoramoz.com`. **Leia este ficheiro primeiro**
> numa sessão nova: o plugin ECC está declarado em `.claude/settings.json`
> (âmbito projecto) e carrega no arranque da sessão, não a meio.

**Este repositório é público.** As decisões comerciais que estão por trás deste
plano — perfis de cliente, metas de receita, análise de concorrentes — vivem em
documentos de estratégia **fora** do repositório e são referidas aqui por nome,
nunca reproduzidas. Quem escrever aqui deve manter essa linha.

## De onde vem

Três documentos internos de 27 set 2026 — diagnóstico de copy e conversão, ICP,
e pesquisa de mercado global. Os achados que estruturam o plano:

- o site converte mal porque a mensagem é **genérica**, não porque falta
  engenharia;
- a homepage tem 11 secções e cerca de 19 600 px em telemóvel;
- a capacidade real da empresa é de poucos clientes activos no primeiro ano;
- a pesquisa de mercado dá um scorecard de países com um top robusto.

## A decisão que estrutura tudo: duas pistas

Os documentos mandam **estreitar**; o objectivo de expansão manda **alargar**.
Resolve-se separando, e a estrutura de URLs passa a codificar a estratégia:

| Pista | Rotas | Função |
|---|---|---|
| **1 — foco** | `/`, `/mz`, `/pt`, `/br` | Mercados onde operamos. Uma promessa, uma oferta de entrada com prazo, WhatsApp à vista |
| **2 — expansão** | `/global`, `/global/<pais>` | Mercados onde entramos. Superfície de pesquisa e entrada, com funil próprio |

Uma não compete com a outra porque vivem em rotas diferentes e falam com
compradores diferentes.

## Nível global — dez países

`ch` Suíça · `sg` Singapura · `us` Estados Unidos · `uk` Reino Unido ·
`de` Alemanha · `fr` França · `ae` Emirados · `sa` Arábia Saudita ·
`za` África do Sul · `ca` Canadá

Duas correcções à lista de partida, registadas em `GAPS.md`: **Cape Town é uma
cidade** e passou a África do Sul; **Portugal** já é um dos três mercados e não
se repete — o seu lugar foi para o Canadá, que consta do scorecard da pesquisa.

Dez setores por país, cem no total, **como entradas dentro da página do país** e
não como cem páginas próprias: cada entrada com dor, resultado e ligação ao
diagnóstico pré-preenchido. Nenhuma diz «em preparação» — ou tem as três
coisas, ou não entra. É a lição directa dos quatro setores de Moçambique que
hoje mostram página vazia.

## Bilingue PT/EN

Prefixo `/en`; **PT fica na raiz**. As URLs actuais não mudam — o site está
indexado, e mover 17 URLs sem necessidade destrói o que existe para ganhar
simetria. `buildMetadata` já aceita `languages`; o hreflang passa a incluir
`en`. `RESERVED_TOP_LEVEL_SLUGS` ganha `global` e `en`.

Na camada de conteúdo, `Texto = { pt, en }` com um leitor por locale, e um
**teste-guarda** que falha se um lado estiver vazio ou igual ao outro. É o que
impede «traduzir depois» virar português com bandeira inglesa.

## Moeda local — o que já existe e o que falta

Já existe: `Country.currency` e `investmentBands` nativas nos três mercados
(`MZN`, `EUR`, `BRL`), e a legenda do passo de orçamento mostra a moeda.

**Feito neste lote:** o ecrã de confirmação passa a devolver mercado, setor,
faixa **na moeda do país** e prazo. Verificado nos três: `Até 250 000 MZN`,
`Até 5 000 €`, `Até R$ 30 mil`.

**Feito no lote D:** os dez mercados globais têm moeda e faixas nativas,
escritas como constantes — **nunca convertidas**; uma taxa de câmbio no
repositório envelhece e passa a mentir. O diagnóstico aceita os treze códigos
por uma só porta, `lib/diagnostic/mercado.ts`. Verificado de ponta a ponta:
`Até 5 000 CHF`, `Até 5 500 USD`, `Até 100 000 ZAR`, e os três originais sem
mudança. Valores por validar comercialmente (GAPS B-20).

## Copy e conversão

Direcção, toda ela vinda do diagnóstico interno:

- hero que nomeia setor, país, dor e resultado em menos de 20 palavras;
- homepage de 11 para 7 secções;
- cenas concretas em vez de conceitos abstractos;
- palavras do cliente (documentos, prazos, concursos) em vez de palavras de
  arquitecto (infraestrutura, arquitectura, integração);
- «você» antes de «nós», pelo menos 2 para 1;
- os «não garantimos» espalhados colapsam num bloco de compromissos, dito pela
  positiva **uma só vez** — a honestidade é a mesma, a repetição é que soa a
  insegurança;
- FAQ deixa de responder «depende» a preço e prazo.

O posicionamento para os dez países tem de sobreviver à tradução e a um leitor
que não conhece Moçambique: **devolvemos horas qualificadas a empresas que
perdem dinheiro em trabalho documental**, com preço fixo por fase e aprovação
humana em cada decisão.

## Ordem

| Lote | Conteúdo | Estado |
|---|---|---|
| **A** | Nome da co-fundadora · moeda na confirmação · registo em GAPS | **feito** |
| **B** | `Texto` bilingue + leitor + teste-guarda | **feito** |
| **C** | Copy da pista 1 — homepage e `/mz/energia-mineracao` | **retido** até 10 conversas, como o diagnóstico manda |
| **D** | `/global` + 10 países + 100 setores, PT e EN · diagnóstico nos 13 mercados · migração 0011 | **feito** |
| **E** | E1 infra bilingue e chrome · E2 diagnóstico em inglês com consentimento no idioma mostrado · E3 home e soluções em inglês | **feito** — E3 em três partes: índice de soluções (E3a), as cinco soluções (E3b), a inicial `/en` e as quatro entradas de mercado nas duas iniciais (E3c) |
| **F** | Formulário de 5 para 2 passos + subir `SCORING_VERSION` | por fazer |

O lote F mexe em `lead-schema.ts`, `STEP_FIELDS` e `lead-score.ts` e obriga a
subir `SCORING_VERSION`. Vai sozinho.

## Verificação

`pnpm test` e `pnpm build` verdes em cada lote. `.qa/seo-qa.mjs`,
`.qa/confirmacao.mjs`, `.qa/perfis.mjs`, axe, e `.qa/lcp-rota.mjs` antes e
depois. hreflang recíproco verificado por HTTP. A medida que diz se o lote C
resultou: **altura da homepage em telemóvel abaixo de 8 000 px**.

## Ordem de publicação do lote D

A migração 0011 **só alarga** a restrição `organisations_country_code_check`
de 3 para 13 códigos. **Corre antes do deploy:**

1. `supabase/aplicar-0011.sql` no SQL Editor — repetível;
2. `supabase/verificar-estado.sql` — a linha 21 tem de dizer `ok`;
3. deploy.

Se o deploy chegar antes da migração, os três mercados de operação continuam
a funcionar, mas um lead global com email empresarial recebe 503 — a
organização viola a restrição antiga e a transacção aborta. Com email de
domínio público passa. É por essa inconsistência que a ordem importa.
