# Document Spec Reference (`doc_builder.py`)

```json
{
  "meta": {"title": "…", "organization": "…", "doc_label": "ZABATAINA 3000 · …", "year": "2026", "year_sup": "2027",
           "website": "…", "email": "…", "lang": "pt"},
  "max_table_rows": 18,
  "pages": [ {"layout": "cover", …}, {"layout": "section", …}, … ]
}
```

`lang`: `pt` (default) or `en` (auto labels: page, source, next action). Footers alternate automatically (odd = ink with website, even = blue with `doc_label` and page number); force one with `"footer": "ink"|"blue"`.

## Page layouts

| layout | Fields | Look |
|---|---|---|
| `cover` | `eyebrow`, `title`, `subtitle`, `kpis:[{value,label}]`, `note`, `image` | Full blue gradient, huge title, photo block, KPIs at the bottom |
| `section` | `number`, `title`, `image`, `blocks` | Lavender→blue band with photo, "01. Title" display heading |
| `standard` | `eyebrow`, `number`, `title`, `blocks` | Paper page with eyebrow + year strip |
| `blue` | same as standard | Electric-blue page (white text) |
| `dark` | same as standard | Black page; charts switch to the dark palette |
| `lilac` | `title`, `subtitle`, `blocks` | Lilac top band (insight pages) |

## Layout v2.1 — structure and spacing

Page fields (all layouts except `cover`):

| Field | Effect |
|---|---|
| `title` + `number` | Page title as a `display-m` heading ("02. …"). Write the conclusion, not the topic. `"title_size": "h2"` keeps the old small title. |
| `lead` | Opening paragraph under the title, 11 pt. |
| `align: "spread"` | Spreads the blocks over the full page height. Free space goes **between groups**; a `heading`/`lead` (or a grid containing one) always stays with the block after it. `"keep_with_next": true` on any block does the same. |
| `question` | The question this section answers, shown in the automatic table of contents. |
| `toc: false` · `toc_title` | Leave a page out of the contents · title to use there (for pages whose title is a `hero`). |

New blocks: `{"type":"toc"}` (contents with real page numbers, built from pages with `number` + `title`, or a numbered `heading`, also inside grids), `{"type":"lead","text":…}` and `{"type":"push"}` (flexible space: everything after it goes to the bottom of the page).

**Vertical rhythm.** Without `"mt"`, each block gets the space for its type from the scale `--s-1`…`--s-6` (2.5 / 4 / 6 / 9 / 13 / 18 mm): text 6 mm; headings, tables, charts, grids and metrics 9 mm; KPIs, callouts and dark panels 13 mm. Set `"mt"` only to break the rhythm on purpose.

**Type scale.** Body 8.6 pt / 1.62, tables 8 pt with 2.7 mm cell padding, chart titles 10 pt, footnotes 6.8 pt.

**Renderer checks** (`render_pdf.js`, printed as `WARNING:`): overflow, **underfilled page** (more than a third empty at the bottom: use `spread`, `push` or more content) and **overlap** (a chart taller than its card, or adjacent blocks that touch). A finished document has no warnings. Mark a page that is meant to be sparse with `"nofill": true`.

## Blocks (`"type"`)

Every block accepts `"mt"` (top margin, default `5mm`).

| type | Fields | Use |
|---|---|---|
| `heading` | `text`, `level` (`display`, `display-xl/l/m/s`, `h2`, `h3`, `eyebrow`), `number` | Titles |
| `text` | `text` (paragraphs separated by blank lines, `**bold**`), `columns: 2` | Body copy |
| `bullets` | `items` | Lists |
| `kpis` | `items:[{value,label}]`, `align:"right"` | Big numbers (best on blue/cover) |
| `stats` | `items:[{value,label}]` | "2014 / Fundação" ruled list |
| `tracks` | `items:[{label,pct,value}]` | Progress of Tracks A–D or any target |
| `segments` | `items:[{name,desc,value}]` | ↗ segment … 60% list |
| `line-items` | `items:[{label,value,total}]` | Budget lines |
| `metrics` | `items:[{big,label,title,text}]` | "15% ROI" callouts |
| `tiles` | `heads:[4]`, `items:[{value,label}] (4)` | 45/25/20/10 composition tiles |
| `hero` | `value`, `pill`, `caption` | Giant figure (use inside `dark`) |
| `sig-bars` | `items:[{value,label,meta,n}]`, `height` | Signature rounded columns (height ∝ `n`) |
| `callout` | `label`, `value` | Black card ($79M) |
| `tam` | `tam`, `sam`, `som` | Nested market circles |
| `chart` | `chart`, `title`, `sub`, `source`, `data` **or** `data_file`+`data_key`, `opts`, `height` | One chart card (types in chart-catalog.md) |
| `charts` | `items:[chart…]`, `cols`, `row_height` | Grid of chart cards |
| `table` | `columns:[label or {label,num}]`, `rows`, `style` (`blue`, `fin`, `zebra`, `lines`), `row_classes` (`indent`, `subtotal`, `total`, `highlight`), `caption`, `footnote`, `max_rows`, `strong_first` | Tables (auto-split across pages) |
| `photo` | `src`, `tone` (`duo`, `soft`), `height` | Real image in duotone; without `src` → abstract arch |
| `grid` | `cols` (`2`, `3`, `1-2`, `2-1`), `items:[blocks]`, `gap`, `align` | Side-by-side blocks |
| `dark` | `items:[blocks]` | Black full-width panel inside a page |
| `rule` · `spacer` (`h`) · `note` (`text`) | — | Separators and footnotes |

### Table cell objects

| Cell | Renders |
|---|---|
| `{"status":"VERIFIED"}` / `{"status":"good|warn|serious|critical","text":"…"}` | Status chip with icon (VERIFIED, PARTIALLY VERIFIED, NEEDS_APPROVAL, BLOCKED, FAILED map automatically; other values → blue tag) |
| `{"tag":"verified|estimate|assumption|unknown|blue","text":"…"}` | Evidence tag |
| `{"spark":[1,2,3]}` | Sparkline |
| `{"bar":60,"text":"60%"}` | Inline data bar |
| `{"mark":"yes|part|no"}` | Comparison mark (●, half, ○) |

## Data from the calculators

```bash
python3 scripts/finance.py --json scenarios --leads 300,400,500 --qual .1,.12,.15 --close .15,.2,.25 --price 9000,10000,10000 > scen.json
```
```json
{"type": "chart", "chart": "scenarioFan", "data_file": "scen.json", "data_key": "chart_scenarioFan", "title": "…"}
{"type": "chart", "chart": "tornado",     "data_file": "scen.json", "data_key": "chart_tornado"}
```
`data_file` is relative to the spec file.
