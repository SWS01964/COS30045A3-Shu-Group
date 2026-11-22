# Q&A Bank — Week 11 (Stand Up 2)

Answers kept under ~30 seconds each. Canonical figures from `STANDUP2_PLAN.md` §5. Tone: evidence-led, honest about limits. Do **not** claim usability testing, Phase 2 or Mercury deployment are finished.

1. **Why a heatmap?** Two categorical dimensions (road user × age) plus magnitude of change. Colour shows the pattern at a glance — the two hot cells are cyclists and motorcyclists over 65 — while the text and data table give exact values. It's compact and lets the reader "find themselves" in the grid.

2. **Why a log-ratio colour scale?** Because halving and doubling should look like equal-and-opposite steps. On a linear scale the biggest rises dominate and everything else flattens to grey. We cap it at −60% to +150% so no single cell saturates the scale.

3. **Why three-year averages?** Endpoint years are noisy. Single-year 2011→2021 says cyclists 65–74 rose +212%; the 3-year average (2011–13 vs 2019–21) says +138%. Our headline — "more than doubled" — is true under both methods, so it's the defensible claim.

4. **Why not say "tripled"?** Only the single-year comparison supports that. The more robust 3-year figure is +138–142%, so we say "more than doubled" and let the tooltip show the single-year numbers.

5. **Isn't this just population ageing?** No. The 65–74 population grew +33% over the comparison while their cycling injuries rose +138% — so per person that's still +78%. For 75+: population +26%, injuries +142%, so +92% per person. Ageing explains part, not most.

6. **Counts vs rates?** Counts rise with population, so we offer a per-person toggle on both chapters. These are rates per resident, not per kilometre or per trip — we say that on the page.

7. **Why not a dashboard?** The brief explicitly asks for a narrative with *structured* exploration, not an unconstrained explorer. BITRE already has a Power BI tool for that; replicating it is discouraged.

8. **How is this different from BITRE's Power BI?** Theirs is an analyst's tool for slicing the data. Ours is a public narrative: two claims, a "find yourself" entry point, per-person views, and the caveats built into the story rather than in a footnote.

9. **Why only two chapters?** Deliberate scope. Phase 1 covers RQ1 (is it getting safer?) and RQ2 plus the age half of RQ3 (older riders). The rest — counterparty severity, COVID, equity — is a documented Phase 2 backlog.

10. **What about the series breaks?** Victoria from 2012 and NSW from June 2017 narrowed what counts as an admission, which *lowers* counts. So the national rise is understated, and NSW's post-2017 fall is a counting artefact, not a safety gain. We grey-shade it in Chapter 1.

11. **Why bed days only from 2016 and deaths only to 2019?** The bed-day method changed in July 2015, so earlier years aren't comparable. Died-in-hospital data is incomplete for 2020–21 (88 in 2020, 0 in 2021), so mortality uses 2011–19.

12. **What about exposure?** There's no kilometres, trips or cycling participation in the data, so we can't say whether a rise means more risk or more travel. We adjust for population, not exposure, and state that limit on the page.

13. **How accessible is it?** Semantic HTML, `aria-label`s on every chart, keyboard operation (arrow keys on the line chart, Enter/Space on cells), data tables behind every chart, a colour-blind-safe blue/orange palette, reduced-motion support, and a true 375px mobile layout.

14. **How will you evaluate usability?** Five to six participants matching our reader, think-aloud, three tasks, measuring success rate, time-on-task and SUS. **Not done yet** — that's the next step, part of the final submission.

15. **What remains?** Usability testing, the design-process write-up, and Mercury deployment; then optional Phase 2. First Nations data also has an unresolved validation gap, which is why it isn't used yet.

16. **Why D3?** The brief requires D3, and it's the right tool for custom annotated charts. We vendor v7.9.0 with no build step, so the site is static and fast.
