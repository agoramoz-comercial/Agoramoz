#!/usr/bin/env python3
"""ZABATAINA 3000 — Editorial document builder (JSON spec → A4 HTML → PDF).

  python3 doc_builder.py spec.json out.html [--pdf out.pdf]

The spec describes pages and blocks; the builder applies the editorial design system (reports/assets).
Long tables are split across continuation pages automatically. Footers alternate ink/blue (book spread).
See reports/references/document-spec.md for every block type, and reports/specs/ for ready-made documents.
"""
import html, json, math, os, pathlib, re, shutil, subprocess, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent          # reports/
ASSETS = ROOT / "assets"
LABELS = {
    "pt": {"page": "Página", "cont": "(cont.)", "source": "Fonte", "tasks": "Tarefas", "verified": "Verificadas",
           "exec": "Relatório de Execução", "final": "Relatório Final de Conclusão", "next": "Próxima ação"},
    "en": {"page": "Page", "cont": "(cont.)", "source": "Source", "tasks": "Tasks", "verified": "Verified",
           "exec": "Execution Report", "final": "Final Completion Report", "next": "Next action"},
}
BRAND_SVG = ('<svg class="brand-mark" viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="2">'
             '<circle cx="20" cy="20" r="17"/><path d="M20 9 L31 29 H9 Z"/><path d="M20 17 L25 26 H15 Z" fill="currentColor"/></svg>')


def esc(s):
    s = html.escape(str(s if s is not None else ""))
    s = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", s)
    return s.replace("\n", "<br>")


def paras(text):
    return "".join(f"<p>{esc(p)}</p>" for p in str(text or "").split("\n\n") if p.strip())


# ------------------------------------------------------------------ cells
STATUS_MAP = {"VERIFIED": "good", "PASSED": "good", "OK": "good", "NEEDS_APPROVAL": "warn", "PARTIALLY VERIFIED": "warn",
              "AT RISK": "warn", "BLOCKED": "serious", "HIGH": "serious", "FAILED": "critical", "CRITICAL": "critical"}


def cell(c):
    if isinstance(c, dict):
        if "status" in c:
            kind = c["status"] if c["status"] in ("good", "warn", "serious", "critical") else STATUS_MAP.get(str(c["status"]).upper())
            if kind:
                return f'<span class="status status--{kind}">{esc(c.get("text", c["status"]))}</span>'
            return f'<span class="tag tag--blue">{esc(c.get("text", c["status"]))}</span>'
        if "tag" in c:
            return f'<span class="tag tag--{esc(c["tag"])}">{esc(c.get("text", c["tag"]))}</span>'
        if "spark" in c:
            return f'<span class="spark" data-spark="{esc(json.dumps(c["spark"]))}"></span>'
        if "bar" in c:
            w = max(0, min(100, float(c["bar"])))
            return f'<span class="dcell"><span class="dtrack"><span class="dbar" style="width:{w}%"></span></span>{esc(c.get("text", ""))}</span>'
        if "mark" in c:
            return f'<span class="mk-{esc(c["mark"])}"></span>'
    return esc(c)


# ------------------------------------------------------------------ blocks
def b_heading(b, ctx):
    lvl = b.get("level", "display")
    if lvl.startswith("display"):
        size = {"display": "", "display-xl": " display--xl", "display-l": " display--l", "display-m": " display--m", "display-s": " display--s"}.get(lvl, "")
        num = f'{esc(b["number"])}. ' if b.get("number") else ""
        return f'<h1 class="display{size}">{num}{esc(b["text"])}</h1>'
    if lvl == "eyebrow":
        return f'<div class="eyebrow">{esc(b["text"])}</div>'
    num = f'{esc(b["number"])} ' if b.get("number") else ""
    return f'<h2 class="h2">{num}{esc(b["text"])}</h2>' if lvl == "h2" else f'<div class="h3">{num}{esc(b["text"])}</div>'


def b_text(b, ctx):
    cls = "body-text" + (" cols-2" if b.get("columns") == 2 else "")
    return f'<div class="{cls}">{paras(b["text"])}</div>'


def b_bullets(b, ctx):
    return '<ul class="body-text" style="padding-left:4mm;margin:0">' + "".join(f"<li>{esc(i)}</li>" for i in b["items"]) + "</ul>"


def b_kpis(b, ctx):
    jc = "justify-content:flex-end;" if b.get("align") == "right" else ""
    return f'<div class="kpi-row" style="{jc}">' + "".join(
        f'<div class="kpi-hero"><b>{esc(i["value"])}</b><span>{esc(i["label"])}</span></div>' for i in b["items"]) + "</div>"


def b_stats(b, ctx):
    return '<div class="stat-list">' + "".join(
        f'<div class="stat"><b>{esc(i["value"])}</b><span>{esc(i["label"])}</span></div>' for i in b["items"]) + "</div>"


def b_tracks(b, ctx):
    return '<div class="tracks">' + "".join(
        f'<div class="track"><span>{esc(i["label"])}</span><div class="bar"><i style="--p:{max(0, min(100, float(i.get("pct", 0)))):.1f}%"></i></div>'
        f'<span class="v">{esc(i.get("value", ""))}</span></div>' for i in b["items"]) + "</div>"


def b_segments(b, ctx):
    return '<div class="seg-list">' + "".join(
        f'<div class="seg"><span class="arr">↗</span><div><div class="name">{esc(i["name"])}</div>'
        f'<div class="desc">{esc(i.get("desc", ""))}</div></div><span class="pct">{esc(i["value"])}</span></div>' for i in b["items"]) + "</div>"


def b_lineitems(b, ctx):
    return '<div class="line-items">' + "".join(
        f'<div class="li{" li--total" if i.get("total") else ""}"><span>{esc(i["label"])}</span><span>{esc(i["value"])}</span></div>'
        for i in b["items"]) + "</div>"


def b_metrics(b, ctx):
    return "<div>" + "".join(
        f'<div class="metric"><div><div class="big">{esc(i["big"])}</div><div class="lbl">{esc(i.get("label", ""))}</div></div>'
        f'<div><div class="ttl">{esc(i.get("title", ""))}</div><div class="body-text">{paras(i.get("text", ""))}</div></div></div>'
        for i in b["items"]) + "</div>"


def b_tiles(b, ctx):
    kinds = ["white", "blue", "peri", "lav"]
    heads = "".join(f"<span>{esc(h)}</span>" for h in b.get("heads", []))
    tiles = "".join(f'<div class="tile tile--{kinds[k % 4]}"><b>{esc(i["value"])}</b><small>{esc(i.get("label", ""))}</small></div>'
                    for k, i in enumerate(b["items"][:4]))
    return (f'<div class="tile-heads">{heads}</div>' if heads else "") + f'<div class="tiles">{tiles}</div>'


def b_hero(b, ctx):
    pill = f' <span class="pill" style="margin-left:2mm;vertical-align:middle">{esc(b["pill"])}</span>' if b.get("pill") else ""
    cap = f'<div class="eyebrow" style="text-align:right;opacity:.75;font-weight:500">{esc(b.get("caption", ""))}</div>'
    return f'<div class="between"><div><span class="figure-xl">{esc(b["value"])}</span>{pill}</div>{cap}</div>'


def b_sigbars(b, ctx):
    items = b["items"][:5]
    nums = [float(i["n"]) for i in items if "n" in i]
    mx = max(nums) if nums else None
    out = []
    for i in items:
        h = i.get("h") or (f'{95 * float(i["n"]) / mx:.1f}%' if mx and "n" in i else "50%")
        meta = f'<div class="meta">{esc(i["meta"])}</div>' if i.get("meta") else ""
        out.append(f'<div class="sig-bar">{meta}<div class="val">{esc(i["value"])}</div><div class="col" style="--h:{h}"><span>{esc(i["label"])}</span></div></div>')
    return f'<div class="sig-bars" style="height:{b.get("height", "62mm")}">' + "".join(out) + "</div>"


def b_callout(b, ctx):
    return (f'<div class="callout-card"><div class="top"><span>{esc(b.get("label", ""))}</span><span class="ico">↙</span></div>'
            f'<b>{esc(b["value"])}</b></div>')


def b_tam(b, ctx):
    return (f'<div class="tam"><div class="c c1"><b>{esc(b["tam"])}</b>TAM</div><div class="c c2"><b>{esc(b["sam"])}</b>SAM</div>'
            f'<div class="c c3"><b>{esc(b["som"])}</b>SOM</div></div>')


def chart_html(c, ctx):
    data = c.get("data")
    if c.get("data_file"):
        src = json.loads((ctx["base"] / c["data_file"]).read_text(encoding="utf-8"))
        data = src[c["data_key"]] if c.get("data_key") else src
    payload = json.dumps({"data": data, "opts": c.get("opts", {})}, ensure_ascii=False).replace("</", "<\\/")
    src_ = f'<div class="source">{esc(LABELS[ctx["lang"]]["source"])}: {esc(c["source"])}</div>' if c.get("source") else ""
    return (f'<div class="chart-card" style="{("height:" + c["height"]) if c.get("height") else ""}">'
            f'<h4>{esc(c.get("title", ""))}</h4><div class="sub">{esc(c.get("sub", ""))}</div>'
            f'<div class="chart" data-chart="{esc(c["chart"])}"><script type="application/json">{payload}</script></div>{src_}</div>')


def b_chart(b, ctx):
    return chart_html(b, ctx)


def b_charts(b, ctx):
    cols = b.get("cols", 2)
    h = b.get("row_height", "78mm")
    return (f'<div style="display:grid;grid-template-columns:repeat({cols},1fr);grid-auto-rows:{h};gap:5mm">'
            + "".join(chart_html(c, ctx) for c in b["items"]) + "</div>")


def b_table(b, ctx):
    style = {"blue": " z-table--blue", "fin": " z-table--fin", "zebra": " z-table--zebra", "lines": " z-table--lines"}.get(b.get("style", ""), "")
    cols = [c if isinstance(c, dict) else {"label": c} for c in b["columns"]]
    head = "".join(f'<th class="{"num" if c.get("num") else ""}">{esc(c["label"])}</th>' for c in cols)
    rc = b.get("row_classes") or []
    body = []
    for r_i, row in enumerate(b["rows"]):
        tds = "".join(f'<td class="{("num" if cols[j].get("num") else "") + (" strong" if j == 0 and b.get("strong_first", True) else "")}">{cell(v)}</td>'
                      for j, v in enumerate(row))
        body.append(f'<tr class="{esc(rc[r_i]) if r_i < len(rc) else ""}">{tds}</tr>')
    cap = f"<caption>{esc(b['caption'])}</caption>" if b.get("caption") else ""
    foot = f'<tfoot><tr><td colspan="{len(cols)}" class="footnote" style="font-weight:400">{esc(b["footnote"])}</td></tr></tfoot>' if b.get("footnote") else ""
    return f'<table class="z-table{style}">{cap}<thead><tr>{head}</tr></thead><tbody>{"".join(body)}</tbody>{foot}</table>'


def b_photo(b, ctx):
    style = f'height:{b.get("height", "60mm")};' + b.get("css", "")
    if b.get("src"):
        return f'<div class="photo photo--{b.get("tone", "duo")}" style="{style}"><img src="{esc(b["src"])}" alt="{esc(b.get("alt", ""))}"></div>'
    return f'<div class="photo photo--arch" style="{style}"></div>'


def b_grid(b, ctx):
    tmpl = {"2": "1fr 1fr", "3": "1fr 1fr 1fr", "1-2": "1fr 2fr", "2-1": "2fr 1fr", "1-1-2": "1fr 1fr 2fr"}.get(str(b.get("cols", "2")), "1fr 1fr")
    return (f'<div style="display:grid;grid-template-columns:{tmpl};gap:{b.get("gap", "8mm")};align-items:{b.get("align", "start")}">'
            + "".join(f"<div>{render_block(x, ctx)}</div>" for x in b["items"]) + "</div>")


def b_dark(b, ctx):
    return f'<div class="bg-ink on-dark" style="padding:8mm var(--pad);margin:0 calc(-1 * var(--pad));color:#fff">' + \
        "".join(render_block(x, ctx) for x in b["items"]) + "</div>"


def b_lead(b, ctx):
    return f'<p class="lead">{esc(b["text"])}</p>'


def b_toc(b, ctx):
    """Índice automático: páginas com `number` e `title` (ou um `heading` numerado), com o n.º de página real."""
    rows = []
    for n, pg in ctx.get("toc", []):
        rows.append(f'<tr><td class="n">{esc(pg["num"])}</td><td><div class="t">{esc(pg["title"])}</div>'
                    f'{("<div class=q>" + esc(pg["q"]) + "</div>") if pg.get("q") else ""}</td><td class="p">{n:02d}</td></tr>')
    return '<table class="toc">' + "".join(rows) + "</table>"


BLOCKS = {"heading": b_heading, "text": b_text, "bullets": b_bullets, "kpis": b_kpis, "stats": b_stats, "tracks": b_tracks,
          "segments": b_segments, "line-items": b_lineitems, "metrics": b_metrics, "tiles": b_tiles, "hero": b_hero,
          "sig-bars": b_sigbars, "callout": b_callout, "tam": b_tam, "chart": b_chart, "charts": b_charts, "table": b_table,
          "photo": b_photo, "grid": b_grid, "dark": b_dark,
          "rule": lambda b, c: '<hr class="rule rule--ink">', "spacer": lambda b, c: f'<div style="height:{b.get("h", "6mm")}"></div>',
          "note": lambda b, c: f'<p class="footnote">{esc(b["text"])}</p>',
          "lead": b_lead, "toc": b_toc}

# Ritmo vertical (v2.1): espaço antes de cada tipo de bloco quando o spec não diz `mt`.
RHYTHM = {"heading": "var(--s-4)", "lead": "var(--s-3)", "text": "var(--s-3)", "bullets": "var(--s-2)", "note": "var(--s-2)",
          "table": "var(--s-4)", "chart": "var(--s-4)", "charts": "var(--s-4)", "grid": "var(--s-4)", "kpis": "var(--s-5)",
          "metrics": "var(--s-4)", "callout": "var(--s-5)", "dark": "var(--s-5)", "tracks": "var(--s-4)", "tiles": "var(--s-4)",
          "stats": "var(--s-3)", "hero": "var(--s-4)", "toc": "var(--s-4)"}


def render_block(b, ctx):
    if b.get("type") == "push":
        return '<div class="blk-push"></div>'
    fn = BLOCKS.get(b.get("type"))
    if not fn:
        raise ValueError(f"unknown block type: {b.get('type')}")
    return f'<div class="blk" style="margin-top:{b.get("mt", RHYTHM.get(b.get("type"), "var(--s-3)"))}">{fn(b, ctx)}</div>'


def is_heading(b):
    return b.get("type") in ("heading", "lead") or (b.get("type") == "grid" and any(is_heading(x) for x in b.get("items", [])))


def render_groups(blocks, ctx):
    """Página `spread`: o espaço livre vai para entre grupos, e um título fica sempre colado ao bloco que o segue."""
    groups, cur = [], []
    for b in blocks:
        cur.append(b)
        if not (is_heading(b) or b.get("keep_with_next")):
            groups.append(cur); cur = []
    if cur:
        groups.append(cur)
    return "".join('<div class="blk-group">' + "".join(render_block(b, ctx) for b in g) + "</div>" for g in groups)


def find_numbered_heading(blocks):
    for b in blocks:
        if b.get("type") == "heading" and b.get("number"):
            return b
        if b.get("type") == "grid":
            h = find_numbered_heading(b.get("items", []))
            if h:
                return h
    return None


# ------------------------------------------------------------------ pages
def split_tables(pages, max_rows):
    out = []
    for pg in pages:
        extra = []
        for blk in pg.get("blocks", []):
            if blk.get("type") == "table":
                lim = blk.get("max_rows", max_rows)
                if len(blk["rows"]) > lim:
                    rows, blk["rows"] = blk["rows"], blk["rows"][:lim]
                    rcs = blk.get("row_classes") or []
                    for k in range(lim, len(rows), lim):
                        nb = dict(blk, rows=rows[k:k + lim], row_classes=rcs[k:k + lim],
                                  caption=(blk.get("caption", "") + " ") .strip() + " " + "(cont.)", mt="0mm")
                        extra.append({"layout": "standard", "eyebrow": pg.get("eyebrow", ""), "blocks": [nb]})
        out.append(pg); out += extra
    return out


def page_html(pg, i, n, meta, ctx):
    L = LABELS[ctx["lang"]]
    layout = pg.get("layout", "standard")
    footer_kind = pg.get("footer") or ("ink" if i % 2 == 1 else "blue")
    left = meta.get("website", "") if footer_kind == "ink" else esc(meta.get("doc_label", meta.get("title", ""))).replace(" · ", "<br>")
    right = f'{L["page"]} {i:02d}' if (i > 1 or footer_kind == "blue") else meta.get("email", "")
    footer = (f'<div class="page-footer{" page-footer--blue" if footer_kind == "blue" else ""}">'
              f'<span>{left if footer_kind == "blue" else esc(left)}</span><span>{esc(right)}</span></div>')
    year = f'<div class="year">{esc(meta.get("year", ""))}<sup>{esc(meta.get("year_sup", ""))}</sup></div>' if meta.get("year") else "<div></div>"
    brand = f'<div class="brand">{BRAND_SVG}<span>{esc(meta.get("organization", ""))}</span></div>'
    if pg.get("align") == "spread":
        blocks, flow = render_groups(pg.get("blocks", []), ctx), "flow flow--spread"
    else:
        blocks, flow = "".join(render_block(b, ctx) for b in pg.get("blocks", [])), "flow"
    eyebrow = f'<div class="eyebrow">{esc(pg.get("eyebrow", ""))}</div>'
    lead = f'<p class="lead">{esc(pg["lead"])}</p>' if pg.get("lead") else ""

    if layout == "cover":
        kp = b_kpis({"items": pg.get("kpis", [])}, ctx) if pg.get("kpis") else ""
        return (f'<section class="page page--blue"><div class="page-body bg-blue-grad"><div class="page-top">{brand}{year}</div>'
                f'<div class="pad" style="margin-top:28mm"><div class="eyebrow" style="opacity:.8">{esc(pg.get("eyebrow", ""))}</div>'
                f'<h1 class="display display--xl" style="margin-top:4mm">{esc(pg.get("title", meta.get("title", "")))}</h1>'
                f'<p class="body-text" style="max-width:120mm;margin-top:5mm">{esc(pg.get("subtitle", meta.get("subtitle", "")))}</p></div>'
                f'{b_photo({"height": "84mm", "src": pg.get("image"), "css": "margin:10mm var(--pad) 0"}, ctx)}'
                f'<div class="pad between" style="margin-top:auto;padding-bottom:9mm">{kp}'
                f'<div class="body-text" style="max-width:62mm;text-align:right">{esc(pg.get("note", ""))}</div></div>'
                f'</div>{footer}</section>')
    if layout == "section":
        num = f'{esc(pg["number"])}. ' if pg.get("number") else ""
        return (f'<section class="page"><div class="page-body"><div class="bg-grad-h" style="height:64mm;position:relative">'
                f'<div class="page-top">{brand}{year}</div>'
                f'{b_photo({"height": "34mm", "src": pg.get("image"), "css": "position:absolute;left:52mm;bottom:0;width:78mm"}, ctx)}</div>'
                f'<div class="pad" style="padding-top:10mm"><h1 class="display display--m">{num}{esc(pg.get("title", ""))}</h1>{lead}</div>'
                f'<div class="pad {flow}" style="padding-top:var(--s-4);padding-bottom:8mm">{blocks}</div></div>{footer}</section>')
    if layout == "lilac":
        return (f'<section class="page"><div class="page-body"><div class="bg-lilac" style="padding:18mm var(--pad) 10mm">'
                f'<h1 class="display display--l">{esc(pg.get("title", ""))}</h1>'
                f'<p class="body-text" style="max-width:120mm;margin-top:5mm;color:#2a2a35">{esc(pg.get("subtitle", ""))}</p></div>'
                f'<div class="pad {flow}" style="padding-bottom:8mm">{blocks}</div></div>{footer}</section>')
    cls = {"blue": "page page--blue", "dark": "page page--ink on-dark"}.get(layout, "page")
    if pg.get("title"):
        num = esc(pg["number"]) + ". " if pg.get("number") else ""
        tag = (f'<h2 class="h2 page-title">{num}{esc(pg["title"])}</h2>' if pg.get("title_size") == "h2"
               else f'<h1 class="display display--m page-title">{num}{esc(pg["title"])}</h1>')
        title = f'<div class="pad page-head">{tag}{lead}</div>'
        pad_top = "var(--s-4)"
    else:
        title, pad_top = "", "6mm"
    return (f'<section class="{cls}"><div class="page-top">{eyebrow}{year}</div><div class="page-body">{title}'
            f'<div class="pad {flow}" style="padding-top:{pad_top};padding-bottom:8mm">{blocks}</div></div>{footer}</section>')


def toc_entries(pages):
    """(n.º de página, {num, title, q}) para cada página numerada; `"toc": false` exclui uma página."""
    out = []
    for i, pg in enumerate(pages, 1):
        if pg.get("toc") is False or pg.get("layout") == "cover":
            continue
        num, title = pg.get("number"), pg.get("title") or pg.get("toc_title")
        if not (num and title):
            h = find_numbered_heading(pg.get("blocks", []))
            if h:
                num, title = h["number"], h["text"]
        if num and title and "(cont.)" not in str(title):
            out.append((i, {"num": num, "title": pg.get("toc_title", title), "q": pg.get("question", "")}))
    return out


def build(spec, out_html, spec_dir=None):
    meta = spec.get("meta", {})
    ctx = {"lang": meta.get("lang", "pt") if meta.get("lang", "pt") in LABELS else "pt", "base": pathlib.Path(spec_dir or ".")}
    pages = split_tables(spec["pages"], spec.get("max_table_rows", 18))
    ctx["toc"] = toc_entries(pages)
    body = "".join(page_html(p, i, len(pages), meta, ctx).replace("<section ", "<section data-nofill ", 1 if p.get("nofill") else 0)
                   for i, p in enumerate(pages, 1))
    out_html = pathlib.Path(out_html).resolve()
    adir = out_html.parent / "z3k-assets"
    if adir.resolve() != ASSETS.resolve():
        shutil.copytree(ASSETS, adir, dirs_exist_ok=True)
    doc = (f'<!doctype html><html lang="{ctx["lang"]}"><head><meta charset="utf-8"><title>{esc(meta.get("title", "Documento"))}</title>'
           f'<link rel="stylesheet" href="z3k-assets/report.css"><script src="z3k-assets/vendor/echarts.min.js"></script>'
           f'<script src="z3k-assets/charts.js"></script><style>.blk:first-child{{margin-top:0!important}}</style></head><body>{body}'
           f'<script>ZChart.autoRender();</script></body></html>')
    out_html.write_text(doc, encoding="utf-8")
    return out_html


# ------------------------------------------------------------------ process record → spec
def spec_from_process(d, lang="pt"):
    L = LABELS[lang]; p = d["process"]; T = d["tasks"]; R = d["requirements"]
    final = d["final"]
    groups = {"VERIFIED": 0, "EM CURSO": 0, "PENDENTE": 0, "BLOQUEADO/FALHOU": 0, "CANCELADO/ADIADO": 0}
    for t in T.values():
        s = t["status"]
        k = "VERIFIED" if s == "VERIFIED" else "EM CURSO" if s in ("IN_PROGRESS", "UNDER_VERIFICATION") else \
            "BLOQUEADO/FALHOU" if s in ("BLOCKED", "FAILED") else "CANCELADO/ADIADO" if s in ("CANCELLED", "DEFERRED") else "PENDENTE"
        groups[k] += 1
    mand = [r for r in R.values() if r["mandatory"]]
    mv = sum(r["status"] == "VERIFIED" for r in mand)

    def st(s):
        return {"status": s, "text": s.replace("_", " ")}
    tracks = []
    for k, v in sorted(d["tracks"].items()):
        try:
            pct = 100 * float(v.get("baseline", 0)) / float(v.get("target"))
        except (TypeError, ValueError, ZeroDivisionError):
            pct = 0
        tracks.append({"label": f"Trilha {k} — {({'A': 'Receita', 'B': 'Lucro líquido', 'C': 'ARR', 'D': 'Valor da empresa'})[k]}",
                       "pct": pct, "value": f"{v.get('baseline', '?')} / {v.get('target', '?')} {v.get('currency', '')}"})
    pages = [{"layout": "cover", "eyebrow": "ZABATAINA 3000 · " + (L["final"] if final else L["exec"]),
              "title": p["name"], "subtitle": p["objective"],
              "kpis": [{"value": f'{d["verified"]}/{d["total"]}', "label": "Tarefas verificadas"},
                       {"value": f"{mv}/{len(mand)}", "label": "Requisitos obrigatórios verificados"}],
              "note": f"Processo {p['process_id']} · registo v{p['version']} · {p['updated'][:16].replace('T', ' ')}"},
             {"layout": "section", "number": "01", "title": "Estado do Projeto", "blocks": [
                 {"type": "grid", "cols": "1-2", "gap": "10mm", "items": [
                     {"type": "stats", "items": [{"value": d["verified"], "label": "Verificadas"}, {"value": groups["EM CURSO"], "label": "Em curso"},
                                                 {"value": groups["PENDENTE"], "label": "Pendentes"}, {"value": groups["BLOQUEADO/FALHOU"], "label": "Bloqueadas / falhadas"}]},
                     {"type": "text", "text": f"**Resultado:** {d['outcome']}\n\n**Objetivo:** {p['objective']}\n\n**Fase:** {p['phase']} · **Modo:** {p['execution_mode']}\n\n"
                                              f"Só as tarefas VERIFIED contam como concluídas (Zero-Skip §34)."}]},
                 {"type": "chart", "chart": "donut", "title": "Distribuição das tarefas por estado", "sub": f"{d['total']} tarefas",
                  "data": {"items": [{"name": k, "value": v} for k, v in groups.items() if v], "centerValue": f"{d['verified']}/{d['total']}", "centerLabel": "verificadas"},
                  "opts": {"compact": False}, "height": "78mm", "mt": "8mm"}] + ([{"type": "tracks", "items": tracks, "mt": "6mm"}] if tracks else [])}]
    small = len(R) + len(T) <= 14
    if final or R:
        pages.append({"layout": "standard", "eyebrow": "02 · Matriz de requisitos (§54)" + (" e registo de tarefas" if small else ""),
                      "title": "Matriz de Requisitos" + (" e Tarefas" if small else ""), "number": "02", "blocks": [
            {"type": "table", "style": "blue", "columns": ["ID", "Requisito", "Entregável", "Critérios", "Evidência", "Estado"],
             "rows": [[k, r["text"] + ("" if r["mandatory"] else " (opcional)"), r["deliverable"], "; ".join(r["acceptance"]), "; ".join(r["evidence"]) or "—",
                       st(r["status"] + (" — " + r["justification"] if r["justification"] else ""))] for k, r in R.items()] or [["—", "Sem requisitos registados", "", "", "", ""]]}]})
    task_tbl = {"type": "table", "caption": "Registo de tarefas" if small and (final or R) else "", "mt": "8mm",
                "columns": ["Tarefa", "Prio", "Título", "Responsável", "Depende de", "Estado"],
                "rows": [[k, t["priority"], t["title"], t["owner"] or t["agent"] or "—", ", ".join(t["deps"]) or "—", st(t["status"])] for k, t in T.items()]
                or [["—", "", "Sem tarefas", "", "", ""]]}
    if small and (final or R):
        pages[-1]["blocks"].append(task_tbl)
    else:
        pages.append({"layout": "standard", "eyebrow": "03 · Registo de tarefas", "title": "Registo de Tarefas", "number": "03", "blocks": [task_tbl]})
    blk = [{"type": "table", "caption": "Bloqueios", "columns": ["Tarefa", "Motivo", "Próxima ação"],
            "rows": [[k, t["blocker"]["reason"], t["blocker"]["next"]] for k, t in T.items() if t["status"] == "BLOCKED"] or [["—", "Sem bloqueios", ""]]},
           {"type": "table", "caption": "Tentativas falhadas", "columns": ["Tarefa", "Tentativa", "Motivo"],
            "rows": [[k, f["attempt"], f["reason"]] for k, f in d["failures"]] or [["—", "", "Sem falhas registadas"]], "mt": "8mm"}]
    if d["risks"]:
        blk.append({"type": "grid", "cols": "2", "mt": "8mm", "items": [
            {"type": "chart", "chart": "riskMatrix", "title": "Matriz de riscos", "sub": "Probabilidade × impacto", "height": "80mm",
             "data": {"risks": [{"id": r["id"], "p": r["p"], "i": r["i"]} for r in d["risks"]]}},
            {"type": "table", "caption": "Registo de riscos", "columns": ["ID", "Risco", "Nível", "Mitigação"],
             "rows": [[r["id"], r["risk"], st(r["level"]), r["mitigation"]] for r in d["risks"]]}]})
    pages.append({"layout": "standard", "eyebrow": "04 · Bloqueios, falhas e riscos", "title": "Bloqueios, Falhas e Riscos", "number": "04", "blocks": blk})
    pages.append({"layout": "standard", "eyebrow": "05 · Decisões, evidências e entregáveis", "title": "Decisões e Evidências", "number": "05", "blocks": [
        {"type": "table", "caption": "Decisões", "columns": ["ID", "Decisão", "Fundamentação", "Por"],
         "rows": [[x["id"], x["decision"], x["rationale"], x["decided_by"]] for x in d["decisions"]] or [["—", "Sem decisões registadas", "", ""]]},
        {"type": "table", "caption": "Registo de evidências (E1–E4)", "mt": "8mm", "columns": ["ID", "Afirmação", "Fonte", "Nível", "Tipo", "Confiança"],
         "rows": [[e["id"], e["claim"], e["source"], {"tag": "blue", "text": e["tier"]}, e["type"], e["confidence"]] for e in d["evidence"]] or [["—", "Sem evidências registadas", "", "", "", ""]]},
        {"type": "table", "caption": "Entregáveis", "mt": "8mm", "columns": ["ID", "Entregável", "Localização"],
         "rows": [[x["id"], x["name"], x["path"]] for x in d["deliverables"]] or [["—", "Sem entregáveis registados", ""]]}]})
    nx = d["next"]
    closing = [{"type": "callout", "label": L["next"], "value": (nx[0][2] + " — " + nx[0][3]) if nx else "—"}]
    if final:
        closing = [{"type": "bullets", "items": [f"{x['lesson']} ({x['type']})" for x in d["lessons"]] or ["Sem lições registadas."]},
                   {"type": "note", "text": "Secções a completar pelo Orquestrador (§54): Sumário executivo, Pedido original, Arquitetura de implementação, "
                                            "Desvios, Resultado final, Processos reutilizáveis, Recomendações."}] + closing
    pages.append({"layout": "blue" if not final else "standard", "eyebrow": "06 · " + ("Lições e próximos passos" if final else "Próxima ação"),
                  "title": "Lições e Próximos Passos" if final else "Próxima Ação", "number": "06", "blocks": closing})
    return {"meta": {"title": (L["final"] if final else L["exec"]) + " — " + p["name"], "organization": p["name"],
                     "doc_label": "ZABATAINA 3000 · " + (L["final"] if final else L["exec"]), "year": p["updated"][:4], "lang": lang,
                     "website": p["project_id"]}, "pages": pages}


def main():
    a = sys.argv[1:]
    if len(a) < 2:
        print(__doc__); return 2
    spec_path, out = pathlib.Path(a[0]), pathlib.Path(a[1])
    spec = json.loads(spec_path.read_text(encoding="utf-8"))
    h = build(spec, out, spec_path.parent)
    print(f"HTML: {h}")
    if "--pdf" in a:
        pdf = a[a.index("--pdf") + 1]
        rc = subprocess.call(["node", str(ROOT / "scripts" / "render_pdf.js"), str(h), pdf] + (["--png"] if "--png" in a else []))
        return rc
    return 0


if __name__ == "__main__":
    sys.exit(main())
