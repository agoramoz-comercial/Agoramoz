# Inquéritos — construtor no /admin, partilha por link

A equipa cria inquéritos no `/admin`, publica-os e partilha-os por link ou
código QR. Quem responde não precisa de conta e é anónimo por omissão; só
deixa contacto se quiser, e com consentimento. Os resultados agregam-se no
`/admin` e exportam-se em CSV.

É o primeiro passo do AGORAFORMS: uso interno da AGORAMOZ, sem IA na v1 (a
interface está preparada em `lib/inqueritos/ia.ts`).

## Estado

| Peça | Estado |
|---|---|
| Construtor, partilha, resultados, CSV (`/admin/inqueritos`) | Pronto, **desligado** (`SURVEYS=off`) |
| Página pública `/i/<token>` e `POST /api/inqueritos` | Pronta, responde 404 enquanto desligado |
| Migração 0013 (`survey_links`, regras de `responses` e `activities`, RPC) | Pronta; **por aplicar** em produção |
| Bloco «Inquéritos» no painel | Aparece só com `SURVEYS=on` |

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
- **Entra no CRM como contacto e actividade, nunca como oportunidade.** Um
  contacto que já existe **não é reescrito** — mantém-se o que o CRM tinha.
- **Exportação:** o CSV sem contactos está disponível a toda a equipa; com
  contactos (`?contacto=1`) só para admin e comercial.
- Registar o consentimento não é declarar conformidade legal. O texto e o uso
  dos dados precisam de revisão qualificada antes de recolher contactos fora
  da equipa.

## Segurança

| Ameaça | Defesa |
|---|---|
| Adivinhar links | Token de 32 bytes HMAC; 404 igual para «não existe» e «desligado» |
| Token em logs ou analítica | Vai no corpo do POST; `/i` é caminho privado na atribuição; `no-referrer`, `noindex`, `no-store` em `/i` |
| Spam de respostas | Limite por IP (20/10 min) e por link (600/10 min) em memória; tecto por link na base; armadilha `fax`; revogar |
| Respostas forjadas | Validadas pelo spec guardado na base, nunca pelo que o browser diz; a ingestão recusa chaves desconhecidas |
| Injecção de fórmulas no CSV | Células que começam por `= + - @`, tabulação ou retorno ficam texto |
| Texto do inquérito com HTML | Mostrado sempre como texto (React escapa; sem `innerHTML`) |
| Edição do diagnóstico por aqui | Todas as RPC recusam `kind <> 'survey'` |

O limite em memória vale por instância da Vercel. Os limites duráveis são o
tecto de respostas e a revogação.

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
| `supabase/migrations/0013_inqueritos.sql` | Tabela, regras, RPC (= `supabase/aplicar-0013.sql`) |
| `.qa/inqueritos-comportamento.sql` | 25 cenários SQL num Postgres real |
| `.qa/inqueritos-publico.mjs`, `.qa/inqueritos-admin.mjs` | Playwright + axe a 390/768/1440 |
