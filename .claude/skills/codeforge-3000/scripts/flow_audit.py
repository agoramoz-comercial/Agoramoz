#!/usr/bin/env python3
"""Functional Flow Audit (CODEFORGE Module 15) — static detection of non-functional UI.

  python3 flow_audit.py <path> [--json] [--emit]   (exit 1 when HIGH findings exist)

Detects in JSX/TSX/JS/HTML/Vue/Svelte/Angular templates:
  DEAD_BUTTON      button with no click handler, not submitting a form
  EMPTY_HANDLER    handler that does nothing  (onClick={() => {}}, @click="", onclick="")
  STUB_HANDLER     handler that only logs/alerts
  FORM_NO_SUBMIT   form with no submit handler and no action
  DEAD_LINK        href="#", "", javascript: without a handler
  MISSING_API      client calls /api/... with no matching route definition in the repo
  BROKEN_NAV       internal link/router.push to a route that does not exist (Next.js app/pages routing)
Static heuristics: every finding must be confirmed by running the app/tests (M15/M16). --emit appends findings to
.codeforge/events.jsonl so they appear in the live dashboard's Error Monitor.
"""
import argparse, datetime as dt, json, os, pathlib, re, sys

SKIP = {".git", "node_modules", ".next", "dist", "build", ".venv", "venv", "__pycache__", "coverage", ".codeforge", "vendor"}
UI_EXT = {".jsx", ".tsx", ".js", ".ts", ".html", ".vue", ".svelte", ".htm"}
CLICK = re.compile(r"\b(onClick|onPress|onTap|@click|v-on:click|on:click|\(click\)|onclick|formAction|hx-(get|post|put|delete))\b", re.I)
SUBMIT_ATTR = re.compile(r"""type\s*=\s*(\{\s*)?["']submit["']""", re.I)
FORM_HANDLER = re.compile(r"\b(onSubmit|@submit|v-on:submit|on:submit|\(ngSubmit\)|\(submit\)|action|onsubmit|hx-post|method)\s*=", re.I)
EMPTY = re.compile(r"""(onClick|onPress|onSubmit)\s*=\s*\{\s*(\(\s*\w*\s*\)\s*=>\s*(\{\s*\}|null|undefined|void 0)|undefined|null)\s*\}|(@click|v-on:click|onclick)\s*=\s*["']\s*["']""", re.I)
STUB = re.compile(r"""(onClick|onPress|onSubmit)\s*=\s*\{\s*\(\s*\w*\s*\)\s*=>\s*\{?\s*(console\.(log|info|debug)|alert)\s*\(""", re.I)
DEAD_HREF = re.compile(r"""href\s*=\s*(\{\s*)?["'](#|javascript:[^"']*|)["']""", re.I)
API_CALL = re.compile(r"""(fetch|axios\.(get|post|put|patch|delete)|\$fetch|useFetch|ky\.(get|post))\s*\(\s*[`"'](/api/[^`"'?#\s]*)""")
ROUTE_DEF = re.compile(r"""\.(get|post|put|patch|delete|all|route)\s*\(\s*["'](/[^"']*)["']""")
NAV = re.compile(r"""(<Link[^>]*\bhref\s*=\s*(\{\s*)?["'](/[^"'#?]*)["']|router\.(push|replace)\(\s*["'](/[^"'#?]*)["']|navigate\(\s*["'](/[^"'#?]*)["'])""")


def files(root):
    for dp, dns, fns in os.walk(root):
        dns[:] = [d for d in dns if d not in SKIP]
        for f in fns:
            p = pathlib.Path(dp) / f
            yield p


def tag_spans(text, tag):
    """Yield (start, attrs) for <tag ...> handling braces/quotes inside JSX attributes."""
    for m in re.finditer(rf"<{tag}\b", text, re.I):
        i, depth, q = m.end(), 0, None
        while i < len(text):
            ch = text[i]
            if q:
                if ch == q: q = None
            elif ch in "\"'`": q = ch
            elif ch == "{": depth += 1
            elif ch == "}": depth -= 1
            elif ch == ">" and depth <= 0: break
            i += 1
        yield m.start(), text[m.end():i]


def line_of(text, pos):
    return text.count("\n", 0, pos) + 1


def route_patterns(root):
    """API routes and page routes from Next.js conventions + express-style definitions."""
    api, pages, has_defs = [], [], False
    for p in files(root):
        rel = p.relative_to(root).as_posix()
        m = re.search(r"(?:^|/)app/(api/.*)/route\.(t|j)sx?$", rel)
        if m: api.append("/" + m.group(1)); has_defs = True
        m = re.search(r"(?:^|/)pages/(api/.*)\.(t|j)sx?$", rel)
        if m: api.append("/" + re.sub(r"/index$", "", m.group(1))); has_defs = True
        m = re.search(r"(?:^|/)app/(.*?)/?page\.(t|j)sx?$", rel)
        if m: pages.append("/" + re.sub(r"\([^)]*\)/?", "", m.group(1)).strip("/"))
        m = re.search(r"(?:^|/)pages/(?!api/|_)(.*)\.(t|j)sx?$", rel)
        if m: pages.append("/" + re.sub(r"(^|/)index$", "", m.group(1)))
        if p.suffix in (".js", ".ts", ".mjs", ".py") and p.stat().st_size < 400_000:
            t = p.read_text(encoding="utf-8", errors="ignore")
            for d in ROUTE_DEF.findall(t):
                api.append(d[1]); has_defs = True
    norm = lambda r: "/" + r.strip("/") if r.strip("/") else "/"
    return [norm(x) for x in api], [norm(x) for x in pages], has_defs


def matches(path, patterns):
    """Match a concrete path against route patterns with [param], :param, [...catchall] and [[...optional]] segments."""
    path = "/" + path.strip("/")
    for pat in patterns:
        parts, rx = [x for x in pat.strip("/").split("/") if x], ""
        for seg in parts:
            if seg.startswith("[[...") or seg.startswith("[..."):
                rx += "(/.*)?"
                break
            rx += "/" + ("[^/]+" if (seg.startswith("[") and seg.endswith("]")) or seg.startswith(":") else re.escape(seg))
        if re.fullmatch((rx or "") + "/?", path) or (not parts and path == "/"):
            return True
    return False


def audit(root):
    root = pathlib.Path(root).resolve()
    api, pages, has_defs = route_patterns(root)
    F = []
    add = lambda rule, sev, f, ln, snip: F.append({"rule": rule, "severity": sev, "file": f, "line": ln, "snippet": snip.strip()[:140]})
    for p in files(root):
        if p.suffix not in UI_EXT or p.stat().st_size > 600_000:
            continue
        t = p.read_text(encoding="utf-8", errors="ignore")
        rel = p.relative_to(root).as_posix()
        forms_open = [(m.start(), 1) for m in re.finditer(r"<form\b", t, re.I)] + [(m.start(), -1) for m in re.finditer(r"</form\s*>", t, re.I)]
        forms_open.sort()

        def inside_form(pos):
            return sum(d for s, d in forms_open if s < pos) > 0
        for start, attrs in tag_spans(t, "button"):
            if CLICK.search(attrs):
                continue
            if SUBMIT_ATTR.search(attrs) or (inside_form(start) and not re.search(r"""type\s*=\s*(\{\s*)?["'](button|reset)["']""", attrs)):
                continue
            if re.search(r"\{\s*\.\.\.", attrs):          # spread props may carry a handler — cannot decide statically
                continue
            add("DEAD_BUTTON", "HIGH", rel, line_of(t, start), "<button" + attrs[:100])
        for start, attrs in tag_spans(t, "form"):
            if not FORM_HANDLER.search(attrs) and not re.search(r"\{\s*\.\.\.", attrs):
                add("FORM_NO_SUBMIT", "HIGH", rel, line_of(t, start), "<form" + attrs[:100])
        for m in EMPTY.finditer(t):
            add("EMPTY_HANDLER", "HIGH", rel, line_of(t, m.start()), m.group(0))
        for m in STUB.finditer(t):
            add("STUB_HANDLER", "MEDIUM", rel, line_of(t, m.start()), m.group(0))
        for start, attrs in tag_spans(t, "a"):
            if DEAD_HREF.search(attrs) and not CLICK.search(attrs):
                add("DEAD_LINK", "MEDIUM", rel, line_of(t, start), "<a" + attrs[:100])
        for m in API_CALL.finditer(t):
            path = m.group(4)
            if has_defs and not matches(path, api):
                add("MISSING_API", "HIGH", rel, line_of(t, m.start()), f"{m.group(1)} → {path} (no route definition found)")
        if pages:
            for m in NAV.finditer(t):
                path = m.group(3) or m.group(5) or m.group(6)
                if path and not matches(path, pages) and not matches(path, api):
                    add("BROKEN_NAV", "MEDIUM", rel, line_of(t, m.start()), f"→ {path} (no page route)")
    info = [] if has_defs else ["No API route definitions found — MISSING_API could not be evaluated (API may be external)."]
    return {"root": str(root), "findings": F, "api_routes": sorted(set(api)), "page_routes": sorted(set(pages)), "info": info}


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("path"); ap.add_argument("--json", action="store_true"); ap.add_argument("--emit", action="store_true")
    a = ap.parse_args()
    r = audit(a.path)
    high = [f for f in r["findings"] if f["severity"] == "HIGH"]
    if a.emit:
        d = pathlib.Path(a.path).resolve() / ".codeforge"; d.mkdir(exist_ok=True)
        ts = dt.datetime.now().isoformat(timespec="seconds")
        with open(d / "events.jsonl", "a", encoding="utf-8") as fh:
            for f in r["findings"]:
                fh.write(json.dumps({"ts": ts, "kind": "audit", **f}, ensure_ascii=False) + "\n")
            fh.write(json.dumps({"ts": ts, "kind": "audit_run", "total": len(r["findings"]), "high": len(high)}) + "\n")
    if a.json:
        print(json.dumps(r, indent=2, ensure_ascii=False)); return 1 if high else 0
    print(f"# Functional Flow Audit (M15) — {r['root']}\n")
    if not r["findings"]:
        print("No static functional defects detected. Still verify flows end-to-end with tests (M15 golden rule).")
    else:
        print("| Severity | Rule | Location | Snippet |\n|---|---|---|---|")
        for f in sorted(r["findings"], key=lambda x: (x["severity"] != "HIGH", x["file"], x["line"])):
            print(f"| {f['severity']} | {f['rule']} | `{f['file']}:{f['line']}` | `{f['snippet'].replace('|', '/')}` |")
    for i in r["info"]:
        print(f"\nNote: {i}")
    print(f"\n{len(r['findings'])} finding(s), {len(high)} HIGH. Static heuristics — confirm each by running the flow.")
    return 1 if high else 0


if __name__ == "__main__":
    sys.exit(main())
