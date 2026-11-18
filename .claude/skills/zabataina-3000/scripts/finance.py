#!/usr/bin/env python3
"""ZABATAINA 3000 — Financial Intelligence calculators (M06, Prediction Engine §28, Simulation §29).

Every command shows its formula, keeps the four tracks separate (§3) and prints --json for charts/reports.
These are calculators, not forecasts of certain outcomes: inputs must be labelled (actual / estimate / assumption).

Commands
  reverse     Track A — target revenue → sales → opportunities → leads (+ capacity verdict)
  netprofit   Track B — revenue required for a net-profit target
  arr         Track C — new customers/month needed to reach a target ARR with churn
  unit        Unit economics — contribution, LTV, LTV:CAC, CAC payback
  breakeven   Units and revenue to cover fixed costs
  growth      Required compound monthly growth rate
  scenarios   Conservative / base / optimistic revenue + sensitivity (tornado data)
  valuation   Track D — enterprise and equity value ranges from multiples
"""
import argparse, json, math, sys

VERDICTS = ["ACHIEVABLE", "ACHIEVABLE WITH CHANGES", "HIGH RISK", "NOT CURRENTLY FEASIBLE", "INSUFFICIENT EVIDENCE"]


def money(v, cur="US$"):
    return f"{cur} {v:,.0f}"


def out(a, data, lines):
    if a.json:
        print(json.dumps(data, indent=2, ensure_ascii=False))
    else:
        print("\n".join(lines))
        print("\nNote: calculator output, not a guaranteed result (§28). Label every input as actual, estimate or assumption.")


def cmd_reverse(a):
    gap = a.target - a.baseline
    sales = math.ceil(gap / a.price)
    opps = math.ceil(sales / a.close)
    leads = math.ceil(opps / a.qual)
    window = a.horizon - a.cycle - a.ramp
    months = window / 30.4375
    if window <= 0:
        verdict = "NOT CURRENTLY FEASIBLE"; why = "sales cycle + ramp-up exceed the horizon"
        per = {"sales": None, "opportunities": None, "leads": None}
    else:
        per = {"sales": sales / months, "opportunities": opps / months, "leads": leads / months}
        checks = []
        if a.capacity:
            checks.append(("delivery", per["sales"] / a.capacity))
        if a.lead_capacity:
            checks.append(("lead generation", per["leads"] / a.lead_capacity))
        if a.sales_capacity:
            checks.append(("sales capacity", per["opportunities"] / a.sales_capacity))
        if not checks:
            verdict, why = "INSUFFICIENT EVIDENCE", "no capacity data supplied (--capacity / --lead-capacity / --sales-capacity)"
        else:
            worst = max(checks, key=lambda x: x[1])
            r = worst[1]
            verdict = VERDICTS[0] if r <= 1 else VERDICTS[1] if r <= 1.5 else VERDICTS[2] if r <= 3 else VERDICTS[3]
            why = f"binding constraint: {worst[0]} needs {r:.1f}× current capacity"
    data = {"track": "A", "target": a.target, "baseline": a.baseline, "gap": gap, "price": a.price, "close_rate": a.close,
            "qualification_rate": a.qual, "sales": sales, "opportunities": opps, "leads": leads,
            "effective_window_days": window, "per_month": per, "verdict": verdict, "reason": why}
    L = ["TRACK A — REVERSE ENGINEERING (M06 §004.1)",
         f"Gap = target − baseline = {money(a.target)} − {money(a.baseline)} = {money(gap)}",
         f"Sales = ⌈gap ÷ price⌉ = ⌈{gap:,.0f} ÷ {a.price:,.0f}⌉ = {sales}",
         f"Qualified opportunities = ⌈sales ÷ close rate⌉ = ⌈{sales} ÷ {a.close}⌉ = {opps}",
         f"Leads = ⌈opportunities ÷ qualification rate⌉ = ⌈{opps} ÷ {a.qual}⌉ = {leads}",
         f"Effective selling window = horizon − cycle − ramp-up = {a.horizon} − {a.cycle} − {a.ramp} = {window} days"]
    if window > 0:
        L.append(f"Per month: {per['sales']:.1f} sales · {per['opportunities']:.1f} opportunities · {per['leads']:.1f} leads")
    L.append(f"VERDICT: {verdict} — {why}")
    out(a, data, L)


def cmd_netprofit(a):
    fixed = a.fixed_monthly * a.months
    pretax = a.target / (1 - a.tax)
    rev = (pretax + fixed + a.interest) / a.cm
    data = {"track": "B", "target_net_profit": a.target, "tax_rate": a.tax, "contribution_margin": a.cm,
            "fixed_costs_period": fixed, "interest": a.interest, "required_revenue": rev, "implied_net_margin": a.target / rev}
    out(a, data, ["TRACK B — REQUIRED REVENUE FOR NET PROFIT (M06 §004.2)",
                  "Revenue = (net profit ÷ (1 − tax) + fixed costs + interest) ÷ contribution margin",
                  f"= ({a.target:,.0f} ÷ {1 - a.tax:.2f} + {fixed:,.0f} + {a.interest:,.0f}) ÷ {a.cm}",
                  f"= {money(rev)}  (implied net margin {a.target / rev:.1%})",
                  "Tax treatment is simplified — confirm with a qualified accountant (M06 §009)."])


def cmd_arr(a):
    T, c, p = a.months, a.churn, a.price_monthly
    target_mrr = a.target / 12
    keep = (1 - c) ** T
    geo = sum((1 - c) ** k for k in range(T))
    n = max(0.0, (target_mrr - a.start_mrr * keep) / (p * geo))
    path, mrr = [], a.start_mrr
    for m in range(1, T + 1):
        mrr = mrr * (1 - c) + n * p
        path.append(round(mrr, 2))
    data = {"track": "C", "target_arr": a.target, "target_mrr": target_mrr, "monthly_churn": c, "price_monthly": p,
            "start_mrr": a.start_mrr, "new_customers_per_month": n, "mrr_path": path,
            "arr_end": path[-1] * 12 if path else a.start_mrr * 12,
            "revenue_recognized_in_period": sum(path)}
    out(a, data, ["TRACK C — ARR BUILD WITH CHURN (M06 §004.2)",
                  f"Target MRR = ARR ÷ 12 = {money(target_mrr)}",
                  "MRR_T = MRR_0·(1−c)^T + n·p·Σ_{k=0}^{T−1}(1−c)^k  →  n = (MRR_T − MRR_0·(1−c)^T) ÷ (p·Σ)",
                  f"n = ({target_mrr:,.0f} − {a.start_mrr:,.0f}·{keep:.4f}) ÷ ({p:,.0f}·{geo:.4f}) = {n:.1f} new customers / month",
                  f"MRR path: {', '.join(f'{x:,.0f}' for x in path)}",
                  f"Revenue actually recognized in the {T} months: {money(sum(path))} — ARR ≠ revenue (§3)."])


def cmd_unit(a):
    contrib = a.price - a.variable
    cm = contrib / a.price
    life = a.lifetime or (1 / a.churn if a.churn else None)
    if life is None:
        print("Provide --lifetime (periods) or --churn (per period)."); return 2
    ltv = (a.arpu or a.price) * cm * life
    ratio = ltv / a.cac if a.cac else None
    payback = a.cac / ((a.arpu or a.price) * cm) if a.cac else None
    health = "HEALTHY" if ratio and ratio >= 3 else "WARNING" if ratio and ratio < 1.5 else "WATCH"
    data = {"contribution_per_unit": contrib, "contribution_margin": cm, "lifetime_periods": life, "ltv": ltv,
            "cac": a.cac, "ltv_cac": ratio, "cac_payback_periods": payback, "health": health,
            "scaling_allowed": contrib > 0 and (payback is None or a.runway is None or payback <= a.runway)}
    L = ["UNIT ECONOMICS (M06 §003)", f"Contribution/unit = price − variable cost = {a.price:,.0f} − {a.variable:,.0f} = {contrib:,.0f} ({cm:.1%})",
         f"Lifetime = {'given' if a.lifetime else '1 ÷ churn'} = {life:.1f} periods",
         f"LTV (gross-margin) = ARPU × CM × lifetime = {(a.arpu or a.price):,.0f} × {cm:.2f} × {life:.1f} = {ltv:,.0f}"]
    if a.cac:
        L += [f"LTV:CAC = {ltv:,.0f} ÷ {a.cac:,.0f} = {ratio:.2f} → {health} (reference: ≥3 healthy, <1.5 warning; adjust by sector)",
              f"CAC payback = CAC ÷ (ARPU × CM) = {payback:.1f} periods"]
    if not data["scaling_allowed"]:
        L.append("SCALING RULE: do not scale — negative contribution or payback longer than runway (M06 §003.3).")
    out(a, data, L)


def cmd_breakeven(a):
    cu = a.price - a.variable
    if cu <= 0:
        print("Contribution per unit ≤ 0 — break-even impossible at this price."); return 2
    units = a.fixed / cu
    data = {"fixed": a.fixed, "price": a.price, "variable": a.variable, "units": units, "revenue": units * a.price,
            "chart": {"fixed": a.fixed, "variable": a.variable, "price": a.price, "maxUnits": math.ceil(units * 2)}}
    out(a, data, ["BREAK-EVEN (M06 §003.1)", f"Units = fixed ÷ (price − variable) = {a.fixed:,.0f} ÷ {cu:,.0f} = {units:,.1f}",
                  f"Revenue at break-even = {money(units * a.price)}"])


def cmd_growth(a):
    g = (a.target_monthly / a.current_monthly) ** (1 / a.months) - 1
    data = {"current_monthly": a.current_monthly, "target_monthly": a.target_monthly, "months": a.months, "cmgr": g}
    flag = "extreme — classify HIGH RISK unless history supports it" if g > 0.3 else "ambitious" if g > 0.1 else "moderate"
    out(a, data, ["REQUIRED GROWTH (M06 §004.3)", f"g = (target ÷ current)^(1/months) − 1 = ({a.target_monthly:,.0f} ÷ {a.current_monthly:,.0f})^(1/{a.months}) − 1 = {g:.1%} per month → {flag}"])


def triple(s):
    v = [float(x) for x in s.split(",")]
    if len(v) == 1:
        v = v * 3
    if len(v) != 3:
        raise SystemExit("each driver takes 1 or 3 comma-separated values: conservative,base,optimistic")
    return v


def cmd_scenarios(a):
    drv = {"leads": triple(a.leads), "qual": triple(a.qual), "close": triple(a.close), "price": triple(a.price)}
    names = ["conservative", "base", "optimistic"]

    def rev(i=None, override=None):
        vals = {k: v[1] if i is None else v[i] for k, v in drv.items()}
        if override:
            vals.update(override)
        return vals["leads"] * vals["qual"] * vals["close"] * vals["price"]
    monthly = {n: rev(i) for i, n in enumerate(names)}
    cum = {n: [round(monthly[n] * m, 2) for m in range(1, a.months + 1)] for n in names}
    base_total = cum["base"][-1]
    sens = []
    for k, v in drv.items():
        lo = rev(override={k: v[1] * (1 - a.swing)}) * a.months
        hi = rev(override={k: v[1] * (1 + a.swing)}) * a.months
        sens.append({"name": k, "low": lo, "high": hi})
    data = {"monthly_revenue": monthly, "cumulative": cum, "months": a.months,
            "chart_scenarioFan": {"x": [f"M{m}" for m in range(1, a.months + 1)], "conservative": cum["conservative"],
                                  "base": cum["base"], "ambitious": cum["optimistic"]},
            "chart_tornado": {"base": base_total, "items": sens}}
    L = ["SCENARIOS (§8, §28) — revenue = leads × qualification × close × price, per month"]
    for n in names:
        L.append(f"{n:<13} {money(monthly[n])}/month → {money(cum[n][-1])} over {a.months} months")
    L.append(f"Sensitivity (±{a.swing:.0%} on each base driver, total over horizon):")
    for s_ in sorted(sens, key=lambda x: -abs(x['high'] - x['low'])):
        L.append(f"  {s_['name']:<6} {money(s_['low'])} … {money(s_['high'])}")
    L.append("Invalidation: any driver observed outside its conservative value for 2 consecutive weeks → re-forecast.")
    out(a, data, L)


def cmd_valuation(a):
    mult = [float(x) for x in a.multiples.split(",")]
    ev = [a.metric * m for m in mult]
    eq = [v - a.net_debt for v in ev]
    data = {"track": "D", "metric": a.metric, "metric_name": a.metric_name, "multiples": mult, "enterprise_value": ev,
            "equity_value": eq, "net_debt": a.net_debt}
    out(a, data, ["TRACK D — VALUATION RANGE (M15 §005)", f"EV = {a.metric_name} × multiple; Equity = EV − net debt",
                  *(f"  × {m:g} → EV {money(e)} · equity {money(q)}" for m, e, q in zip(mult, ev, eq)),
                  "Multiples must come from cited, comparable, recent sources; an estimate is not cash or an offer (M01 Track D)."])


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--json", action="store_true")
    sp = ap.add_subparsers(dest="cmd", required=True)
    p = sp.add_parser("reverse"); p.add_argument("--target", type=float, default=1_000_000); p.add_argument("--baseline", type=float, default=0)
    p.add_argument("--price", type=float, required=True); p.add_argument("--close", type=float, required=True); p.add_argument("--qual", type=float, required=True)
    p.add_argument("--horizon", type=int, default=180); p.add_argument("--cycle", type=int, default=30); p.add_argument("--ramp", type=int, default=14)
    p.add_argument("--capacity", type=float, help="max sales delivered per month"); p.add_argument("--lead-capacity", type=float)
    p.add_argument("--sales-capacity", type=float, help="opportunities the team can work per month"); p.set_defaults(f=cmd_reverse)
    p = sp.add_parser("netprofit"); p.add_argument("--target", type=float, default=1_000_000); p.add_argument("--cm", type=float, required=True)
    p.add_argument("--fixed-monthly", type=float, required=True); p.add_argument("--months", type=int, default=6)
    p.add_argument("--interest", type=float, default=0); p.add_argument("--tax", type=float, default=0.25); p.set_defaults(f=cmd_netprofit)
    p = sp.add_parser("arr"); p.add_argument("--target", type=float, default=1_000_000); p.add_argument("--price-monthly", type=float, required=True)
    p.add_argument("--churn", type=float, required=True); p.add_argument("--months", type=int, default=6); p.add_argument("--start-mrr", type=float, default=0)
    p.set_defaults(f=cmd_arr)
    p = sp.add_parser("unit"); p.add_argument("--price", type=float, required=True); p.add_argument("--variable", type=float, required=True)
    p.add_argument("--cac", type=float); p.add_argument("--churn", type=float); p.add_argument("--lifetime", type=float)
    p.add_argument("--arpu", type=float); p.add_argument("--runway", type=float, help="periods of cash runway"); p.set_defaults(f=cmd_unit)
    p = sp.add_parser("breakeven"); p.add_argument("--fixed", type=float, required=True); p.add_argument("--price", type=float, required=True)
    p.add_argument("--variable", type=float, required=True); p.set_defaults(f=cmd_breakeven)
    p = sp.add_parser("growth"); p.add_argument("--current-monthly", type=float, required=True); p.add_argument("--target-monthly", type=float, required=True)
    p.add_argument("--months", type=int, default=6); p.set_defaults(f=cmd_growth)
    p = sp.add_parser("scenarios")
    for k in ("leads", "qual", "close", "price"):
        p.add_argument(f"--{k}", required=True, help="conservative,base,optimistic (or one value)")
    p.add_argument("--months", type=int, default=6); p.add_argument("--swing", type=float, default=0.2); p.set_defaults(f=cmd_scenarios)
    p = sp.add_parser("valuation"); p.add_argument("--metric", type=float, required=True); p.add_argument("--metric-name", default="EBITDA")
    p.add_argument("--multiples", required=True); p.add_argument("--net-debt", type=float, default=0); p.set_defaults(f=cmd_valuation)
    a = ap.parse_args()
    for k in ("close", "qual", "churn", "cm", "tax"):
        v = getattr(a, k, None)
        if isinstance(v, float) and not (0 <= v < 1 if k in ("churn", "tax") else 0 < v <= 1):
            ap.error(f"--{k} must be a fraction (e.g. 0.2), got {v}")
    return a.f(a) or 0


if __name__ == "__main__":
    sys.exit(main())
