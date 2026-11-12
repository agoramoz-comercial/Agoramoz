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
| Testes | 103 (vitest, um deles com o fluxo real capturado) + `.qa/civico.mjs` (Playwright e axe, desktop e telemóvel, contra o motor simulado) |

Com o motor desligado, a página apresenta-se com o campo desligado e a frase
«A consulta ainda não está activa neste site». Nada é simulado em produção.

## Como funciona

```
/civico (browser)                      nosso servidor                         portal cívico (Lovable)
 pergunta + até 3 trocas  ──POST──►  /api/civico/consulta
                                      valida · recusa contactos e nº de documento
                                      limita a taxa por origem
                                      POST /api/consulta  ────────────────►  procura + IA
                                      lê o fluxo inteiro  ◄────────────────  eventos (Markdown)
                                      Markdown → o nosso modelo
 resposta + fontes numeradas  ◄─────  { blocos, fontes, texto }
```

- **O browser nunca fala com o motor.** A CSP continua com `connect-src 'self'`.
- **O contrato** (lido no bundle, `lib/civico/motor.ts` e `fluxo.ts`): `POST
  /api/consulta` com `{ id, trigger: 'submit-message', messages: [{ id, role,
  parts: [{ type: 'text', text }] }] }` e o cabeçalho `x-idioma`; a resposta é
  `text/event-stream` com eventos `text-delta`. O cliente do portal envia um
  `X-Turnstile-Token` quando o tem — hoje a função que o obtém devolve sempre
  `null`, ou seja, o Turnstile está desligado no portal.
- **A forma da resposta real.** Sete secções numeradas — resposta directa,
  citação literal, prática, onde tratar, prazos e contactos, «Fonte legal» e
  aviso. A lei vem citada **pelo nome** («Lei n.º 22/2022, de 22 de Dezembro»);
  a ligação, quando existe, é a raiz de um portal (`https://www.at.gov.mz`),
  não o diploma. Por isso a lista por baixo da resposta chama-se «Ligações
  citadas», e o aviso de resposta sem ligação manda procurar o diploma no
  Boletim da República em vez de dizer que «não há fonte».
- **A resposta é lida inteira e normalizada antes de sair** (`lib/civico/resposta.ts`):
  parágrafos, títulos, listas, citações e tabelas; negrito, ênfase e ligações.
  Não há variante que transporte HTML. Só ligações `https` públicas sobrevivem,
  e cada uma entra na lista de fontes com o domínio por extenso e o selo
  `gov.mz` quando o domínio é do Estado (lido do endereço, não afirmado pelo
  motor). Uma resposta sem nenhuma ligação é entregue com um aviso próprio e
  fica no log como `sem-fonte`.
- **Nada é guardado por nós.** A pergunta e a resposta nunca vão para o log
  (só contagens) nem para a base. No browser, a conversa vive na memória do
  separador — não há `localStorage` — e desaparece ao fechar.
- **Dados pessoais.** Uma pergunta com um e-mail ou nove ou mais algarismos
  seguidos (telemóvel, NUIT, BI, conta) é recusada no browser e outra vez no
  servidor (422), com a frase que diz o que tirar. Nomes não são detectados: o
  aviso junto ao campo cobre isso.

## Antes de ligar em produção

Três coisas do lado do portal Lovable, encontradas na auditoria de 2026-11-12.
Não se resolvem neste repositório.

1. **A página `/estado` do portal publica as perguntas dos utilizadores, palavra
   por palavra, com data e hora** (secção «lacunas»). Com o motor ligado, as
   perguntas feitas em `agoramoz.com/civico` que o motor não souber responder
   passam a aparecer lá. A nossa guarda trava contactos e números, não trava
   nomes nem histórias. **Tirar essa secção da página pública do portal antes de
   ligar.** O texto de privacidade em `content/civico.ts` diz a verdade sobre
   isto («o motor pode guardar o texto da pergunta»), mas não cobre publicação.
2. **O motor responde com leis revogadas — visto numa resposta real.** À
   pergunta «Quem herda quando alguém morre sem deixar testamento?» (a primeira
   do tema «Família e heranças»), o motor citou os artigos 2133.º e 2134.º do
   Código Civil e a Lei n.º 10/2004. O Livro V do Código Civil foi revogado
   pela Lei n.º 23/2019 (Lei das Sucessões), e a Lei da Família em vigor é a
   n.º 22/2019. A resposta veio bem formada, confiante e desactualizada. O
   mesmo vale para o trabalho: a lei em vigor é a n.º 13/2023, que revogou a
   23/2007. A página de estado do portal mostrava 8 documentos, de duas fontes.
   **Enquanto o corpus não tiver os diplomas em vigor, ligar isto ao público é
   publicar informação jurídica errada com a marca AGORAMOZ.** Os avisos da
   página («pode estar desactualizado», «confirme na fonte») são verdadeiros,
   mas não chegam para isto. A nossa página não promete cobertura nem números
   por isso mesmo.
3. **Se o Turnstile for ligado no portal, esta integração deixa de funcionar**
   (o motor responde 403 e a rota 503): um servidor não resolve um desafio de
   browser. Nesse dia o caminho certo é o portal expor uma rota de servidor a
   servidor com uma chave, como a `analyze-news` do News.

## Ligar o motor (passos do fundador)

1. Tratar o ponto 1 acima no Lovable.
2. Na Vercel (projecto `agoramoz`), primeiro em **Preview**:

   | Variável | Valor |
   |---|---|
   | `CIVICO_ENGINE` | `lovable` |
   | `LOVABLE_CIVICO_URL` | `https://fonte-clara-source-guide.lovable.app/api/consulta` |

   Não há chave: o `/api/consulta` do portal é público.
3. Abrir `/civico` na pré-visualização e fazer as perguntas dos seis temas.
   Confirmar que as respostas chegam e, sobretudo, **que citam a lei em vigor**
   (ponto 2). O log mostra `civico.respondida` (ou `civico.falhou` com o
   `reason`).
4. Só depois repetir as variáveis em **Production** e pedir o redeploy (as
   variáveis só entram num deploy novo; a página lê o interruptor no build).

Se as variáveis estiverem mal postas, a página fica com o campo desligado e a
rota responde 503 com `reason: config-invalida` no log — nunca um 500 mudo.

Para desligar: `CIVICO_ENGINE=off` e redeploy.

## O que se mede

Com `ANALYTICS_PERSISTENCE=on`, dois eventos de servidor em `analytics_events`:
`civico_consulta` (`trocas`, `fontes`, `fontesEstado`, `durationMs`) e
`civico_falhou` (`motivo`, `status`, `durationMs`). Só contagens — nunca a
pergunta nem a resposta. Ainda não aparecem no painel de comando.

## QA local

```bash
node .qa/civico-motor-simulado.mjs &
export CIVICO_ENGINE=lovable LOVABLE_CIVICO_URL=http://127.0.0.1:4020/api/consulta
pnpm build && pnpm start -p 3111 &
node .qa/civico.mjs http://127.0.0.1:3111
```

O motor simulado devolve texto **sintético** (não é informação jurídica). Na
pergunta, «sem fonte» devolve uma resposta sem ligações, «falha» um 500,
«bloqueio» um 403 e «erro» um evento de erro no fluxo. Usar `pnpm start`, não
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
- **Sem fluxo no ecrã.** A resposta aparece inteira, depois de lida e
  normalizada. É uma escolha (D-43): não se mostra a meio uma resposta sobre a
  lei que o motor ainda pode recusar.
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
