#!/usr/bin/env python3
"""ZABATAINA 3000 — QA & Verification score (Part XVI §46) and Red Team checklist (§47).

12 dimensions scored 0–4. Gate (operational interpretation, see ops/OPERATIONAL-ADDENDUM.md):
  total ≥ 39/48 (≈80%, equivalent to the v1 32/40 threshold) AND no 0 in Accuracy, Evidence, Feasibility, Security
  AND no dimension at 0 at all for critical deliverables (--critical).
A quality score is NOT proof of successful execution (§46).

Usage:
  python3 qa.py --completeness 3 --accuracy 4 --consistency 3 --executability 3 --evidence 3 --feasibility 3 \
      --technical 3 --financial 3 --security 3 --compliance 3 --clarity 4 --maintainability 3 [--critical] [--json]
  python3 qa.py --redteam        # print the §47 Red Team checklist
"""
import argparse, json, sys

DIMS = ["completeness", "accuracy", "consistency", "executability", "evidence", "feasibility", "technical",
        "financial", "security", "compliance", "clarity", "maintainability"]
LABEL = {"technical": "Technical correctness", "financial": "Financial coherence"}
NO_ZERO = ["accuracy", "evidence", "feasibility", "security"]
REDTEAM = ["Market assumptions", "Financial forecasts", "Customer demand", "Competitive differentiation", "Technology choices",
           "Project timelines", "Resource availability", "Security", "Legal risks", "Operational scalability", "Strategic logic"]
QUESTIONS = ["What could fail?", "What evidence contradicts the proposal?", "What has been underestimated?", "What is missing?",
             "What is unnecessarily expensive?", "What could invalidate the business case?", "What is the strongest alternative?"]


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    for d in DIMS:
        ap.add_argument(f"--{d}", type=int, choices=range(5))
    ap.add_argument("--critical", action="store_true"); ap.add_argument("--json", action="store_true")
    ap.add_argument("--redteam", action="store_true")
    a = ap.parse_args()
    if a.redteam:
        print("RED TEAM PROTOCOL (§47)\n\nChallenge each area:")
        print("| Area | Finding | Evidence | Severity | Correction |\n|---|---|---|---|---|")
        for r in REDTEAM:
            print(f"| {r} | | | | |")
        print("\nAsk:\n" + "\n".join(f"- {q}" for q in QUESTIONS))
        print("\nThe Orchestrator must resolve material contradictions before final approval.")
        return 0
    missing = [d for d in DIMS if getattr(a, d) is None]
    if missing:
        ap.error("score every dimension (0–4); missing: " + ", ".join(missing))
    s = {d: getattr(a, d) for d in DIMS}
    total = sum(s.values())
    zeros = [d for d in DIMS if s[d] == 0]
    blocking = [d for d in zeros if d in NO_ZERO or a.critical]
    passed = total >= 39 and not blocking
    res = {"scores": s, "total": total, "max": 48, "pct": round(100 * total / 48, 1), "blocking_zeros": blocking, "passed": passed}
    if a.json:
        print(json.dumps(res)); return 0 if passed else 1
    print("| Dimension | Score (0–4) |\n|---|---|")
    for d in DIMS:
        print(f"| {LABEL.get(d, d.capitalize())} | {s[d]} |")
    print(f"| **Total** | **{total}/48 ({res['pct']}%)** |\n")
    print(("QUALITY GATE PASSED" if passed else "QUALITY GATE NOT PASSED") +
          (f" — blocking zero in: {', '.join(blocking)}" if blocking else "") + (" — total below 39/48" if total < 39 else ""))
    print("Reminder: a quality score is not proof of successful execution (§46).")
    return 0 if passed else 1


if __name__ == "__main__":
    sys.exit(main())
