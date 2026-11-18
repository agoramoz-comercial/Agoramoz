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
