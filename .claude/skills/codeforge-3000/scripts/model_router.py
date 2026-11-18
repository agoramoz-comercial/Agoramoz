#!/usr/bin/env python3
"""ULOE — Model routing & internal benchmarks (CODEFORGE §6).

  python3 model_router.py route --complexity high --needs tools,structured [--context 120000] [--privacy local-only] [--critical]
                                [--specialist DOMAIN] [--collaborate]
  python3 model_router.py bench [--dir project]        internal benchmark from the project's real records (§6.3)
  python3 model_router.py list

Routing uses only enabled models from data/models.json (or $CODEFORGE_MODELS), filters by required capabilities
(unknown capability ≠ supported), then ranks by MEASURED project performance when it exists (verified tasks,
blocks, cost per verified task from provider-reported usage), otherwise by tier fit. It also proposes the execution
mode (A single · B specialist · C independent review · D multi-model collaboration · E fallback · F human escalation, §17.5) and a fallback chain.
"""
import argparse, json, os, pathlib, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
TIER_FIT = {"low": ["fast", "balanced", "frontier"], "medium": ["balanced", "frontier", "fast"], "high": ["frontier", "balanced"]}


def registry():
    return json.loads(pathlib.Path(os.environ.get("CODEFORGE_MODELS") or ROOT / "data" / "models.json").read_text(encoding="utf-8"))["models"]


def bench(dirpath):
    f = pathlib.Path(dirpath).resolve() / ".codeforge" / "record.json"
    if not f.exists():
        return {}
    r = json.loads(f.read_text(encoding="utf-8"))
    B = {}
    for t in r["tasks"].values():
        m = t.get("model")
        if not m:
            continue
        b = B.setdefault(m, newb())
        b["tasks"] += 1; b["verified"] += t.get("status") == "VERIFIED"; b["blocked"] += t.get("status") == "BLOCKED"; b["failures"] += len(t["failures"])
    for u in r.get("usage", []):
        b = B.setdefault(u.get("model"), newb())
        b["input_tokens"] += int(u.get("input_tokens", 0) or 0); b["output_tokens"] += int(u.get("output_tokens", 0) or 0)
        b["cached_tokens"] += int(u.get("cached_tokens", 0) or 0); b["calls"] += 1
        if u.get("reasoning_tokens") is not None:
            b["reasoning_tokens"] = (b["reasoning_tokens"] or 0) + int(u["reasoning_tokens"])
        if u.get("latency_ms") is not None:
            b["latency_ms"].append(float(u["latency_ms"]))
        if u.get("cost") is not None:
            b["cost"] += float(u["cost"]); b["cost_reported"] = True
    evf = pathlib.Path(dirpath).resolve() / ".codeforge" / "events.jsonl"
    hashes = []
    if evf.exists():
        for line in evf.read_text(encoding="utf-8", errors="ignore").splitlines():
            try:
                e = json.loads(line)
            except json.JSONDecodeError:
                continue
            if e.get("kind") == "context" and e.get("package_hash"):
                hashes.append(e["package_hash"])
    dup = len(hashes) - len(set(hashes))
    for m, b in B.items():
        b["retries"] = b["failures"]
        b["avg_latency_ms"] = round(sum(b["latency_ms"]) / len(b["latency_ms"]), 1) if b["latency_ms"] else None
        b["context_duplication"] = dup
        b["success_rate"] = round(b["verified"] / b["tasks"], 3) if b["tasks"] else None
        b["cost_per_verified_task"] = round(b["cost"] / b["verified"], 4) if b["verified"] and b["cost_reported"] else None
        b["tokens_per_verified_task"] = round((b["input_tokens"] + b["output_tokens"]) / b["verified"]) if b["verified"] else None
    return B


def newb():
    return {"tasks": 0, "verified": 0, "blocked": 0, "failures": 0, "calls": 0, "input_tokens": 0, "output_tokens": 0, "cached_tokens": 0,
            "reasoning_tokens": None, "latency_ms": [], "cost": 0.0, "cost_reported": False}


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sp = ap.add_subparsers(dest="cmd", required=True)
    p = sp.add_parser("route"); p.add_argument("--complexity", choices=["low", "medium", "high"], default="medium")
    p.add_argument("--needs", default=""); p.add_argument("--context", type=int); p.add_argument("--privacy", choices=["any", "local-only"], default="any")
    p.add_argument("--critical", action="store_true"); p.add_argument("--dir", default=".")
    p.add_argument("--specialist", help="domain for specialist-model execution (mode B), matched against 'specialties'")
    p.add_argument("--collaborate", action="store_true", help="multi-model collaboration plan (mode D)")
    p = sp.add_parser("bench"); p.add_argument("--dir", default=".")
    sp.add_parser("list")
    a = ap.parse_args()
    M = registry()
    if a.cmd == "list":
        for m in M:
            print(f"{'✓' if m['enabled'] else '·'} {m['key']:<18} {m['provider']:<26} {m['model_id']:<26} tier={m['tier']} verified={m['verified']}")
        return 0
    if a.cmd == "bench":
        B = bench(a.dir)
        if not B:
            print("No model-attributed tasks or usage yet. Record `task add --model <id>` and provider-reported usage events (cf.py event usage --data …)."); return 0
        print("| Model | Tasks | Verified | Blocked | Retries | Success | Calls | Input | Output | Cached | Reasoning | Avg latency ms | Tokens/verified | Cost/verified |")
        print("|---|---|---|---|---|---|---|---|---|---|---|---|---|---|")
        for m, b in B.items():
            nr = "not reported"
            print(f"| {m} | {b['tasks']} | {b['verified']} | {b['blocked']} | {b['retries']} | {b['success_rate']} | {b['calls']} | {b['input_tokens']} | {b['output_tokens']} | "
                  f"{b['cached_tokens']} | {b['reasoning_tokens'] if b['reasoning_tokens'] is not None else nr} | {b['avg_latency_ms'] if b['avg_latency_ms'] is not None else nr} | "
                  f"{b['tokens_per_verified_task']} | {b['cost_per_verified_task'] if b['cost_per_verified_task'] is not None else nr} |")
        print(f"\nContext duplication: {next(iter(B.values()))['context_duplication']} repeated identical context packages. Values come only from provider-reported usage (§18.4).")
        return 0
    needs = [x for x in a.needs.split(",") if x]
    cand, rejected = [], []
    for m in M:
        why = []
        if not m["enabled"]: why.append("disabled")
        if a.privacy == "local-only" and not m["local"]: why.append("not local")
        if "tools" in needs and m["tool_calling"] is not True: why.append("tool calling not confirmed")
        if "structured" in needs and m["structured_output"] is not True: why.append("structured output not confirmed")
        if "vision" in needs and "image" not in (m["modalities"] or []): why.append("no image modality")
        if a.context and (m["context_window"] is None or m["context_window"] < a.context):
            why.append("context window unknown" if m["context_window"] is None else f"context {m['context_window']} < {a.context}")
        (rejected if why else cand).append((m, why))
    if not cand:
        print("No eligible model. Rejections:\n" + "\n".join(f"- {m['key']}: {', '.join(w)}" for m, w in rejected) +
              "\n→ Mode F: human escalation (configure data/models.json from official provider docs)."); return 1
    B = bench(a.dir)
    def score(m):
        b = B.get(m["model_id"])
        measured = (b["success_rate"] if b and b["tasks"] >= 3 else None)
        fit = TIER_FIT[a.complexity].index(m["tier"]) if m["tier"] in TIER_FIT[a.complexity] else 9
        return (0 if measured is not None else 1, -(measured or 0), fit)
    cand.sort(key=lambda x: score(x[0]))
    best = cand[0][0]
    mode = "C — independent review by a second model + tests" if a.critical and len(cand) > 1 else "A — single-model execution"
    if a.specialist:
        spec = [m for m, _ in cand if a.specialist.lower() in [x.lower() for x in (m.get("specialties") or [])]]
        if spec:
            best = spec[0]; mode = f"B — specialist-model execution ({a.specialist})"
        else:
            print(f"No model has a measured '{a.specialist}' specialty in data/models.json — falling back to general routing (never assume a specialty).")
    if a.collaborate:
        provs = []
        for m, _ in cand:
            if m["provider"] not in [x["provider"] for x in provs]:
                provs.append(m)
        if len(provs) >= 2:
            mode = "D — multi-model collaboration"
            print(f"Collaboration plan: {provs[0]['model_id']} builds · {provs[1]['model_id']} reviews independently against the same acceptance criteria; "
                  "share only the structured task state (context_pack.py), not conversation history (§17.6).")
        else:
            print("Only one provider is eligible — multi-model collaboration (D) is not possible; independent review would use the same provider.")
    b = B.get(best["model_id"])
    basis = f"measured success {b['success_rate']} over {b['tasks']} tasks in this project" if b and b["tasks"] >= 3 else f"tier fit ({best['tier']}) — no project measurements yet"
    print(f"ROUTE → {best['model_id']} ({best['provider']}) · basis: {basis}\nExecution mode: {mode}")
    print("Fallback chain (E): " + (" → ".join(m["model_id"] for m, _ in cand[1:]) or "none") + " → F human escalation")
    if a.critical and len(cand) > 1:
        print(f"Reviewer: {cand[1][0]['model_id']} verifies against the same acceptance criteria; tests decide, not model agreement.")
    unver = [k for k in ("context_window", "pricing", "rate_limits") if best.get(k) is None]
    if unver:
        print(f"Unverified adapter fields for {best['key']}: {', '.join(unver)} — confirm in provider docs (§6.1).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
