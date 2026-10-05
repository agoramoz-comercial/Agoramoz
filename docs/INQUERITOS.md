# Inquéritos — construtor no /admin, partilha por link

A equipa cria inquéritos no `/admin`, publica-os e partilha-os por link ou
código QR. Quem responde não precisa de conta e é anónimo por omissão; só
deixa contacto se quiser, e com consentimento. Os resultados agregam-se no
`/admin` e exportam-se em CSV.

É o primeiro passo do AGORAFORMS: uso interno da AGORAMOZ, sem IA na v1 (a
interface está preparada em `lib/inqueritos/ia.ts`). A arquitetura da
plataforma e o roadmap de 12 meses estão em `docs/AGORAFORMS_ARQUITETURA.md`.

## Estado

| Peça | Estado |
|---|---|
| Construtor, partilha, resultados, CSV (`/admin/inqueritos`) | **Em produção** (`SURVEYS=on`) |
| Página pública `/i/<token>` e `POST /api/inqueritos` | **Em produção**; experiência v2 (Lote R) abaixo |
| Migração 0013 (`survey_links`, regras de `responses` e `activities`, RPC) | **Aplicada** em produção (linhas 23 e 24 de `verificar-estado.sql`) |
| Bloco «Inquéritos» no painel | Visível (`SURVEYS=on`) |

## Experiência de quem responde (v2)

Uma pergunta de cada vez, num palco de ecrã inteiro na superfície `deep` da
marca (grão, malha de contorno parada, título em crómio nas boas-vindas).

| Gesto | Efeito |
|---|---|
| Letras A–T | Escolhem a opção (escolha única avança; múltipla marca/desmarca) |
| Dígitos 1–5 / 0–9 | Escolhem na avaliação / no NPS (o 10 por clique, toque ou setas) |
| Enter | Começa (boas-vindas), segue (campo ou título da pergunta) |
| Ctrl + Enter | Segue a partir do texto longo |
| Setas no título | Avançam e recuam |
| Deslizar (telemóvel) | Esquerda avança, direita volta |
| Segmentos do progresso | Voltam a perguntas vistas (até 12 cartões) |

- **Os atalhos nunca actuam dentro de um campo de texto**, nem com Ctrl, Cmd
  ou Alt; avançar por gesto **nunca envia** — enviar é sempre o botão.
- **Rascunho:** as respostas ficam em `sessionStorage` (morre com o separador),
  **sem contacto nem token**, e são revalidadas contra o spec actual ao ler. Ao
  reabrir: «Retomar onde parou» ou «Descartar respostas». Apaga-se ao enviar.
  A pré-visualização do construtor não guarda nem mede nada.
- **Telemóvel:** acções numa barra fixa acima da zona segura; NPS em 6 + 5
  células de 48 px.
- Código: `components/inqueritos/SurveyRenderer.tsx` e `partes/`; lógica pura
  em `lib/inqueritos/teclas.ts`, `ritmo.ts`, `rascunho.ts` (com testes).

## Colar e transformar (texto → inquérito)

No construtor, antes de «Boas-vindas». Cola-se o inquérito inteiro em texto
(do Word, do Google Docs ou escrito numa mensagem) e recebe-se uma
**proposta** com secções e o seu texto, perguntas com tipo, obrigatoriedade,
subtítulo, opções e condições. Nada é gravado: aplicar muda o construtor e só
«Guardar rascunho» escreve na base.

- **Dois motores, um contrato.** O *analisador local* (determinístico,
  instantâneo, o texto não sai do servidor) e o **Kimi** (Moonshot AI, para
  texto desorganizado). Os dois produzem o mesmo rascunho
  (`lib/inqueritos/importar/esquema.ts`), que passa pela mesma normalização
  (`normalizar.ts`) até um `SpecInquerito` válido.
- **Rapidez:** o `kimi-k2.6` vai com o «thinking» desligado (por omissão vem
  ligado e um inquérito de 48 perguntas passava dos 45 s). Um texto com mais
  de 3000 caracteres é partido entre blocos (`partirTexto`) e as partes são
  pedidas em paralelo (4 de cada vez, 50 s cada, 100 s no total; a página tem
  `maxDuration = 120`).
- **Se o Kimi falhar** (timeout, 4xx/5xx, JSON inválido, sem perguntas), a
  parte que falhou é lida pelo analisador local e o ecrã diz quantas foram
  («O Kimi estruturou 5 de 6 partes…»); se falharem todas, o inquérito inteiro
  vem do analisador local, com o motivo.
- **Limite de 50 blocos:** as secções contam para o limite de 50 (é o limite
  do formato). O que passar é cortado com aviso; um inquérito maior divide-se
  e junta-se com «Juntar ao fim».
- **Estrutura declarada = leitura exacta, sem IA** (`estruturado.ts`). Se o
  texto disser a estrutura, é lida tal como está — instantâneo, sem custo, e
  mesmo com o Kimi escolhido (nem é chamado):
  - **ficha com campos** — «Título:», «Introdução:», «Secção 1:», «Texto da
    secção:», «Pergunta 3:», «Tipo:», «Obrigatória:», «Opções:» (na linha,
    separadas por «;», «|», «/» ou vírgulas, ou em lista nas linhas
    seguintes), «Subtítulo:», «Escala:», «Mín:»/«Máx:», «Condição: P4 = Sim»,
    «Agradecimento:»;
  - **tabela** — colada do Word/Excel (tabulações) ou em Markdown («|»), com
    cabeçalho «Nº | Secção | Pergunta | Tipo | Obrigatória | Opções |
    Subtítulo | Condição».
  O vocabulário de tipos aceita os nomes do construtor e os do Google Forms
  («Resposta curta», «Parágrafo», «Caixas de verificação», «Lista pendente»,
  «Escala linear»…). Cada pergunta mostra «Tipo indicado no texto: …». O
  botão «Inserir modelo com campos» mostra o formato.
- **Listas do Word coladas sem marcas** (opções em linhas soltas, ou com os
  caracteres privados de marca do Word) são lidas como opções.
- **Lógica do Microsoft Forms e do Typeform (D-34):**
  - até **200 perguntas + 50 secções** (as secções não contam para as
    perguntas) — exige a 0014 aplicada (`supabase/aplicar-0014.sql`, linha 25
    de `verificar-estado.sql`);
  - **ramificação:** uma secção com condição esconde-se com as suas
    perguntas; condições «for» e «não for»;
  - **saltos no texto:** «Se Não, passe para a Secção 3», «(Se respondeu Não,
    avance para a pergunta 10)», «Não → Secção 3», «Sim – ir para o fim»,
    «Lógica: Se Não, ir para a Secção 3» — viram «mostrar só se a resposta
    não for…» nos blocos saltados;
  - **Likert/grelha:** «Tipo: Likert» + «Afirmações: a; b; c» (+ «Colunas:»
    ou a escala de 5 pontos por omissão) → uma pergunta por afirmação;
  - **equivalentes:** Declaração → secção; Ranking → escolha múltipla;
    Upload e Hora → texto curto; Legal → Aceito/Não aceito; Escala de
    opinião → avaliação, NPS ou número conforme o intervalo.
- **Revisão antes de aplicar:** resumo (perguntas, secções, obrigatórias,
  condições), a lista numerada com o tipo, **o porquê de cada tipo**, a
  condição em linguagem simples e os avisos. «Aplicar: substituir o
  inquérito» ou «Aplicar: juntar ao fim»; depois de aplicar, «Desfazer
  importação» enquanto não se mexer no resultado. Uma proposta feita antes de
  outras alterações no construtor não se aplica (apagaria essas alterações).
- **Correcções automáticas, sempre avisadas:** limites (50 perguntas, 20
  opções, títulos 300, ajuda 500), escolha com menos de 2 opções passa a
  texto, opções repetidas saem, condições impossíveis saem, e **pedidos de
  dados pessoais** («Qual o seu email?», «Número de telemóvel», NUIT, morada…)
  são retirados — esses dados pedem-se no bloco «Contacto no fim», com
  consentimento.
- **Segurança:** a chave só existe no servidor (`KIMI_API_KEY`); o host é uma
  lista fechada (`api.moonshot.ai` / `api.moonshot.cn`); o texto vai
  delimitado como dado e o que vier do modelo é validado por esquema e nunca
  executado; os logs levam só métricas (motor, caracteres, perguntas, tempo);
  limite de 10 pedidos ao Kimi por utilizador em 10 min (por instância).
  Só papéis com escrita (admin, comercial) usam o painel.

**Ligar o Kimi (do lado do fundador):**
1. Na consola da Moonshot (platform.kimi.ai), gerar uma chave nova e definir
   um **limite de gasto** — é o controlo de custo real.
2. Na Vercel, `KIMI_API_KEY` (Sensitive, Production), sem espaços nem linha
   no fim; depois `SURVEY_AI=kimi`. Conta da plataforma chinesa:
   `KIMI_BASE_URL=https://api.moonshot.cn/v1`. Opcional: `KIMI_MODEL`
   (por omissão `kimi-k2.6`).
3. Redeploy. Sem estas variáveis o painel funciona só com o analisador local.

O texto enviado ao Kimi sai para a Moonshot AI: não colar dados pessoais de
respondentes. A conformidade da transferência requer validação jurídica.

## Ligar (do lado do fundador)

1. **Aplicar a 0013.** No SQL Editor do Supabase, correr
   `supabase/aplicar-0013.sql` inteiro. É idempotente: pode correr outra vez.
2. **Verificar.** Correr `supabase/verificar-estado.sql`; a linha **23** tem de
   dizer `ok`.
3. **Segredo dos links.** Na Vercel, criar `SURVEY_LINK_SECRET` com o resultado
   de `openssl rand -hex 32` (Production e Preview). Não o partilhar nem o pôr
   no Git.
4. **Ligar.** Na Vercel, `SURVEYS=on` e fazer redeploy.
5. **Testar.** Criar um inquérito de teste, publicar, criar um link, responder
   pelo telemóvel, ver a resposta em «Resultados». Apagar o teste não é
   possível pelo ecrã (de propósito): revogue o link e feche o inquérito.

Com `SURVEYS=on` e a 0013 por aplicar, as páginas do admin falham ao ler
`survey_links` — por isso a ordem acima.

## Como funciona

```mermaid
sequenceDiagram
  participant E as Equipa (/admin)
  participant S as agoramoz.com
  participant B as Base (Supabase)
  participant P as Quem responde
  E->>S: cria e publica o inquérito
  S->>B: criar_inquerito / guardar_rascunho / publicar_versao (RLS + papel)
  E->>S: «Criar link»
  S->>S: link_id aleatório; token = HMAC(segredo, link_id)
  S->>B: criar_link(link_id, SHA-256(token))
  S-->>E: endereço /i/<token> e QR (derivados, nunca guardados)
  P->>S: abre /i/<token>
  S->>B: obter_inquerito_publico(SHA-256(token)) — chave de serviço
  P->>S: POST /api/inqueritos {token, submissionId, respostas, contacto?}
  S->>S: valida pelo spec guardado; limites, armadilha
  S->>B: ingest_survey_response(...) — uma transacção
```

- **O token não está guardado em lado nenhum.** A base tem o SHA-256; o
  endereço volta a derivar-se do id do link com o segredo sempre que a equipa
  abre o inquérito. **Trocar `SURVEY_LINK_SECRET` invalida todos os links já
  distribuídos** (os QR impressos incluídos).
- **Versões.** Publicar fixa o texto (a versão publicada é imutável na base) e
  retira a anterior no mesmo instante. Os links apontam para o inquérito, não
  para a versão: depois de publicar, os links activos mostram a versão nova.
  As respostas ficam presas à versão que a pessoa viu. As perguntas agregam-se
  pela **chave**, que o construtor gera e nunca muda — corrigir um título não
  parte a série.
- **Estado de um link:** revogado → expirado → tecto atingido → aberto. Fechar
  o inquérito fecha todos os links; reabrir volta a abri-los.

## Dados pessoais

- **Anónimo por omissão.** Sem contacto, a resposta não identifica ninguém. A
  base guarda o SHA-256 do IP e do user-agent (como no diagnóstico), para
  detectar abuso — não para identificar.
- **Contacto só com email e consentimento.** O texto do consentimento é
  escrito no construtor e é **exactamente** o que fica em `consent_records`,
  com uma versão derivada do texto. Rever o texto antes de publicar.
- **O email não é verificado.** Qualquer pessoa com o link pode escrever o
  email de outra. Por isso o consentimento é **auto-declarado** e só se regista
  para o contacto que a resposta cria; a um contacto que já existia no CRM
  nunca se junta consentimento, e a actividade fica marcada
  `contacto_existente`. Não usar estes consentimentos como prova para
  campanhas sem confirmação por email (dupla confirmação — fora da v1).
- **Entra no CRM como contacto e actividade, nunca como oportunidade.** Um
  contacto que já existe **não é reescrito** — mantém-se o que o CRM tinha.
- **Exportação:** o CSV sem contactos está disponível a toda a equipa; com
  contactos (`?contacto=1`) só para admin e comercial. Cada exportação fica
  na auditoria (`inquerito.exportar`, com ou sem contactos); sem esse registo,
  não há ficheiro.
- **Endereços e QR** só aparecem a admin e comercial: um link é a capacidade
  de responder.
- Registar o consentimento não é declarar conformidade legal. O texto e o uso
  dos dados precisam de revisão qualificada antes de recolher contactos fora
  da equipa.

## Segurança

| Ameaça | Defesa |
|---|---|
| Adivinhar links | Token de 32 bytes HMAC; 404 igual para «não existe» e «desligado» |
| Token em logs ou analítica | Vai no corpo do POST; `/i` é caminho privado na atribuição; `no-referrer`, `noindex`, `no-store` em `/i` |
| Spam de respostas | Na base, durável: 50 respostas por link e IP em 10 min, e o tecto por link. Na aplicação, em memória: 20 pedidos por IP e 600 por link em 10 min (o de link só conta links que existem). Armadilha `fax`; revogar |
| Respostas forjadas | Validadas pelo spec guardado na base, nunca pelo que o browser diz; a ingestão recusa chaves desconhecidas |
| Injecção de fórmulas no CSV | Células que começam por `= + - @`, tabulação ou retorno ficam texto |
| Texto do inquérito com HTML | Mostrado sempre como texto (React escapa; sem `innerHTML`) |
| Edição do diagnóstico por aqui | Todas as RPC recusam `kind <> 'survey'` |

O limite em memória vale por instância da Vercel; o da base vale para todas.
Uma sala com mais de 50 pessoas atrás do mesmo router chega ao limite por IP
em 10 minutos — para eventos grandes, criar um link por grupo.

**Desligar depois de usar:** para parar de receber respostas, **feche os
inquéritos** ou revogue os links. Pôr `SURVEYS=off` esconde o ecrã; enquanto
`SURVEY_LINK_SECRET` existir, o painel continua a tirar as respostas de
inquérito das contagens de leads.

## Decisão registada: o construtor é a excepção ao «admin sem estado de cliente»

O resto do admin funciona sem JavaScript, com o estado no URL (D-26). O
construtor não: editar perguntas, opções e condições com uma ida ao servidor
por tecla seria inutilizável. O estado vive no browser até «Guardar»; a
Server Action valida tudo de novo pelo mesmo esquema da página pública, e só
as funções da 0013 escrevem. Ver D-31.

## Limites da v1

- Desistência por passo é uma **estimativa** (eventos do browser; bloqueadores
  de anúncios cortam-nos). O total de respostas é exacto.
- Respostas em texto e datas só se lêem na exportação CSV.
- Sem embed em iframe, sem edição de respostas, sem apagar inquéritos pelo ecrã.
- Sem IA: `lib/inqueritos/ia.ts` define a interface (resumo de respostas sem
  PII, respostas tratadas como dados e não instruções); não há implementação.

## Ficheiros

| Onde | O quê |
|---|---|
| `lib/inqueritos/spec.ts` | Formato `survey.v1` (zod) — a única definição |
| `lib/inqueritos/respostas.ts`, `logica.ts`, `cartoes.ts` | Validação e visibilidade, iguais no browser e no servidor |
| `lib/inqueritos/token.ts`, `partilha.ts`, `qr.ts`, `links.ts` | Token, endereços, QR, estado dos links |
| `lib/inqueritos/csv.ts`, `resultados.ts` | Exportação e leitura dos resultados |
| `lib/inqueritos/importar/` (`esquema`, `local`, `normalizar`, `kimi`, `servidor`) | «Colar e transformar»: contrato, analisador local, normalização, cliente Kimi, escolha do motor (D-33) |
| `lib/admin/importar-inquerito.ts`, `components/admin/inqueritos/ImportarTexto.tsx` | Server Action (sem escrita) e painel de revisão |
| `supabase/migrations/0013_inqueritos.sql` | Tabela, regras, RPC (= `supabase/aplicar-0013.sql`) |
| `.qa/inqueritos-comportamento.sql` | 25 cenários SQL num Postgres real |
| `.qa/inqueritos-publico.mjs`, `.qa/inqueritos-admin.mjs` | Playwright + axe a 390/768/1440 |
