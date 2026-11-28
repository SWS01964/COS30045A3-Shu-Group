#!/bin/sh
# Copies the 7 contract CSVs from data/processed/ into website/data/.
# Run from anywhere: ./sync_data.sh   (the website must stay self-contained)
set -eu
HERE="$(cd "$(dirname "$0")" && pwd)"
SRC="$HERE/../data/processed"
DST="$HERE/data"
mkdir -p "$DST"
for f in ch1_trend ch2_age_roaduser ch4_monthly ch4_state_cyclists \
         ch5_first_nations_trend ch5_first_nations_profile severity; do
  cp "$SRC/$f.csv" "$DST/$f.csv"
  echo "copied $f.csv"
done
