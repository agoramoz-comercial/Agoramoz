# AGORAMOZ Moz News — operação

A secção `/news` e `/en/news` analisa uma notícia (link ou texto) e mostra um
relatório organizado pela ordem da decisão. O motor é a função `analyze-news`
do projecto Lovable (`agoramoz.lovable.app`), chamada **só** pelo nosso
servidor em `app/api/news/analisar/route.ts`.

## Estado

| Peça | Estado |
|---|---|
| Páginas, relatório, navegação, sitemap, OG | No ar |
| Rota `/api/news/analisar` | No ar |
| Motor real (Lovable) | **Ligado em 2026-09-30** (projecto `aqmetakutmbyqzahzhyz`). Primeira análise real: notícia da AIM sobre o Porto de Maputo, HTTP 200 em ~29 s, todas as secções presentes, 0 itens descartados |
| Jornal público, redacção e publicidade (fase 2, Lote V) | **Ligado em 2026-10-06** (`NEWS_BLOG=on`, deploy `dpl_BFSxgRXHUjY54kBwmFK3frBiekfA`). A 0015 foi aplicada em duas partes e provada numa pré-visualização contra a base real antes de ligar a produção |

## Ligar o motor (passo do responsável pela conta Lovable)

1. No Lovable, abrir o projecto AGORA MOZ → **Cloud** → as definições do
   projecto Supabase gerido pelo Lovable. Copiar:
   - o **URL do projecto** (`https://<ref>.supabase.co`);
   - a **chave anónima / publicável**.
2. Na Vercel (projecto `agoramoz`, ambiente Production), acrescentar:

   | Variável | Valor |
   |---|---|
   | `NEWS_ENGINE` | `lovable` |
   | `LOVABLE_NEWS_FUNCTION_URL` | `https://<ref>.supabase.co/functions/v1/analyze-news` |
   | `LOVABLE_NEWS_API_KEY` | a chave anónima |

3. Voltar a publicar o deploy (as variáveis só entram num deploy novo).
4. Testar uma análise real em `/news`. Cada análise **gasta créditos de IA**
   na conta Lovable.

Se as variáveis estiverem mal postas, a rota responde 503 e o log mostra
`news.falhou` com `reason: config-invalida` — nunca um 500 mudo.

## O jornal (`NEWS_BLOG=on`)

Com o interruptor ligado, o `/news` deixa de ser a ferramenta de análise
pública e passa a **jornal** (manchete, «Em destaque», «Mais gostados»,
secções, faixa «Últimas», RSS). A análise passa para o `/admin` — o custo do
motor fica só com a equipa (a rota `/api/news/analisar` responde 404 a quem
não tem sessão com escrita).

```
/admin/news (equipa)                          /news (público)
 Analisar (motor Lovable) ──► «Criar rascunho»  Jornal ─► /news/<slug>: artigo, gosto, partilha
 Editor: título, entrada, secção, endereço      Outdoor (topo, meio, artigo, fim)
 Publicar (caixa «Revi…») / Arquivar ─────────►    clique ─► /api/news/anuncio/<id> ─303─► destino
 Publicidade: anúncios + métricas ◄──────────── impressões, cliques, únicos, conversões (UTM)
```

- **Nada sai sem uma pessoa.** A análise vira **rascunho**; só fica público
  quando alguém com papel `admin` ou `comercial` marca «Revi o título, a
  entrada e o conteúdo…» e carrega em «Publicar» (`audit_log`). O endereço de
  um artigo publicado não muda (os links partilhados continuam a abrir).
- **Gosto** anónimo, um por browser; **partilha** por LinkedIn, WhatsApp, X,
  Facebook, email, partilha nativa do telemóvel ou «copiar ligação», contada
  por canal. Sem scripts de terceiros.
- **SEO:** `NewsArticle` (autor e editor por extenso, imagem em
  `/news/<slug>/imagem`), imagem de partilha própria por artigo, sitemap com
  a data editorial real, RSS em `/news/feed.xml` e `/en/news/feed.xml`.

### O «outdoor» (publicidade)

Painel de LED à maneira da Times Square e da Nasdaq: título grande, faixa a
correr, criativos a revezar a cada 7 s. Formato do banner do LinkedIn (4:1)
no desktop, 3:1 no tablet, 2:1 no telemóvel (cresce se o texto precisar).
Pausa por botão, ao passar o rato ou com o foco; com «reduzir movimento» fica
parado.

**O que se mede, por anúncio e por lugar** (`/admin/news/publicidade`):

| Métrica | Como |
|---|---|
| Impressões | O criativo ≥ 50 % visível durante ≥ 1 s, uma vez por anúncio e lugar, por página |
| Alcance único | Browsers distintos que o viram (chave anónima por anúncio) |
| Cliques / cliques únicos | Contados no servidor, na rota do clique — fiáveis mesmo com bloqueadores |
| CTR | Cliques ÷ impressões; sem impressões não há taxa (nunca 0 inventado) |
| Conversões atribuídas | Diagnósticos e oportunidades com `utm_campaign = <slug do anúncio>` (`response_attribution`, `deals.acquisition_campaign`). **Estimativa:** quem volta mais tarde por outro caminho não conta |

O clique vai sempre para o destino **guardado na base** (caminho do site ou
`https` sem query), com `utm_source=agoramoz_news&utm_medium=outdoor&utm_campaign=<slug>&utm_content=<lugar>`.
Um URL adulterado nunca escolhe o destino.

### Anúncios propostos (para o fundador aprovar)

Propostas da revisão de marketing (ECC), só com factos das páginas do site —
sem clientes, números, prazos nem superlativos. **Não estão criados**: entram
pelo formulário de Publicidade, desligados, e cada um é activado à mão.

| slug | Título | Mensagem | Chamada | Destino | Tema | Peso |
|---|---|---|---|---|---|---|
| `diagnostico-estrategico` | ONDE PERDE OPORTUNIDADES? | O AGORA Opportunity Diagnostic mapeia o processo, as fricções e as prioridades. Sem adequação, não há proposta. | Pedir diagnóstico | `/diagnostico` | tinta | 8 |
| `energia-fornecedores` | ALERTA ANTES DE EXPIRAR | Registo único de fornecedores, documentação com versão e pipeline de oportunidades para energia e indústria em Moçambique. | Ver solução setorial | `/mz/energia-mineracao` | energia | 6 |
| `agentes-ia-fontes` | IA QUE DIZ «NÃO SEI» | Agentes ancorados nas suas fontes, que citam a origem e passam a uma pessoa quando não sabem. | Ver agentes de IA | `/solucoes/agentes-ia` | sinal | 5 |
| `websites-que-captam` | WEBSITE QUE CAPTA PEDIDOS | Websites que identificam o visitante, recolhem o contexto e entregam o pedido a quem deve responder. | Ver como captam | `/solucoes/websites-avancados` | crescimento | 5 |
| `software-a-medida` | SAIA DA FOLHA DE CÁLCULO | Portais, operações e painéis desenhados à volta de como a sua empresa trabalha de facto. | Ver software à medida | `/solucoes/software-empresarial` | tinta | 4 |
| `automacao-processos` | MENOS TRABALHO REPETIDO | Ligamos tarefas, dados e plataformas para que cópias, avisos e documentos aconteçam sem passar por mãos. | Ver automação | `/solucoes/automacao-de-processos` | sinal | 4 |

Fitas (ticker) sugeridas, na mesma ordem: «DIAGNÓSTICO: mapa do processo,
fricções, prioridades por impacto e esforço, plano de implementação»;
«ENERGIA E MINERAÇÃO: qualificação de fornecedores, gestão documental,
procurement com rasto e reporting»; «AGENTES DE IA: âmbito declarado,
citação da origem e aprovação humana nas decisões críticas»; «WEBSITES
AVANÇADOS: captar, qualificar e encaminhar oportunidades»; «SOFTWARE
EMPRESARIAL: portais de cliente, gestão de operações e painéis de decisão»;
«AUTOMAÇÃO DE PROCESSOS: cada falha gera alerta, nenhum passo depende da
memória de alguém».

O diagnóstico **não** é anunciado como gratuito: o site não o afirma. Se for,
confirmar primeiro e só depois mudar o texto.

## Ligar o jornal (passos do fundador)

1. SQL Editor do Supabase: correr `supabase/aplicar-0015.sql` (repetível).
   O ficheiro tem ~30 KB e uma colagem cortada deixa as funções públicas por
   criar (`42883` no SQL, `PGRST202` no site). Para colar em dois passos:
   `aplicar-0015-parte1.sql` e depois `aplicar-0015-parte2.sql` (cada um
   repetível; a parte 2 sozinha completa uma 0015 cortada).
2. Correr `supabase/verificar-estado.sql`: as linhas **26** e **27** têm de
   dizer `ok`.
3. Vercel → `agoramoz` → Settings → Environment Variables: `NEWS_BLOG` =
   `on` (Production). Não há segredo novo. Pedir o redeploy.
4. Em `/admin/news`: analisar uma notícia → «Criar rascunho de artigo» →
   rever → «Publicar». Em «Publicidade»: criar os anúncios (tabela acima) e
   activá-los.

Para desligar: `NEWS_BLOG=off` e redeploy — o `/news` volta a ser o
analisador; os dados ficam na base.

## Limites conhecidos

- **Custo.** O limitador (`NEWS_RATE_LIMIT_MAX`, por omissão 5 análises por
  10 minutos por origem) é em memória, por instância: trava repetição e abuso
  ingénuo, não é um tecto global. **Pôr também um limite de gasto do lado do
  Lovable** — é o único tecto real.
- **URLs.** A guarda recusa http, IPs privados e reservados, credenciais no
  URL e nomes locais. Não resolve DNS: um nome público que aponte para um IP
  privado passa, e quem o vai buscar é o motor, na rede do Lovable.
- **Conteúdo.** O relatório é texto gerado por IA a partir de um artigo que o
  visitante escolhe. É normalizado (esquema estrito, pontuações limitadas a
  −100..100, texto sem marcação) e desenhado pelo React, que escapa. Secções
  em falta ou malformadas são marcadas no relatório («Análise incompleta») e
  no log (`faltas`, `descartados`), nunca preenchidas por nós.
- **Dados pessoais.** Nenhum. O relatório não pede nome nem e-mail, e o
  histórico fica só no browser (`localStorage`, chave
  `agoramoz:news:historico:v1`).
- **Leitor anónimo do jornal.** Um código aleatório de 128 bits no
  `localStorage` (`agoramoz:news:leitor:v1`). O servidor guarda só
  `sha256(código:id)`, diferente por artigo e por anúncio; no clique vai só
  essa chave já derivada, nunca o código. Explicado em `/privacidade`.
- **«Único» é por browser, não por pessoa.** Outro browser, navegação privada
  ou dados apagados contam como novo leitor; bloqueadores cortam impressões
  (os cliques ficam fiáveis, contados no servidor).
- **Abuso de gostos e de contadores.** A chave vem do browser: quem forjar
  chaves novas a cada pedido só é travado pelo limitador **em memória, por
  instância** (gosto: 60 pedidos por 10 min por origem). Chega para uso normal;
  se os números de um artigo ou anúncio parecerem inflacionados, o passo
  seguinte é um limite persistente (tabela por hash de IP e dia) ou o
  Vercel BotID na rota do gosto.
- **Crescimento das tabelas de unicidade.** `news_gostos` e
  `news_anuncio_vistos` crescem com os leitores. Há índice por `created_at`
  para purgar (por exemplo, vistos com mais de 90 dias — o «único» passa a
  ser por janela). A purga não está agendada.
- **Sitemap:** até 100 artigos por edição (os mais recentes).
- **Anunciantes de fora** ficam fora da v1: contrato, preços, facturação e
  aprovação de criativos de terceiros são um lote próprio.

## Diagnóstico

Eventos de log (`lib/log/logger.ts`, lista de permissões — nunca o URL, o
texto analisado nem a chave):

| Evento | Campos | Significado |
|---|---|---|
| `news.analisada` (info) | `idioma`, `modo`, `prioridade`, `faltas`, `descartados`, `durationMs` | Análise completa |
| `news.analisada` (warn, `outcome: parcial`) | idem | O motor devolveu secções em falta ou itens inválidos — vigiar se o formato mudou |
| `news.falhou` | `reason`, `status`, `errorCode` | `motor-desligado`, `config-invalida`, `timeout` (504), `indisponivel` (401/402/403/429 do motor → 503), `rede`, `http`, `json`, `grande`, `vazio`, `schema:<campos>`, `rate-limit` |

## QA local

```sh
node --experimental-strip-types .qa/news-motor-simulado.mjs &
NEWS_ENGINE=lovable \
LOVABLE_NEWS_FUNCTION_URL=http://127.0.0.1:4010/functions/v1/analyze-news \
LOVABLE_NEWS_API_KEY=qa-chave-local-com-mais-de-vinte \
pnpm start &
node .qa/news.mjs
```

O motor simulado devolve o payload **sintético** de `lib/news/exemplo.ts`.

Jornal, outdoor, gosto e partilha (sem base, com exemplos marcados «QA»):

```sh
ADMIN_PREVIEW=on pnpm start -p 3100 &
BASE=http://127.0.0.1:3100 node .qa/news-jornal.mjs
```

`/qa/jornal` só responde com `ADMIN_PREVIEW=on` fora da Vercel. O script
intercepta gostos, partilhas, impressões e cliques (nada sai), e verifica
axe, scroll horizontal, um só h1, o outdoor (rodar, pausar, movimento
reduzido), o corpo de cada pedido e o gosto lembrado, a 390/768/1440 px.

Base: `.qa/news-comportamento.sql` num Postgres descartável, depois da
0001–0015 (nunca em produção).
