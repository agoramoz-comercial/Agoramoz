# Activação: Perfil de Empresa, Search Console e o que fica por ligar

Escrito a 2026-09-24. Tudo o que está aqui é do seu lado — eu não tenho acesso
ao Google, ao LinkedIn, nem ao projeto Supabase novo a partir desta sessão.

**Nada neste documento inventa um facto sobre a AGORAMOZ.** Onde falta
informação, diz-se que falta.

---

## 1. Primeiro: a ordem, porque há uma janela de risco

O código já está no repositório. A base de dados **ainda não**. E a ordem
importa:

1. Você corre `supabase/aplicar-0009-0010.sql` no SQL Editor do projeto
   `nixltrbdplqjadfytryd`.
2. **Avisa-me.**
3. Eu publico o deployment imediatamente.

Entre 1 e 3 existe uma janela em que o formulário devolve 503. A razão: o SQL
larga a função de ingestão de 16 argumentos e recria-a com 17, e o site que
está no ar chama a de 16. Não há forma de evitar isto sem deixar as duas
versões a coexistir — e duas funções com o mesmo nome fazem o PostgREST não
saber qual chamar, o que seria pior e mais silencioso.

A janela é de minutos se me avisar. Não corra o SQL e vá almoçar.

O ficheiro traz consultas de verificação no fim. Se alguma não der o esperado,
mande-me o resultado antes de eu publicar.

---

## 2. Google Business Profile

### Antes de criar

O nome do negócio é **`AGORAMOZ`**. Exactamente isso, sem sufixos.

Não é preferência minha: acrescentar palavras-chave ao nome — «AGORAMOZ
Software Maputo», «AGORAMOZ — Desenvolvimento Web» — é motivo de suspensão do
perfil. É a tentação óbvia e é a que custa o perfil inteiro. O repositório
agora impede-o do seu lado: `BRAND_NAME` é um tipo literal e um teste verifica
que nenhum nó de dados estruturados nomeia a empresa de outra maneira.

### Tipo de perfil: área de serviço

Quando o Google perguntar «adicionar uma localização que os clientes podem
visitar?», responda **não**. Confirmou-me que a AGORAMOZ não tem morada pública
de atendimento, e é a configuração normal para software B2B.

O Google vai pedir uma morada para **verificação**. Essa morada pode ficar
oculta — é o que distingue um perfil de área de serviço de uma loja. Forneça a
morada real de registo; ela não aparece no perfil público.

### Os campos, com os valores

| Campo | Valor | Origem |
|---|---|---|
| Nome | `AGORAMOZ` | Fixo. Sem palavras-chave |
| Categoria principal | *Empresa de software* (`Software company`) | Sugestão. A categoria é a decisão de posicionamento mais importante do perfil — escolha a que descreve o que vende, não a que parece ter mais procura |
| Categorias secundárias | *Consultor de software*, *Designer de websites* | Sugestão, se existirem na lista do seu país |
| Áreas servidas | Moçambique · Portugal · Brasil | É o que o website já afirma, nos três ficheiros de país |
| Telefone | `+258 82 478 0097` | `content/site.ts`. É a linha de WhatsApp, e é a única que existe |
| Website | `https://agoramoz.com/perfil?utm_source=google&utm_medium=organic&utm_campaign=gbp` | **Copie exactamente, com a query string** |
| Horário | **Por preencher — não invento** | Ver §5 |

### Porquê aquele URL, com aquela cauda

O Google envia o mesmo referenciador quer a pessoa venha do seu perfil quer da
pesquisa normal. São indistinguíveis — excepto por aquela etiqueta, que é
nossa e só existe ali.

Com ela, o canal aparece como **«Perfil de empresa»** no CRM, e o ecrã
`/admin/aquisicao` mostra quantas visitas do perfil se transformaram em
diagnósticos, em oportunidades e em negócios fechados. Sem ela, essas visitas
diluem-se em «Pesquisa orgânica» e a pergunta «vale a pena investir no perfil?»
fica sem resposta.

Se o Google recusar a query string nalgum campo, use
`https://agoramoz.com/perfil` — perde-se a distinção entre perfil e pesquisa,
mas a página continua a funcionar.

### A descrição

750 caracteres é o máximo. Esta tem 431 e é construída inteiramente a partir do
que o website já diz:

> A AGORAMOZ desenha e constrói sistemas digitais que ligam website, software,
> automação e agentes de inteligência artificial ao processo real da sua
> empresa. Trabalhamos com empresas em Moçambique, Portugal e Brasil que já têm
> procura e precisam de estrutura. Começamos sempre por um diagnóstico do
> processo: só apresentamos proposta quando houver adequação. Escopo,
> exclusões e critérios de aceitação ficam escritos antes de começar.

### O que NÃO fazer no perfil

- **Não peça avaliações a quem não é cliente.** Avaliações falsas são
  detectáveis e custam o perfil.
- **Não publique fotografias que não sejam suas.** Uma imagem de banco de
  imagens apresentada como escritório é uma afirmação falsa.
- **Não use a secção «Produtos» para preços** enquanto o preço depender do
  diagnóstico — é o que o website diz, e a contradição entre os dois é o tipo
  de sinal que enfraquece os dois.

---

## 3. Search Console

Não existe nenhuma propriedade. Sem ela, não há forma de saber que consultas
trazem visitas — estamos a otimizar às cegas.

1. `search.google.com/search-console` → **Adicionar propriedade** → **Prefixo
   de URL** → `https://agoramoz.com`.
2. Verificação: escolha **Registo DNS** se o domínio está na Vercel (é o mais
   robusto, não depende de o site estar no ar). Se preferir a meta-tag,
   mande-me o token: já existe encaixe por variável de ambiente
   (`GOOGLE_SITE_VERIFICATION`) e eu ligo-o — **não está ligado ainda**, porque
   não invento um token.
3. Submeta o sitemap: `https://agoramoz.com/sitemap.xml` — já responde, com 17
   URL.
4. Em **Páginas**, confirme daqui a uns dias que `/admin` e `/api` **não**
   aparecem. Se aparecerem, avise-me.

Vale também criar a propriedade no **Bing Webmaster Tools**: importa a do
Google em dois cliques e cobre o Copilot e o DuckDuckGo.

---

## 4. LinkedIn — uma correcção de cinco minutos que vale a pena

A página de empresa lista **duas** localizações. A segunda é
`Avellino Way, Mountain View, California 94043`.

Esse é o endereço de exemplo do próprio LinkedIn, que ficou por apagar. O
problema não é estético: os motores de busca usam o `sameAs` do website para
ligar a entidade aos perfis oficiais, e depois leem o que esses perfis dizem.
Uma entidade com duas moradas contraditórias, uma delas nos Estados Unidos, é
exactamente o sinal que enfraquece a correspondência que estamos a construir.

**Apagar a segunda localização.** É a acção com melhor relação
esforço/benefício de toda esta lista.

---

## 5. O que não fiz porque não tenho os factos

Nada disto bloqueia o que já está feito. Registei tudo em `docs/GAPS.md`.

| Falta | Consequência |
|---|---|
| **Horário de funcionamento** | O perfil fica sem horário, e o `LocalBusiness` não é emitido |
| **Morada e coordenadas** | O `LocalBusiness` não é emitido. Para área de serviço, é provavelmente o correcto |
| **Nome legal registado e NUIT** | `Organization.legalName` fica omitido — omitir é certo; emitir `null` seria afirmar que não existe |
| **Facebook, YouTube, X, TikTok** | O `sameAs` fica mais fraco do que podia |
| **Certificações** | Os arrays estão vazios por decisão anterior, não por esquecimento |

Se me der horário, morada e coordenadas, o `LocalBusiness` passa a ser emitido —
mas há uma rede que recusa valores de exemplo (código postal com forma de outro
país, coordenadas no centróide do país, sete dias das 00:00 às 23:59, e
literalmente `Avellino Way`). Se lhe der um valor a copiar de um sítio qualquer,
o teste falha em vez de o publicar.

---

## 6. Depois do deployment: ligar a medição

Duas variáveis de ambiente na Vercel, em **Production**:

```
ANALYTICS_PERSISTENCE=on
```

Sem isto, a rota de eventos responde e não grava — de propósito, para que
ninguém ligue um sistema de medição por inferência. `/admin/aquisicao` fica
vazio até esta variável existir.

`DIAGNOSTIC_PERSISTENCE` já está em `required` e não muda.

---

## 7. Como confirmar que ficou bem

Depois de eu publicar:

1. `agoramoz.com/perfil` responde 200, com título próprio e imagem de partilha.
2. Cole `https://agoramoz.com/perfil` no **Rich Results Test** do Google:
   devem aparecer `Organization`, `WebSite`, `WebPage`, `BreadcrumbList` e
   `FAQPage`, e **não** deve aparecer `LocalBusiness`.
3. Submeta o formulário uma vez a partir de
   `https://agoramoz.com/perfil?utm_source=google&utm_medium=organic&utm_campaign=gbp`.
   Em `/admin/oportunidades`, a oportunidade deve aparecer com origem **«Perfil
   de empresa»**.
4. Submeta **a mesma coisa outra vez**, sem a cauda. Deve continuar a existir
   **uma** oportunidade, não duas — é o que prova que a origem não entrou na
   chave de idempotência.
5. Partilhe `agoramoz.com` no WhatsApp ou no LinkedIn: deve aparecer imagem.
   Até hoje não aparecia em página nenhuma.
