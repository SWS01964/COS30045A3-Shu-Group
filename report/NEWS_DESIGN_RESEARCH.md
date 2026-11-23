# Newspaper data-journalism design research (S2)

Date: 2026-11-23. Purpose: patterns for the "Beyond the road toll" D3 data story.

## 0. Honest scope note

Automated fetching was heavily restricted. Most target outlets could not be read, so **most typography, colour and chart-style detail below is labelled "general knowledge"** (what these outlets are widely known to do, not verified on a fetched page today). Nothing in the "Read" column was invented. Computed CSS was never available: the fetch tool returns page text as markdown, with no stylesheets.

| Outlet | Page(s) tried | What I could actually read |
|---|---|---|
| ABC News (AU) | https://www.abc.net.au/news ; https://www.abc.net.au/news/2026-11-21/victorian-election-regional-voters-issues-seat-by-seat/107390056 | **Read** (text structure only, no CSS): homepage modules, nav, appearance toggle; one analysis article's anatomy |
| The Conversation AU | https://theconversation.com/au | **Read** (text structure only): homepage cards, bylines with affiliations |
| BBC (bbplot docs) | https://raw.githubusercontent.com/bbc/bbplot/master/README.md | **Read**: BBC Visual Journalism's published R chart helper (title/subtitle/source rules). Not an article page |
| Guardian (fonts/typography) | web search results only (github.com/guardian/fonts, csnx PR 1335) | **Search snippets only**; article pages blocked |
| Guardian AU/UK, BBC News articles | theguardian.com, bbc.com | **Blocked** by fetch tool |
| FT | ft.com/visual-and-data-journalism; github.com/Financial-Times/chart-doctor | ft.com **blocked**; GitHub repo page had no guidance text |
| SMH / The Age | smh.com.au/interactive | **Blocked** |
| Zeit Online | zeit.de | **Blocked** |
| Le Monde (Les Decodeurs) | lemonde.fr | **Blocked** |
| El Pais | elpais.com | **Blocked** |
| NZZ | nzz.ch/visuals | HTTP 402 (paywall) |
| The Economist, Reuters Graphics | economist.com, reuters.com | **Blocked** |

Requirement for 6+ outlets read directly was **not met**. Six-plus outlets are covered below, but only ABC, The Conversation and BBC (docs) have verified content. The rest is general knowledge. If the team wants verification, open 3 or 4 pages in a browser and use DevTools (Computed > font-family, font-size, max-width) against the checklist in section 5.

## 1. Per-outlet notes

### ABC News (verified from text; CSS not visible)
- Homepage: skip links first, then a section nav ("Just In", "For You", "Analysis", "More") and search. A light/dark/system **Appearance (beta)** setting exists. Module order runs Top Stories, Spotlight, Local, Just In, Analysis, topic blocks. Cards are thumbnail + headline + topic tag, sometimes byline and reading time.
- Article (analysis piece): lowercase **"analysis" kicker** plus a topic tag above the headline; **"Analysis by [name] and staff"** byline; **published and updated timestamps** shown separately; no separate standfirst (opening paragraphs act as lede); every photo/graphic has a caption with a **credit in parentheses**, e.g. "(ABC News: Name)"; maps carry alt text ("A map of the state seat of Bass"); ends with "Related stories / Related topics". No methods note on that page. Takeaway: even a mainstream outlet shows *updated* time and credits every graphic.
- General knowledge (unverified today): ABC uses its own sans-serif family, a white page, a narrow single column of about 620-700px, and bespoke interactives built with its Visual Journalism team.

### The Conversation AU (verified from text)
- Bylines carry **academic affiliation** under the name; sections are labelled; "Most read" is a numbered list. General knowledge: serif/sans mix, white page, a plain single text column, and a short "Disclosure statement" at the article end, which is a good model for our methods/limitations box.

### BBC Visual Journalism (verified from bbplot README only)
- Chart furniture: **title, subtitle and source are all left-aligned**; the **source line sits bottom-left and begins "Source:"**; a small brand block bottom-right; default export 640 x 450px; series colours set explicitly in the geoms (not by default theme). General knowledge: titles state the finding, minimal gridlines (horizontal only), direct labels, a restrained 3 or 4 colour palette, and one colour for the highlighted series. Fonts are proprietary (do not copy).

### The Guardian (search snippets only; pages blocked)
- Verified from snippets: two custom families, a display serif headline face (weights 300/500/700) and a text serif (400/700 + italics) with a sans for UI, and fallback to Georgia/serif; one headline preset 3.125rem at line-height 1.15, weight 500. Other numbers (17/20/24/28px) came from an unverified third party; ignore.
- General knowledge: kicker/section label, bold headline, standfirst, byline with date, captions with credits, "Methodology/Notes" for data pieces, charts often with headline-finding titles.

### FT, Zeit Online, Le Monde Decodeurs, El Pais, NZZ, SMH/The Age (not read)
- Everything is general knowledge: FT is known for off-white (salmon) page and one highlighted line with grey context lines and direct end-of-line labels; Zeit and NZZ for generous whitespace and full-bleed scroll stories; Le Monde Decodeurs for question-style explainers and "Ce qu'il faut retenir" (key points) boxes; El Pais for large image-led scroll pieces and sticky charts. Treat as hypotheses.

## 2. What the current site already does well

From `website/css/style.css` and `index.html`: off-white `--bg:#faf8f3`, serif body with sans for UI, 760px measure and 980px wide figures, kicker + chapter number, `.fig-head h3` + `.fig-sub` + `.source` per figure, "View the data" `<details>` tables, tabular numerals on key numbers, focus rings. This is already close to the pattern. Gaps: system fonts only (Georgia/system-ui), no dateline or updated-date, byline placeholder, no "key points" box, no pull-stat, no methods box styling, no dark theme, no sticky section indicator, h3 chart titles are descriptive rather than findings in places.

## 3. Patterns to adopt (10 to 15, each mapped to a change)

1. **Finding-first chart titles, unit in subtitle, source under every figure.** Retitle chart h3s as sentences ("Hospital injuries rose 16% while deaths fell 11.5%"); `.fig-sub` holds unit/period ("Index, 2011 = 100"). Keep `.source`, add a "Notes:" line. CSS: `.fig-title` (sans 600, 1.1rem), `.fig-sub`, `.fig-source`, `.fig-notes`.
2. **Left-align all chart furniture** (title, subtitle, source) to the chart's left edge, as BBC's helper specifies. Remove any centred titles.
3. **Direct labels, no legends.** In `js/charts/lines.js` and others, label series at line ends; drop legend elements. Keep a legend only for heatmap colour scales (already `.legend-scale`).
4. **One highlight, rest grey.** Add `--hl` (accent) and `--ctx` (grey) tokens; draw context series in `--ctx` at 1.5px, highlight at 3px. Max 3 colours per chart.
5. **Annotation callouts.** Add `.annot` (sans 12px, thin leader line, `--ink-2`) for 1 or 2 notes per chart ("2020 lockdowns"). Implement as SVG text with a 1px line in common.js.
6. **Lighter gridlines, horizontal only, no chart border.** `--grid:#e7e3d8` at 1px; zero line in `--ink`; delete vertical gridlines and axis domain lines except baseline.
7. **Headline block with updated date.** Masthead gets kicker, headline, standfirst, byline, and `Published 23 Nov 2026 · Updated …` (ABC shows both). Replace "[Team names]" before submission. Add `.dateline`.
8. **Credit and alt text on every graphic.** Follow ABC's alt-text-on-maps habit: each `<figure>` gets `aria-labelledby` (present) plus a one-sentence `aria-describedby` text summary of the finding; keep "View the data" tables (present).
9. **Key-points box at the top of each chapter** (2 or 3 bullets, "What to know"). `.keypoints` with a 3px accent left rule, sans 0.95rem. Helps scanners and mobile readers.
10. **Pull stat instead of pull quote.** Big number + one-line caption in the text column: `.pullstat` (display serif 3rem, tabular figures, caption in sans). Use once per chapter.
11. **Methods and limitations box at the end** (Conversation-style disclosure + BBC "Source:" rule): `.methods` section with data sources, definitions, caveats (counts not rates; 2011-19 for deaths in care; bed days 2016-21), and last-updated date. Style: `--band` background, sans 0.88rem.
12. **Section breaks with chapter nav.** Keep kicker+chapter number; add a slim sticky top bar with a chapter list and a thin reading-progress line (CSS `position:sticky`, scroll-linked width, hidden when `prefers-reduced-motion`). Interactivity stays optional: the story reads fully without it.
13. **"Find yourself" pickers inside a styled sentence box** (already `.sentence`, `.finder`). Keep them clearly labelled "Optional", default to a sensible state so the chart tells the story without touching it.
14. **Mobile chart adaptation at 375px.** Use `viewBox` aspect ratios that change by width (e.g. 4:3 below 600px), fewer ticks (every 2nd or 3rd year), 12px minimum label size, wide tables in `.table-scroll`, tap targets 44px. Move annotations below the chart on narrow screens.
15. **Tabular, lining figures and consistent number formats.** `font-variant-numeric: tabular-nums lining-nums` on `.n`, tables, axes; thin-space thousands separators or commas consistently; "per 100,000" always spelled out.

## 4. Design token proposal

Fonts are free from Google Fonts (SIL OFL): Source Serif 4 (text and display), Inter (UI and chart text). Newsreader is an alternative display serif. Tabular figures are supported by Inter (`tnum`) and Source Serif 4.

```css
:root{
  /* fonts */
  --serif:"Source Serif 4","Iowan Old Style",Georgia,serif;
  --display:"Newsreader","Source Serif 4",Georgia,serif; /* optional, headlines only */
  --sans:"Inter",system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;

  /* type scale (fluid, ~1.25 ratio) */
  --fs-micro:.78rem;   /* source, notes */
  --fs-small:.9rem;    /* captions, UI */
  --fs-body:1.125rem;  /* 18px, line-height 1.65 */
  --fs-lede:1.3rem;    /* standfirst, line-height 1.45 */
  --fs-h3:1.15rem;     /* chart title, sans 600 */
  --fs-h2:clamp(1.65rem,5.5vw,2.4rem);   /* lh 1.15 */
  --fs-h1:clamp(2.4rem,9vw,4.2rem);      /* lh 1.05 */
  --lh-body:1.65; --lh-tight:1.15;

  /* measure & spacing */
  --measure:66ch;         /* about 680-720px at 18px; current 760px wrap is fine on desktop */
  --wide:980px; --bleed:1200px;
  --gutter:16px;
  --s1:4px; --s2:8px; --s3:16px; --s4:24px; --s5:40px; --s6:64px;

  /* colour: light */
  --bg:#faf8f3; --surface:#fff;
  --ink:#1c2230; --ink-2:#434a5a; --muted:#646b78;  /* muted 4.9:1 on bg */
  --rule:#d9d4c8; --grid:#e7e3d8; --band:#ece8dc;
  --hl:#b8470f;          /* highlight / accent */
  --hl-soft:#f4d8c5; --hl-ink:#8f3406;
  --ctx:#9aa1ad;         /* context series grey */
  --ctx-dark:#6b7280;
  /* rise / fall, colour-blind safe (blue vs orange; also encode with arrows or labels) */
  --rise:#c2410c;        /* increase in harm (orange-red) */
  --fall:#1f5f99;        /* decrease (blue) */
  --focus:#b8470f;
}
@media (prefers-color-scheme:dark){
  :root:not([data-theme="light"]){
    --bg:#14171e; --surface:#1c2029;
    --ink:#eef0f4; --ink-2:#c3c8d2; --muted:#9aa2b0;
    --rule:#343a47; --grid:#2a2f3a; --band:#1f242e;
    --hl:#f08a4b; --hl-soft:#3a2418; --hl-ink:#f7a672;
    --ctx:#6f7787; --ctx-dark:#8a92a1;
    --rise:#f08a4b; --fall:#6aa9dd;
  }
}
:root[data-theme="dark"]{ /* same values as above for a manual toggle */ }
```
Rules: charts use at most `--hl`, `--fall`, `--ctx`; sequential scale for the heatmap should be single-hue (orange) from `--hl-soft`; never rely on red/green. Do not set `--rise` as "bad" in green terms; use text labels ("up", "down") alongside colour.

## 5. Checklist if the team verifies pages manually

For 3 or 4 pages (any outlet) open DevTools and record: body font-family and size; line-height; `max-width` of the article column; headline size on desktop and 375px; chart title/subtitle/source classes; colours of highlight vs context series; whether a data table or alt text exists; presence of sticky nav or progress bar; scroll mechanism (scrollytelling or stepped).

## 6. Do not copy

Learn patterns only. Do not reuse any outlet's name, logo, masthead style, wordmark, proprietary fonts (Guardian Egyptian/Headline, BBC Reith, FT Financier/Metric, etc.), distinctive colours (FT salmon, BBC red-blocks), or chart templates and branding blocks. Our site uses its own name ("Beyond the road toll"), free OFL fonts, and its own palette. Do not mention outlet names on the site as endorsement.

## 7. Wireframes

Desktop (about 1280px)

```
+----------------------------------------------------------------+
| BEYOND THE ROAD TOLL    1 2 3 4 5   [progress line ======    ] | sticky, slim
+----------------------------------------------------------------+
|                 A DATA STORY  ·  ROAD CRASH INJURIES 2011-21   | kicker
|                 Headline in display serif, two lines max       |
|                 Standfirst (1.3rem, grey-ink, 2 sentences)     |
|                 By Names · Published 23 Nov 2026 · Updated ... |
+----------------------------------------------------------------+
|   +--------------- hero chart (wide, 980px) --------------+   |
|   | Finding-style title                                    |   |
|   | Unit, period subtitle                                  |   |
|   | [chart: highlight line + grey context, direct labels]  |   |
|   | Source: ... Notes: ...                  [View data v]  |   |
|   +--------------------------------------------------------+   |
|          CHAPTER 1                                             |
|          H2 finding sentence                                   |
|          +-- Key points (3 bullets) --+                        |
|          Body text, 66ch column, centred                       |
|          -- big pull stat: 35 : 1 --                           |
|   +---------------- wide figure ---------------------------+   |
|          Optional finder sentence box                          |
|          ...                                                  |
|          Methods and limitations (band background)            |
|          Related: other chapters / data sources               |
+----------------------------------------------------------------+
```

Mobile (375px)

```
+---------------------------+
| BEYOND THE ROAD TOLL  [=] |  sticky, progress line under
+---------------------------+
| KICKER                    |
| Headline (2.4rem)         |
| Standfirst                |
| By Names                  |
| Published / Updated       |
| [hero chart, 4:3, full-   |
|  width, 16px gutters]     |
| Title (finding)           |
| Subtitle (unit)           |
| Source / Notes            |
| [View data v]  (scrolls)  |
| CHAPTER 1                 |
| H2                        |
| Key points                |
| Body, 18px, ~38ch         |
| Pull stat                 |
| Figure: annotations moved |
|  below the chart          |
| Finder: stacked controls, |
|  44px targets             |
| Methods box               |
+---------------------------+
```

## 8. Reduced motion and accessibility

Wrap any transitions and the progress bar animation in `@media (prefers-reduced-motion:no-preference)`. Keep `<details>` data tables, keyboard arrow-key chart navigation (already present), 4.5:1 text contrast (check `--ctx` against `--bg` for text: use `--ctx-dark` for any labels), and a visible focus ring.
