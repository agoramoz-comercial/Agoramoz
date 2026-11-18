# Estilos de Tabela

Todas as tabelas usam `<table class="z-table ...">`. Os números ficam à direita (`class="num"`) com dígitos tabulares. Os títulos vão em `<caption>`.

| Uso | Classe | Características |
|---|---|---|
| Lista simples, registos, pressupostos | `z-table` | Cabeçalho em maiúsculas pequenas, linha preta sob o cabeçalho, divisórias finas |
| Painel de KPIs, dados de destaque | `z-table z-table--blue` | Cabeçalho azul elétrico com cantos arredondados |
| Demonstração de resultados, balanço, cash flow | `z-table z-table--fin` | Linhas `indent`, `subtotal`, `total` (faixa preta) e `highlight` (lilás) |
| Tabelas longas | `z-table z-table--zebra` | Faixas alternadas muito subtis em azul |
| Itens de orçamento (rótulo … valor) | `.line-items` (componente) ou `z-table z-table--lines` | Linhas pretas, valores à direita, `li--total` |
| Tabelas em painéis pretos | dentro de `.on-dark` ou `z-table--dark` | Texto branco e divisórias translúcidas |

## Elementos dentro das células

| Elemento | HTML | Uso |
|---|---|---|
| Estado | `<span class="status status--good">OK</span>` (`--warn`, `--serious`, `--critical`) | Situação de KPIs e iniciativas — sempre ícone + texto |
| Sparkline | `<span class="spark" data-spark="[1,2,3]"></span>` | Tendência compacta |
| Barra de dados | `<span class="dbar" style="width:60%"></span>` | Magnitude relativa numa coluna |
| Mapa de calor | `<td class="num cell-h1">` … `cell-h5` | Retenção, matrizes, intensidades (h1 claro → h5 azul) |
| Comparação | `<td class="mk-yes">`, `mk-part`, `mk-no` | Matriz competitiva (cheio, meio, vazio) com legenda `.mk-legend` |
| Etiqueta de evidência | `<span class="tag tag--verified">verificado</span>` (`--estimate`, `--assumption`, `--unknown`, `--blue`) | Origem dos dados (ZABATAINA M02) |
| Ênfase | `<td class="strong">` | Primeira coluna, rubricas principais |

## Regras

1. Valores negativos em demonstrações financeiras entre parênteses: `(38.000)`.
2. Indique sempre a moeda e a unidade no título ou no cabeçalho ("US$", "US$ mil", "%").
3. No máximo cerca de 8 colunas em A4 retrato. Acima disso, divida em várias tabelas ou passe a página para paisagem.
4. Rodapé `<tfoot>` para totais. Notas e fontes em `.footnote` por baixo.
5. Separadores numéricos de acordo com o locale do documento (pt-PT: `1.240.000,5`; en-US: `1,240,000.5`).
6. Nada de grelhas completas nem bordas verticais. O estilo é editorial, só com linhas horizontais.

## Exemplo: demonstração de resultados

```html
<table class="z-table z-table--fin">
  <caption>Demonstração de resultados (US$)</caption>
  <thead><tr><th>Rubrica</th><th class="num">2025</th><th class="num">2026</th><th class="num">Var.</th></tr></thead>
  <tbody>
    <tr><td class="strong">Receita líquida</td><td class="num">980.000</td><td class="num">1.240.000</td><td class="num">+26,5%</td></tr>
    <tr class="indent"><td>Custo dos serviços</td><td class="num">(640.000)</td><td class="num">(848.000)</td><td class="num">+32,5%</td></tr>
    <tr class="subtotal"><td>Lucro bruto</td><td class="num">340.000</td><td class="num">392.000</td><td class="num">+15,3%</td></tr>
    <tr class="total"><td>Lucro líquido</td><td class="num">68.000</td><td class="num">89.000</td><td class="num">+30,9%</td></tr>
  </tbody>
</table>
```

## Exemplo: KPI com tendência e estado

```html
<table class="z-table z-table--blue">
  <thead><tr><th>KPI</th><th class="num">Real</th><th class="num">Meta</th><th>Tendência</th><th>Estado</th></tr></thead>
  <tbody>
    <tr><td class="strong">Leads</td><td class="num">412</td><td class="num">400</td>
        <td><span class="spark" data-spark="[300,320,350,340,380,412]"></span></td>
        <td><span class="status status--good">OK</span></td></tr>
  </tbody>
</table>
```
