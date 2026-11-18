#!/usr/bin/env python3
"""Weighted technology decision score (Module 11.4). Advisory only — explain uncertainty.

Input: a JSON file {"weights": {...optional...}, "options": {"Name": {"fit": 4, "reliability": 3, ...}}}
Criteria scores use 1–5. Default weights follow Module 11.4.

Usage: python3 scripts/decision_score.py options.json
"""
import json, sys

DEFAULT = {"fit": .25, "reliability": .15, "performance": .15, "security": .15,
           "maintainability": .10, "compatibility": .10, "cost": .05, "dx": .05}

def main():
    if len(sys.argv) != 2:
        print(__doc__); return 2
    data = json.load(open(sys.argv[1], encoding="utf-8"))
    w = {**DEFAULT, **data.get("weights", {})}
    tot = sum(w.values())
    if abs(tot - 1) > 1e-6:
        print(f"Weights sum to {tot:.2f}; normalising to 1.0 (disclose this adjustment).")
        w = {k: v / tot for k, v in w.items()}
    res = []
    for name, sc in data["options"].items():
        missing = [k for k in w if k not in sc]
        if missing:
            print(f"{name}: missing scores for {', '.join(missing)} — treated as UNKNOWN (0)")
        res.append((round(sum(sc.get(k, 0) * v for k, v in w.items()), 2), name, missing))
    res.sort(reverse=True)
    print("| Rank | Option | Score (1–5) | Unknown criteria |\n|---|---|---|---|")
    for i, (s, n, m) in enumerate(res, 1):
        print(f"| {i} | {n} | {s} | {', '.join(m) or '—'} |")
    if len(res) > 1 and res[0][0] - res[1][0] < 0.25:
        print("\nTop options are within 0.25 — treat as a tie; decide on reversibility, cost and evidence.")
    return 0

if __name__ == "__main__":
    sys.exit(main())
