#!/bin/bash
# usage: run_v3.sh <scratch dir>   builds v3 into <scratch>/BeyondTheRoadToll_DataPrep_v3, runs it headless on that copy
set -e
SCR="$1"; ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
rm -rf "$SCR/kn_ws" "$SCR/BeyondTheRoadToll_DataPrep_v3"; mkdir -p "$SCR"
python3 "$ROOT/processing/knime/build_v3.py" "$SCR/BeyondTheRoadToll_DataPrep_v3"
"/Applications/KNIME 5.5.1.app/Contents/MacOS/knime" -nosplash -consoleLog -application org.knime.product.KNIME_BATCH_APPLICATION \
  -workflowDir="$SCR/BeyondTheRoadToll_DataPrep_v3" -reset -nosave -data "$SCR/kn_ws" > "$SCR/log.txt" 2>&1 &
PID=$!
for i in $(seq 1 600); do grep -q "Workflow execution done" "$SCR/log.txt" 2>/dev/null && break; sleep 2; done
sleep 3; kill $PID 2>/dev/null || true; pkill -f "KNIME_BATCH_APPLICATION.*$SCR" 2>/dev/null || true
grep -E "sucessfully|ERROR" "$SCR/log.txt" | head -20
