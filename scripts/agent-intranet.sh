#!/usr/bin/env bash
# ==============================================================================
# Semen Indonesia Cooperative - Intranet Monitoring Agent (Bash / cURL)
# Cocok untuk server Linux / Raspberry Pi / Docker / VM di intranet KWSG.
# ==============================================================================

DASHBOARD_URL="${DASHBOARD_URL:-https://dashboard-server.vercel.app}"
SECRET_KEY="${SECRET_KEY:-kwsg-intranet-agent-key-2026}"
TARGET_URL="${TARGET_URL:-http://172.20.110.20/hrdonline}"
TARGET_NAME="${TARGET_NAME:-HRD Online Intranet}"

echo "================================================================"
echo " SEMEN INDONESIA COOPERATIVE - INTRANET MONITOR AGENT (BASH)"
echo " Target Intranet : $TARGET_URL"
echo " Dashboard URL   : $DASHBOARD_URL"
echo "================================================================"

START_TIME=$(date +%s%3N)
HTTP_RESPONSE=$(curl -k -s -w "\n%{http_code}\n%{time_total}" -o /dev/null --connect-timeout 5 --max-time 10 "$TARGET_URL")
CURL_EXIT=$?

STATUS_CODE=$(echo "$HTTP_RESPONSE" | sed -n '1p')
TIME_TOTAL=$(echo "$HTTP_RESPONSE" | sed -n '2p')
# Konversi second ke ms (contoh 0.045 -> 45ms)
LATENCY=$(awk "BEGIN {print int(${TIME_TOTAL:-0} * 1000)}")

if [ $CURL_EXIT -eq 0 ] && [ "$STATUS_CODE" -ge 200 ] && [ "$STATUS_CODE" -lt 400 ]; then
  if [ "$LATENCY" -gt 2500 ]; then
    STATUS="degraded"
  else
    STATUS="operational"
  fi
  ERROR="null"
else
  STATUS="down"
  ERROR="\"Gagal terhubung atau HTTP Status $STATUS_CODE (Exit $CURL_EXIT)\""
fi

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Pengecekan: $STATUS | Latency: ${LATENCY}ms | HTTP: $STATUS_CODE"

PAYLOAD=$(cat <<EOF
{
  "target": "$TARGET_URL",
  "name": "$TARGET_NAME",
  "status": "$STATUS",
  "latency": $LATENCY,
  "statusCode": ${STATUS_CODE:-0},
  "error": $ERROR,
  "category": "web",
  "type": "http"
}
EOF
)

REPORT_URL="${DASHBOARD_URL%/}/api/agent/report"
echo "Mengirim hasil ke $REPORT_URL..."

curl -s -X POST "$REPORT_URL" \
  -H "Content-Type: application/json" \
  -H "x-agent-secret: $SECRET_KEY" \
  -d "$PAYLOAD"

echo ""
echo "Selesai."
