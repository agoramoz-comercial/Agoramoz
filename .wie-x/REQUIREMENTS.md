# REQUIREMENTS — AGORAMOZ website v2

> Module 04. Types: Mandatory · Important · Optional · Future · Out of Scope · Unknown · Assumed.
> IDs `REQ-###` are referenced by TASKS.md and QA.md. `scripts/traceability.py` checks the chain REQ → Task → Test → Result (Module 04.4).

## Intake (Module 04.1)

| Field | Value |
|---|---|
| Objective | Recriar o site público agoramoz.com: estrutura da direcção C («Conversa»), cores e tipografia da direcção A («Editorial»), efeitos 1, 2, 3, 5, 6, 8 e 10 do laboratório de movimento |
| Problem being solved | O site actual é longo (≈19 000 px na página inicial) e denso; a empresa precisa da primeira venda e o caminho até uma conversa tem de ser curto |
| Target users | Decisores de PME em Moçambique (primeiro), Portugal e Brasil; sobretudo em telemóvel |
| User needs | Perceber em segundos o que a AGORAMOZ resolve, ver que é sério, falar por WhatsApp ou pedir o diagnóstico |
| Business context | Estágio 1, pré-receita; oferta de entrada: Diagnóstico Operacional Digital (diagnóstico M03, 18/11/2026) |
| Constraints | Repositório público; Next.js 16.3.5, React 19, Tailwind v4; sem dados inventados (`content/types.ts`); consola, cursos, Cívico e formulários não podem regredir |
| Budget | Tempo do fundador; nenhum custo de software novo (GSAP gratuito) |
| Timeline | unknown |
| Technology preferences | GSAP 3.15 (já instalado), sem Three.js no site público |
| Platform | Vercel (projecto `agoramoz`), Supabase |
| Required integrations | Formulário de diagnóstico → `ingest_diagnostic_response`; eventos de tráfego; WhatsApp |
| Security requirements | CSP actual mantida; nenhum segredo no cliente |
| Expected deliverables | Site v2 em pré-visualização, depois em produção após aprovação |
| Success criteria | Todos os REQ Mandatory verificados; zero regressões nos testes e no QA |

## Requirements

| ID | Requirement | Type | Priority | Acceptance criteria | Source | Status |
|---|---|---|---|---|---|---|
| REQ-001 | Página inicial com a estrutura C | Mandatory | High | Ordem: cabeçalho curto → topo com pergunta + escolha de setor → como funciona (3 passos) → problemas → diagnóstico → sistema → curso → quem somos → chamada final; altura ≤ 40% da actual a 1440 px | Utilizador | Open |
| REQ-002 | Cores do logótipo e composição em mosaico em todo o site público (D-51, substitui a direcção A) | Mandatory | High | Verde, amarelo, vermelho, preto e papel; Archivo; navegação lateral; consola, QA e documento intactos | Utilizador | Open |
| REQ-003 | Efeito 01: títulos revelados por linhas | Mandatory | High | SplitText com máscara nos títulos de secção; texto legível sem JS | Utilizador | Open |
| REQ-004 | Efeito 02: números que contam | Mandatory | Medium | Só números reais (10, 6, 7); valor final no HTML | Utilizador | Open |
| REQ-005 | Efeito 03: fluxo desenhado com o scroll | Mandatory | Medium | Linha com `scrub` e passos que acendem; reversível | Utilizador | Open |
| REQ-006 | Efeito 05: cartões empilhados | Mandatory | Medium | Os 4 problemas em `sticky` com escala; funciona no telemóvel | Utilizador | Open |
| REQ-007 | Efeito 06: arco que se abre | Mandatory | Medium | `clip-path` com `scrub` na entrada do diagnóstico | Utilizador | Open |
| REQ-008 | Efeito 08: botão magnético | Mandatory | Low | Só com rato fino; sem efeito no toque | Utilizador | Open |
| REQ-009 | Efeito 10: transição entre páginas | Mandatory | Medium | Cortina azul entre rotas do site público; foco gerido; sem atraso na navegação > 1 s | Utilizador | Open |
| REQ-010 | Movimento reduzido | Mandatory | High | Com `prefers-reduced-motion: reduce`, nada se move e tudo fica visível | WIE-X M14/M21 | Open |
| REQ-011 | Sem regressões | Mandatory | High | `pnpm test`, `typecheck`, `lint`, `build` verdes; rotas, sitemap, canonical e hreflang iguais; formulário de diagnóstico grava em pré-visualização | WIE-X M19 | Open |
| REQ-012 | Acessibilidade WCAG 2.1 AA | Mandatory | High | axe sem violações sérias em todas as rotas públicas; contraste ≥ 4,5:1 | WIE-X M21 | Open |
| REQ-013 | Desempenho no telemóvel | Mandatory | High | LCP ≤ 2,5 s e CLS ≤ 0,1 no perfil móvel do QA; JS novo ≤ 10 KB gzip além do actual | WIE-X M22 | Open |
| REQ-014 | Português e inglês em paridade | Important | Medium | As páginas `/en` com o mesmo desenho e os mesmos efeitos | Site actual | Open |
| REQ-015 | Verdade do conteúdo | Mandatory | High | Nenhum cliente, número ou depoimento inventado; demonstrações identificadas | `content/types.ts` | Open |
| REQ-016 | Produção só com aprovação | Mandatory | High | Pré-visualização aprovada pelo fundador antes de `main` | WIE-X M35 | Open |
| REQ-017 | Cena 3D, efeitos 4, 7 e 9 | Out of Scope | — | — | Escolha do utilizador | Closed |

## Assumptions (Module 04.2 — each one labelled)

| ID | Assumption | Reversible? | Impact if wrong | Validate by |
|---|---|---|---|---|
| A-01 | ASSUMED: o botão principal do topo é «Conversar no WhatsApp» e o segundo é «Preencher o pedido» (como na direcção C) | Sim | Menos pedidos por formulário | Aprovação do plano |
| A-02 | ASSUMED: o menu principal fica com Como funciona, Soluções, Setores, Cursos e Sobre; Cívico, News, Projetos (demo), FAQ e Global passam para o rodapé | Sim | Menos tráfego para essas páginas | Aprovação do plano |
| A-03 | ASSUMED: o título do topo é a pergunta da C; a frase da marca passa a subtítulo | Sim | Mensagem de marca menos visível | Aprovação do plano |
| A-04 | ASSUMED: a consola de gestão mantém o desenho actual | Sim | Duas linguagens visuais | Aprovação do plano |
| A-05 | ASSUMED: o novo desenho entra por uma camada de tokens limitada ao site público, sem mexer nos tokens da consola | Sim | — | Inspecção na Fase 1 |

## Open questions (max. 7 per round — Module 04.2)

1. Aprova os pressupostos A-01 a A-04 tal como estão?
