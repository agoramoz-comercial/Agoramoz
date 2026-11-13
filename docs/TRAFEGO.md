# Tráfego e SEO — operação

Decisão: D-47. Painel: `/admin/tráfego` (`/admin/trafego`), no grupo Marketing.

## O que se mede (desde a publicação desta versão)

Em todas as páginas públicas do site (não no admin):

| Evento | Quando | O que leva |
|---|---|---|
| `page_view` | ao chegar a uma página (também na navegação interna) | caminho, canal e campanha (UTM), site de origem (só o host, só na página de entrada), tipo de ecrã |
| `page_engagement` | ao sair da página, ao esconder o separador, ao fechar | tempo com a página **visível** (ms) e o ponto mais fundo lido (0–100 %) |

O servidor acrescenta a cada evento:

- **`visita`** — resumo HMAC-SHA-256 (16 hex) de `dia UTC + IP + navegador`, com um
  segredo do servidor (`ANALYTICS_SALT`, ou a chave de serviço com rótulo próprio).
  Muda todos os dias; o IP e o navegador **não são guardados**. É o que junta as
  páginas de uma visita e as conversões à página de entrada.
- **`pais`** — do cabeçalho `x-vercel-ip-country` (só o país).

Não se grava: robôs e ferramentas (User-Agent), quem envia Global Privacy
Control, o admin e as pré-visualizações. Não há cookies nem nada guardado no
dispositivo para esta medição; `/privacidade` diz exactamente isto.

Tudo vai para `analytics_events` (0010), que já estava ligada em produção
(`ANALYTICS_PERSISTENCE=on`): **não há migração a aplicar**.

## O painel

- **Agora no site** — visitantes com uma vista nos últimos 5 minutos, e a página em que estão. O painel volta a ler-se a cada 60 s.
- **Resumo** — vistas, visitantes(-dia), visitas, páginas por visita, leitura por visita, rejeição, conversões.
- **Todas as páginas** — todas as do sitemap, mesmo as sem vistas, com vistas, visitantes, entradas, saídas, **taxa de saída**, leitura média, até onde leu e conversões das visitas que entraram por ela.
- **Onde param** — páginas com 3+ vistas pela taxa de saída.
- **Percursos** — de que página para que página.
- **De onde vêm** — canais, sites de origem, campanhas UTM, países, ecrãs, e conversões por página de entrada.
- **Motores de pesquisa** — estado da verificação no Google e no Bing, e o botão IndexNow.

As definições estão no fim do painel e em `lib/admin/trafego.ts`. Limites,
ditos: pessoas atrás do mesmo IP com o mesmo navegador (CGNAT das operadoras
móveis) contam como uma; quem volta noutro dia conta como novo; o painel lê
até 60 000 eventos por período (e diz quando passa).

## SEO

### Páginas da lei (1 001 páginas novas)

`/civico/lei` → `/civico/lei/{trabalho|sucessoes|familia}` → `/civico/lei/{lei}/artigo-N`.
O texto oficial do corpus do Cívico, um artigo por página, estático (gerado no
build). Título com a epígrafe e o artigo (≤ 60 com a marca), descrição 120–160
com a lei e o país, canonical, `BreadcrumbList` e `Legislation` em JSON-LD,
vizinhos, artigos relacionados (pela mesma procura do Cívico), ligação à fonte
oficial e convite ao Cívico. Os 27 artigos que a extracção não leu com
segurança são listados na página de cada lei. No sitemap, com o `lastmod` da
extracção.

### Avisar os motores

- **IndexNow** (Bing, Yandex, Seznam, Naver): botão no painel de tráfego. A chave
  é pública por desenho do protocolo e está em `/indexnow.txt`.
- **Google**: não usa IndexNow. Passos seus, uma vez:
  1. Search Console → «Adicionar propriedade» → Prefixo do URL `https://agoramoz.com`.
  2. Método «Etiqueta HTML»: copiar só o código de `content="…"`.
  3. Vercel → projecto `agoramoz` → Settings → Environment Variables →
     `GOOGLE_SITE_VERIFICATION` = esse código (Production) → novo deploy.
  4. Na Search Console, «Verificar», e depois **Sitemaps → `sitemap.xml`**.
  O mesmo para o Bing (`BING_SITE_VERIFICATION`, meta-tag `msvalidate.01`).

### Campanhas

Para medir uma campanha (WhatsApp, redes, e-mail, anúncios pagos), use ligações
com UTM: `https://agoramoz.com/civico?utm_source=whatsapp&utm_medium=social&utm_campaign=lancamento-civico`.
O painel mostra a campanha, as visitas, onde param e as conversões.

## Código

| Peça | Ficheiro |
|---|---|
| Envio no browser | `components/analytics/MedicaoPaginas.tsx`, `lib/analytics/track.ts` |
| Validação e gravação | `lib/analytics/event-schema.ts`, `app/api/eventos/route.ts`, `lib/analytics/visita.ts` |
| Contas do painel | `lib/admin/trafego.ts` (testado), `lib/admin/trafego-dados.ts` |
| Painel | `app/admin/(painel)/trafego/page.tsx`, `components/admin/trafego/*` |
| Páginas da lei | `lib/civico/lei.ts`, `components/civico/Lei.tsx`, `app/(site)/civico/lei/**` |
| IndexNow | `lib/seo/indexnow.ts`, `app/indexnow.txt/route.ts`, `lib/admin/indexnow-actions.ts` |
| QA | `.qa/trafego-seo.mjs` |
