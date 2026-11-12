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
| Motor real (Lovable) | **Desligado** (`CIVICO_ENGINE=off`). O contrato foi lido no bundle público do portal a 2026-11-12, mas **ainda não houve uma consulta real**: a rede onde isto foi escrito não chega a `lovable.app`. Tudo foi provado contra o motor simulado (`.qa/civico-motor-simulado.mjs`), que fala o mesmo protocolo |
| Testes | 102 (vitest) + `.qa/civico.mjs` (Playwright e axe, desktop e telemóvel) |

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
2. **O corpus é pequeno e os exemplos do portal citam leis revogadas.** A página
   de estado do portal mostrava 8 documentos, de duas fontes. A Lei do Trabalho
   em vigor é a n.º 13/2023 (revogou a 23/2007) e as sucessões regem-se pela
   Lei n.º 23/2019 (revogou o Livro V do Código Civil). Sem estes diplomas no
   corpus, as perguntas mais comuns (trabalho, heranças, INSS) saem sem fonte
   ou erradas. A nossa página não promete cobertura nem números por isso mesmo.
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
3. Abrir `/civico` na pré-visualização e fazer uma pergunta real. É a primeira
   consulta verdadeira — confirmar que a resposta chega, que traz fontes, e ver
   o log `civico.respondida` (ou `civico.falhou` com o `reason`).
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
