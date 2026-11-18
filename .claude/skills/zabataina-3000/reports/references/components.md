# Sistema de Design — Páginas e Componentes

Todos os estilos estão em `assets/report.css`. Copie os blocos HTML abaixo. Para ver tudo em uso, abra `assets/template.html` ou `examples/modelo-editorial.pdf`.

## 1. Tokens

| Token | Valor | Uso |
|---|---|---|
| `--z-blue` | `#1D2BE6` | Cor principal, páginas azuis, rodapé direito, destaques |
| `--z-blue-deep` | `#131C9C` | Azul profundo (fim de gradiente, maior magnitude) |
| `--z-peri` | `#7A80DA` | Pervinca: tiles, gradientes |
| `--z-lav` | `#A9ACE3` | Lavanda: tiles, gradientes |
| `--z-lilac` | `#C8CAEE` | Fundo lilás de secções ("Insight de Clientes") |
| `--z-ink` | `#0C0C10` | Preto: rodapé esquerdo, painéis, linhas |
| `--z-paper` | `#F4F4F6` | Fundo das páginas claras |
| `--z-grad-h` | lavanda → azul (horizontal) | Faixas de topo |
| `--z-grad-v` | lilás → azul (vertical) | Blocos laterais, mosaico |
| `--z-grad-blue` | azul → azul profundo | Capa, páginas azuis |
| Fonte | Inter Tight (Google Fonts) → Inter Display → Inter → Helvetica | Toda a peça |

## 2. Anatomia da página

```html
<section class="page">                       <!-- A4 210×297 mm. Variantes: page--blue, page--ink, page--lilac -->
  <div class="page-top">                      <!-- opcional: marca + ano -->
    <div class="brand"><svg class="brand-mark">…</svg><span>Nome da Empresa</span></div>
    <div class="year">2026<sup>2027</sup></div>
  </div>
  <div class="page-body"> … conteúdo … </div>
  <div class="page-footer">www.exemplo.com <span>contacto@exemplo.com</span></div>
  <!-- página direita: <div class="page-footer page-footer--blue"><span>Relatório Anual<br>Plano</span><span>Página 07</span></div> -->
</section>
```

Utilitários de layout: `.pad` (margem lateral de 14 mm), `.grid-2`, `.grid-3`, `.grid-2-1`, `.grid-1-2`, `.split` (duas metades sem espaço), `.between`, `.stack`, `.rule` / `.rule--ink`, `.cols-2` (texto em 2 colunas).

Fundos: `.bg-blue`, `.bg-blue-grad`, `.bg-grad-h`, `.bg-grad-v`, `.bg-ink`, `.bg-lilac`, `.bg-lav`, `.bg-peri`, `.bg-white`. Em fundos pretos, junte `.on-dark` para que gráficos, listas e tabelas usem a versão escura.

## 3. Tipos de página (receitas)

| Página | Estrutura |
|---|---|
| **Capa** | `page--blue` + `.bg-blue-grad`; título `.display--xl`; bloco `.photo`; 2 `.kpi-hero` no fundo |
| **Abertura de secção** (esquerda) | faixa `.bg-grad-h` de cerca de 72 mm com foto; título `.display` numerado ("01. Visão Geral"); `.stat-list` + texto `.cols-2` |
| **Página de KPIs** (direita) | `page--blue`; `.kpi-row` com 2 `.kpi-hero` alinhados à direita; `.mosaic` de tiles azuis com foto e texto |
| **Insight** | metade superior `.bg-lilac` com `.display--l`; metade inferior `.split`: foto + `.seg-list` |
| **Orçamento** | `.line-items` em cima à direita; `.display--l`; 2–3 `.metric`; tabela no fundo |
| **Painel de dados** | foto + bloco `.bg-grad-v`; painel `.bg-ink.on-dark` com `.figure-xl` + `.pill`; `.tiles` de composição |
| **Previsão** | `.h2` numerado; `.sig-bars`; `.line-items` + `.callout-card`; gráfico `breakEven` |
| **Galeria de gráficos** | `.page-top` com eyebrow; `.gallery` (grelha 2×3) de `.chart-card` |
| **Tabelas** | `.grid-2` de tabelas `.z-table`, mais `.tam` ou notas |

## 4. Componentes

### Título display
```html
<h1 class="display">02. Visão<br>Geral da Empresa</h1>   <!-- display--xl 56pt · --l 46pt · --m 30pt · --s 22pt -->
<h2 class="h2">4.2 Previsão de Receita<br>(2026–2028)</h2>
<div class="eyebrow">Secção · Subtítulo</div>
```

### KPI hero (números grandes sobre azul)
```html
<div class="kpi-row">
  <div class="kpi-hero"><b>US$ 213,5K</b><span>Receita do período</span></div>
  <div class="kpi-hero"><b>31,6%</b><span>Margem bruta</span></div>
</div>
```

### Lista de estatísticas (2000 / Fundação)
```html
<div class="stat-list">
  <div class="stat"><b>2014</b><span>Fundação</span></div>
  <div class="stat"><b>148</b><span>Colaboradores</span></div>
</div>
```

### Segmentos (↗ nome … %)
```html
<div class="seg-list">
  <div class="seg"><span class="arr">↗</span>
    <div><div class="name">Segmento<br>PME</div><div class="desc">Descrição curta.</div></div>
    <span class="pct">60%</span></div>
</div>
```

### Linhas de valor (orçamento)
```html
<div class="line-items">
  <div class="li"><span>Energia renovável</span><span>US$ 10.000</span></div>
  <div class="li li--total"><span>Total</span><span>US$ 35.000</span></div>
</div>
```

### Métrica com explicação (15% ROI)
```html
<div class="metric"><div><div class="big">15% ROI</div><div class="lbl">Energia renovável</div></div>
  <div><div class="ttl">Investir no que tem retorno</div><p class="body-text">Texto…</p></div></div>
```

### Número gigante com pílula (painel preto)
```html
<div class="bg-ink on-dark pad pad-y">
  <span class="figure-xl">US$ 120M</span> <span class="pill">−10% agora</span>
</div>
```

### Tiles de composição (45% / 25% / 20% / 10%)
```html
<div class="tile-heads"><span>Motor principal</span><span>Escala</span><span>Recorrente</span><span>Não essencial</span></div>
<div class="tiles">
  <div class="tile tile--white"><b>45%</b><small>Subscrições</small></div>
  <div class="tile tile--blue"><b>25%</b><small>Créditos</small></div>
  <div class="tile tile--peri"><b>20%</b><small>Licenças</small></div>
  <div class="tile tile--lav"><b>10%</b><small>Serviços</small></div>
</div>
```

### Barras-assinatura (previsão em colunas arredondadas)
```html
<div class="sig-bars">
  <div class="sig-bar"><div class="val">130M</div><div class="col" style="--h:55%"><span>2030</span></div></div>
  <div class="sig-bar"><div class="meta">Crescimento<br>+ 28,8%</div><div class="val">167,5M</div><div class="col" style="--h:70%"><span>2040</span></div></div>
  <div class="sig-bar"><div class="meta">Crescimento<br>+ 37,1%</div><div class="val">230,2M</div><div class="col" style="--h:95%"><span>2045</span></div></div>
</div>
```
A altura `--h` tem de ser proporcional ao valor: `--h = valor ÷ máximo × 95%`. Calcule-a, não a estime a olho.

### Cartão destaque ($79M)
```html
<div class="callout-card"><div class="top"><span>Custo fixo<br>anual</span><span class="ico">↙</span></div><b>US$ 79M</b></div>
```

### Progresso das Trilhas A–D (ZABATAINA)
```html
<div class="tracks">
  <div class="track"><span>Trilha A — Receita</span><div class="bar"><i style="--p:62%"></i></div><span class="v">US$ 620K</span></div>
</div>
```

### TAM / SAM / SOM
```html
<div class="tam"><div class="c c1"><b>US$ 48M</b>TAM</div><div class="c c2"><b>US$ 12M</b>SAM</div><div class="c c3"><b>US$ 1,4M</b>SOM</div></div>
```

### Mosaico azul
```html
<div class="mosaic" style="grid-template-rows:1fr 1fr">
  <div class="t5"></div><div class="t2"></div><div class="photo photo--arch photo--duo"></div><div class="t1"></div>
  <div class="t3"></div><div class="t1 txt">Texto curto…</div><div class="t2"></div><div class="t4"></div>
</div>
```

### Imagens
```html
<div class="photo photo--duo" style="height:60mm"><img src="foto.jpg" alt=""></div>  <!-- foto real em duotone azul -->
<div class="photo photo--soft" style="height:60mm"><img src="foto.jpg" alt=""></div> <!-- duotone lavanda -->
<div class="photo photo--arch" style="height:60mm"></div>                             <!-- placeholder abstrato -->
```

### Cartão de gráfico
```html
<div class="chart-card">
  <h4>Título-conclusão</h4><div class="sub">Unidade · período</div>
  <div class="chart" data-chart="bars"><script type="application/json">{"data":{…},"opts":{…}}</script></div>
  <div class="source">Fonte: … </div>
</div>
```

### Etiquetas de evidência
```html
<span class="tag tag--verified">verificado</span> <span class="tag tag--blue">cliente</span>
<span class="tag tag--estimate">estimativa</span> <span class="tag tag--assumption">pressuposto</span>
<span class="tag tag--unknown">desconhecido</span>
```

## 5. Boas práticas de composição

- Uma ideia por página. A conclusão vai no título ou no número grande.
- Alterne o ritmo: claro → azul → claro → preto. Nunca duas páginas de galeria de gráficos seguidas sem uma página editorial pelo meio, exceto em anexos.
- Respiração: deixe espaço vazio intencional, como no topo da página de orçamento. Não encha todos os cantos.
- Em `.gallery`, use 4 a 6 gráficos por página. Um gráfico principal pode ocupar duas colunas com `style="grid-column: span 2"`.
- Antes de entregar, renderize com `--png`, olhe para cada página e corrija transbordos e sobreposições.
