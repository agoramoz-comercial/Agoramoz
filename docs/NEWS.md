# AGORAMOZ Moz News — operação

A secção `/news` e `/en/news` analisa uma notícia (link ou texto) e mostra um
relatório organizado pela ordem da decisão. O motor é a função `analyze-news`
do projecto Lovable (`agoramoz.lovable.app`), chamada **só** pelo nosso
servidor em `app/api/news/analisar/route.ts`.

## Estado

| Peça | Estado |
|---|---|
| Páginas, relatório, navegação, sitemap, OG | No ar |
| Rota `/api/news/analisar` | No ar; responde **503** enquanto `NEWS_ENGINE=off` |
| Motor real (Lovable) | **Por ligar** — faltam as variáveis abaixo |
| Feed de análises publicadas (fase 2) | Por fazer; precisa de migração e aprovação humana por análise |

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
