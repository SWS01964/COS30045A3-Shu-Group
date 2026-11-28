# Wireframes (Design Book 3.1 Website design)

Low-fidelity, hand-written SVG with 1x PNG exports. Layout follows `report/LAYOUT_SPEC.md`; content (headlines, figure titles, notes) follows `report/STORYBOARD.md` v2. Grey = structure, blue = interactive controls only. Chart shapes are illustrative, not data. Desktop frames are 1280px wide (dashed guides: 680px text column, 1040px figure breakout). Mobile frames show the 375px phone on the left and layout callouts in a 285px margin on the right (canvas 660px).

| File | Shows |
|---|---|
| `00_page_overview_desktop` / `_mobile` | Whole page: masthead + sticky nav, hero with lede figure 1B, chapters 1-5 as stacked sections, closing, methods, download, footer |
| `ch1_*` | Ch1 headline, standfirst, What to know, fig-1a (counts / per 100,000 toggle) |
| `ch2_*` | Ch2: fig-2a heatmap with "find yourself" pickers and toggle, fig-2b three aligned panels |
| `ch3_*` | Ch3: fig-3a stepper paired bars, fig-3b dot plot with whiskers, fig-3c sorted dots, chapter caveat |
| `ch4_*` | Ch4: fig-4a monthly line + band with view switch, 4b diverging bars, 4c annual trend, caveat, 4d state inset |
| `ch5_*` | Ch5: fig-5a two lines with toggle, 5b paired bars, 5c share / dumbbell toggle, caveat |

## Design rationale
- **Narrative order, not a dashboard.** One column, read top to bottom: hero finding, five chapters that each answer one of Sam's questions, then takeaways. No side panels or tabs (brief: "clear, analytically grounded narrative").
- **Headline states the finding.** Every chapter and figure title is a claim, so a skimmer gets the story without reading charts.
- **What to know box up front.** 2-3 bold-number bullets give the explanatory layer; the figures below serve readers who want to explore.
- **Structured exploration, one control per chart.** Controls (segmented buttons, selects, a stepper) sit directly above the chart they change, so cause and effect stay in one view (brief: "explore selected dimensions in a structured way").
- **Mobile first.** 375px is the base layout; controls are full width and 44px tall; the nav is a swipeable pill bar. At 960px+ the text stays at 680px and figures break out to 1040px.
- **Caveats beside the chart.** A notes line under each figure and a chapter caveat box keep limitations next to the claim they qualify, not hidden in Methods.
- **Labels on marks, no legends.** Series are named at line ends and bar ends; colour is never the only cue (dash styles, hatching for low counts, value text).
- **Accessibility baseline.** Each figure is `role="img"` with a summary, has a "Show the numbers" table, keyboard-operable controls, and a visible focus ring.
- **Exploratory and explanatory together.** The default view of each chart tells the story; toggles, pickers and tooltips let readers test it for themselves.
