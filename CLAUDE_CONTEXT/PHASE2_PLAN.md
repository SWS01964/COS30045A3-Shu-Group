# Phase 2 plan: two more chapters, newspaper redesign, full screenshot record

Created 2026-11-23. Owner: Claude (orchestrator). Requirement.md re-read this session.
Work runs as sequential subtasks, one subagent at a time, each reporting back before the next starts.

## Why these two ideas

Sam (52, outer Brisbane, drives, took up cycling in 2020, parents in their late 70s who walk and drive) brings three questions:

1. Is it getting safer out there? → Idea 1 (built)
2. Are people like me, or my parents, more at risk than I think? → Idea 2 (built, age × road user), **Idea 3 (new, severity)**
3. What should I actually take away? → **Idea 4 (new, lockdown test)** plus a closing "what this means" section

| Idea | Working headline (to be confirmed by the data) | Sam's question | Data |
|---|---|---|---|
| 3 | Not every crash is equal: pedestrians are a small share of the injured but a large share of the harm | "my parents" | national raw: road user, counterparty, age; died in care 2011–19; bed days 2016–21 |
| 4 | The lockdown test: when the roads emptied in 2020, cycling injuries went up | "me, the new cyclist" | national raw, monthly 2019–21 by road user |

Deferred (stated honestly on the site and slides): Idea 5, equity (First Nations, remoteness). The First Nations block totals fall short of the national figures by more than suppression explains (HANDOFF §9), so we will not publish on them until we understand why.

## Editorial rules (truthful newspaper)

- Every number in prose, charts and slides is computed by a script and traceable to a CSV in `data/clean/`.
- The headline must survive the stricter method. If it doesn't, soften it, as we did with "tripled" → "more than doubled".
- Caveats sit next to the chart, not just in the methods notes: counts are not rates; died-in-care uses 2011–19 only; bed days use 2016–21 only; no exposure data; lockdowns differed by state; residence is not crash location.
- Learn layout and UX patterns from professional newspapers; never copy their branding, logos, names or typefaces under licence.

## Subtasks

| # | Subtask | Who | Model / effort | Output | Done when |
|---|---|---|---|---|---|
| S1 | Plan and storyboard (draft) | Claude | — | this file | Ideas and rules agreed |
| S2 | Newspaper UI/UX research (AU + European) | subagent | sonnet / medium | `report/NEWS_DESIGN_RESEARCH.md` | 6+ outlets reviewed; concrete patterns and a token proposal for our site |
| S3 | EDA + processing for Ideas 3 and 4 | subagent | opus / high | `processing/phase2_ideas.py`, `data/clean/idea3_*.csv`, `idea4_*.csv`, `processing/EDA_PHASE2.md`, figures | Script reruns cleanly; totals reconcile to the existing pipeline; headlines tested |
| S4 | Final storyboard + chapter copy | Claude | — | `report/STORYBOARD.md` | Every claim backed by an S3 number |
| S5 | Website: newspaper redesign + chapters 3 and 4 | subagent | opus / high | `website/` updated | Headless render OK at 375 and 1280 px, no JS errors, numbers match CSVs |
| S6 | Screenshot record + slides update | subagent | sonnet / high | `report/figures/screenshots/`, `presentation/week11/` v2 deck + PDF | Every page section, chart, state and code file captured; deck has new ideas; v1 PDF kept |
| S7 | Review, handoff | Claude | — | HANDOFF.md | Status updated |

## Draft storyboard (refined in S4 once the numbers are in)

**Chapter 3 — Not every crash is equal**

> Open on a simple contrast. Two bars side by side for each type of road user: their share of everyone hospitalised, and their share of the days spent in hospital. Pedestrians barely register on the first bar and jump out on the second.
>
> Then the harder number: out of every thousand pedestrians admitted, about 22 never left hospital alive, against about 6 car drivers and 2 cyclists. We stop at 2019 because the 2020 and 2021 death records are incomplete, and we say so under the chart.
>
> Last beat, for Sam's parents: what you are hit by matters as much as who you are. Crashes with trains and heavy vehicles are rare but are the worst of all. A reader picks a road user and sees which counterparties do the most damage.

**Chapter 4 — The lockdown test**

> Start with April 2020. Hospital admissions after crashes dropped by about a third in a single month, the sharpest fall in the decade. Show monthly lines for 2019, 2020 and 2021 with the national lockdown shaded.
>
> Then the twist: one line went the other way. Cyclist admissions rose. June 2020 was about half as high again as June 2019, the same months people bought bikes and took to empty streets.
>
> Close carefully. Lockdowns were not one event: Victoria's lasted far longer than Queensland's, and the national data cannot separate them by month. We don't know how many more people were riding, so this is a story about more riders, not proof that riding got more dangerous.

**Closing — What to take away** (three short lines for Sam; written in S4)
