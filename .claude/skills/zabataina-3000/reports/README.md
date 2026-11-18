# ZABATAINA 3000 — Motor de Documentos e Design Editorial

Este é o módulo de documentação da ZABATAINA 3000 (Parte IX — biblioteca de documentos; Parte XIX — relatórios). Todos os relatórios e documentos do sistema usam o mesmo design editorial A4: **azul elétrico `#1D2BE6`, pervinca `#7A80DA`, lavanda `#A9ACE3`/`#C8CAEE`, preto `#0C0C10` e papel `#F4F4F6`**. Tem títulos grandes, números enormes, rodapés alternados preto/azul (como num livro aberto) e blocos de imagem em duotone.

O resultado é um **PDF A4** gerado a partir de HTML. Funciona sem internet: a letra Inter Tight e o ECharts vêm incluídos.

## Três formas de produzir um documento

| Forma | Quando | Comando |
|---|---|---|
| **A. Relatório a partir do registo do processo** | Relatório de Execução (§53) e Relatório Final com Matriz de Requisitos (§54), sempre a partir de dados reais do processo | `python3 scripts/z3k.py report --pdf out.pdf` · `python3 scripts/z3k.py final --pdf out.pdf` |
| **B. Especificação JSON** (recomendado) | Qualquer documento da biblioteca: Brief Executivo, viabilidade, plano de 180 dias, proposta, plano de negócios… | `python3 reports/scripts/doc_builder.py spec.json out.html --pdf out.pdf [--png]` |
| **C. HTML à mão** | Layouts totalmente personalizados | Copiar `assets/template.html` e renderizar com `node reports/scripts/render_pdf.js in.html out.pdf --png` |

Os caminhos são relativos à pasta `zabataina-3000/`.

### Modelos prontos (`specs/`)

| Ficheiro | Documento | Módulos |
|---|---|---|
| `executive-brief.json` | Executive Intelligence Brief (resultado obrigatório do M01) | M01, M03, M06 |
| `financial-feasibility.json` | Viabilidade financeira: cenários, sensibilidade, economia por cliente, ponto de equilíbrio | M06, §28 |
| `plan-180-days.json` | Plano de transformação de 180 dias com gates e KPIs | M08, M17 |
| `commercial-proposal.json` | Proposta comercial | M07, M10, §27 |

Copie o modelo, substitua **todos** os marcadores `[…]` e os valores ilustrativos por dados reais, etiquete a origem e gere o documento. Os gráficos podem ler os dados diretamente do JSON produzido por `finance.py --json`: use `"data_file"` e `"data_key"` no bloco do gráfico.

## Ficheiros

| Caminho | Função |
|---|---|
| `scripts/doc_builder.py` | Especificação JSON → HTML A4. Divide automaticamente as tabelas longas por páginas e alterna os rodapés. |
| `scripts/render_pdf.js` | HTML → PDF (Playwright/Chromium) com `--png` para rever as páginas. Avisa quando há conteúdo a transbordar. |
| `assets/report.css` | Sistema de design: cores, tipografia, páginas, componentes e tabelas |
| `assets/charts.js` | `ZChart`: 20 tipos de gráfico com paletas validadas para daltonismo |
| `assets/fonts/` | Inter Tight (licença OFL), incluída para funcionar sem internet |
| `assets/vendor/` | ECharts 5.6 (Apache 2.0) e `NOTICE.md` |
| `assets/template.html` | Modelo HTML de 11 páginas com todos os componentes |
| `references/document-spec.md` | **Referência de todos os blocos da especificação JSON** |
| `references/document-library.md` | **Estrutura de cada documento da biblioteca (§27)**, com blocos e gráficos recomendados |
| `references/chart-catalog.md` | Que gráfico usar para cada pedido e o formato de dados de cada tipo |
| `references/components.md` | Componentes HTML (para a forma C) |
| `references/tables.md` | Estilos de tabela |
| `examples/` | PDFs de referência |

## Quando usar

Use-o em relatórios, diagnósticos, briefs, planos, propostas, planos de negócios, memorandos de investimento, estudos de viabilidade e de mercado, relatórios de auditoria e de execução, e em qualquer documento formal da ZABATAINA.

**Não** o use em respostas curtas no chat, e-mails ou notas rápidas: nesses casos responda em texto. Se o utilizador pedir Word ou PowerPoint, mantenha as mesmas cores, letra e hierarquia nesse formato.

## Regras (não negociáveis)

- **Nunca inventar números**, testemunhos, certificações ou resultados (§27). Os modelos trazem valores ilustrativos que têm de ser substituídos. Sem dados, mantenha o marcador e diga-o.
- Etiquete a origem dos números (`[VERIFIED]`, `[CLIENT]`, `[ESTIMATE]`, `[ASSUMPTION]`, `[UNKNOWN]`) e coloque uma linha de fonte em cada gráfico. O nível de evidência E1–E4 vai para o registo de evidências.
- Separe sempre real, previsão e meta. Nunca apresente pipeline como receita, nem ARR ou valor da empresa como dinheiro em caixa.
- Os títulos dos gráficos dizem a conclusão, não só o tema.
- Antes de entregar: renderize com `--png`, olhe para cada página e corrija transbordos e sobreposições.

## Regras de design

- **Paleta fechada.** Cores extra só nos gráficos (azul-céu, âmbar e violeta, já validados) e nos estados (verde, amarelo, laranja e vermelho, sempre com ícone e texto).
- **Tipografia:** títulos display de 30–56 pt com peso 400; números de 17–36 pt com peso 700–800; texto corrido de 7–8,5 pt.
- **Ritmo:** alterne páginas claras, azuis e painéis pretos. Use uma ideia por página.
- **Imagens:** só imagens reais fornecidas pelo utilizador (`"src"` no bloco `photo`). Sem imagem, o sistema usa o motivo abstrato do arco.
