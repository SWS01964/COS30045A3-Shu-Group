#!/bin/sh
# Re-copy the cleaned CSVs used by the website from data/clean/ into website/data/.
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
mkdir -p "$ROOT/website/data"
for f in \
  idea1_rates idea1_index_long \
  idea2_heatmap_change idea2_age_population_change idea2_roaduser_age_annual idea2_age_severity \
  idea3_burden_share idea3_severity_roaduser idea3_older_pedestrians idea3_severity_counterparty \
  idea4_baseline_band idea4_monthly_2019_2021 idea4_roaduser_change_2020 idea4_cyclist_trend \
  idea4_cyclist_age_2020 idea4_state_cyclists_2020; do
  cp "$ROOT/data/clean/$f.csv" "$ROOT/website/data/$f.csv"
  echo "copied $f.csv"
done
