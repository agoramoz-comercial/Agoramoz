# Catálogo de Gráficos Avançados

Escolha o gráfico pela **pergunta que os dados respondem**, nunca pela aparência. Todos os tipos são renderizados por `ZChart` (`assets/charts.js`) com `data-chart="<tipo>"`.

Formato geral:

```html
<div class="chart" data-chart="TIPO"><script type="application/json">
{"data": { ... }, "opts": { "prefix": "US$ ", "suffix": "", "decimals": 1, "compact": true, "locale": "pt-PT" }}
</script></div>
```

Opções de formatação comuns (`opts`): `prefix`, `suffix`, `decimals`, `compact` (K/M/B, ligado por omissão; use `false` para valores pequenos ou percentagens) e `locale` (por omissão `pt-PT`; use `en-US`, `pt-BR`, etc.).

---

## 1. Pedido → gráfico recomendado

| Pedido / pergunta | Gráfico | `data-chart` | Alternativa |
|---|---|---|---|
| Quanto vale um número só (receita, margem, meta) | **Não é gráfico** — número grande `.kpi-hero` / `.figure-xl` | — | `.callout-card` |
| Evolução de receita por ano ou trimestre (poucos pontos) | Barras arredondadas sequenciais | `bars` | `.sig-bars` (HTML) |
| Comparar real vs. meta por período | Barras agrupadas | `groupedBars` | `bullet` |
| Tendência ao longo do tempo (muitos pontos, ≤4 séries) | Linhas com etiqueta final | `lines` | `lines` com `opts.area` (1 série) |
| Previsão / projeção com incerteza | **Leque de cenários** (base + intervalo + real) | `scenarioFan` | `lines` |
| O que explica a variação do lucro/receita/caixa | **Cascata (ponte)** | `waterfall` | `dumbbell` |
| Que variáveis mais afetam o resultado | **Tornado (sensibilidade)** | `tornado` | — |
| Quantas unidades para cobrir custos | **Ponto de equilíbrio** | `breakEven` | `.line-items` + `.callout-card` |
| Progresso face a metas (vários KPIs) | **Bullet** (% da meta) | `bullet` | `.tracks` (HTML, Trilhas A–D) |
| Conversão entre etapas de venda/marketing | **Funil** | `funnel` | `dumbbell` (antes/depois) |
| Retenção de clientes ao longo do tempo | **Heatmap de coortes** | `heatmap` | tabela `.cell-h1…h5` |
| Sazonalidade (mês × dia/semana/ano) | Heatmap | `heatmap` | `lines` |
| Riscos por probabilidade e impacto | **Matriz de riscos 5×5** | `riskMatrix` | tabela de riscos |
| Posição face à concorrência (2 dimensões + tamanho) | **Mapa de bolhas** com quadrantes | `bubble` | tabela comparativa `.mk-*` |
| Origem → destino do dinheiro, clientes ou leads | **Sankey** | `sankey` | `stacked100` |
| Estrutura de custos ou de mercado (partes de um todo, muitas partes) | **Treemap** | `treemap` | `pareto` |
| Mix de receita (≤5 partes) | Donut com total ao centro | `donut` | `.tiles` (HTML) |
| Composição comparada entre grupos | **100% empilhado horizontal** | `stacked100` | `groupedBars` |
| Concentração (clientes, produtos, causas — regra 80/20) | **Pareto** (barras ordenadas + % acumulada) | `pareto` | `treemap` |
| Antes vs. depois de uma iniciativa | **Dumbbell** | `dumbbell` | `groupedBars` |
| Avaliação de capacidades (escala 0–4, atual vs. meta) | **Radar** (≤2 séries) | `radar` | `bullet` |
| Plano, roteiro ou cronograma com fases e decisões | **Gantt com gates** | `gantt` | tabela de ações |
| Mercado endereçável | Círculos TAM/SAM/SOM | — (`.tam` HTML) | `bars` |
| Tendência mínima dentro de uma tabela | Sparkline | `data-spark="[...]"` | — |

### Por tipo de documento (atalhos)

| Documento | Gráficos típicos |
|---|---|
| Relatório anual / desempenho | `bars`, `groupedBars`, `waterfall`, `donut`, `bullet`, tabela financeira |
| Diagnóstico de negócio (ZABATAINA M03) | `.tracks`, `radar`, `funnel`, `pareto`, `heatmap` de coortes |
| Viabilidade US$1M (M06) | `scenarioFan`, `tornado`, `breakEven`, `waterfall` |
| Estudo de mercado (M04/M05) | `.tam`, `bubble`, `treemap`, `stacked100` |
| Plano de 180 dias (M08) | `gantt`, `bullet`, tabela de iniciativas com estado |
| Marketing e vendas (M09/M10) | `funnel`, `sankey`, `dumbbell`, `groupedBars` |
| Risco e governação (M16) | `riskMatrix`, tabela de riscos |
| Painel semanal (M17) | `bullet`, tabela KPI com sparkline e estado, `lines` |
| Orçamento / proposta | `.line-items`, `treemap`, `breakEven`, `donut` |

---

## 2. Formatos de dados

### `bars` — barras arredondadas
```json
{"data": {"categories": ["2026","2027","2028"], "values": [1300000,1700000,2300000]},
 "opts": {"prefix":"US$ ", "horizontal": false, "uniform": false, "highlight": null, "axis": true}}
```
Por omissão, a cor segue a rampa sequencial (claro → escuro) da esquerda para a direita, como na assinatura visual. `uniform:true` usa só azul; `highlight:i` destaca uma barra.

### `groupedBars`
```json
{"data": {"categories": ["Jan","Fev"], "series": [{"name":"Real","values":[82000,91000]},{"name":"Meta","values":[90000,95000]}]}, "opts": {"labels": false}}
```

### `lines`
```json
{"data": {"x": ["Jan","Fev","Mar"], "series": [{"name":"Receita","values":[100,108,112]}]}, "opts": {"area": true}}
```

### `scenarioFan`
```json
{"data": {"x": ["M1","M2","M3"], "conservative": [60,140,240], "base": [80,190,330], "ambitious": [95,230,410], "actual": [78,null,null]}}
```

### `waterfall`
```json
{"data": {"steps": [{"name":"2025","value":420000,"type":"start"},{"name":"Preço","value":85000},{"name":"Custos","value":-38000},{"name":"2026","type":"total"}]},
 "opts": {"totalLabel":"Total","upLabel":"Aumento","downLabel":"Redução"}}
```
O `total` sem valor é calculado automaticamente.

### `tornado`
```json
{"data": {"base": 300000, "items": [{"name":"Preço","low":190000,"high":410000}]}, "opts": {"lowLabel":"−20%","highLabel":"+20%"}}
```
`low` e `high` são **resultados** (ex.: lucro) quando a variável desce ou sobe. As linhas são ordenadas pela amplitude.

### `breakEven`
```json
{"data": {"fixed": 45000, "variable": 250, "price": 550, "maxUnits": 300}, "opts": {"unitName":"Unidades / mês"}}
```

### `bullet`
```json
{"data": {"items": [{"name":"Receita","actual":620000,"target":1000000,"prefix":"US$ "},{"name":"Margem","actual":31.6,"target":35,"suffix":"%","compact":false}]},
 "opts": {"ranges": [70,100,130]}}
```
Cada item é mostrado em % da sua meta. A formatação de cada item vem das suas próprias chaves (`prefix`/`suffix`/`compact`).

### `funnel`
```json
{"data": {"stages": [{"name":"Leads","value":2400},{"name":"Qualificados","value":720}]}, "opts": {"compact": false}}
```

### `heatmap`
```json
{"data": {"x": ["M0","M1"], "y": ["Jan","Fev"], "values": [[0,0,100],[1,0,82],[0,1,100]], "min": 60, "max": 100}, "opts": {"suffix":"%","compact":false}}
```
`values` = `[índiceX, índiceY, valor]`. Células vazias são simplesmente omitidas.

### `riskMatrix`
```json
{"data": {"risks": [{"id":"R1","p":4,"i":5}]}, "opts": {"xName":"Impacto →","yName":"Probabilidade →"}}
```

### `bubble`
```json
{"data": {"xName":"Preço relativo","yName":"Qualidade","series": [{"name":"Nós","points":[[62,78,18,"Nós"]]},{"name":"Concorrentes","points":[[80,70,30,"Líder"]]}]},
 "opts": {"quadrants": {"x": 60, "y": 60}}}
```
`points` = `[x, y, tamanho, rótulo]`. No máximo 3 séries.

### `sankey`
```json
{"data": {"nodes": [{"name":"Referências"},{"name":"PME"}], "links": [{"source":"Referências","target":"PME","value":220000}]}}
```

### `treemap` / `donut` / `pareto`
```json
{"data": {"items": [{"name":"Pessoal","value":420000},{"name":"Marketing","value":95000}]}}
```
O `donut` agrupa automaticamente acima de 5 fatias em "Outros" e aceita `centerValue` e `centerLabel`. O `pareto` aceita `opts.cut` (80 por omissão) e `opts.rotate`.

### `stacked100`
```json
{"data": {"categories": ["PME","Empresarial"], "series": [{"name":"Projetos","values":[260,200]},{"name":"Manutenção","values":[130,130]}]}}
```

### `dumbbell`
```json
{"data": {"items": [{"name":"Lead → Qualificado","before":22,"after":30}]}, "opts": {"suffix":"%","compact":false,"beforeLabel":"Antes","afterLabel":"Depois"}}
```

### `radar`
```json
{"data": {"indicators": [{"name":"Oferta","max":4}], "series": [{"name":"Atual","values":[3]},{"name":"Meta","values":[4]}]}}
```

### `gantt`
```json
{"data": {"phases": ["P1 Fundação","P2 Tração"], "tasks": [{"name":"Diagnóstico","start":0,"end":14,"phase":"P1 Fundação"}],
          "gates": [{"name":"G1","day":30}], "max": 180, "interval": 30}, "opts": {"unit": "Dia "}}
```

### Sparkline (em tabelas)
```html
<span class="spark" data-spark="[300,320,350,380,412]"></span>
```

### Uso programático
```js
ZChart.render(document.getElementById('x'), 'waterfall', data, { prefix: 'US$ ', mode: 'dark' });
ZChart.types; // lista de tipos disponíveis
```

---

## 3. Paletas (validadas — não alterar sem voltar a validar)

| Papel | Claro (papel/branco) | Escuro (painel preto) |
|---|---|---|
| Categórica (ordem fixa) | `#1D2BE6` `#2E9AD6` `#C58F2C` `#5B2FB0` `#8A8FE0` | `#4A57FA` `#2A92CC` `#B3842C` `#8670E6` |
| Sequencial (magnitude) | `#9EA2E3` → `#7A80DA` → `#5560E0` → `#1D2BE6` → `#131C9C` | `#2A2F7A` → … → `#C9CCFF` |
| Divergente | `#1D2BE6` (+) · `#C9C9D1` (neutro) · `#C2701F` (−) | `#4A57FA` · `#4A4A55` · `#C98A3A` |
| Estado (só com ícone e rótulo) | bom `#1E8E4E` · atenção `#C99400` · grave `#DD6B20` · crítico `#D33A3A` | idem |

A paleta categórica clara passa todos os testes de daltonismo (ΔE adjacente ≥ 19). Algumas cores ficam abaixo de 3:1 de contraste, por isso os gráficos levam sempre etiquetas diretas ou tabela. O limite em gráficos de dispersão é de 3 séries.

## 4. Anti-padrões (proibidos)

- Gráfico de dois eixos Y. Use dois gráficos ou um índice com base 100.
- Pizza ou donut com mais de 5 fatias, ou para comparar valores próximos.
- Gráficos 3D, sombras ou gradientes dentro das barras de dados (fora das `.sig-bars` decorativas).
- Arco-íris de cores, ou cores atribuídas pela posição em vez de pela entidade.
- Um número em cada ponto de uma linha longa.
- Eixo de barras que não começa em zero.
- Usar as cores de estado (verde/vermelho) como cores de série.
- Títulos que não dizem nada ("Gráfico 1").
