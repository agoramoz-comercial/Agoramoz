# STATE — AGORAMOZ website v2

> WIE-X project state (Module 10). Update at every checkpoint (Module 10.3). Keep it short: this is the first file loaded when work resumes.

| Field | Value |
|---|---|
| Project ID | PRJ-AGORAMOZ-WEBSITE-V2 |
| Objective | |
| Category (A–F) | |
| Complexity (L0–L4) | L3 |
| Risk level | |
| Autonomy level (A0–A4) | |
| Platform / environment | |
| Blueprint version | v0.1 |
| Current phase | |
| Last checkpoint | 2026-11-18 — Project initialised |

## Capability assessment (Module 01.2 — observed only)

Paste the output of `scripts/capability_probe.py` here and complete the agent-only rows.

## Status

- **Completed:**
- **In progress:**
- **Pending:**
- **Blockers:**
- **Decisions required from the user:**

## Key decisions (summary — full record in DECISIONS.md)

## Open risks (summary — full record in IMPLEMENTATION-PLAN.md § Risk register)

## Next action

One clear next step.

## Checkpoint log

| Date | Checkpoint (Module 10.3) | Summary | Next action |
|---|---|---|---|
| 2026-11-18 | Initialisation | `.wie-x/` created | Intake & requirements |

## 2026-11-18 · PH-1 Fundação — DONE

- Tokens v2 em `[data-v2]` (globals.css), só no site público; superfície `azul` e botão `claro`.
- Inter Tight via `next/font` nos layouts `(site)` e `(en)` (`lib/fonts/site.ts`).
- Casca: sem cursor próprio, índice lateral, grão e scroll suave (Lenis desligado, `suave={false}`).
- Navegação (A-02): barra com Soluções, Setores, Como trabalhamos, Cursos, Sobre; o resto na gaveta e no rodapé.
- Movimento: `CountUp` (02), `ScrubLine` (03), `CardStack` (05), `ArchReveal` (06); `SplitHeading` (01), `MagneticButton` (08) e `PageTransition` azul (10) reaproveitados. Lógica pura em `lib/motion/v2.ts` com 12 testes.
- Correcção: títulos `[data-split]` visíveis sem JavaScript (`<noscript>` no layout raiz).
- ESLint deixa de analisar `.claude/`, `.codeforge/` e `.wie-x/` (código das skills, não do site).
- Verificação: 1894 testes OK · typecheck OK · lint 0 erros · axe 0 violações em 6 rotas × 2 larguras (TESTED AND PASSED).
- Próximo: PH-2, página inicial com a estrutura C.
