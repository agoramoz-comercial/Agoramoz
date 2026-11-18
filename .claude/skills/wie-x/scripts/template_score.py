#!/usr/bin/env python3
"""Template evaluation score (Module 31). Scores are 0–100 per criterion; weights are fixed by the module.

Usage:
  python3 scripts/template_score.py --objective 95 --functional 90 --fidelity 92 --security 88 \
      --technical 85 --reusability 90 --prompt 80 [--critical 0] [--json]
Exit code 0 = eligible for approval (>=90 and no critical failure), 1 otherwise.
"""
import argparse, json, sys

WEIGHTS = [("objective", "Objective Achievement", .20), ("functional", "Functional Completeness", .20),
           ("fidelity", "Requirement Fidelity", .15), ("security", "Security", .15),
           ("technical", "Technical Quality", .10), ("reusability", "Reusability", .10),
           ("prompt", "Prompt Clarity & Efficiency", .10)]

def evaluate(scores, critical):
    total = round(sum(scores[k] * w for k, _, w in WEIGHTS), 2)
    if total >= 90: band = "Eligible for approval, provided no critical failures exist"
    elif total >= 80: band = "Improvement recommended"
    elif total >= 70: band = "Substantial revision required"
    else: band = "Not qualified"
    eligible = total >= 90 and critical == 0
    if critical: band += f" — BLOCKED: {critical} unresolved critical failure(s)"
    return total, band, eligible

def main():
    ap = argparse.ArgumentParser()
    for k, label, _ in WEIGHTS:
        ap.add_argument(f"--{k}", type=float, required=True, help=f"{label} (0-100)")
    ap.add_argument("--critical", type=int, default=0, help="unresolved critical failures")
    ap.add_argument("--json", action="store_true")
    a = ap.parse_args()
    scores = {k: getattr(a, k) for k, _, _ in WEIGHTS}
    for k, v in scores.items():
        if not 0 <= v <= 100: ap.error(f"--{k} must be between 0 and 100")
    total, band, eligible = evaluate(scores, a.critical)
    if a.json:
        print(json.dumps({"scores": scores, "total": total, "band": band, "eligible": eligible, "critical": a.critical}))
    else:
        print("| Criterion | Weight | Score | Weighted |\n|---|---|---|---|")
        for k, label, w in WEIGHTS:
            print(f"| {label} | {int(w*100)}% | {scores[k]:g} | {scores[k]*w:.1f} |")
        print(f"| **Total** | 100% | | **{total}** |\n\n{band}\nEligible for Q4 approval: {'YES' if eligible else 'NO'}")
        print("Note: an evaluation aid, not an objective truth — every score must be backed by findings (Module 31).")
    return 0 if eligible else 1

if __name__ == "__main__":
    sys.exit(main())
