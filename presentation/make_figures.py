"""Generate vector PDF charts for the Beamer deck from data/clean/*.csv.
Run: python make_figures.py   (needs pandas, matplotlib)"""
import glob, os
import numpy as np, pandas as pd
import matplotlib as mpl
mpl.use("Agg")
import matplotlib.pyplot as plt
from matplotlib import font_manager as fm
from matplotlib.colors import LinearSegmentedColormap, Normalize
from matplotlib.patches import Rectangle

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, "..", "data", "clean")
OUT = os.path.join(HERE, "figures")
os.makedirs(OUT, exist_ok=True)

# fonts: Source Sans 3 from TinyTeX if present, so charts match slide text
for f in glob.glob(os.path.expanduser("~/Library/TinyTeX/texmf-dist/fonts/opentype/adobe/sourcesans/SourceSans3-*.otf")):
    fm.fontManager.addfont(f)
mpl.rcParams.update({
    "font.family": ["Source Sans 3", "Helvetica Neue", "DejaVu Sans"],
    "pdf.fonttype": 42, "font.size": 12, "axes.unicode_minus": True,
    "axes.edgecolor": "#434a5a", "axes.labelcolor": "#434a5a",
    "xtick.color": "#434a5a", "ytick.color": "#434a5a",
    "text.color": "#1c2230", "axes.spines.top": False, "axes.spines.right": False,
})
# website palette (website/css/style.css)
BG, INK, INK2, MUTED = "#faf8f3", "#1c2230", "#434a5a", "#646b78"
RULE, GRID, BAND, NEUTRAL = "#d9d4c8", "#e7e3d8", "#ece8dc", "#efece4"
ACCENT, ACCENT_SOFT, ACCENT_INK = "#b8470f", "#f4d8c5", "#8f3406"
BLUE, BLUE_SOFT, BAR, GREY = "#1f5f99", "#cfe0ef", "#8796a8", "#6b7280"
W = 5.43  # figure width in inches = text width on the slide

def rd(name): return pd.read_csv(os.path.join(DATA, name))
def save(fig, name):
    fig.savefig(os.path.join(OUT, name), facecolor=BG)
    plt.close(fig)
def pct(v, d=0):
    a = np.floor(abs(v) * 10**d + 0.5) / 10**d  # round half up, as the website does
    return ("+" if v > 0 else "\u2212" if v < 0 else "") + f"{a:.{d}f}%"

def spread(ys, gap):
    """Nudge label y-positions apart so they do not overlap (sorted ascending)."""
    order = np.argsort(ys); out = np.array(ys, float)
    for k in range(1, len(order)):
        i, j = order[k-1], order[k]
        if out[j] - out[i] < gap: out[j] = out[i] + gap
    return out

# ---- 1. hook: unit chart, hospitalised per death --------------------------
def fig_hook():
    r = rd("idea1_rates.csv").set_index("year")
    rows = [(2011, r.loc[2011, "hosp_per_death"]), (2021, r.loc[2021, "hosp_per_death"])]
    nmax = int(round(max(v for _, v in rows)))
    fig, ax = plt.subplots(figsize=(W, 1.3)); fig.patch.set_facecolor(BG); ax.set_facecolor(BG)
    for i, (yr, v) in enumerate(rows):
        n = int(round(v)); y = len(rows) - 1 - i
        ax.scatter([0], [y], marker="s", s=120, color=INK, zorder=3)
        ax.scatter(np.arange(1, n + 1) + 0.6, [y]*n, marker="o", s=95, color=ACCENT, zorder=3)
        ax.text(-1.2, y, str(yr), ha="right", va="center", fontsize=15, fontweight="bold")
        ax.text(n + 1.7, y, f"{n} hospitalised", ha="left", va="center", fontsize=13, color=ACCENT_INK, fontweight="bold")
    ax.scatter([], [], marker="s", color=INK, s=60, label="1 death")
    ax.text(0, 1.62, "1 death", ha="left", va="bottom", fontsize=12, color=INK, fontweight="bold")
    ax.set_xlim(-3, nmax + 11); ax.set_ylim(-0.5, 2.1); ax.axis("off")
    save(fig, "hook_units.pdf")

# ---- 2. indexed lines ----------------------------------------------------
def fig_index():
    d = rd("idea1_index_long.csv")
    style = {  # series: (label, colour, linestyle, marker, lw)
        "hospitalisations": ("Hospitalisations", ACCENT, "-", "o", 3.2),
        "population": ("Population", GREY, (0, (4, 2)), "s", 2.2),
        "road_deaths": ("Road deaths", BLUE, "-", "^", 3.2),
    }
    fig, ax = plt.subplots(figsize=(W, 2.15)); fig.patch.set_facecolor(BG); ax.set_facecolor(BG)
    ax.axvspan(2016.6, 2021.4, color=BAND, zorder=0)
    ax.text(2018.0, 125, "NSW counting\nchange (2017 on)", ha="center", va="top", fontsize=11, color=INK2, linespacing=0.95)
    ax.axhline(100, color=RULE, lw=1, zorder=1)
    ends = {}
    for s, (lab, c, ls, mk, lw) in style.items():
        x = d[d.series == s].sort_values("year")
        ax.plot(x.year, x.index_2011, color=c, ls=ls, lw=lw, marker=mk, ms=5, zorder=3)
        ends[s] = x.index_2011.iloc[-1]
    keys = list(style); ys = spread([ends[k] for k in keys], 5.0)
    for k, y in zip(keys, ys):
        lab, c = style[k][0], style[k][1]
        ax.text(2021.65, y, f"{lab} {ends[k]:.1f}", color=c if c != GREY else INK2, va="center", fontsize=12, fontweight="bold")
    # COVID annotation
    h20 = d[(d.series == "hospitalisations") & (d.year == 2020)].index_2011.iloc[0]
    ax.annotate("COVID-19\nlockdowns", xy=(2020, h20 - 1.2), xytext=(2020, 102), ha="center", va="center", fontsize=11, color=INK2,
                arrowprops=dict(arrowstyle="-", color=INK2, lw=1), linespacing=0.95)
    ax.set_xlim(2010.6, 2027.8); ax.set_ylim(82, 126)
    ax.set_xticks([2011, 2013, 2015, 2017, 2019, 2021]); ax.set_yticks([90, 100, 110, 120])
    ax.tick_params(labelsize=12, length=3); ax.grid(axis="y", color=GRID, lw=0.8); ax.set_axisbelow(True)
    ax.spines["bottom"].set_bounds(2011, 2021); ax.spines["left"].set_color(RULE)
    ax.set_ylabel("Index, 2011 = 100", fontsize=12)
    fig.subplots_adjust(left=0.1, right=0.995, top=0.98, bottom=0.14)
    save(fig, "index_counts.pdf")

# ---- 3. rates (two small panels) -----------------------------------------
def fig_rate(col, fname, color, ylim, fmt, label):
    r = rd("idea1_rates.csv").sort_values("year")
    fig, ax = plt.subplots(figsize=(2.6, 0.95)); fig.patch.set_facecolor(BG); ax.set_facecolor(BG)
    ax.plot(r.year, r[col], color=color, lw=3.2, marker="o" if color == ACCENT else "^", ms=4.5)
    a, b = r[col].iloc[0], r[col].iloc[-1]
    ax.text(2011, a + ylim[1]*0.07, fmt.format(a), ha="center", va="bottom", fontsize=12, fontweight="bold", color=color)
    ax.text(2021, b + ylim[1]*0.07, fmt.format(b), ha="center", va="bottom", fontsize=12, fontweight="bold", color=color)
    ax.set_ylim(*ylim); ax.set_xlim(2010.3, 2021.7); ax.set_xticks([2011, 2016, 2021])
    ax.tick_params(labelsize=12, length=3); ax.set_yticks([0])
    ax.grid(axis="y", color=GRID, lw=0.8); ax.set_axisbelow(True); ax.spines["left"].set_color(RULE)
    ax.spines["bottom"].set_bounds(2011, 2021)
    fig.subplots_adjust(left=0.13, right=0.98, top=0.98, bottom=0.26)
    save(fig, fname)

# ---- 4. heatmap ----------------------------------------------------------
def fig_heatmap():
    h = rd("idea2_heatmap_change.csv")
    users = ["Car driver", "Car passenger", "Motorcyclist", "Pedal cyclist", "Pedestrian"]
    ages = ["0-7", "8-16", "17-25", "26-39", "40-64", "65-74", "75+"]
    cap = np.log2(2.5)
    cmap = LinearSegmentedColormap.from_list("bo", [BLUE, "#8fb3d3", NEUTRAL, "#e0a37a", ACCENT])
    norm = Normalize(-cap, cap)
    fig = plt.figure(figsize=(W, 1.9)); fig.patch.set_facecolor(BG)
    ax = fig.add_axes([0.205, 0.30, 0.79, 0.60]); ax.set_facecolor(BG)
    for i, u in enumerate(users):
        for j, a in enumerate(ages):
            row = h[(h.road_user == u) & (h.age_group == a)].iloc[0]
            p = row.pct_change_3yr
            lr = np.clip(np.log2(1 + p/100), -cap, cap)
            if row.low_count:
                ax.add_patch(Rectangle((j, i), 1, 1, facecolor="#e4e1d8", edgecolor=GREY, hatch="////", lw=0, zorder=1))
                ax.add_patch(Rectangle((j+0.1, i+0.28), 0.8, 0.44, facecolor="#faf8f3", edgecolor="none", zorder=2, alpha=0.92))
                ax.text(j+.5, i+.5, "too few\ncases", ha="center", va="center", fontsize=9, color=INK, linespacing=0.9, zorder=3)
            else:
                col = cmap(norm(lr)); ax.add_patch(Rectangle((j, i), 1, 1, facecolor=col, edgecolor=BG, lw=1.5))
                lum = 0.299*col[0] + 0.587*col[1] + 0.114*col[2]
                ax.text(j+.5, i+.5, pct(p), ha="center", va="center", fontsize=12.5,
                        color="white" if lum < 0.5 else INK, fontweight="bold" if abs(p) >= 100 else "normal")
    # emphasise the two cycling cells for over-65s
    iy = users.index("Pedal cyclist")
    ax.add_patch(Rectangle((5, iy), 2, 1, fill=False, edgecolor=INK, lw=2.6, zorder=5))
    ax.set_xlim(0, 7); ax.set_ylim(5, 0)
    ax.set_xticks(np.arange(7)+.5); ax.set_xticklabels(ages, fontsize=12.5)
    ax.set_yticks(np.arange(5)+.5); ax.set_yticklabels(users, fontsize=12.5)
    ax.xaxis.tick_top(); ax.tick_params(length=0, pad=3)
    for s in ax.spines.values(): s.set_visible(False)
    # colourbar
    cax = fig.add_axes([0.205, 0.10, 0.30, 0.05])
    grad = np.linspace(-cap, cap, 256)[None, :]
    cax.imshow(grad, aspect="auto", cmap=cmap, norm=norm, extent=[-cap, cap, 0, 1])
    tv = [-60, -30, 0, 100]
    cax.set_xticks([np.log2(1+t/100) for t in tv]); cax.set_xticklabels([pct(t) if t else "0" for t in tv], fontsize=10.5)
    cax.set_yticks([]); cax.tick_params(length=3, pad=1)
    for s in cax.spines.values(): s.set_visible(False)
    fig.text(0.53, 0.04, "Change, 2011\u201313 to 2019\u201321 avg\nLog scale, capped. Boxed: cyclists 65+", fontsize=10, color=INK2, va="bottom", ha="left", linespacing=1.0)
    save(fig, "heatmap.pdf")

# ---- 5. counts vs per person ---------------------------------------------
def fig_counts_vs_rate():
    h = rd("idea2_heatmap_change.csv"); p = rd("idea2_age_population_change.csv").set_index("age_group")
    groups = ["65-74", "75+"]
    fig, ax = plt.subplots(figsize=(W, 2.1)); fig.patch.set_facecolor(BG); ax.set_facecolor(BG)
    ypos = {"65-74": 3.0, "75+": 0.9}
    for g in groups:
        cnt = h[(h.road_user == "Pedal cyclist") & (h.age_group == g)].pct_change_3yr.iloc[0]
        pop = p.loc[g, "pct_change_3yr"]
        per = ((1 + cnt/100) / (1 + pop/100) - 1) * 100
        y = ypos[g]
        ax.barh(y + 0.4, cnt, height=0.7, color=ACCENT, zorder=3)
        ax.barh(y - 0.4, per, height=0.7, color=ACCENT_SOFT, edgecolor=ACCENT_INK, hatch="///", lw=1.2, zorder=3)
        ax.text(cnt + 3, y + 0.4, f"{pct(cnt)}  in number", va="center", fontsize=13, fontweight="bold", color=ACCENT_INK)
        ax.text(per + 3, y - 0.4, f"{pct(per)}  per person", va="center", fontsize=13, fontweight="bold", color=INK2)
        ax.text(-3, y, f"Cyclists {g.replace('-', chr(8211))}", ha="right", va="center", fontsize=13.5, fontweight="bold")
        ax.text(-3, y - 0.62, f"population {pct(pop)}", ha="right", va="center", fontsize=11.5, color=MUTED)
    ax.axvline(0, color=INK2, lw=1.2)
    ax.set_xlim(0, 235); ax.set_ylim(-0.3, 4.1)
    ax.set_yticks([]); ax.set_xticks([0, 50, 100, 150]); ax.set_xticklabels(["0", "+50%", "+100%", "+150%"])
    ax.tick_params(labelsize=12, length=3); ax.spines["left"].set_visible(False); ax.spines["bottom"].set_bounds(0, 150)
    ax.grid(axis="x", color=GRID, lw=0.8); ax.set_axisbelow(True)
    fig.subplots_adjust(left=0.26, right=0.995, top=0.99, bottom=0.13)
    save(fig, "counts_vs_rate.pdf")

# ---- 6. severity small multiples ----------------------------------------
def fig_severity():
    s = rd("idea2_age_severity.csv")
    panels = [("hosp_2016_2021", "Hospitalised,\n2016–21", lambda v: f"{v/1000:.1f}k"),
              ("avg_stay_days_2016_2021", "Average days in\nhospital, 2016–21", lambda v: f"{v:.1f}"),
              ("died_per_1000_2011_2019", "Died in hospital per\n1,000 cases, 2011–19", lambda v: f"{v:.1f}")]
    fig, axes = plt.subplots(1, 3, figsize=(W, 1.8), sharey=True); fig.patch.set_facecolor(BG)
    n = len(s); y = np.arange(n)
    for k, (ax, (col, title, f)) in enumerate(zip(axes, panels)):
        ax.set_facecolor(BG)
        hl = s.age_group == "75+"
        ax.barh(y, s[col], color=[ACCENT if x else BAR for x in hl], height=0.68,
                hatch=None, zorder=3)
        mx = s[col].max()
        for yi, v, h in zip(y, s[col], hl):
            ax.text(v + mx*0.03, yi, f(v), va="center", fontsize=11.5 if not h else 12.5, color=ACCENT_INK if h else INK2,
                    fontweight="bold" if h else "normal")
        ax.set_xlim(0, mx*1.45); ax.set_ylim(n - 0.4, -0.6)
        ax.set_title(title, fontsize=12, fontweight="bold", loc="left", pad=4, linespacing=0.95)
        ax.set_xticks([]); ax.spines["bottom"].set_visible(False); ax.spines["left"].set_color(RULE)
        ax.tick_params(length=0)
        if k == 0:
            ax.set_yticks(y); ax.set_yticklabels([a.replace("-", "–") for a in s.age_group], fontsize=11.5)
            ax.get_yticklabels()[-1].set_fontweight("bold")
    fig.subplots_adjust(left=0.09, right=0.995, top=0.78, bottom=0.01, wspace=0.12)
    save(fig, "severity.pdf")

if __name__ == "__main__":
    fig_hook(); fig_index()
    r = rd("idea1_rates.csv")
    fig_rate("hosp_per_100k", "rate_hosp.pdf", ACCENT, (0, 235), "{:.1f}", "")
    fig_rate("deaths_per_100k", "rate_deaths.pdf", BLUE, (0, 8.5), "{:.2f}", "")
    fig_heatmap(); fig_counts_vs_rate(); fig_severity()
    print("figures written to", OUT)
