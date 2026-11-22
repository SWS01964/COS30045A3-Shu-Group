# Prototype pack — figure captions

*Beyond the Road Toll*, Week 11 design checkpoint. Figures P1–P8 document the progression **concept → wireframe → high-fidelity build → interaction states**.

| # | File | Caption |
|---|---|---|
| P1 | `P1_concept.svg` | **Concept sketches.** Three rough ideas drawn before any code: (a) the two-chapter scroll narrative, (b) an indexed line with two series diverging from 2011 = 100, and (c) a road-user × age heatmap with the "hot" older-cyclist cell circled. Source: the ASCII sketches in `CLAUDE_CONTEXT/FOCUS_2_IDEAS.md`, redrawn. |
| P2 | `P2_wireframe_desktop.svg` | **Low-fidelity wireframe — overall page (desktop).** Masthead, Chapter 1 (prose + unit chart + prose + indexed line chart), Chapter 2 (prose + heatmap), About, footer. Prose column 760px, figures 980px, both centred with 16px gutters. |
| P3 | `P3_wireframe_chapters.svg` | **Wireframe detail — Chapter 1 and Chapter 2 figures.** Placement of the Counts/Per-person toggle, the "Find yourself" selector panel, the sentence callout, the colour legend, the linked trend block, and the three severity panels. |
| P4 | `P4_wireframe_mobile.svg` | **Low-fidelity wireframe — mobile (375px).** Single stacked column; charts reflow for narrow width; age labels stack in the heatmap; data tables scroll inside their own container. |
| P5 | `P5_desktop_full.png` | **High-fidelity build — desktop.** Headless-Chrome full-page capture of the live site at 1280px. Shows the unit chart, indexed lines with annotations, the heatmap with finder and trend, and the severity panels. |
| P6 | `P6_mobile_full.png` | **High-fidelity build — mobile.** Headless-Chrome full-page capture at 375px (device-emulation width). Confirms the stacked layout and no horizontal page scroll. |
| P7 | `P7_states.svg` | **Interaction-state strip.** Five states of the heatmap: default selection, hover/focus tooltip, click → linked yearly trend, per-person mode, and the low-count hatch rule, with the colour/hatch key. |
| P8 | `P8_evolution.svg` | **Design evolution.** The indexed line chart and the heatmap from concept sketch, to wireframe, to the shipped D3 chart — showing where the log-ratio colour and 3-year-average encoding were added. |

Source notes: hospitalisation and death data from BITRE; population from ABS Estimated Resident Population. See the "About this data" section of the site for the full caveat list.
