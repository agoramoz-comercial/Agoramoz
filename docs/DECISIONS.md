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
