"""Shared helpers for WIE-X scripts (stdlib only)."""
import re, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent

def md_tables(text):
    """Yield tables from markdown as lists of dicts (header -> cell)."""
    lines = text.splitlines()
    i = 0
    while i < len(lines):
        if lines[i].strip().startswith("|") and i + 1 < len(lines) and re.match(r"^\s*\|[\s:\-|]+\|\s*$", lines[i + 1]):
            header = [c.strip() for c in lines[i].strip().strip("|").split("|")]
            rows = []
            j = i + 2
            while j < len(lines) and lines[j].strip().startswith("|"):
                cells = [c.strip() for c in lines[j].strip().strip("|").split("|")]
                cells += [""] * (len(header) - len(cells))
                rows.append(dict(zip(header, cells)))
                j += 1
            yield header, rows
            i = j
        else:
            i += 1

def find_table(text, required_cols):
    for header, rows in md_tables(text):
        if all(c in header for c in required_cols):
            return rows
    return []

def ids(cell, prefix):
    return re.findall(rf"\b{prefix}-\d+\b", cell or "")

def front_matter(text):
    m = re.match(r"^---\n(.*?)\n---\n", text, re.S)
    data = {}
    if not m:
        return data
    for line in m.group(1).splitlines():
        if ":" in line:
            k, v = line.split(":", 1)
            v = v.strip()
            if v.startswith("[") and v.endswith("]"):
                v = [x.strip().strip("'\"") for x in v[1:-1].split(",") if x.strip()]
            data[k.strip()] = v
    return data
