#!/usr/bin/env python3
"""Quick EDA figures from the clean CSVs (run after clean_data.py). Writes processing/eda_figures/*.png"""
from pathlib import Path
import pandas as pd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

ROOT = Path(__file__).resolve().parents[1]
C = ROOT / "data" / "clean"
O = ROOT / "processing" / "eda_figures"
O.mkdir(exist_ok=True)
plt.rcParams.update({"figure.dpi": 130, "axes.spines.top": False, "axes.spines.right": False, "font.size": 9})
BLUE, ORANGE, GREY = "#2b6cb0", "#dd6b20", "#a0aec0"


def shade(ax):
    ax.axvspan(2010.5, 2011.5, color=GREY, alpha=0.25, lw=0)
    ax.axvspan(2016.5, 2021.5, color=GREY, alpha=0.15, lw=0)
    ax.set_xticks(range(2011, 2022))


ann = pd.read_csv(C / "idea1_national_annual.csv")
fig, ax = plt.subplots(figsize=(7, 3.6))
shade(ax)
ax.plot(ann.year, ann.hospitalisations, marker="o", color=BLUE)
ax.set_ylim(0, 45000)
ax.set_title("Road-crash hospitalisations per year, Australia 2011-2021 (counts)")
ax.set_ylabel("Hospitalisations")
ax.text(2011, 2000, "grey = BITRE series breaks (Vic 2012 / NSW 2017)", fontsize=7, color="#4a5568")
fig.tight_layout(); fig.savefig(O / "fig1_annual_total.png"); plt.close(fig)

ru = pd.read_csv(C / "idea2_roaduser_age_annual.csv")
p = ru.groupby(["year", "road_user"])["hospitalisations"].sum().unstack()
fig, ax = plt.subplots(figsize=(7, 3.8))
shade(ax)
for c in p.columns:
    ax.plot(p.index, p[c], marker="o", ms=3, label=c)
ax.set_title("Annual hospitalisations by main road user (counts)")
ax.set_ylabel("Hospitalisations"); ax.legend(ncol=3, fontsize=7, frameon=False, loc="upper left")
ax.set_ylim(0, 17000)
fig.tight_layout(); fig.savefig(O / "fig2_by_road_user.png"); plt.close(fig)

ag = ru.groupby(["year", "age_group"])["hospitalisations"].sum().unstack()
fig, ax = plt.subplots(figsize=(7, 3.8))
shade(ax)
for c in ag.columns:
    ax.plot(ag.index, ag[c], marker="o", ms=3, label=c)
ax.set_title("Annual hospitalisations by age group (5 main road users; counts)")
ax.set_ylabel("Hospitalisations"); ax.legend(ncol=4, fontsize=7, frameon=False, loc="upper left")
ax.set_ylim(0, 16000)
fig.tight_layout(); fig.savefig(O / "fig3_by_age_group.png"); plt.close(fig)

ann["alos"] = ann.bed_days_excl_died / ann.hospitalisations
fig, ax = plt.subplots(figsize=(7, 3.6))
ax.axvspan(2014.5, 2015.5, color=ORANGE, alpha=0.2, lw=0)
ax.plot(ann.year[ann.year <= 2015], ann.alos[ann.year <= 2015], marker="o", color=GREY)
ax.plot(ann.year[ann.year >= 2016], ann.alos[ann.year >= 2016], marker="o", color=BLUE)
ax.plot(ann.year[(ann.year >= 2015) & (ann.year <= 2016)], ann.alos[(ann.year >= 2015) & (ann.year <= 2016)], ls=":", color=GREY)
ax.set_xticks(range(2011, 2022)); ax.set_ylim(0, 6.5)
ax.axvline(2015.5, color=ORANGE, ls="--", lw=1)
ax.text(2015.6, 0.4, "bed-day counting changed 1 Jul 2015\n(compare 2016-2021 only)", fontsize=7, color=ORANGE)
ax.set_title("Average length of stay (bed days excl. died / hospitalisations)")
ax.set_ylabel("Days")
fig.tight_layout(); fig.savefig(O / "fig4_avg_stay_by_year.png"); plt.close(fig)
print("figures written to", O)
