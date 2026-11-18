@AGENTS.md

## Skills ZABATAINA (instaladas em `.claude/skills/`)

Origem: `agoramoz-comercial/zabataina`, commit c44f435. Usar a que corresponde à tarefa:

- `codeforge-3000`: engenharia de software (construir, corrigir, auditar), barreiras de qualidade, painel ao vivo.
- `wie-x`: inteligência de engenharia (investigação, planeamento, prompts, blueprints, auditorias técnicas).
- `zabataina-3000`: negócio (diagnóstico, estratégia, ofertas, plano de 180 dias, relatórios editoriais A4).

### Codeforge

- **Antes de mexer:** correr `python3 -I .claude/skills/codeforge-3000/scripts/repo_scan.py .`, `flow_audit.py .` e `secret_scan.py .`.
- **Escala:** ajustar o processo ao tamanho da tarefa. Uma correcção de uma linha pede só scan, execução e teste.
- **Achados:** os do `flow_audit` são heurísticos. Confirmar a correr o fluxo antes de os dar como defeito. Em 18/11/2026, os 34 achados eram falsos positivos: `Button asChild` com `Link`, `Dialog.Trigger` e formulário com Server Action. As duas «chaves» do `secret_scan` são valores de teste.

### Documentos premium (relatórios, briefs, planos, propostas)

Motor: `.claude/skills/zabataina-3000/reports/` (`doc_builder.py`, A4). Todo o documento formal segue este padrão:

- **Estrutura:** capa → resumo executivo numa página (a conclusão em título, 3 números, decisão pedida) → conteúdo com a pergunta a que cada secção responde → uma ideia por página → página de decisão → anexo de fontes e método (afirmação, fonte, nível E1–E4, data).
- **Títulos:** dizem a conclusão, não o tema («Forte a construir, fraco a vender», não «Capacidades»). Usar o bloco `heading` `display-m`, não o `title` pequeno da página.
- **Ritmo:** alternar páginas claras, azuis e uma preta para a mensagem principal (`hero`).
- **Visual:** pelo menos um gráfico do `chart-catalog.md` por secção analítica, com a fonte por baixo. Barras dentro de tabelas só em colunas largas.
- **Equilíbrio:** nenhuma página com a metade de baixo vazia. Usar `"align": "spread"` nas páginas (o espaço livre vai para entre grupos e os títulos ficam colados ao bloco seguinte) ou `{"type": "push"}`; preencher com conteúdo útil (gráfico maior, `tiles`, `kpis`, painel `dark` com a conclusão), não com `spacer`.
- **Motor v2.1:** texto a 8,6 pt e tabelas a 8 pt; ritmo vertical automático por tipo de bloco (não pôr `mt` sem motivo); índice com `{"type": "toc"}` e `question` em cada página; títulos de página com `title` + `number` + `lead`. Referência em `reports/references/document-spec.md`, secção «Layout v2.1».
- **Verdade:** cada número com etiqueta ([VERIFIED], [ESTIMATE], [ASSUMPTION], [HYPOTHESIS], [UNKNOWN]); nada inventado; referências propostas marcadas como tal.
- **Revisão:** renderizar com `--png`; o renderizador avisa de transbordo, página vazia e sobreposição, e um documento acabado sai **sem nenhum `WARNING`**. Depois ver a folha de contacto e uma página em tamanho real. Confirmar com `pdftotext` que não sobram marcadores `[…]`.
- **Confidencialidade:** o repositório é público. Diagnósticos, metas e números da empresa ficam fora do git (pasta temporária) e são entregues por ficheiro.
