# SEO — palavras-chave, SERP e mapa de páginas

**Data da medição:** 2026-09-30. **Método:** pesquisas reais via Firecrawl
(motor web, localização Moçambique quando indicado), top 10 orgânico lido e
classificado à mão. **O que NÃO temos:** volumes de pesquisa e dificuldade
numérica — não há acesso a Ubersuggest, Semrush nem Keyword Planner. A
prioridade abaixo vem da intenção e da concorrência observada, não de volume.
Quando houver Search Console com dados, os volumes reais substituem esta tabela.

## Resumo executivo

1. **A marca ainda não aparece para «AGORAMOZ».** A pesquisa devolve agora
   agora.io, dicionários e locais chamados «Agora». Antes de qualquer
   palavra-chave, a marca tem de ser indexada e reconhecida (passos no fim).
2. **«Criação de sites» e «desenvolvimento de software» em Moçambique estão
   saturados** de agências locais com títulos de correspondência exacta
   (ITCORE, Cserve, MozOut, Agência360, LG TecServ, Easyhost, MOZ Websites).
   Entrar aqui é trabalho de meses de autoridade.
3. **«Agentes de IA» e «automação de processos» em Moçambique quase não têm
   concorrência local.** O top 10 é conteúdo genérico do Brasil (Zeev,
   Safetec), fornecedores globais (IBM, NetSuite, Innowise) e um artigo no
   ResearchGate. Só três páginas de serviço locais (Orange Choice, Smartek,
   Bit Consulting). **É aqui que a AGORAMOZ pode chegar primeiro ao top 10.**
4. **Energia/Oil & Gas + software em Moçambique** é dominado por notícias e
   instituições (ITU, Energy Year, Club of Mozambique), sem páginas de
   serviço — espaço livre para a página de sector `/mz/energia-mineracao`.

## SERP medidas (top 10, Moçambique)

| Pesquisa | Quem ocupa | Leitura |
|---|---|---|
| empresa de desenvolvimento de software Moçambique | ITCORE, Cserve, ITGest, TechSolutions, Touch IT, F3M, Megatrónica, Reboot, vagas LinkedIn | Saturada; títulos «Desenvolvimento de Software \| X – Moçambique» |
| criação de sites Maputo empresa | MozOut, ITCORE, Cserve, Site.pro, MOZ Websites, Diversité, Agência360, MozNetwork, LG TecServ, Easyhost | Saturada; muitas agências pequenas |
| automação de processos empresariais Moçambique | ResearchGate, Instagram, KPMG Angola, Innowise, IBM, Smartek, Bit Consulting, NetSuite, Primavera | **Fraca** — só 2 páginas de serviço locais |
| agentes de IA para empresas Moçambique | YouTube, Hyland, Cegid Primavera, Unlocking Tech, Google Cloud, Databricks, Orange Choice, Zeev, Safetec | **Fraca** — conteúdo genérico; 1 local |
| software development company Mozambique (EN) | Sapphire, Cserve, ZoomInfo, EGREED, Viprasol, directórios | Directórios e agregadores; páginas de serviço fracas |
| AI agents automation company Mozambique (EN) | LeewayHertz, PwC, Deloitte, HSO, fornecedores globais | Global; nenhum local |
| transformação digital energia oil and gas Moçambique | ITU, Energy Year, Club of Mozambique, Kabum Digital, DXC | Notícias; sem páginas de serviço |
| AGORAMOZ | agora.io, Wikipedia, Britannica, Merriam-Webster… | **Marca ausente** do top 10 |

## Mapa palavra-chave → página

| Prioridade | Palavra-chave (intenção comercial) | Página | Título aplicado |
|---|---|---|---|
| 1 | agentes de IA para empresas (Moçambique) | `/solucoes/agentes-ia` | Agentes de IA para empresas em Moçambique |
| 1 | automação de processos empresariais (Moçambique) | `/solucoes/automacao-de-processos` | Automação de processos empresariais em Moçambique |
| 1 | software para energia / mineração (Moçambique) | `/mz/energia-mineracao` | já existente: «Sistemas digitais para energia, mineração e serviços industriais em Moçambique» |
| 2 | software à medida / desenvolvimento de software (Moçambique) | `/solucoes/software-empresarial` | Software à medida para empresas em Moçambique |
| 2 | integração de sistemas, cibersegurança (Moçambique) | `/solucoes/infraestrutura-digital` | Integração de sistemas e segurança em Moçambique |
| 2 | AI agents / process automation / custom software (Mozambique, EN) | `/en/solucoes/*` | «… in Mozambique» |
| 3 | criação de sites / websites (Maputo, Moçambique) | `/solucoes/websites-avancados` | Criação de websites para empresas em Moçambique |
| — | AGORAMOZ (marca) | `/` | inalterado: «AGORAMOZ — …» |

**Regras mantidas:** o H1 e o corpo das páginas não mudaram (só `<title>` e
meta description); a marca não leva palavras-chave; nenhuma afirmação nova —
as descrições reutilizam o que cada página já diz. `lib/seo/titulos.test.ts`
fixa comprimentos (≤ 60 com a marca; descrição 120–160) e o país no título.

## Correcções técnicas feitas neste lote

- **hreflang no sitemap** (`app/sitemap.ts`): cada par PT/EN declara o mesmo
  conjunto recíproco que o `<head>` da página, com `x-default` em português; a
  home e os países mantêm `pt-MZ`, `pt-PT`, `pt-BR`. Testado
  (`app/sitemap.test.ts`): reciprocidade e nenhum alternate fora do sitemap.
- **Ícone de pesquisa** (P1): logo sobre preto, 480 px (múltiplo de 48),
  `favicon.ico`, `apple-icon`, manifesto e `Organization.logo`.

## Decidido NÃO fazer

- **FAQ + `FAQPage` no `/news`.** O markup exige a FAQ visível na página (muda
  o design, que é para manter), e o Google restringiu os resultados ricos de
  FAQ a sites governamentais e de saúde em 2023 — ganho nulo.
- **`WebApplication` com `offers` no Moz News.** Exige declarar o preço; não
  está confirmado que o serviço seja gratuito. Não se inventa.
- **Prometer «primeiro lugar no mundo».** A posição depende de autoridade
  (ligações de outros sites), histórico, concorrência e comportamento de quem
  pesquisa — nada disto se instala no código.

## O que falta e só o fundador pode fazer (por ordem de impacto)

1. **Google Search Console:** verificar o domínio (`GOOGLE_SITE_VERIFICATION`,
   ver `docs/SEO_ACTIVACAO.md` §3), submeter
   `https://agoramoz.com/sitemap.xml` e pedir indexação da home e das cinco
   soluções. Sem isto, a marca continua ausente.
2. **Perfil de Empresa no Google** (guião em `/perfil` e
   `docs/SEO_ACTIVACAO.md`): é o que põe a AGORAMOZ no mapa e no painel de
   marca quando alguém pesquisa o nome.
3. **Bing Webmaster Tools** (`BING_SITE_VERIFICATION`): mesma submissão.
4. **Ligações de autoridade:** perfis LinkedIn da empresa e dos fundadores com
   ligação ao site, directórios moçambicanos (câmaras de comércio, Mozambique
   Energy Chamber), parceiros e clientes com autorização.
5. **Conteúdo contínuo:** um artigo por mês nas intenções de prioridade 1
   (agentes de IA, automação, energia), com casos reais quando houver
   autorização — é o que transforma «espaço livre» em posição.

## Como medir

- Search Console → Desempenho, filtrado por página e por país (MZ, PT, BR).
- Repetir estas pesquisas a cada 30 dias e actualizar a tabela «SERP medidas».
- No painel `/admin`: «Canais de aquisição» → linha «Pesquisa orgânica».
