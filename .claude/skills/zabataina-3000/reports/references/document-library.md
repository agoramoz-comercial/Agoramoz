# Document Library (Master Prompt v2.0 — Part IX §27, Part XIX §53–54)

Each document type is listed with its structure and the recommended blocks and charts. Adapt every document to the real audience and objective. **Never invent testimonials, certifications, contracts, financial performance or credentials.**

Ready-made specs live in `reports/specs/`. For the other types, start from the closest spec and follow the outline below.

| # | Document | Structure (sections) | Recommended blocks / charts | Spec |
|---|---|---|---|---|
| 1 | Executive Intelligence Brief (M01) | Institutional context · Mission · Objectives · Constraints · Risk classification · Relevant modules · Diagnosis · Decision required | stats, tracks, table (verdicts), funnel, riskMatrix, callout | `executive-brief.json` |
| 2 | Diagnostic report (M03) | Current state · Problem map · Opportunity map · Capability assessment · Baseline metrics · Constraints · Priority gaps | stats, radar (capabilities 0–4), funnel (revenue engine), pareto, table | brief → adapt |
| 3 | Market research report (M04) | Decision supported · Conclusion · TAM/SAM/SOM · Industry structure · Competitors · Gaps · Implications · Sources | tam, bubble (positioning), treemap, stacked100, evidence table | — |
| 4 | Financial model / feasibility study (M06) | Baseline · Assumptions (labelled) · Unit economics · Scenarios · Sensitivity · Break-even · Cash · Verdict per track | scenarioFan, tornado, breakEven, waterfall, line-items, table fin | `financial-feasibility.json` |
| 5 | Strategic plan / transformation plan (M08) | Strategy statement · Choices and exclusions · Initiatives · Roadmap · Gates · KPIs · Risks · Resources | gantt, table (charters), bullet, riskMatrix | `plan-180-days.json` |
| 6 | Business plan | Executive summary · Problem · Solution · Market · Business model · Go-to-market · Operations · Team · Financials · Risks · Funding ask | tam, donut (revenue mix), scenarioFan, table fin, tiles | — |
| 7 | Executive summary | Situation · Conclusion · 3 supporting points · Numbers · Decision | kpis, metrics, callout | — |
| 8 | Investor pitch deck / startup pitch | Problem · Solution · Market · Traction (verified only) · Model & unit economics · Competition · Team · Financial plan · Ask & use of funds | cover, kpis, tam, bubble, sig-bars, donut (use of funds) | — (A4 or slides) |
| 9 | Investment memorandum | Thesis · Company · Market · Financials (actual vs projected) · Valuation range (≥ 2 methods) · Risks · Terms | table fin, waterfall, bars (EV range), riskMatrix | — |
| 10 | Commercial / business proposal | Client situation · Cost of inaction · Solution · Scope · Timeline · Investment & payment terms · Proof (real) · Next steps | lilac, segments, table blue, line-items | `commercial-proposal.json` |
| 11 | Technical proposal | Requirements · Architecture · Implementation plan · Testing · Security · SLA · Team · Price | table, gantt, metrics | — |
| 12 | RFP / RFI / RFQ response | Compliance matrix (requirement → answer → evidence) · Solution · Pricing · Qualifications (real) | table with status cells | — |
| 13 | Project charter | Objective · Scope / out of scope · Stakeholders · Deliverables · Milestones · Budget · Risks · Governance · Approval | table, gantt, line-items | — |
| 14 | Product requirements document (PRD) | Problem · Users · Jobs-to-be-done · Requirements (MoSCoW) · Acceptance criteria · Metrics · Release plan | table, bullets | — |
| 15 | Software requirements specification (SRS) | Scope · Functional requirements · Non-functional requirements · Interfaces · Data · Constraints · Acceptance | table (IDs) | — |
| 16 | Statement of work (SOW) | Scope · Deliverables · Acceptance · Schedule · Responsibilities · Fees · Change control | table, line-items | — |
| 17 | Service-level agreement (SLA) | Services · Metrics and targets · Measurement · Reporting · Remedies · Exclusions | table (KPI cards) | — |
| 18 | Standard operating procedure (SOP) | Purpose · Owner · Trigger · Steps · Tools · Quality checks · Output · Escalation · Version | table (steps), note | — |
| 19 | Job description | Mission · Outcomes (3–5) · Responsibilities · Competencies · KPIs · Reporting line | stats, bullets | — |
| 20 | Organization chart | Structure · Roles · RACI | table (RACI), sankey (reporting flows, optional) | — |
| 21 | Dashboard / KPI report (M17) | Tracks A–D · Cash · Revenue engine · Retention · Operations · Constraint · Initiatives · Decisions | bullet, lines, groupedBars, table blue with sparklines | — |
| 22 | Audit report / QA report | Scope · Method · Findings (severity) · Evidence · Recommendations · Management response | table with status, riskMatrix | — |
| 23 | Due diligence report | Commercial · Financial · Legal · Technical · People · Red flags · Conditions | table, riskMatrix, waterfall | — |
| 24 | Execution report (§53) | Project · Phase · Completed · In progress · Pending · Blockers · Risks · Decisions · Evidence · Next action | **auto: `z3k.py report --pdf`** | generated |
| 25 | Final completion report (§54) | 20 sections including the Requirements Matrix (VERIFIED / PARTIALLY VERIFIED / NOT STARTED / BLOCKED / NOT APPLICABLE + justification) | **auto: `z3k.py final --pdf`** + Orchestrator narrative | generated |
| 26 | Task implementation document (§36) | A–K identification → completion record | **auto: `z3k.py task doc T-001`** (Markdown) | generated |
| 27 | Historical case study (§25) | 23 analysis fields, transferable vs. non-transferable lessons, relevance | table, lines (timeline), metrics | — |
