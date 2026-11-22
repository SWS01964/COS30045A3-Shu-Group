# Speaker notes — Week 11 deck (Stand Up 2)

Open `index.html` in a browser; use left/right arrows (or click right/left half) to move. Print to PDF for a handout. Aim ~6–8 minutes for slides 1–10; slide 11 is Q&A backup.

---

**Slide 1 — Title (15s).**
"Good morning/afternoon. I'm [name], from [team]. This is *Beyond the Road Toll* — our Week 11 design checkpoint. It's a data story about hospitalised road-crash injuries in Australia from 2011 to 2021, answering two questions: is it getting safer, and is that true for everyone."

**Slide 2 — Where we are (30s).**
"At Stand Up 1 we showed *what* our story is: two claims and who it's for. Both are now built as a working D3 prototype, and the data is checked against BITRE's own published tables, which match exactly. Today is about *how*: the design decisions behind the visualisation, interaction and website, and our plan for the rest of the code."

**Slide 3 — Claim 1 (60s).**
"Claim one: the road toll is falling, but the injury toll isn't. In 2021, 39,505 people were hospitalised — about 108 a day. For every person killed, 35 were hospitalised, up from 27 a decade earlier. Road deaths fell eleven-and-a-half percent, but hospitalisations rose sixteen percent. Because these are different sizes, we index both to 2011 — the gap between the lines is the story. Switch to per person and the hospitalisation rate is basically flat. So fewer people are dying, but the same number per head are being seriously hurt."

**Slide 4 — Claim 2 (60s).**
"Claim two: cycling injuries have more than doubled among the over-65s. Cyclists aged 65 to 74 rose 138 percent, and over-75s rose 142 percent, using three-year averages. Even per person — after accounting for an ageing population — that's still plus 78 and plus 92 percent. The heatmap lets the reader find themselves: pick road user and age, and it tells you the change in plain English."

**Slide 5 — Visualisation design (75s).**
"Each chart exists to support one claim, and each was chosen against alternatives. The unit chart makes a ratio human — one dark dot is a death among the hospitalised. The indexed line handles series of different sizes without a dual axis. The heatmap handles two categories plus magnitude. And we deliberately rejected pies, dual axes, radar charts and small multiples. Two decisions matter most: three-year averages, so 'more than doubled' is defensible, and a log-ratio colour scale, so halving and doubling look equal."

**Slide 6 — Interaction design (75s).**
"Interaction serves five goals — orient, compare, personalise, drill down, inspect. 'Find yourself' is the personalisation: two selectors and a plain-language sentence. Clicking a cell drills into that group's yearly trend. Everything has keyboard and touch parity and respects reduced motion. The state model is simple: default, hovered, selected, mode, low-count, resized — and selection survives a mode change."

**Slide 7 — Website design (45s).**
"Visually it's a newspaper page, not a dashboard. There's no navigation — the story is the navigation. Prose sits in a 760px column, figures at 980px. Orange means rise, blue means fall, on a paper background. It's mobile-first at 375px, and accessible — semantic HTML, keyboard, reduced motion, a colour-blind-safe palette."

**Slide 8 — Prototype evolution (30s).**
"The prototype moved from concept sketch, to wireframe, to build. Three things changed along the way: we adopted three-year averages, added a log scale to the heatmap, and corrected 'tripled' to 'more than doubled' because only the weaker single-year comparison supported 'tripled'."

**Slide 9 — Coding plan (30s).**
"Technically it's a static site — six clean CSVs feed four chart modules with one set of shared constants: colour tokens, breakpoints, the 2011-equals-100 convention, and the log-ratio scale. Prose numbers are computed from the same data so words and charts can't disagree. QA is automated headless rendering plus a keyboard and reduced-motion walkthrough. What's left — placeholders, a CSV download, usability, deployment — is clearly next, not done."

**Slide 10 — Next steps + asks (15s).**
"What remains is the usability evaluation, the design-process write-up and Mercury deployment, then an optional Phase 2. I'd welcome feedback on the chart choices and the find-yourself flow."

**Slide 11 — Backup (Q&A only).**
Pull this up if asked about rigour: validation matched BITRE exactly, 18 passes and 9 explained failures. The three caveats worth naming: the Victorian and NSW counting changes, the bed-day and death-window limits, and the fact that counts are not rates.

---

### Quick answers (full bank in `CLAUDE_CONTEXT/QA_BANK.md`)
- **Why a heatmap?** Two categories + magnitude; compact; reader can find themselves.
- **Why log-ratio colour?** Halving/doubling are equal steps; linear would let the biggest rises dominate.
- **Why 3-yr averages?** Endpoints are noisy; "more than doubled" holds under both methods.
- **Isn't this ageing?** 65–74 pop +33% vs injuries +138% → +78% per person; 75+ +26% vs +142% → +92%.
- **Why not a dashboard?** The brief asks for a narrative; BITRE already has the explorer.
- **Series breaks?** Vic 2012 / NSW 2017 lower counts, so the rise is understated.
- **Exposure?** No km/trips in the data; we adjust for population, not exposure.
- **Why D3?** Required, and right for custom annotated charts; vendored, no build step.
