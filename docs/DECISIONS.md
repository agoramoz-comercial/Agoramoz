# DECISIONS — decisões arquiteturais e premissas

Formato: decisão, contexto, alternativas, consequência.
As premissas assinaladas **[P]** foram assumidas por mim na ausência de
instrução, pelo critério mais conservador, e podem ser revertidas.

## D-01 — PostgreSQL/Supabase é o sistema de registo
O pedido público termina depois do COMMIT. Alternativas descartadas: ficheiros,
fila externa como fonte de verdade, n8n como dono de dados.
**Consequência:** a disponibilidade da captura passa a depender da base de
dados. Ver R-01 em `GAPS.md` — os projetos estão `INACTIVE`.

## D-02 — Transactional Outbox em vez de webhook no caminho crítico
A escrita do lead e a intenção de processar acontecem na mesma transação.
Alternativa descartada: `fetch(webhook)` na rota — cria perda silenciosa
quando a VPS está indisponível.
**Consequência:** entrega at-least-once; consumidores têm de ser idempotentes.

## D-03 — Scoring determinístico e versionado
`scoring_version` e `ruleset_version` gravados em cada diagnóstico.
**Consequência:** um diagnóstico antigo é sempre reproduzível. Alterar regras
não reescreve o passado.

## D-04 — A IA só redige
Não calcula score, não escolhe tier, não altera severidade, não acede à rede,
não usa ferramentas. Recebe evidência e findings; devolve JSON validado.
**Consequência:** custo e latência de IA fora do caminho crítico.

## D-05 — Aprovação humana antes de qualquer envio
Constraint na base, não apenas na aplicação.
**Consequência:** introduz latência humana. Métrica `review_age` para vigiar.

## D-06 — Documento é página primeiro, PDF derivado
Mesma apresentação versionada (`template_version`, `renderer_version`).
**Consequência:** o PDF precisa de um renderizador; corre na VPS, não em
funções serverless.

## D-07 — Admin no mesmo repositório e mesmo deploy
Reutiliza os 499 linhas de tokens em `app/globals.css` e os 14 primitivos em
`components/ui/`.
**Consequência:** o bundle público não pode importar código do admin;
verificar com análise de bundle.

## D-08 — Migrações versionadas e aditivas
Nenhuma alteração destrutiva sem backup verificado. Coluna só é removida
depois de o código deixar de depender dela.

## D-09 — Papéis mínimos **[P]**
`admin`, `comercial`, `leitura`. Assumido na ausência de organigrama.
Reversível: é uma coluna e políticas RLS.

## D-10 — Política de criação de oportunidade **[P]**
`questionnaires.creates_deal` controla se uma resposta cria `deal`. Assumo
`true` para o diagnóstico e `false` para surveys genéricas.

## D-11 — Resolução de organização só com evidência **[P]**
Associo `contact` a `organisation` apenas quando o domínio do e-mail de
trabalho corresponde a `normalized_domain` existente. Sem heurísticas sobre o
nome — «Agora, Lda» e «AGORA LDA» não são fundidos automaticamente.
**Consequência:** duplicados possíveis, resolvidos manualmente no admin.
Preferi duplicar a fundir erradamente.

## D-12 — Chave de idempotência **[P]**
Derivada no servidor a partir de `normalized_email` + `questionnaire_version_id`
+ `input_fingerprint` (hash estável das respostas normalizadas). Não confio
num valor enviado pelo cliente.
**Consequência:** uma segunda submissão idêntica devolve o mesmo resultado
observável; uma submissão com respostas diferentes cria novo registo.

## D-13 — Retenção **[P]**
Não defino prazos sem decisão de negócio. `DATA_RETENTION.md` fica com a
estrutura e os campos por preencher, não com números inventados.

## D-14 — Consentimento como registo próprio
`consent_records` com texto e versão, não um booleano na tabela de contactos.
**Consequência:** é possível provar *o que* foi consentido e *quando*.

## D-15 — Tier deixa de ser devolvido ao cliente
Corrige T-02. A resposta passa a `{ ok, correlation_id }`.
**Consequência:** o evento de analytics `form_completed` perde o campo `tier`.
É uma alteração de comportamento observável — carece de confirmação sua.

## D-16 — Civicportal fora de escopo
Não inspecionado, não alterado. Mantém-se assim até instrução explícita.

## D-17 — A persistência é um interruptor explícito, não uma inferência
`DIAGNOSTIC_PERSISTENCE` é `required` ou `off`. Não é inferido da presença das
chaves do Supabase. Inferir tornaria a maior falha do sistema — aceitar um lead
e perdê-lo — num acidente silencioso de configuração: bastava alguém apagar uma
variável no painel para o formulário passar a descartar submissões devolvendo
«obrigado». O valor por omissão é `off` para que um deploy sem chaves não parta
o formulário, e o modo `off` regista um aviso a cada submissão.
**Consequência:** passar a produção a `required` é uma edição consciente, e
esquecer-se dela aparece no log em vez de aparecer na facturação do mês
seguinte.

## D-18 — Falha de gravação devolve 503, nunca 200
O cliente vê erro e pode voltar a tentar. Repetir é seguro porque a chave de
idempotência é derivada do conteúdo (D-12): a segunda submissão idêntica é
reconhecida e não duplica o lead.
**Consequência:** trocamos um «obrigado» falso por um erro verdadeiro. É a
troca certa — um lead que a pessoa sabe que não passou é um lead que ela volta
a enviar ou envia por outro canal.

## D-19 — A resposta é idêntica para submissão nova e para repetição
A função de ingestão distingue as duas, o log distingue as duas, a resposta HTTP
não. Dizer «já tínhamos isto» não serve o utilizador e serve quem sonda:
permitiria descobrir, e-mail a e-mail, quem já pediu um diagnóstico.

## D-20 — `workEmail` não entra nas respostas normalizadas
A identidade vive em `contacts`. `response_answers` existe para agregar
respostas e não precisa de identificar ninguém, por isso o e-mail é removido
antes de lá chegar. Continua a entrar na impressão digital e na chave de
idempotência — aí é **usado**, não **guardado**.
**Consequência:** uma consulta de análise sobre respostas não tem PII para
vazar, e o apagamento de um contacto não deixa o e-mail espalhado por linhas de
resposta.

## D-21 — Os achados têm uma única fonte de verdade
`diagnostics.findings` é a coluna de registo. `evidence_bundle` guarda o resto
do pacote (evidência, versões, numerais admissíveis) e **não** repete os
achados. Duas cópias do mesmo JSON são duas cópias que um dia discordam.
**Consequência:** quem precisar do pacote completo recompõe-o com
`{ ...evidence_bundle, findings }`.

## D-22 — O texto de consentimento guardado vem da mesma fonte que o formulário
`consentTextFor()` lê `content/countries/*.ts`, que é o que o formulário
renderiza, e a versão é o SHA-256 do próprio texto em vez de um número escrito
à mão. Uma versão manual é uma versão que alguém se esquece de subir: o texto
muda, o número fica, e os registos passam a dizer que se consentiu uma coisa
quando se consentiu outra.
**Consequência:** mudar uma vírgula no texto muda a versão sem ninguém ter de
se lembrar, e os três países guardam o texto que cada um mostrou — o de
Portugal invoca o RGPD, o do Brasil a LGPD, o de Moçambique fica pelos direitos
em termos gerais.

## D-23 — O browser nunca recebe cliente Supabase nem token
`SUPABASE_ANON_KEY` é variável de servidor, sem prefixo `NEXT_PUBLIC_`. A chave
é desenhada para poder ser pública; não a publicar é o que permite que não
exista sessão em `localStorage`, nem token em JavaScript, e que a CSP continue
com `connect-src 'self'` — o admin não fala com domínio nenhum a partir do
browser.
**Consequência:** todo o ecrã administrativo é renderizado no servidor e toda a
mutação é Server Action. Um componente de cliente que precisasse de ler a base
não tem por onde; isso é a restrição a funcionar, não um obstáculo.

## D-24 — A aplicação não escreve em tabela nenhuma
Corrige T-15. Onze funções `security definer` (migração 0006) verificam o
papel, derivam o autor de `auth.uid()` em vez de o aceitarem como argumento,
verificam a revisão onde faz sentido e escrevem a auditoria na mesma transação.
As políticas de escrita directa foram removidas.
**Consequência:** um botão escondido deixa de ser um problema de segurança — o
ecrã decide o que mostrar, a base decide o que acontece. E não existe caminho
que altere estado sem deixar rasto.

## D-25 — `/admin/entrar` deixa de devolver 404
Reverte parte de uma decisão anterior. O argumento antigo — «um 401 confirma
que existe ali uma área reservada» — era correcto enquanto não havia porta
nenhuma; a partir do momento em que existe autenticação, alguma página tem de
responder. O que o substitui: limite de tentativas por origem **e** por conta,
erro único que não distingue conta inexistente de palavra-passe errada,
`X-Robots-Tag: noindex`, e auditoria de cada entrada. Todo o resto de `/admin`
continua a devolver 404 sem sessão.

## D-26 — Estado da vista no URL, não em estado de cliente
Filtros, ordenação e paginação do admin viajam em parâmetros de URL.
**Consequência:** o admin carrega praticamente sem JavaScript — só a navegação
é componente de cliente, e apenas porque `aria-current` precisa do caminho — e
qualquer vista é uma ligação que se envia a um colega.

## D-27 — Paginação sem contagem total
`count: 'exact'` custa uma varredura completa por cada página vista. Pede-se um
registo a mais do que cabe no ecrã, e a existência desse registo é o que revela
a página seguinte.
**Consequência:** não se mostra «página 3 de 47». Ninguém precisa de saber que
há 4 812 contactos para ver os próximos vinte.

## D-28 — Diagnóstico em carrossel: uma pergunta por cartão
Pedido do fundador: que o público-alvo «não se canse». O formulário de cinco
passos (14 campos, 13 obrigatórios, uma área de texto obrigatória a meio)
passou a nove cartões, sete de toque único, com o contacto no fim.
- **Avanço automático** só no gesto deliberado (clique, Enter, Espaço) e
  anunciado por escrito antes — nunca nas setas, que percorrem as opções.
  Cumpre a excepção do WCAG 3.2.2 em vez de a ignorar.
- **O texto livre passou a opcional** (máximo 1500, sem mínimo). A pontuação
  NÃO mudou: vazio vale o mesmo que curto (+2). `SCORING_VERSION` sobe na
  mesma, porque «clareza +2» passa a poder querer dizer «não escreveu».
- **A regra `CONTEXTO_INSUFICIENTE` fica na versão 1**, e continua a disparar
  sem texto. O plano previa calá-la sem texto; recusado: sem texto o contexto
  É insuficiente, e esconder isso à equipa seria tirar-lhe informação verdadeira.
- **A faixa de investimento continua sempre perguntada.** O plano previa
  saltá-la para quem «está a recolher informação» e gravar «a definir»;
  recusado: seria gravar uma resposta que a pessoa não deu.
- **Começa onde a pessoa está**: `?pais=`/`?setor=` válidos ou rascunho levam
  ao primeiro cartão por responder; um setor que não é do mercado é recusado.
- **Medição:** `step_viewed` novo, uma vez por cartão; o `stepId` passa a ser
  o id do cartão (`pais`, `faixa`…). Relatórios de funil anteriores a
  2026-09-30 usam os títulos antigos dos cinco passos e não se comparam
  passo a passo com os novos.
**Consequência:** o pedido à API, o rascunho sem PII e o ecrã final não
mudaram; a rota do servidor não precisou de uma linha.

## D-29 — Cal.com por link e webhook assinado, não pelo embed
A marcação é uma ligação para `CAL_ORIGIN/CAL_LINK?metadata[ref]=…`, aberta
noutro separador, em vez do script de embed do Cal.
- **Porquê:** o embed obrigava a abrir a CSP (`script-src`, `frame-src`) a
  JavaScript de terceiros em todas as páginas do diagnóstico; o link não abre
  nada. E funciona igual no Cal alojado e numa instalação própria.
- **Ligação à oportunidade por `ref` aleatório**, guardado em hash
  (`reunioes_intencoes`) — nunca o id da oportunidade no URL, nunca PII.
- **Verificação pendente:** a documentação do Cal mostra `metadata[...]` a
  chegar ao webhook a partir do embed; a primeira marcação de teste confirma
  que o link directo também o passa (ver `docs/AGENDAMENTO.md`, passo 7).
- **Eventos do News** vão para `analytics_events` (`origin 'servidor'`) sem o
  URL nem o texto — o painel conta análises e prioridade, não guarda o que se lê.
**Consequência:** com `SCHEDULING=off` nada muda para quem visita o site;
ligar é aplicar a 0012, pôr três variáveis e criar o webhook.

## D-30 — Painel de comando: contagens exactas, dias de Maputo, nada inventado
O `/admin` passou de cinco contagens a um painel com período (7/30/90 dias no
URL), comparação com o período anterior, leads por dia, CRM por fase, funil do
pixel, canais, desistência por cartão, Moz News, reuniões Cal.com e ERP.
- **Contagens exactas, não linhas:** o PostgREST do Supabase corta leituras em
  `max_rows` (1000) sem erro. Cada número é um `count: 'exact', head: true`;
  só a série diária lê linhas, paginadas, com tecto de 20 000 — acima dele o
  bloco diz «erro» em vez de mostrar um número incompleto.
- **Dias de calendário de Maputo** (UTC+2, sem hora de verão), hoje incluído
  até agora. O preço — hoje a meio compara com dias inteiros — está escrito no
  cabeçalho do painel.
- **Uma fonte por ligar diz «por activar» e o passo que falta**; uma leitura
  que falha diz «erro». Nenhum dos dois mostra zero.
- **Sessão do staff, sujeita à RLS.** Nunca a chave de serviço.
- **Cor:** uma série em verde `#007a43`, o contexto em cinzento `#85858d`
  (≥ 3:1, validado para daltonismo), negativo em `#b82200`; texto verde em
  `#006b3a` (AA sobre giz e giz-2). Toda a figura tem tabela.
- **ERP:** a porta existe (`lib/erp/porta.ts`, `docs/ERP.md`); o adaptador não,
  porque o sistema não foi escolhido. O painel mostra «Por ligar».
- **Pré-visualização de QA** em `/qa/painel`: só com `ADMIN_PREVIEW=on` fora de
  produção; números de exemplo, assinalados no topo.
**Consequência:** ~60 contagens em paralelo por visita ao painel. Se crescer,
o passo seguinte é uma vista ou RPC agregada (migração própria).

## D-31 — Inquéritos: anónimos por omissão, link por HMAC, construtor com estado
A equipa cria inquéritos no `/admin` e partilha-os por link e QR
(`docs/INQUERITOS.md`). Decisões do fundador: uso interno, anónimo por
omissão, contacto só com consentimento, sem IA na v1, link recuperável.
- **Link recuperável sem guardar o token:** `token = HMAC(SURVEY_LINK_SECRET,
  link_id)`; a base guarda o SHA-256. Mostra-se de novo derivando-o.
  **Consequência:** trocar o segredo invalida todos os links distribuídos.
- **Respostas sem contacto:** `responses.contact_id` passou a aceitar nulo,
  com a regra «contacto OU link»; `activities` ganhou `contact_id` e
  `deal_id` passou a aceitar nulo, com a regra «oportunidade OU contacto».
  O diagnóstico continua a gravar sempre contacto e oportunidade.
- **CRM sem atropelos:** um contacto de inquérito é só inserido, nunca
  sobrescreve o que existe, e nunca cria oportunidade.
- **Consentimento auto-declarado** (revisão ECC): o email não é verificado,
  por isso o consentimento só se regista para o contacto que a resposta cria
  — nunca se junta «prova» a um contacto que já existia.
- **Revisões ECC aplicadas:** idempotência repetida depois do bloqueio do link;
  limite durável por link e IP na base; spec medido em bytes de texto e com
  chaves únicas; exportação auditada; chaves já publicadas nunca reutilizadas
  pelo construtor.
- **Idempotência por submissão, não por conteúdo:** a chave junta o link e um
  `submissionId` gerado no browser. Duas pessoas anónimas com respostas
  iguais são duas respostas; a mesma submissão repetida é uma.
- **Fora dos leads:** com `SURVEYS=on`, o painel tira as respostas de
  inquérito das contagens de submissões e mostra-as num bloco próprio.
- **O construtor guarda estado no browser** — a excepção deliberada a D-26.
  O servidor revalida tudo pelo mesmo esquema; só as RPC da 0013 escrevem.
- **Chaves estáveis:** pergunta e opção têm chaves geradas que nunca mudam;
  os resultados agregam por chave através das versões publicadas.
**Consequência:** com `SURVEYS=off` nada muda no site nem no painel; ligar é
aplicar a 0013, pôr `SURVEY_LINK_SECRET` e `SURVEYS=on`.

## D-32 — AGORAFORMS: monólito modular agora, microserviços por gatilho

O fundador pediu a arquitetura completa da plataforma de inquéritos
(microserviços, Kubernetes, roadmap de 12 meses). Decisão: documentar a
arquitetura-alvo inteira (`docs/AGORAFORMS_ARQUITETURA.md`) mas **construir
como monólito modular** sobre Next.js + Supabase + Vercel, com fronteiras de
módulo explícitas, eventos pela outbox da 0004 e API versionada.
- **Porquê:** com 1–2 pessoas, microserviços e K8s acrescentam custo fixo e
  falhas distribuídas sem volume que os justifique; uma transação Postgres
  hoje dá consistência que serviços separados teriam de reconstruir.
- **Gatilhos medidos para extrair serviços:** ≥ 2 equipas em paralelo, SLA
  contratual ≥ 99,9 %, residência de dados não coberta, ou p95/volume acima
  dos limiares da secção 8 do documento.
- **Primeiro passo de produto:** a experiência de resposta (Lote R2), não a
  infraestrutura.
**Consequência:** cada módulo escreve só nas suas tabelas, por RPC com
`exigir_papel` + `audit_log`; extrair um serviço passa a ser mover um módulo.

## D-33 — «Colar e transformar» com o Kimi, analisador local como recurso

Revê D-31 («sem IA na v1») por decisão do fundador: o construtor ganha um
painel que transforma texto colado num inquérito, com o **Kimi** (Moonshot AI)
como motor e um **analisador local determinístico** sempre disponível.
- **Um contrato, uma normalização:** os dois motores produzem o mesmo
  rascunho tolerante; só `normalizar` decide o spec final, que passa a
  validação completa. O modelo nunca escolhe chaves nem escreve na base.
- **Proposta, não escrita:** a Server Action devolve uma proposta; o admin
  revê (com o porquê de cada tipo) e o «Guardar» existente continua a ser o
  único caminho de escrita.
- **Falha sem bloquear:** qualquer falha do Kimi cai para o local e é dita no
  ecrã.
- **Segredo só na Vercel:** `KIMI_API_KEY` sensível; host numa lista fechada;
  erros e logs só com códigos e métricas. A chave colada no chat durante o
  pedido foi tratada como comprometida e não usada.
- **Dados pessoais:** perguntas que pedem contacto são retiradas da proposta;
  o texto enviado ao fornecedor é do admin, não de respondentes.
**Consequência:** com `SURVEY_AI=off` (omissão) o painel funciona só com o
analisador local; ligar o Kimi é criar a chave e `SURVEY_AI=kimi`.

## D-34 — Inquéritos com a lógica do Microsoft Forms e do Typeform

O fundador colou um inquérito com mais de 50 blocos e pediu «a lógica do
Microsoft Forms e do Typeform».
- **Limites do Forms:** as secções deixam de contar para as perguntas —
  200 perguntas + 50 secções (250 blocos), spec até 256 KB. A base acompanha
  pela 0014 (só `spec_de_inquerito_valido`), aplicada pelo fundador; até lá,
  gravar mais de 50 blocos é recusado pela base.
- **Uma só regra de visibilidade** (`percursoDeVisibilidade`, logica.ts),
  usada pelo browser, pelo servidor e pela pré-visualização — antes estava
  em três sítios.
- **Ramificação por secção:** uma secção escondida esconde as suas perguntas
  até à secção seguinte (o «ir para a secção» do Forms, o «logic jump» do
  Typeform). Muda o significado de condições em secções já existentes — uso
  interno, poucos inquéritos.
- **Condição «não for»** (`diferente`): sem resposta conta como «não é»; com
  a pergunta de origem escondida, conta como cumprida (o salto nunca
  disparou), para os saltos encadeados levarem ao destino certo. Revisão ECC.
- **Secção sem perguntas à vista:** `visiveis` não a mostra como cartão vazio
  (vários saltos da mesma pergunta para secções diferentes). Uma secção sem
  perguntas por desenho (declaração) fica. Não muda o que o servidor aceita:
  secções não têm resposta.
- **Saltos escritos em texto** («Se Não, passe para a Secção 3», «Não →
  Secção 3», «ir para o fim») viram condições «não for» nos blocos saltados.
- **Tipos que não existem aqui** (Likert/grelha, ranking, upload, hora,
  legal) importam-se para o equivalente mais próximo, e a proposta diz o que
  se fez. A Likert expande-se numa pergunta por afirmação, com a mesma escala.

## D-35 — AGORAMOZ News: redacção interna → jornal público, com publicidade medida

O fundador pediu que o News passe a sistema interno que alimenta um jornal
público (WSJ/Bloomberg), com gosto, partilha e publicidade em «outdoor»
(Times Square/Nasdaq) que leve ao serviço e conte quem agiu.
- **Rascunho + aprovação humana** (decisão dele): a análise nunca publica
  sozinha; publicar exige papel com escrita e a confirmação «Revi…».
- **O motor passa para o /admin** com `NEWS_BLOG=on`: o custo de IA deixa de
  estar exposto ao público.
- **Gosto anónimo, um por browser** (decisão dele): código aleatório no
  `localStorage`, hash por artigo/anúncio no servidor; sem cookies, sem conta.
- **Só anúncios da AGORAMOZ na v1** (decisão dele): terceiros exigem
  contrato, preço e facturação — lote próprio.
- **O clique passa pelo servidor** (`/api/news/anuncio/<id>` → 303 para o
  destino guardado, com UTM): conta mesmo sem JavaScript, nunca é um
  redireccionamento aberto, e liga o anúncio às conversões pela
  `utm_campaign`. As conversões são uma estimativa e o painel di-lo.
- **Sem cotações nem números inventados** na faixa a correr: só os nossos
  títulos. Sem imagens de stock: a imagem de cada artigo é tipográfica.
- **Revisões ECC** (BD, segurança, React/a11y, SEO, marketing) aplicadas
  antes do primeiro deploy: ver o commit «News V5b».

**Consequência:** com `NEWS_BLOG=off` (omissão) nada muda para o público.
Ligar é aplicar a 0015, confirmar as linhas 26–27 e pôr `NEWS_BLOG=on`.

## D-36 — Espaço CEnO: o pipeline de oportunidades privado da Chief Energy Officer

O fundador pediu um ambiente de trabalho no `/admin` para a Chief Energy
Officer, com a estrutura do documento «Opportunity Operating System», que
**só ela** possa ver.
- **Privacidade na base, não na interface** (decisão dele: «só ela», nem o
  CEO nem os admins). Cada linha tem `dono`; a RLS só devolve as da própria
  conta, e só com o módulo `energia` (`acessos_modulo`). Escreve-se apenas
  por RPC `security definer`, que verifica o módulo e o dono. Sem o módulo,
  `/admin/energia` dá 404 e o menu não mostra a entrada.
- **O `audit_log` não leva conteúdo**, só a acção e o id, porque toda a
  equipa o lê.
- **Papel `comercial`** no resto do admin (decisão dele).
- **Separado do CRM comercial,** como o documento pede («pipeline separado do
  pipeline comercial comum»). O CRM actual é visível a toda a equipa e não
  serve para dados privados.
- **O documento recomenda não começar por software próprio.** O fundador
  pediu o espaço, por isso a v1 é deliberadamente pequena:
  - sem integrações;
  - a sala documental guarda ligações para SharePoint ou Drive, não ficheiros;
  - o agente de IA e as automações por email ficam para a fase 2, depois das
    4 semanas de validação.
- **As probabilidades por etapa são um pressuposto declarado,** não dado
  medido, e o manual diz como recalibrá-las.
- **A palavra-passe dada no chat é só provisória:** uma marca em
  `app_metadata` obriga a escolher outra no primeiro acesso, e a troca
  reautentica a pessoa. Nenhuma palavra-passe entra no Git.

**Consequência:**
- Se a conta dela se perder, a recuperação é por SQL do fundador.
- O CEO só vê o que ela partilhar: o memo em PDF.
- Activar é: aplicar a 0017, confirmar a linha 29, criar a conta e correr o
  bloco de `docs/ENERGIA.md`.

## D-37 — Gabinete do Fundador: o Work Operating System v1, privado do fundador

O fundador colou o documento «AGORAMOZ Work Operating System» e pediu que essa
arquitectura existisse no `/admin`, visível **só para ele**. Escolheu «5
registos + painéis».
- **Mesmo padrão do Espaço CEnO (D-36), outro módulo (`direcao`).** Privacidade
  na base: `dono` em cada linha, RLS só de leitura, escrita só por RPC que
  verifica módulo e dono, `audit_log` sem conteúdo e escondido da equipa. Sem o
  módulo, `/admin/gabinete` dá 404 — também para administradores e para a CEnO.
- **Peças de ecrã partilhadas** (`components/admin/espaco/`) em vez de copiar
  as do CEnO; o CEnO passou a importá-las, com a QA dele a provar que nada
  mudou.
- **Tensão com o documento:** ele recomenda Microsoft 365 e «não construir uma
  plataforma personalizada agora». A v1 fica deliberadamente pequena — cinco
  registos dentro do admin que já existe, sem integrações nem automações,
  ficheiros por ligação https. O registo técnico fica para a v2.
- **Nada inventado:** sem saldo de partida não há caixa; sem decisões
  recorrentes fechadas, a métrica de delegação diz o que falta; sem câmbio
  entre moedas; o pipeline do CRM aparece em contagem porque o CRM não guarda
  valor.

**Consequência:**
- Os números são os que o fundador registar; o painel serve a reunião
  executiva semanal se for actualizado antes dela.
- Activar é: aplicar a 0018, confirmar a linha 30 e correr o bloco de
  `docs/GABINETE.md` (cria o perfil `admin` só se faltar; nunca rebaixa).

## D-38 — Website Final 2026: conteúdo novo, design igual, só páginas com substância

O fundador pediu que o documento mestre «Website Completo Final 2026» fosse
implementado «sem mudar o design». O mapa e o checklist estão em
`docs/WEBSITE_2026.md`.
- **Design congelado.** Mudou o conteúdo. As páginas novas (`/setores`,
  `/seguranca-qualidade`, `/faq` e as duas soluções novas) reutilizam
  templates existentes. `/setores` fica só no rodapé, porque o mega-menu já
  tem «Setores».
- **URLs mantidos.** O documento sugere `/automacao`, `/infraestrutura`, etc.
  Os nossos `/solucoes/<slug>` já estão indexados (medição SEO do dia 7, `4153e0b`); renomear
  perdia esse sinal.
- **Páginas que o documento lista e que não se publicam agora**, pela regra
  dele «nenhuma página vazia ou em preparação» e pela «prova antes do claim»:
  - `/casos` e `/demonstracoes`: não há casos autorizados;
  - `/insights`, `/guias` e `/calculadoras`: não há conteúdo;
  - `/equipa`: os perfis vivem em `/sobre`;
  - `/cookies` e `/termos`: precisam de revisão jurídica por mercado, e não
    se inventa texto legal;
  - páginas por sector além de energia-mineração: o documento dá uma linha
    por sector e diz para não publicar especialização sem processo, prova e
    capacidade.

  Os setores sem página dizem que são avaliados pelo diagnóstico, nunca «em
  preparação».
- **Formulário: «juntar os dois»** (decisão do fundador). Os 9 cartões e a
  pontuação ficam, e entram os campos do documento como opcionais e
  informativos (`diagnostico-v2`).
- **Conformidade:** a privacidade e a segurança usam a copy segura do
  documento, sem declarar conformidade (RGPD, LGPD ou a lei moçambicana)
  enquanto não houver revisão qualificada.

**Consequência:**
- «Casos» e «Insights» entram na navegação quando houver conteúdo autorizado;
  `/cookies` e `/termos` entram depois da revisão jurídica.
- Os KPIs do documento são critérios internos de teste e ainda não foram
  medidos.

## D-40 — Admin como consola de trabalho: «Hoje» primeiro, CRM operacional (0019)

O fundador pediu um admin «digno de uma empresa que quer prosperar», ao nível
das consolas da Palantir e da Bloomberg. O mapa está em `docs/CRM.md`.
- **`/admin` abre o «Hoje»** (o trabalho de cada pessoa). O painel analítico
  passa para `/admin/painel`, e cada número leva à lista que o explica.
- **Escolhas do fundador** (AskUserQuestion, 11/10/2026):
  - valor, moeda, data prevista de fecho e próxima acção;
  - motivo de perda obrigatório, de uma lista fechada;
  - **sem probabilidade nem previsão ponderada**;
  - dono manual com «Atribuir a mim»;
  - diagnóstico aprovado ou rejeitado move a oportunidade só se ela estiver em `novo`.
- **Uma só migração (0019) para o fundador aplicar.** A função de registo das
  exportações CSV entrou na 0019 (parte 3) antes de esta ser aplicada, em vez
  de abrir uma 0020.
- **Sem câmbio:** os valores somam e ordenam por moeda.
- **Ecrãs que degradam:** sem a 0019, o que dela depende diz «por activar»
  com o passo que falta. Nunca zeros inventados.
- **Teclado:** os atalhos de uma tecla desligam-se na ajuda (WCAG 2.1.4).

**Consequência:**
- Até o fundador aplicar a 0019 (três partes, linha 31 em «ok»), a próxima
  acção, o valor, o motivo, as paradas, a pesquisa trigram e a exportação
  ficam «por activar».
- A auditoria das exportações é de detecção; restringir leituras do papel
  `leitura` seria uma decisão de RLS.

## D-41 — `/projetos`: demonstração TerraBuild com dados fictícios, fora do índice

O fundador pediu a página de projetos a partir do conceito «AGORAMOZ
TerraBuild» (terreno, arquitectura, agricultura, capital e execução num
gémeo digital), como **demo com dados fictícios que não guarda nada**. O mapa
está em `docs/TERRABUILD.md`.
- **Escolhas do fundador** (AskUserQuestion, 12/10/2026):
  - Three.js próprio, não Cesium nem Google 3D Tiles;
  - entrada no menu com selo «Demo»;
  - demonstração completa;
  - assistente com respostas guiadas locais, sem modelo de IA.
- **Fora do índice:** `noindex` e fora do sitemap. Números fictícios não podem
  aparecer em pesquisas como se fossem da AGORAMOZ. Volta a indexar-se só com
  um projecto real e autorizado.
- **Nada guardado:**
  - o que se escreve ou escolhe não sai do browser;
  - a única coisa que sai é o evento anónimo `project_demo_interaction`
    (`projectId` de uma lista fechada e `action`, mais o caminho e o canal de
    origem saneados que todo o evento do site leva), e a página di-lo;
  - «Submeter um terreno» é simulado e não pede dados pessoais. O canal real
    continua a ser o diagnóstico.
- **Sem linguagem de oferta:**
  - o botão é «Simular financiamento» e «Ver plano de capital», nunca «Investir»;
  - pagamentos só por instituição autorizada, com KYC/AML;
  - nenhum instrumento financeiro é anunciado.
- **3D só a pedido:**
  - `next/dynamic` sem SSR, cerca de 257 KB gzip, fora do carregamento inicial;
  - a planta 2D é a vista por omissão e o recurso sem WebGL;
  - a CSP não muda, porque nada vem de terceiros.
- **Excepção à regra monocromática:** três cores de camada validadas para
  daltonismo (água, eléctrica, talhões). O risco é textura; obra em curso é
  contorno tracejado.
- **Navegação:** o selo vem antes do clique. Na gaveta e no rodapé o rótulo é
  «Projetos (demo)»; na barra, «Projetos» com um quadrado na cor do selo de
  demonstração e o nome acessível «Projetos (demo)», porque o texto completo
  não cabia a 1280 px. No
  cabeçalho só a partir de `xl` (1280 px); entre 1024 e 1279 px não cabia sem
  mudar o desenho, e aí fica no rodapé e na gaveta.
- **Fora do índice por três vias:** `noindex, nofollow` nas páginas, o cabeçalho
  `X-Robots-Tag` em toda a árvore `/projetos` (`next.config.ts`) e testes que
  falham se uma página perder o `noindex` ou entrar no sitemap. O `robots.txt`
  não recusa `/projetos`, para o rastreador conseguir ler o `noindex`.

**Consequência:**
- A demo serve o G0 do documento do fundador. Passar a real exige o G1:
  - terreno autorizado;
  - cobertura cartográfica ou drone;
  - parecer jurídico sobre o instrumento financeiro e a instituição de pagamento.
- Até lá, nada desta página é prova comercial nem caso de cliente.

## D-42 — TerraBuild realista: Blender offline, níveis de qualidade e DXF

**Pedido do fundador:** «qualidade avançada do skill blender e ECC», «algo realístico e que não deixe nenhuma máquina lenta», «utilize repositórios de Blender e AutoCAD», e que o trabalho «não atinja o weekly limit».
**As escolhas dele:** tempo real **e** renders Cycles; exportar DXF; qualidade automática com escolha manual.

### Decisões
1. **O Blender trabalha offline, no repositório (`.qa/blender/`), nunca no browser.**
   - O site recebe só os resultados: GLB quantizados, WebP e dois renders.
   - Os modelos são gerados por código a partir dos mesmos dados do site, e não modelados à mão. Mudar uma medida nos dados e correr `gerar.sh` refaz tudo.
2. **Sem descodificadores.**
   - A CSP não permite WebAssembly, por isso não se usa Draco, meshopt nem KTX2.
   - `KHR_mesh_quantization` e WebP são lidos pelo three sem nada extra. O custo são cerca de 30 % mais bytes do que com meshopt.
3. **Texturas próprias, geradas por código.**
   - O Poly Haven e o blender.org estão bloqueados nesta rede.
   - Assim as texturas são reprodutíveis, sem licença de terceiros, e com tamanho controlado.
4. **Níveis de qualidade como contrato** («nenhuma máquina lenta»):
   - Leve não descarrega nada e é a cena procedimental de antes;
   - os tectos de triângulos e de bytes têm testes (vitest) e QA (Playwright);
   - a escolha da pessoa ganha à automática;
   - em Automática, a cena desce de nível se engasgar.
5. **CSP:** `connect-src` ganha `blob:`, que só cobre objectos criados pela própria página. Nenhum host externo.
6. **Renders:** são ilustrações dos dados fictícios, sempre com a legenda «Render ilustrativo (Blender Cycles)… Não é fotografia nem projeto aprovado».
7. **DXF no browser** (`dxf-writer`, MIT, carregado no clique):
   - em metros, sem georreferência;
   - a planta e o SVG do construtor partilham a geometria (`lib/terrabuild/planta.ts`);
   - nada é enviado.
8. **Para poupar o limite semanal:** uma só revisão ECC (`react-reviewer`, desempenho e WebGL), em vez de seis.

### Limites
- O realismo é de demonstração: construções low-poly e culturas instanciadas a baixa densidade, para caber nos orçamentos.
- O render leva cerca de 4 min em CPU. Fica fora do CI e corre-se com `RENDERS=1`.
- Os sinais do dispositivo são aproximados. O Safari e o Firefox não dizem a memória e ficam em Normal, salvo telemóveis com ≤ 4 núcleos.

## D-43 — AGORAMOZ Cívico: o portal cívico por trás, a página do AGORAMOZ à frente

**Pedido do fundador:** uma página nova em agoramoz.com, «AGORAMOZ Cívico», que use o portal cívico do Lovable por trás para gerar a informação, com um desenho moderno e alinhado ao do site.

### Decisões
1. **O mesmo molde do News (D-35, lote N).**
   - O browser fala só com `/api/civico/consulta`; o motor é chamado do servidor, com tempo máximo, tecto de tamanho e limite de taxa por origem.
   - `CIVICO_ENGINE=off` por omissão: a página apresenta-se com o campo desligado e a rota responde 503. Nada é simulado.
   - O contrato do motor foi lido no bundle público do portal (`POST /api/consulta`, mensagens no formato do AI SDK, resposta em fluxo de eventos).
2. **O desenho é o do site, não o do portal.**
   - Mesmas superfícies, tipografia, réguas e numerais; nenhuma cor nova. O âmbar, a serifa e a fotografia do portal não entram.
   - A pergunta faz-se logo no hero; no portal estava atrás de um ecrã de boas-vindas em quatro passos.
3. **O que sai do servidor é o nosso modelo, não o Markdown do motor.**
   - Uma árvore fechada (parágrafo, título, lista, citação, tabela; negrito, ênfase, ligação), sem variante que transporte HTML.
   - Sem biblioteca de Markdown no bundle de `/civico`.
4. **As fontes ficam à vista.**
   - Cada ligação é numerada no texto e listada no fim com o domínio por extenso.
   - O selo `gov.mz` vem do endereço, não do que o motor afirma.
   - Uma resposta sem nenhuma ligação leva um aviso próprio, nunca escondido.
5. **A resposta chega em fluxo, e a que fica é a final.**
   - A primeira versão esperava pela resposta inteira; o fundador pediu uma experiência à altura («algo incrível de verdade») e 7 a 10 segundos de ecrã parado não o são.
   - A rota repassa os pedaços e a página escreve com o mesmo normalizador do servidor — o texto a meio passa pelo mesmo modelo fechado, sem HTML.
   - No fim chega a resposta normalizada no servidor, com as ligações e a verificação de vigência, e substitui o que estava a meio. Um fluxo sem `fim` é erro.
6. **Nada é guardado.**
   - A pergunta nunca vai para o log nem para a base; os eventos levam só contagens.
   - No browser não há `localStorage` (ao contrário do News): a pergunta de alguém sobre um despedimento não fica num telemóvel partilhado.
7. **Contactos e números de documento são recusados** no browser e no servidor, porque o motor fica com o texto da pergunta.
8. **Nenhuma promessa do portal que não se possa provar.**
   - Saem «9.500+ documentos», «10 segundos», os valores «poupados» e o depoimento sem autor.
   - Os temas trazem perguntas de exemplo, nunca respostas feitas: uma resposta escrita à mão fica errada no dia em que a lei muda.
   - Um teste falha se o texto de apresentação ganhar um algarismo.
9. **Só em português**, e na barra do cabeçalho só a partir de 1536 px (medido: a 1280 px transbordava 52 px). Na gaveta e no rodapé, sempre.

10. **Verificador de vigência** (`lib/civico/vigencia.ts`).
    - O motor respondeu a uma pergunta real sobre heranças com artigos do Código Civil revogados em 2019.
    - Antes: uma nota de vigência segue com cada pedido. Depois: a resposta é comparada com um registo de revogações, e um aviso aparece antes do texto.
    - O registo guarda revogações lidas no Boletim da República, nunca a afirmação de que um diploma «está em vigor». Fora do registo, «por verificar».
11. **A pergunta nunca é a última mensagem enviada ao motor.**
    - O portal publica a última mensagem de cada consulta na sua página de estado. Medido.
    - A última mensagem passa a ser o tema («Tema: Trabalho.»); a pergunta vai antes, sem nomes de pessoas.
    - `CIVICO_PERGUNTA_NO_FIM=on` repõe a ordem simples, para depois de o portal ser corrigido.
12. **Partilha onde as pessoas estão:** WhatsApp, impressão (uma folha limpa, com os avisos) e cópia.
13. **Texto oficial e conferidor contra a alucinação** (`lib/civico/corpus.ts`, `lib/civico/conferir.ts`; `docs/CIVICO.md` «3.»).
    - Uma pessoa pôs o assistente a inventar; um ensaio de 8 perguntas confirmou citações e números de artigo inventados.
    - O texto de lei mostrado vem do nosso corpus (Trabalho, Sucessões, Família: 1 001 artigos do Boletim da República), não do modelo.
    - Citações entre aspas que não constam do corpus, números de artigo que não foram dados ao motor e telefones saem da resposta, e a página diz o que saiu. Determinístico, sem segundo modelo.
    - Ordens ao assistente e perguntas sobre outro país não chegam ao motor / ao corpus.
    - Não se promete «zero alucinação»: promete-se que essas três coisas só passam conferidas.

### Limites
- **Provado com o motor real em 2026-11-12**, com duas consultas: o contrato lido no bundle confirmou-se e a página respondeu de ponta a ponta (7,3 s). O resto da prova é contra um motor simulado que fala o mesmo protocolo, para não gastar o motor.
- **O motor cita a lei pelo nome e quase nunca liga ao diploma** (a ligação é a raiz de um portal). A lista chama-se por isso «Ligações citadas», e o aviso de resposta sem ligação manda procurar o diploma no Boletim da República.
- **Os dois problemas do portal estão contidos do nosso lado, não resolvidos na origem** (`docs/CIVICO.md` tem os pedidos prontos para o Lovable):
  - o verificador confere que diploma é citado; o conferidor confere citações, números de artigo e contactos — o sentido da explicação, prazos e valores não são conferidos;
  - o motor recebe a pergunta (sem nomes) e pode guardá-la fora da página pública.
- Ligar o Turnstile no portal parte esta integração.
- Sem voz e sem «memória» com conta, que o portal tem.


## D-44 — Admin organizado pelo AEOS; criador de propostas no estilo editorial

**Pedido do fundador:** adaptar o admin ao «AGORAMOZ Enterprise Operating System» (documento AGZ-ORG-001, «Draft para validação») **sem eliminar os Inquéritos nem o News**, e criar no admin o criador de propostas com a skill editorial de proposta.

### Decisões
1. **A navegação segue os blocos do AEOS, sem mudar endereços nem regras.** Grupos: Direcção (Hoje, Painel, Mapa AEOS), Receita (Pipeline, Diagnósticos, Propostas, Contactos, Organizações), Marketing (Aquisição, Inquéritos, News), Espaços (Gabinete, Espaço CEnO) e Controlo (Fila, Equipa, Auditoria). Os Inquéritos e o News mudam de grupo; o endereço, a flag (`SURVEYS`, `NEWS_BLOG`) e o código ficam iguais. Um teste guarda isto.
2. **`/admin/aeos`: o mapa, não um painel.** Os nove blocos, os sete painéis, a cadência, o roadmap com gates e o Red Team, com o texto do documento (`lib/admin/aeos.ts`). O que é nosso é só o mapeamento para ecrãs que existem. Sem dados e sem números: nenhum painel aparece «completo», os que têm ecrãs são «parcial» e os outros «por construir». A quem não tem o Gabinete ou o CEnO, o mapa não os liga nem os nomeia (como na navegação). Um teste confirma que cada ligação leva a uma página que existe.
3. **`/admin/propostas`: o criador de propostas** (AEOS bloco 2, «Gestão de Propostas»). Formulário à esquerda, folhas A4 à direita no estilo da skill (capa em gradiente com esfera, carta com decisão recomendada, índice, contexto, objectivos, solução, plano com Gantt, investimento com barras de peso, opções A/B/C, riscos, próximos passos com assinaturas, contracapa). «Imprimir / guardar PDF» pelo browser, em A4 (página com nome `@page proposta`).
   - A aritmética é calculada (total, semanas, validade), nunca escrita; números com espaço fino de milhar (`1 735 000 MZN`).
   - Uma secção vazia não tem página; o que falta escrever aparece entre parêntesis rectos, nunca inventado.
   - Contactos comerciais em capa, carta, investimento, próximos passos e contracapa; «Confidencial» na capa. O logótipo é o `Mark` do site; a frase da contracapa é a tagline do site.
   - Regra do AEOS (limites de Finanças): «nenhuma proposta sem margem projetada» — o custo de cada fase é pedido e a margem aparece nas verificações. **O custo e a margem nunca vão para o papel.**
   - Verificações antes de imprimir: sem cliente ou projecto, semanas trocadas ou duas opções recomendadas, o botão fica desligado. Uma folha que transborda é marcada e listada.
4. **Nada é guardado no servidor.** O rascunho vive no `sessionStorage` do separador (prefixo `proposta:`, apagado ao terminar a sessão, como os dos espaços privados) e guarda-se de vez exportando um `.json`, que se volta a importar (validado com zod, campos fechados). Guardar propostas na base pede uma migração aplicada pelo fundador — fica como passo seguinte.

### Limites
- O mapa é estático: não mede nada. Os painéis 3 (Product Portfolio) e, para quem não tem o Gabinete, 4 e 5 continuam por construir.
- As propostas não ficam ligadas a uma oportunidade do Pipeline nem têm histórico de versões (precisa da migração do ponto 4).
- O PDF é o do browser (Chrome dá o melhor resultado). Os cinzentos das labels foram ligeiramente escurecidos face à referência (#7C7C7C → #666666) para chegarem aos 4,5:1.
- QA: `.qa/propostas.mjs` contra `/qa/aeos` e `/qa/propostas` (`ADMIN_PREVIEW=on`), com axe e geração do PDF.

## D-45 — Propostas na base (0020) e colar o texto para gerar o desenho

**Pedido do fundador:** preparar a migração das propostas; um campo onde colar o texto de uma proposta, que gera o desenho editorial já escolhido, e poder descarregá-lo.

### Decisões
1. **Colar o texto, sem IA.** `lib/propostas/texto.ts` reconhece títulos de secção, dados da capa, listas e tabelas (Word, Excel, Markdown), semanas e valores, e arruma o texto nas secções do desenho. Não reescreve: um teste confirma que cada palavra das folhas veio do texto colado. O que não tem lugar, o que é cortado e o que é convertido (meses, dias) vai para um relatório à vista. Um total escrito que não bate com a soma das fases é dito; as folhas usam a soma.
2. **0020: versões imutáveis.** Cada «Guardar» é uma versão nova em `propostas_versoes` (conteúdo, texto colado, nota); não há função que altere ou apague uma versão. Gravar sem mudanças não cria versão; repor uma antiga é guardá-la como nova.
3. **O total é da base.** `guardar_proposta` soma as fases do conteúdo; a aplicação não envia total.
4. **O mesmo padrão de 0006/0019.** Só leitura por RLS (`is_staff`), escrita só por funções `security definer` com `exigir_papel(admin, comercial)`, revisão contra gravações cruzadas, `lock_timeout`, auditoria sem o conteúdo.
5. **Ligada ao Pipeline.** Cada versão e mudança de estado de uma proposta ligada entra na cronologia da oportunidade (`activities`, tipo `proposta`).
6. **Estados**: rascunho → enviada → aceite/recusada; arquivada; «voltar a rascunho» reabre. Aceite só depois de enviada.
7. **«Descarregar PDF»** é o diálogo de impressão do browser (Guardar como PDF), em A4. Não há geração de PDF no servidor: obrigava a um Chromium nas funções da Vercel.
8. **Falhar ao guardar não perde trabalho.** Qualquer falha do servidor volta como mensagem no painel; o editor mantém a proposta e o rascunho do separador.

### Limites
- **A 0020 é aplicada pelo fundador** (`supabase/aplicar-0020.sql`, linha 32 do `verificar-estado`). Até lá, o editor funciona só no separador.
- O leitor reconhece os títulos da tabela em `docs/PROPOSTAS.md`; um título com outro nome fica em «Sem lugar nas folhas», à vista.
- Sem ligação de uma proposta a vários clientes nem modelos de proposta reutilizáveis.

## D-46 — Carregar o documento da proposta (.docx, .pdf, .txt, .md)

**Pedido do fundador:** opção de upload de ficheiros na proposta, para transformar o documento no desenho editorial.

### Decisões
1. **Lido no browser.** O documento do cliente não vai para o servidor para ser convertido; só o resultado, se a proposta for guardada (0020, com o texto extraído como «texto colado»).
2. **O mesmo leitor do texto colado** (D-45): o ficheiro vira texto e o texto aparece no campo, para rever. Nada é reescrito; o relatório diz o que se perdeu na conversão.
3. **.docx sem dependências**: ZIP pelo directório central e `DecompressionStream`, XML de uma estrutura conhecida. Estilos de título → `#`, listas → `-`, tabelas → tabulações. Tecto de 20 MB descomprimidos contra ZIP-bombas; 10 MB por ficheiro.
4. **.pdf com `pdfjs-dist` 5.7.284** (versão fixa), importado dinamicamente só quando chega um PDF; worker do próprio site (`worker-src 'self'` já permitido). As linhas, títulos e colunas são deduzidos pela posição e pelo tamanho da letra — e o relatório di-lo.
5. **Provado com documentos reais**: o mesmo .docx e o seu PDF dão a mesma proposta (testes e QA no browser em build de produção, sem erros na consola).

### Limites
- PDF digitalizado (imagem) não tem texto: é recusado com a indicação de enviar o .docx. Sem OCR.
- .doc (Word antigo), .odt, .pages e .rtf não são lidos: guardar como .docx.
- Um PDF muito «desenhado» (colunas de revista, caixas) pode sair com a ordem trocada; o texto fica no campo para corrigir antes de gerar.

## D-47 — Tráfego de todas as páginas (sem cookies) e SEO: as leis artigo a artigo

**Pedido do fundador:** ver as vistas de todas as páginas, quem entra, por onde anda e onde pára; melhorar o SEO para trazer mais visitas «como se tivéssemos anúncios pagos»; tornar o site mais rentável.

### Decisões
1. **Vistas e leitura de todas as páginas, na nossa base.** `page_view` e `page_engagement` em `analytics_events` (já ligada): sem GA4, sem cookies, sem nada no dispositivo — a mesma linha de 0010. Sem migração.
2. **A visita é um resumo diário calculado no servidor** (HMAC de dia + IP + navegador, 16 hex); o IP e o navegador não se guardam. É o que permite entradas, saídas, percursos e conversões por página de entrada sem identificar ninguém. `/privacidade` foi reescrita para dizer exactamente isto.
3. **«Quem entra» é anónimo.** Não se identifica pessoas (nem se deve, sem consentimento); identifica-se a visita do dia, o canal, o site de origem, o país e o ecrã. Quem deixa contacto num formulário continua a ligar-se ao CRM pela atribuição que já existia.
4. **Robôs, GPC, admin e QA não contam.**
5. **Painel «Tráfego»** com todas as páginas do sitemap (mesmo a zero), «agora», onde param, percursos, fontes e conversões; definições escritas no painel.
6. **SEO: 1 001 páginas da lei** (Trabalho, Sucessões, Família) com o texto oficial do corpus, estáticas, com títulos e descrições dentro das regras do repositório e JSON-LD. É conteúdo real e útil (o texto do BR é sobretudo PDF digitalizado), não páginas para enganar o motor. Os artigos não extraídos com segurança são listados.
7. **IndexNow** com botão no painel; para o Google, os passos da Search Console ficam em `docs/TRAFEGO.md`.
8. **Sem AdSense nem scripts de anúncios de terceiros**: abririam a CSP, trariam cookies e baixariam a confiança num site de serviços. A rentabilidade vem de converter visitas (diagnóstico, WhatsApp, reunião, Cívico) — agora medida por página de entrada — e dos anúncios próprios do News, que já existem.

### Limites
- Tráfego orgânico leva semanas a meses a crescer depois de indexado; nenhum trabalho de SEO dá, de um dia para o outro, o volume de anúncios pagos.
- CGNAT: pessoas atrás do mesmo IP e navegador contam como uma visita; quem volta noutro dia conta como novo.
- O painel lê até 60 000 eventos por período; acima disso, pede um período mais curto (e uma agregação na base passa a valer a pena).

## D-48 — Facturação interna «A facturar», sem ERP (0021)

**Pedido do fundador:** ligar o cartão ERP («onde as oportunidades ganhas seguem para facturação»). Resposta: ainda não há ERP.

### Decisões
1. **A fila nasce da fase `ganho`.** Uma oportunidade ganha sem factura válida está «por facturar»; não há nada a alimentar à mão.
2. **Regista-se a factura emitida fora daqui** (n.º, data, valor, moeda, nota) em `facturacao` (0021). Esta consola não emite documentos fiscais nem calcula IVA.
3. **Número único** entre as facturas válidas; **anular** exige motivo, guarda o registo e devolve a oportunidade à fila; refacturar exige a revisão certa.
4. O padrão de 0006/0019: escrita só por funções `security definer` com `exigir_papel(admin, comercial)`, revisão, `lock_timeout`, cronologia da oportunidade e auditoria; `leitura` só lê.
5. **CSV para o contabilista** com o filtro do ecrã, registado na auditoria antes de sair.
6. Totais **por moeda** (nunca somados entre moedas); «há mais de 7 dias» destaca o dinheiro ganho e ainda não pedido (limite do AEOS).
7. O cartão ERP do painel passa a «Facturação interna», com ligação à fila; o mapa AEOS liga-a aos blocos e ao painel de Finanças.

### Limites
- A 0021 é aplicada pelo fundador (linha 33 do `verificar-estado`); até lá, a fila mostra as ganhas mas não regista.
- Sem cobrança (recebimentos, facturas vencidas) — fica para o passo seguinte, ou para o ERP.
