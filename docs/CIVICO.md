# AGORAMOZ Cívico — operação

A página `/civico` recebe uma pergunta sobre a lei moçambicana e mostra a
resposta com as fontes numeradas. O motor é o portal cívico no Lovable
(`fonte-clara-source-guide.lovable.app`), chamado **só** pelo nosso servidor em
`app/api/civico/consulta/route.ts`. O desenho é o do AGORAMOZ; do portal vem a
lógica, não a página. Decisão: D-43.

## Estado

| Peça | Estado |
|---|---|
| Página, navegação, sitemap, OG, FAQ estruturado | Feito |
| Rota `/api/civico/consulta` | Feita |
| Motor real (Lovable) | **Desligado em produção** (`CIVICO_ENGINE=off`), **provado em 2026-11-12**: duas consultas reais, uma directa ao `/api/consulta` (HTTP 200 em ~10 s) e uma pela página inteira a correr localmente (`/api/civico/consulta` 200 em 7,3 s, 12 blocos, 1 ligação). O contrato lido no bundle confirmou-se: `text/event-stream`, cabeçalho `x-vercel-ai-ui-message-stream: v1`, sem Turnstile e sem verificação de origem |
| Verificador de vigência, tema em última mensagem, anonimizador | Feitos e medidos com o motor real em 2026-11-12 (ver abaixo) |
| Testes | 170 (vitest, um deles com o fluxo real capturado) + `.qa/civico.mjs` (Playwright e axe, desktop e telemóvel, contra o motor simulado) |

Com o motor desligado, a página apresenta-se com o campo desligado e a frase
«A consulta ainda não está activa neste site». Nada é simulado em produção.

## Como funciona

```
/civico (browser)                      nosso servidor                         portal cívico (Lovable)
 pergunta + até 3 trocas  ──POST──►  /api/civico/consulta
                                      valida · recusa contactos e nº de documento
                                      tira nomes de pessoas · limita a taxa
                                      POST /api/consulta  ────────────────►  procura + IA
                                        1. nota de vigência
                                        2. trocas anteriores
                                        3. a pergunta, sem nomes
                                        4. o TEMA (última mensagem)
 pedaços do texto  ◄──── fluxo ─────  repassa cada pedaço  ◄───────────────  eventos (Markdown)
                                      no fim: Markdown → o nosso modelo
                                              + verificação de vigência
 resposta + ligações + diplomas  ◄──  { blocos, fontes, texto } + { alertas, diplomas }
```

- **O browser nunca fala com o motor.** A CSP continua com `connect-src 'self'`.
- **O contrato** (lido no bundle, confirmado com consultas reais; `lib/civico/motor.ts`
  e `fluxo.ts`): `POST /api/consulta` com `{ id, trigger: 'submit-message',
  messages: [{ id, role, parts: [{ type: 'text', text }] }] }` e o cabeçalho
  `x-idioma`; a resposta é `text/event-stream` com eventos `text-delta`. Sem
  Turnstile e sem verificação de origem, a 2026-11-12.
- **A forma da resposta real.** Sete secções numeradas — resposta directa,
  citação literal, prática, onde tratar, prazos e contactos, «Fonte legal» e
  aviso. A lei vem citada **pelo nome**; a ligação, quando existe, é a raiz de
  um portal (`https://www.at.gov.mz`), não o diploma. Por isso a lista por
  baixo da resposta chama-se «Ligações citadas».
- **A resposta chega em fluxo.** A nossa rota repassa cada pedaço e a página
  escreve enquanto o motor escreve, com o mesmo normalizador do servidor. No
  fim chega a resposta inteira, normalizada no servidor, e é essa que fica. Um
  fluxo que acaba sem o `fim` é erro: o texto a meio não fica a fazer de resposta.
- **O nosso modelo** (`lib/civico/resposta.ts`): parágrafos, títulos, listas,
  citações e tabelas; negrito, ênfase e ligações. Não há variante que
  transporte HTML. Só ligações `https` públicas sobrevivem, numeradas, com o
  domínio por extenso e o selo `gov.mz` lido do endereço.
- **Nada é guardado por nós.** A pergunta e a resposta nunca vão para o log
  (só contagens e o tema) nem para a base. No browser, a conversa vive na
  memória do separador — não há `localStorage`.

## Os dois problemas do portal, e o que fazemos do nosso lado

A auditoria de 2026-11-12 encontrou dois problemas no portal. O código do
portal não está num repositório a que este projecto chegue, por isso ficam
contidos **aqui**, do lado do AGORAMOZ, e ficam escritos os pedidos para os
resolver na origem.

### 1. O motor respondia com lei revogada → verificador de vigência

Medido: à pergunta «Quem herda quando alguém morre sem deixar testamento?», o
motor citou os artigos 2133.º e 2134.º do Código Civil, revogados pela Lei
n.º 23/2019. `lib/civico/vigencia.ts` trata disto em dois tempos:

- **Antes.** Uma nota de vigência segue com cada pedido: que diplomas foram
  substituídos, e o pedido de não inventar citações literais. Medido com o
  motor real: com a nota, a mesma pergunta passou a citar a Lei n.º 23/2019 e
  a Lei n.º 22/2019, e onde antes havia uma «citação literal» de um artigo
  revogado passou a dizer «o texto integral não consta do corpus; consulte o BR».
- **Depois.** A resposta final é comparada com o registo. Se citar um diploma
  revogado, a página mostra um aviso **antes** do texto, com o diploma que o
  substituiu e a ligação para o Boletim da República. Por baixo, os diplomas
  citados levam o seu estado: «Revogado», «Conferido» ou «Por verificar».

**O registo** (`REVOGACOES`) tem quatro entradas, cada uma lida na norma
revogatória do diploma novo, no Boletim da República:

| Revogado | Por | Fonte lida |
|---|---|---|
| Lei n.º 23/2007 (Trabalho) | Lei n.º 13/2023 | BR, cópia do Tribunal Supremo (`ts.gov.mz`) |
| Livro V do Código Civil (Sucessões) | Lei n.º 23/2019 | BR, cópia em `reformar.co.mz` |
| Lei n.º 10/2004 (Família) | Lei n.º 22/2019 | BR, cópia na FAOLEX |
| Código Penal da Lei n.º 35/2014 | Lei n.º 24/2019 | BR, cópia em `reformar.co.mz` |

Regras do registo, que os testes guardam:

- Cada entrada é uma **revogação** (um facto que não caduca), não a afirmação
  de que um diploma «está em vigor». Um diploma fora do registo sai como «por
  verificar», nunca como em vigor.
- Acrescentar uma entrada é ler a norma revogatória e escrever o que ela diz,
  com a ligação. Nunca de memória, nunca porque um modelo o afirmou.
- O que isto **não** faz: não confere o conteúdo dos artigos. Uma resposta
  pode citar o diploma certo e descrever mal a regra. O aviso de IA e o
  «confirme na fonte» continuam em todas as respostas por isso.

### 2. O portal publica as perguntas → a pergunta nunca é a última mensagem

Medido: a página `/estado` do portal lista, palavra por palavra e com hora, a
**última mensagem** de cada consulta que não encontrou resposta no corpus. Uma
pergunta de teste nossa apareceu lá em minutos.

- **A última mensagem é o tema, não a pergunta** (`lib/civico/tema.ts`). A
  pergunta segue numa mensagem anterior; a última diz «Tema: Trabalho. A pergunta
  está na mensagem anterior.» Medido: o motor responde à pergunta na
  mesma, e na página pública do portal aparece só «Tema: Trabalho.» — um
  contador útil, sem nada de ninguém. Um teste falha se uma palavra da
  pergunta voltar à última mensagem.
- **Os nomes saem antes** (`lib/civico/anonimo.ts`): «o meu patrão Carlos
  Macamo» segue como «o meu patrão [nome]». Só onde o contexto diz que vem um
  nome de pessoa; nomes de empresas e de instituições ficam.
- **Contactos e números de documento são recusados** no browser e no servidor
  (422), com a frase que diz o que tirar.

O que isto **não** garante: o motor recebe a pergunta (sem nomes) e pode
guardá-la do lado dele, fora da página pública. O texto de privacidade da
página diz exactamente isso.

`CIVICO_PERGUNTA_NO_FIM=on` repõe a pergunta como última mensagem. Só faz
sentido depois de o portal deixar de publicar as perguntas — nesse dia, a
procura no corpus pelo texto exacto da pergunta volta a valer a pena.

### Corrigir na origem (no Lovable)

Dois pedidos para colar na conversa do projecto no Lovable. Com eles feitos,
as protecções acima passam a ser a segunda linha, e não a única.

> **Privacidade.** Na página `/estado`, remove as secções «lacunas · queries
> sem match no corpus» e «lacunas prioritárias · ingestão dirigida» da vista
> pública: elas mostram o texto das perguntas dos utilizadores com data e
> hora. Mantém só números agregados (quantas consultas sem match, por tema).
> Move a lista com o texto das perguntas para uma página de administração
> protegida por login. Não guardes o texto das perguntas por mais de 30 dias.

> **Vigência.** No prompt do sistema do `/api/consulta`, acrescenta: «A Lei
> n.º 13/2023 revogou a Lei n.º 23/2007 (Trabalho). A Lei n.º 23/2019 revogou
> o Livro V do Código Civil (Sucessões). A Lei n.º 22/2019 revogou a Lei
> n.º 10/2004 (Família). A Lei n.º 24/2019 revogou o Código Penal da Lei
> n.º 35/2014. Nunca cites artigos de diplomas revogados. Se o texto do
> diploma em vigor não estiver no corpus, não inventes citações literais.»
> Ingere no corpus o texto integral destes quatro diplomas a partir do
> Boletim da República, e corrige os três exemplos da página inicial, que
> citam a Lei n.º 23/2007 e o artigo 2133.º do Código Civil.

### O que continua a depender do portal

- **Se o Turnstile for ligado no portal, esta integração deixa de funcionar**
  (o motor responde 403 e a rota 503): um servidor não resolve um desafio de
  browser. Nesse dia o caminho é o portal expor uma rota de servidor a
  servidor com uma chave, como a `analyze-news` do News.
- **O corpus é pequeno** (8 documentos, de duas fontes, a 2026-11-12). O motor
  responde sobretudo de memória. A nossa página não promete cobertura.

## Ligar o motor (passos do fundador)

1. Na Vercel (projecto `agoramoz`), primeiro em **Preview**:

   | Variável | Valor |
   |---|---|
   | `CIVICO_ENGINE` | `lovable` |
   | `LOVABLE_CIVICO_URL` | `https://fonte-clara-source-guide.lovable.app/api/consulta` |

   Não há chave: o `/api/consulta` do portal é público.
2. Abrir `/civico` na pré-visualização e fazer as perguntas dos seis temas.
   Confirmar que as respostas chegam e que o aviso de vigência aparece quando
   deve. O log mostra `civico.respondida` (ou `civico.falhou` com o
   `reason`).
3. Só depois repetir as variáveis em **Production** e pedir o redeploy (as
   variáveis só entram num deploy novo; a página lê o interruptor no build).

Se as variáveis estiverem mal postas, a página fica com o campo desligado e a
rota responde 503 com `reason: config-invalida` no log — nunca um 500 mudo.

Para desligar: `CIVICO_ENGINE=off` e redeploy.

## O que se mede

Com `ANALYTICS_PERSISTENCE=on`, dois eventos de servidor em `analytics_events`:
`civico_consulta` (`tema`, `trocas`, `fontes`, `fontesEstado`, `revogados`,
`durationMs`) e `civico_falhou` (`tema`, `motivo`, `status`, `durationMs`). Só contagens — nunca a
pergunta nem a resposta. Ainda não aparecem no painel de comando.

## QA local

```bash
node .qa/civico-motor-simulado.mjs &
export CIVICO_ENGINE=lovable LOVABLE_CIVICO_URL=http://127.0.0.1:4020/api/consulta
pnpm build && pnpm start -p 3111 &
node .qa/civico.mjs http://127.0.0.1:3111
```

O motor simulado devolve texto **sintético** (não é informação jurídica). Na
pergunta, «sem fonte» devolve uma resposta sem ligações, «revogada» uma que
cita a Lei n.º 23/2007, «falha» um 500, «bloqueio» um 403 e «erro» um evento
de erro no fluxo. O terminal do motor simulado mostra a última mensagem de
cada pedido — tem de ser sempre o tema. Usar `pnpm start`, não
`pnpm dev`: é como o resto do arnês de QA corre.

Para apontar o servidor local ao motor **real** a partir de uma rede com proxy
de saída (como os contentores de QA), o Node precisa de
`NODE_USE_ENV_PROXY=1` e `NODE_EXTRA_CA_CERTS=<bundle>`; sem isso a rota
responde 502 com `reason: rede` e `errorCode: ENOTFOUND`. Na Vercel não é
preciso. Cada consulta real gasta modelos de IA e pode ficar na página
`/estado` do portal — não correr `.qa/civico.mjs` contra o motor real.

## Limites conhecidos

- **Custo e taxa.** O limitador (`CIVICO_RATE_LIMIT_MAX`, por omissão 10
  perguntas por 10 minutos por origem) é em memória, por instância: trava
  repetição e abuso ingénuo, não é um tecto global. Do lado do portal, todas as
  perguntas chegam dos mesmos endereços da Vercel — se o portal limitar por
  IP, limita o AGORAMOZ inteiro de uma vez.
- **Só em português.** O motor aceita outros idiomas (`x-idioma`); a página
  envia sempre `pt`. Uma versão inglesa entra por `ROTAS_BILINGUES`.
- **Só texto.** O portal tem voz (`/api/voz/*`) e «memória cifrada» com conta;
  nenhuma das duas está aqui. A voz exigiria abrir o microfone na
  `Permissions-Policy`, e a conta contraria o «sem conta» da página.
- **Na barra do cabeçalho só a partir de 1536 px.** Medido: com a ligação
  «Cívico», a barra transbordava 52 px a 1280. Abaixo de 1536 fica na gaveta
  (telemóvel e tablet) e no rodapé. Trocar de lugar com «Projetos (demo)» ou
  apertar o espaçamento da barra é uma decisão de desenho do fundador.
- **Marcadores de Markdown fora do subconjunto** (imagens, notas de rodapé,
  listas aninhadas) saem como texto simples.
