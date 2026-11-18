# IMPLEMENTATION PLAN — AGORAMOZ website v2

Route: E / L3 / risco médio / autonomia A3 até à pré-visualização, A4 (aprovação) para produção.
Decisão de design: direcção C («Conversa») com a identidade da A («Editorial»); efeitos 1, 2, 3, 5, 6, 8, 10 (D-50).

## Arquitectura

- **Reutilizar, não reescrever.** O conteúdo continua em `content/` (fonte única, PT e EN). Muda a composição das páginas e a camada visual.
- **Tokens v2 limitados ao site público.** Novos tokens (`--v2-*`) e Inter Tight aplicados em `(site)` e `(en)` através do layout; `admin`, `(qa)`, `(documento)` e `(inquerito)` não mudam (A-05).
- **Movimento num só sítio.** `components/motion/` ganha `MaskedLines` (SplitText), `CountUp`, `ScrubLine`, `CardStack`, `ArchReveal`; reaproveita `MagneticButton` e `PageTransition` (cortina). Todos atrás de `gsap.matchMedia()` com movimento reduzido; HTML final legível sem JS.
- **Sem bibliotecas novas.** GSAP 3.15 já está no projecto; SplitText +3 KB gzip.

## Fases

| Fase | Entrega | Verificação |
|---|---|---|
| PH-1 Fundação | Tokens v2, Inter Tight via `next/font`, componentes de movimento, cabeçalho e rodapé novos | Testes unitários dos componentes; typecheck; axe no cabeçalho |
| PH-2 Página inicial | As 9 secções da C com os efeitos; PT e EN | Altura ≤ 40% da actual; LCP/CLS; axe; movimento reduzido; capturas a 360, 768, 1440 px |
| PH-3 Páginas interiores | Soluções (7), Setores, Como trabalhamos, Sobre, Contactos, Diagnóstico (formulário, só visual), FAQ, Privacidade, Segurança, Perfil, Cursos, News, Cívico, Países, Global, Projetos, `/en` | axe em todas as rotas (`.qa/axe-rotas.mjs`); formulário grava em pré-visualização; `flow_audit` do Codeforge |
| PH-4 Regressão completa | `pnpm test`, `lint`, `typecheck`, `build`; sitemap, canonical e hreflang comparados com produção | Rastreabilidade `traceability.py --strict` sem falhas |
| PH-5 Pré-visualização | Deployment de pré-visualização na Vercel a partir da branch | Revisão do fundador |
| PH-6 Produção | `main` → produção, só depois de aprovado (REQ-016) | Verificação pós-deploy: rotas 200, formulário, eventos |

## Riscos

| ID | Risco | Mitigação |
|---|---|---|
| R-001 | Tokens novos afectarem a consola | Tokens com prefixo próprio e aplicados só nos layouts públicos; captura da consola antes e depois |
| R-002 | Animações a prejudicar LCP/CLS no telemóvel | Nada do topo depende de JS para aparecer; SplitText só depois das fontes; orçamento de 10 KB |
| R-003 | Transição de página a atrasar a navegação | Cortina ≤ 0,9 s, cancelável; desligada com movimento reduzido |
| R-004 | Testes existentes presos ao texto ou à estrutura actual | Actualizar só os que testam desenho; os de comportamento ficam iguais |
| R-005 | Perder SEO | Mesmas rotas, metadados e dados estruturados; comparação automática com produção |

## Rollback

Produção volta ao commit anterior com uma promoção do deployment anterior na Vercel; a consola não muda nesta obra.
