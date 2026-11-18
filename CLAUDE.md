@AGENTS.md

## Engenharia: ZABATAINA CODEFORGE 3000

Para trabalho de engenharia neste projecto (construir, corrigir, auditar), usar a skill `codeforge-3000` em `.claude/skills/codeforge-3000/`. Origem: `agoramoz-comercial/zabataina`, commit 8c13a67.

- **Antes de mexer:** correr `python3 -I .claude/skills/codeforge-3000/scripts/repo_scan.py .`, `flow_audit.py .` e `secret_scan.py .`.
- **Escala:** ajustar o processo ao tamanho da tarefa. Uma correcção de uma linha pede só scan, execução e teste.
- **Achados:** os do `flow_audit` são heurísticos. Confirmar a correr o fluxo antes de os dar como defeito. Em 18/11/2026, os 34 achados eram falsos positivos: `Button asChild` com `Link`, `Dialog.Trigger` e formulário com Server Action. As duas «chaves» do `secret_scan` são valores de teste.
