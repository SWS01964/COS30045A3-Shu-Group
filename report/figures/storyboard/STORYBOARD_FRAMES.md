# Interaction storyboard frames (Design Book 3.1)

Persona: Sam, 52, outer Brisbane, phone reader. Each frame is a 375px mobile view (drawn at 400x760) with a caption band: user action, system response, what Sam learns. Grey = structure, blue = controls, orange = Sam's touch point and thoughts. Chart shapes are illustrative; numbers quoted come from `report/STORYBOARD.md` and `data/processed/`.

Overview: `storyboard_overview.svg` / `.png` (2 rows of 4, with arrows). Individual frames: `frame_01` to `frame_08` (`.svg` + `.png`).

| Frame | User action | System response | Brief requirement shown |
|---|---|---|---|
| 1 `frame_01` | Opens the link, scrolls past the hero | Headline, lede and unit chart: 35 admitted for every road death (39,505 vs 1,130, 2021) | Explanatory: finding delivered before any interaction |
| 2 `frame_02` | Ch1: taps "Per 100,000" | Lines re-index; read-out 152.3 to 153.8 per 100,000 | Counts vs rates; exploratory toggle |
| 3 `frame_03` | Ch2: picks "I travel by: Pedal cyclist", "I'm aged: 40-64", then 75+ | Own cell outlined; sentence rewrites (cyclists 75+ up 142%); earlier pick ghosted | Structured exploration (find yourself); counts vs per-person toggle |
| 4 `frame_04` | Ch2: taps a heatmap cell | 2011-21 line for the cell appears underneath | Exploratory drill-down from overview to detail |
| 5 `frame_05` | Ch3: steps Admissions, Bed days, Deaths | Pedestrian bar grows 6.5% to 13.1% to 26.4% | Structured exploration (stepper); explanatory annotation; counts vs outcomes |
| 6 `frame_06` | Ch4: switches All road users to Cyclists | Axis rescales; 2020 line rises above the 2015-19 band; June 682 vs 453 | Structured exploration (view switch); personal relevance |
| 7 `frame_07` | Ch5: toggles index to Per 100,000 | Gap appears (145 to 226 vs 149 to 149); caveat beside chart | Counts vs rates (core); caveat honesty |
| 8 `frame_08` | Opens "Show the numbers" and the Methods box | Data table expands; sources, rules, limitations shown | Explanatory trust and transparency; accessibility text alternative |
