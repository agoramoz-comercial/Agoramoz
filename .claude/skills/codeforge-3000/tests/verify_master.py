#!/usr/bin/env python3
"""Documentary integrity check for CODEFORGE-MASTER-v1.0.md (continuity, numbering, requirement counts, truncation).

  python3 tests/verify_master.py [--base <git-ref>]     (default base: origin/main)

1. Prior content unchanged: every line before the §10.3 junction equals the base version (only the integration-note
   line in the header may differ).
2. Junction: the truncated "…Show" sentence is completed, not duplicated.
3. Numbering: Parts I…N consecutive; MODULE 01–20 present once; numbered sections 1…N consecutive; subsections X.1…X.k
   consecutive inside each section; no duplicate headings.
4. Requirement counts per subsection match the received continuation (counted from the source message).
5. Mandatory repositories ECC, CLI-Anything, REA present with their official URLs.
6. While incomplete: exactly one truncation marker after the last received heading.
   When complete: closing line last, no markers, §21.4 LEVEL 0–4 and the 5-line final declaration present.
7. The previous integration (--prev, default HEAD) is unchanged up to its truncation marker.
"""
import re, subprocess, sys, pathlib

F = pathlib.Path(__file__).resolve().parent.parent / "CODEFORGE-MASTER-v1.0.md"
ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII", "XIII", "XIV", "XV", "XVI", "XVII", "XVIII", "XIX", "XX", "XXI", "XXII"]
JUNCTION = "Do not claim access to private LLM reasoning. Show"
# item counts per subsection, taken from the received continuation message
EXPECTED = {"11.2/A": 10, "11.2/B": 9, "11.2/C": 8, "11.3": 13, "11.4": 6 + 11, "11.5": 11, "11.6": 10, "12.2": 12, "12.3": 15,
            "12.4": 7, "12.5": 8, "13.2": 11 + 9, "13.3": 19, "13.4": 7, "13.5": 10, "14.2": 25, "14.3": 9, "14.4": 9, "14.5": 11,
            "15.2": 4, "15.3": 18, "15.4": 16, "15.5": 20, "15.6": 9, "15.7": 10, "16.2": 18, "16.3": 4, "16.4": 11, "16.5": 5,
            "17.2": 6, "17.3": 14, "17.4": 11, "17.5": 6, "17.6": 9, "18.2": 7,
            # continuation 2
            "18.3": 8, "18.4": 9, "18.5": 6, "19.2": 17, "19.3": 11, "19.4": 7, "19.5": 8, "19.6": 7, "20.3": 11, "20.4": 12,
            "20.5": 12, "20.6": 6, "20.7": 11, "21.1": 13, "21.2": 5, "21.5": 11, "21.6": 10, "21.7": 7, "21.8": 13 + 8,
            "21.9": 7 + 7 + 6, "21.10": 11, "22.2": 8 + 9 + 7, "22.3": 12 + 7, "22.4": 8, "22.5": 3 + 15, "22.6": 7,
            "§23": 18, "§24": 25, "§25": 22, "§26": 16, "§27": 6 + 7 + 7 + 8 + 5 + 5, "§28": 20}
END_LINE = "END OF ZABATAINA CODEFORGE 3000 — MASTER SYSTEM PROMPT VERSION 1.0 — CONTINUATION"
problems, notes = [], []


def items(block):
    n = 0
    for l in block.split("\n"):
        s = l.strip()
        if re.match(r"^(- |\d+\. )", s) or (s.startswith("| ") and not re.match(r"^\| *(ID|Category) *\|", s)):
            n += 1
    return n


def main():
    base = sys.argv[sys.argv.index("--base") + 1] if "--base" in sys.argv else "origin/main"
    text = F.read_text(encoding="utf-8")
    L = text.split("\n")
    # 1 + 2 prior content and junction
    try:
        old = subprocess.run(["git", "-C", str(F.parent), "show", f"{base}:codeforge-3000/{F.name}"], capture_output=True, text=True, check=True).stdout.split("\n")
        if JUNCTION not in old:                       # base already holds the integrated document: it must be unchanged
            if old != L:
                problems.append(f"integrated document differs from {base} at lines {[i + 1 for i in range(min(len(old), len(L))) if old[i] != L[i]][:10]}")
            else:
                notes.append(f"document identical to {base} ({len(L)} lines) — no change to the integrated text")
            raise StopIteration
        j_old = old.index(JUNCTION)
        j_new = next(i for i, l in enumerate(L) if l.startswith(JUNCTION))
        diffs = [i for i in range(j_old) if old[i] != L[i]]
        allowed = [i for i in diffs if old[i].startswith("> **The received text ends inside Part IX") and L[i].startswith("> **Integration record:**")]
        if j_new != j_old:
            problems.append(f"junction moved: line {j_old + 1} → {j_new + 1}")
        if set(diffs) - set(allowed):
            problems.append(f"prior content changed at lines {[i + 1 for i in set(diffs) - set(allowed)][:10]}")
        else:
            notes.append(f"prior content: {j_old} lines identical to {base} (only the header integration note updated)")
        if L[j_new] == JUNCTION:
            problems.append("junction sentence still truncated")
        elif text.count(JUNCTION) != 1:
            problems.append("junction sentence duplicated")
        else:
            notes.append("junction: '…Show' completed once, no duplication")
    except StopIteration:
        pass
    except Exception as e:  # noqa: BLE001
        problems.append(f"could not compare with {base}: {e}")
    # 1b continuation-1 content unchanged (compare with --prev ref, default HEAD)
    prev = sys.argv[sys.argv.index("--prev") + 1] if "--prev" in sys.argv else "HEAD"
    try:
        pv = subprocess.run(["git", "-C", str(F.parent), "show", f"{prev}:codeforge-3000/{F.name}"], capture_output=True, text=True, check=True).stdout.split("\n")
        pm = [i for i, l in enumerate(pv) if "RECEIVED TEXT ENDS HERE" in l]
        if pm:
            d2 = [i for i in range(pm[-1]) if pv[i] != L[i] and not pv[i].startswith("> **Integration record:**")]
            if d2:
                problems.append(f"content of {prev} changed at lines {[i + 1 for i in d2][:10]}")
            else:
                notes.append(f"previous integration ({prev}): {pm[-1]} lines identical up to its truncation marker")
    except Exception as e:  # noqa: BLE001
        notes.append(f"previous-integration comparison skipped ({e.__class__.__name__})")
    # 3 numbering
    parts = re.findall(r"^## PART ([IVXL]+) — ", text, re.M)
    if parts != ROMAN[:len(parts)]:
        problems.append(f"part numbering not consecutive: {parts}")
    mods = re.findall(r"^### MODULE (\d\d) — ", text, re.M)
    if mods != [f"{i:02d}" for i in range(1, 21)]:
        problems.append(f"modules not exactly 01–20: {mods}")
    secs = [int(x) for x in re.findall(r"^### (\d+)\. ", text, re.M)]
    if secs != list(range(1, len(secs) + 1)):
        problems.append(f"section numbering not consecutive: {secs}")
    subs = re.findall(r"^#### (\d+)\.(\d+) ", text, re.M)
    by = {}
    for s, k in subs:
        by.setdefault(int(s), []).append(int(k))
    for s, ks in by.items():
        if ks != list(range(1, len(ks) + 1)):
            problems.append(f"§{s} subsections not consecutive: {ks}")
    heads = re.findall(r"^#{2,4} .+$", text, re.M)
    dup = {h for h in heads if heads.count(h) > 1}
    if dup:
        problems.append(f"duplicate headings: {sorted(dup)}")
    notes.append(f"numbering: Parts I–{parts[-1]} ({len(parts)}), MODULE 01–20, sections 1–{secs[-1]}, {len(subs)} subsections")
    # 4 requirement counts
    def block(num):
        m = re.search(rf"^#### {re.escape(num)} .*?$(.*?)(?=^#### |^### |^## |\Z)", text, re.M | re.S)
        return m.group(1) if m else None
    for key, exp in EXPECTED.items():
        if key.startswith("§"):
            m = re.search(rf"^### {key[1:]}\. .*?$(.*?)(?=^### |^## |\Z)", text, re.M | re.S)
            got = items(m.group(1)) if m else None
        elif "/" in key:
            num, letter = key.split("/")
            b = block(num) or ""
            m = re.search(rf"\*\*{letter}\. .*?\*\*(.*?)(?=\*\*[A-Z]\. |\Z)", b, re.S)
            got = items(m.group(1)) if m else None
        else:
            b = block(key)
            got = items(b) if b is not None else None
        if got != exp:
            problems.append(f"§{key.lstrip('§')}: expected {exp} items, found {got}")
    notes.append(f"requirement counts checked in {len(EXPECTED)} subsections")
    # 5 repositories
    for name, url in [("ECC", "https://github.com/affaan-m/ECC"), ("CLI-Anything", "https://github.com/HKUDS/CLI-Anything"), ("REA", "https://github.com/morluto/rea")]:
        if url not in text or name not in text:
            problems.append(f"repository missing: {name} {url}")
    notes.append("repositories ECC, CLI-Anything, REA present with official URLs (§11.2)")
    # 6 truncation marker / completion
    marks = [i for i, l in enumerate(L) if "RECEIVED TEXT ENDS HERE" in l]
    last_text = max(i for i, l in enumerate(L) if l.strip())
    complete = L[last_text] == END_LINE
    if complete:
        if marks:
            problems.append(f"document ends with the closing line but {len(marks)} truncation marker(s) remain")
        else:
            notes.append("closing line present as the last line; no truncation markers remain")
        if len(re.findall(r"^\*\*LEVEL \d — ", text, re.M)) != 5:
            problems.append("§21.4 must define LEVEL 0–4")
        decl = re.search(r"^#### FINAL CONSTITUTIONAL DECLARATION$(.*?)(?=^---|\Z)", text, re.M | re.S)
        if not decl or len(re.findall(r"^\*\*[A-Z ]+\.\*\*$", decl.group(1), re.M)) != 5:
            problems.append("final constitutional declaration must have 5 lines")
    else:
        last_head = max(i for i, l in enumerate(L) if l.startswith("#"))
        if len(marks) != 1:
            problems.append(f"expected exactly 1 truncation marker, found {len(marks)}")
        elif marks[0] < last_head:
            problems.append("truncation marker is not after the last heading")
        else:
            notes.append(f"truncation marker after last received heading: '{L[last_head]}'")
    for n in notes:
        print("  ✓", n)
    for p in problems:
        print("  ✗", p)
    print("DOCUMENT CONTINUITY OK" if not problems else f"{len(problems)} PROBLEM(S)")
    print("STATUS: COMPLETE AS RECEIVED — closing line present, no gaps detected." if complete and not problems else
          "STATUS: INCOMPLETE — source text not yet received beyond the marked point." if marks else "STATUS: NOT VERIFIED")
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main())
