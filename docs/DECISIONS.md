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
