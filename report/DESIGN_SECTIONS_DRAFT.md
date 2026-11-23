# Design Sections — Draft (Week 11)

*Beyond the Road Toll* — hospitalised road-crash injuries in Australia, 2011–2021.
Stand Up 2 checkpoint draft. Written against the live site in `website/` (Phase 1 build) and the canonical figures in `CLAUDE_CONTEXT/STANDUP2_PLAN.md` §5.

**Figures referenced here are the Week 11 prototype pack (P1–P8) in `report/figures/standup2/`.**

---

## §1 Visualisation Design

### 1.1 Design brief and audience

The story is written for **Sam, a 52-year-old Australian** who arrives with two questions: *"Is it getting safer on the roads?"* and *"Is that true for people like me — and for my parents?"* Sam is not an analyst. They read a newspaper on a phone, skim first, and read on only if the first chart answers their question quickly.

The design answer to Sam is a **two-chapter narrative, not a dashboard**. Chapter 1 answers the first question with two charts (a unit chart and an indexed line chart). Chapter 2 answers the second with a heatmap and a set of aligned severity panels. Every chart exists to support one specific claim in the prose, and the prose is written first, so each chart has a single job.

### 1.2 Design principles

1. **Narrative over exhaustive exploration.** One chart per claim; nothing is shown "just in case." The brief is explicit that this is a data story, not an unconstrained explorer, and that we must not reproduce BITRE's Power BI.
2. **One chart, one comparison.** Charts are split by the comparison they carry (magnitude, time trend, category × category, severity), never overlaid.
3. **Direct labels instead of legends where possible.** Line ends are labelled in the line chart; heatmap cells carry their own value. A reader never has to bounce between chart and legend to decode the main claim.
4. **Annotate the finding, not the mechanics.** The charts label *why* (Victoria/NSW counting changes, COVID-19 lockdowns, the 2.6×/8× severity multiples) rather than just *what* the axes are.
5. **No dual axes.** Different magnitudes are handled by indexing to a common base, by using per-person rates, or by splitting into aligned panels — never by two y-scales on one chart.
6. **Counts and rates side by side.** Raw counts can mislead (population grew +15%); every measure that can be misread is paired with a per-person alternative via a single toggle.
7. **Mobile-first, accessible by default.** Charts are drawn for a 375px phone first, then widened; colour is never the only signal, and every chart has a data table behind it.

### 1.3 Chart 1B — the unit chart ("one death, N hospitalised")

**Task.** Make an abstract ratio concrete: in 2021, about 35 people were hospitalised for every road death.

**Encoding.** One dot per person; a single dark dot represents one road death and the surrounding light dots the people hospitalised alongside it. Two blocks (2011, 2021) sit one above the other so the *growth* of the block — 27 dots growing to 35 — is the visual argument. The dots animate in on first view (disabled under reduced motion).

**Why a unit chart.** It is memorable and human-scale, it works at the top of a story to give the ratio physical size, and it needs no axis or legend. The reader "sees" 35 people where a "35.0" would have been an abstraction.

**Alternatives rejected.** A pie chart (the part-to-whole framing is not the point; we compare *two* ratios, not one), a bar chart (compresses the ratio to a single length and loses the "people" reading), and a log axis (accurate but abstract for a general reader).

### 1.4 Chart 1A — the indexed line chart

**Task.** Compare hospitalisations, road deaths and population — three series that differ by orders of magnitude — and show the *gap* over time.

**Encoding.** All series are indexed to **2011 = 100**; position on the common scale encodes relative change. Hospitalisations and road deaths are solid lines, population is a dashed grey reference. Direct end labels carry the 2021 value; the 100 line is emphasised so the reader can read "above" or "below" at a glance. Annotations mark the Victoria counting change (2011), the NSW change (2017–21 grey band) and the COVID-19 lockdowns (2020). A **Counts / Per person** toggle re-renders the same geometry against rates (per 100,000 residents).

**Why indexed.** It isolates *relative* change, which is the honest claim — deaths fell ~11.5% while hospitalisations rose ~16% — without implying a false common magnitude.

**Alternatives rejected.** A dual axis (the canonical misleading encoding; the lines can be made to cross anywhere), separate small-multiple panels (loses the visual "gap" that is the whole point), and a slope chart (shows only endpoints, losing the COVID dip and the time path).

### 1.5 Chart 2A — the heatmap

**Task.** Show change across two categorical dimensions (road user × age) and let Sam find themselves in the grid.

**Encoding.** Rows are five road-user groups, columns seven age groups; each cell's colour is the **log-ratio of the 3-year-average change** (2011–13 → 2019–21), on a symmetric scale from −60% (halved) to +150% (doubled-and-a-half). Blue is a fall, orange a rise, a neutral paper tone is no change. Cells with fewer than ~30 cases in either compared year are hatched grey rather than coloured. The currently-selected cell gets a dark outline; selecting a cell (click, tap, Enter/Space, or the two "Find yourself" selectors) drives a linked yearly trend line and a plain-language sentence beneath the chart.

**Why log-ratio colour.** Halving (−50%) and doubling (+100%) are perceptually equal steps either side of zero, so the map is symmetric around "no change" and the biggest rises don't swamp everything else. Three-year averages are the primary encoding because endpoint years are noisy (single-year endpoints would read +212%/+228% for cyclists 65–74/75+; the 3-year averages give +138%/+142%).

**Alternatives rejected.** Small multiples of bar charts (35 groups is too tall and unreadable on a phone), a bubble chart (harder to read an exact cell and to label), and grouped bars (35 groups become visual noise).

### 1.6 Chart 2B — the aligned severity panels

**Task.** Compare three very different severity measures — volume, average stay, and in-hospital mortality — across age, without a dual axis.

**Encoding.** Three horizontal-bar panels share a single age axis, so the eye moves horizontally across the same row. The 75+ row is highlighted in orange in every panel. Each panel carries its own unit and its own annotation (e.g. "11.1 days: 2.6× the 26–39 group's 4.3" and "28.1 vs 3.5 per 1,000: 8×").

**Why panels.** Each measure has its own scale, but the *age ordering* is what the claim needs; sharing the axis makes the inversion (fewer cases, longer stays, higher mortality) legible at once.

**Alternatives rejected.** A dual axis (misleading), a radar/spider chart (hard to compare exact values), and a table alone (loses the visual shape of the inversion).

### 1.7 Cross-cutting encodings

- **Colour tokens.** Orange (`#b8470f`) = rise/accent; blue (`#1f5f99`) = fall/decrease; grey = reference/neutral; paper background. Both are distinguishable by deuteranopia/protanopia.
- **Number formats.** Thousands separated by commas; negative values use a true minus sign; percentages are rounded to whole numbers in prose but given to one decimal in the data tables.
- **Source note on every figure**, naming BITRE, ABS ERP and BITRE ARDD, with licence and the specific exclusion rules (hospitalisation counts exclude people who died in hospital).
- **Data table behind every chart** (`details`/`summary`), so exact values and small counts are always reachable.
- **Small-count rule.** Cells under ~30 cases in a compared year are hatched out rather than given a spurious percentage.

### 1.8 Accessibility and mobile

Colour-blind-safe palette (blue/orange, never red/green); text and hatching carry the signal, never colour alone; every SVG has an `aria-label` summarising the finding; charts and cells are keyboard-focusable; `prefers-reduced-motion` disables the unit-chart animation and tooltip fade; the full layout works at 375px with no horizontal page scroll.

### 1.9 Design evolution (what changed and why)

From concept sketches to the built site, three decisions stand out. **Three-year averages replaced single-year endpoints** as the heatmap's primary encoding, because single-year comparison overstated the cyclist rises and a "more than doubled" claim is true under both methods. **The heatmap gained a log-ratio scale** so the doubling among older cyclists and the halving among some pedestrians read as equal-magnitude events. **"Tripled" became "more than doubled"** in the prose, because only the less-defensible single-year method supported "tripled."

---

## §2 Interaction Design

### 2.1 Interaction goals

Five goals, in the order a reader needs them: **orient** ("what am I looking at?"), **compare** (counts vs per-person), **personalise** ("find yourself" in the grid), **drill down** (from a heatmap cell to that group's yearly trend), and **inspect** (exact values in the data table or tooltip).

### 2.2 Principles

Direct manipulation (click/tap a cell, don't hunt for a control); visible state (the selected cell and active toggle are always obvious); progressive disclosure (trend line and tables stay collapsed until wanted); no hover-only content (everything works by touch and keyboard); parity between keyboard, touch and pointer; reduced motion respected throughout.

### 2.3 Interaction inventory

| Control | Location | Action | Response / feedback | Keyboard / touch |
|---|---|---|---|---|
| Counts / Per person toggle | Lines chart (Ch1) | Click | Re-renders geometry + prose subheading; `aria-pressed` updates | Buttons are native and focusable |
| Change in number / per person toggle | Heatmap (Ch2) | Click | Re-colours cells, re-writes the mode note | Native buttons |
| "Find yourself" selectors (road user, age) | Heatmap (Ch2) | Change | Moves the selection outline, updates sentence, trend line and tables | Native `<select>`; also driven by cell click |
| Heatmap cell | Ch2 grid | Click / Enter / Space | Selects that cell; outlines it; updates trend, sentence, tables | Focusable; `role="button"` |
| Heatmap cell hover/focus | Ch2 grid | Hover / focus | Tooltip with 3-yr and single-year values, population and per-person % | Focus shows the same tooltip |
| Pointer over line chart | Ch1 lines | Move / tap | Crosshair + tooltip for the nearest year, values per series | Left/Right arrow keys step years; Esc dismisses |
| Severity bar row | Ch2 severity | Hover / focus | Tooltip with exact counts and days | — |
| Data table (`View the data`) | Every figure | Open `details` | Shows the full table for that chart | `<summary>` is focusable |
| Unit chart entry | Ch1 unit | On load | Dots animate in | Disabled under reduced motion |
| Global: Escape | Anywhere | Key | Dismisses the tooltip | — |
| Global: resize | Window | Resize | Debounced (200ms) redraw of all charts; tooltip hidden | — |

### 2.4 State model

`default → hovered → selected → mode (counts/per-person) → low-count (hatched) → resized`.

- **default** — everything rendered, no tooltip, one heatmap cell pre-selected (pedal cyclist, 65–74).
- **hovered / focused** — transient tooltip, does not change selection.
- **selected** — persistent (survives a mode toggle), drives trend line + sentence + tables.
- **mode** — counts vs per-person; changes colour encoding and prose but keeps the selection.
- **low-count** — a cell is hatched and its sentence reports the raw counts instead of a percentage.
- **resized** — charts redraw at the new width; selection and mode persist.

### 2.5 Feedback and affordances

Cursor changes to `pointer` on cells and `crosshair` on the line chart; the selected heatmap cell carries a 3px ink outline; the active toggle is inverted (dark fill); the sentence region updates live and is announced via `aria-live="polite"`; tooltips reposition to stay within the viewport.

### 2.6 Mobile and touch

Controls meet a ~40px minimum target height; `touch-action: pan-y` lets a vertical scroll pass through the line-chart overlay; tooltips show on tap (and on focus); horizontal scrolling is confined to the data-table scroll container, never the page.

### 2.7 Accessibility

Semantic landmarks (`header/main/footer`), a logical heading order, `role="img"`/`role="button"` with `aria-label`s on every SVG and cell, visible `:focus-visible` outlines, full keyboard path, reduced-motion support, and text alternatives (tables) for every chart.

### 2.8 Built vs planned

**Built** (Phase 1): everything in the inventory above. **Planned** (not yet built, and labelled as such): sex and remoteness filters, URL-addressable state (deep-linking a selection), a downloadable processed CSV, and a guided tour. Only what is actually in `website/` is claimed here.

### 2.9 Evaluation plan (for the final submission — not run yet)

Five to six Sam-like participants, think-aloud protocol, three tasks ("find your group's change", "which age group stays longest", "switch to per person"). Measures: task success, time on task, and SUS; with a changes log. This is planned, not executed; it belongs to the usability checkpoint, not Week 11.

---

## §3 Website Design

### 3.1 Goals

A news-story reading experience: masthead → story → methods, scroll-driven, mobile-first, fast (static files, vendored D3, no build step or CDN), and accessible by default.

### 3.2 Information architecture and page flow

`Masthead → Chapter 1 (deaths vs injuries) → Chapter 2 (older riders, longer stays) → About this data → footer`. There is **no top navigation**; the story itself is the navigation, and the only in-page anchor is a link from the first chapter to the "About this data" methods section. Every figure sits immediately after the claim it supports.

### 3.3 Layout system

Two container widths: `.wrap` (760px) for prose and `.wide` (980px) for figures, both with 16px side gutters and auto-centred. Prose stays narrow for comfortable line length; charts get the full figure width and their SVGs scale to the container.

### 3.4 Typography and colour

A serif stack (Georgia / Palatino / Times) for body text — the newspaper register — and a system sans stack for labels, controls, captions and tables. Heading sizes use `clamp()` so they scale fluidly. Colour is defined as CSS custom properties on `:root`: orange (`--accent #b8470f`) for rises and emphasis, blue (`--blue #1f5f99`) for falls and links, grey for reference lines, and a warm paper background (`#faf8f3`).

### 3.5 Component inventory

Chapter header (number + headline), figure head (title + one-sentence finding), toggle control, "Find yourself" selector panel, sentence callout (the plain-language reading of a selection), log-ratio colour legend with hatch key, linked trend block, source note, collapsible data table, tooltip, and "About" method cards.

### 3.6 Responsive behaviour

Breakpoints at **600px** (body font size and the finder becoming a two-column grid), **560px** (chart-level label logic: narrower margins, stacked labels, fewer x-ticks, wrapped axis text) and **479px** (legend simplification — minor "halved/doubled" ticks are dropped to avoid collision). There is no page-level horizontal scroll; data tables scroll inside their own container. The layout was verified at 375px with `scrollWidth` equal to the viewport.

### 3.7 Accessibility

Semantic HTML5, one `h1`, logical heading order, `aria-label`/`role` on all non-text content, `aria-pressed` on toggles, `aria-live` on the sentence region, keyboard-operable charts, `:focus-visible` outlines, reduced-motion support, and text tables for every visualisation.

### 3.8 Technical architecture

A static site — plain `index.html`, one stylesheet, and ES5-style D3 modules under `js/charts/` (`common`, `unit`, `lines`, `heatmap`, `severity`), coordinated by `js/main.js`, which loads six CSVs with `d3.csv`, fills every `data-fill` prose number from the data (so prose and charts can never disagree), and redraws on resize. D3 7.9.0 is vendored; all paths are relative; there is no build step and no CDN.

### 3.9 Hosting and deployment

Copy the entire `website/` folder to the Swinburne Mercury web directory, keeping the folder structure; test from another device; fall back to `python3 -m http.server` locally. (Deployment is **next**, not done.)

### 3.10 Known gaps

Team names, GitHub URL and licence version are placeholders in `index.html`; there is no downloadable dataset yet; the Chapter 2 explorer covers road user × age only (sex/remoteness are out of scope for Phase 1).
