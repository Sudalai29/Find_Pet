#!/usr/bin/env bash
set -euo pipefail

# ----------------------------------------
# 📁 Log locations & thresholds
# ----------------------------------------
LOG_FILE="/var/log/petfinder.log"
MAX_ERRORS=5
INTERVAL=60  # seconds
TEMP_FILE="/tmp/petfinder_logs.tmp"

# ----------------------------------------
# 🐳 Containers to monitor
# ----------------------------------------
CONTAINERS=("my-node-backend" "my-angular-frontend")

mkdir -p "$(dirname "$LOG_FILE")"
touch "$LOG_FILE" "$TEMP_FILE"

# ----------------------------------------
# 🔍 Common error patterns to look for
# ----------------------------------------
ERROR_PATTERNS=(
  "Error:"
  "Exception"
  "UnhandledRejection"
  "TypeError"
  "ReferenceError"
  "ECONNREFUSED"
  "EADDRINUSE"
  " 500 "
  " failed"
  " crash"
)

# ----------------------------------------
# ♻️ Log rotation (limit 5MB)
# ----------------------------------------
rotate_logs() {
  if [ -f "$LOG_FILE" ] && [ "$(stat -c%s "$LOG_FILE")" -gt $((5 * 1024 * 1024)) ]; then
    echo "🔄 Rotating logs..."
    for i in 5 4 3 2 1; do
      if [ -f "${LOG_FILE}.${i}" ]; then
        mv "${LOG_FILE}.${i}" "${LOG_FILE}.$((i+1))"
      fi
    done
    mv "$LOG_FILE" "${LOG_FILE}.1" || true
    touch "$LOG_FILE"
  fi
}

# ----------------------------------------
# ⏳ Wait for containers to be ready
# ----------------------------------------
echo "⏳ Waiting for containers to start..."
for i in {1..10}; do
  if docker ps --format '{{.Names}}' | grep -q "my-node-backend" && \
     docker ps --format '{{.Names}}' | grep -q "my-angular-frontend"; then
    echo "✅ Containers are up, starting monitoring."
    break
  fi
  echo "⚙️  Containers not ready yet (attempt $i/10), retrying in 5s..."
  sleep 5
done

# ----------------------------------------
# 🔁 Continuous monitoring loop
# ----------------------------------------
while true; do
  # Clear temp file
  : > "$TEMP_FILE"

  # Collect logs for the last INTERVAL seconds
  for c in "${CONTAINERS[@]}"; do
    if docker ps --format '{{.Names}}' | grep -q "^${c}$"; then
      # Append logs with container name prefix for clarity
      docker logs --since "${INTERVAL}s" --timestamps "$c" 2>/dev/null \
        | sed "s/^/[$c] /" >> "$TEMP_FILE" || true
    else
      # Optional: log warning if container not found
      echo "[$(date '+%Y-%m-%d %H:%M:%S')] ⚠️ Container $c not running or not found" >> "$LOG_FILE"
    fi
  done

  # Count matches of real error patterns
  ERR_COUNT=0
  for pattern in "${ERROR_PATTERNS[@]}"; do
    ERR_COUNT=$((ERR_COUNT + $(grep -i -c -- "$pattern" "$TEMP_FILE" || true)))
  done

  # If threshold exceeded, log alert and context
  if (( ERR_COUNT >= MAX_ERRORS )); then
    TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$TIMESTAMP] 🚨 ALERT: ${ERR_COUNT} errors detected across containers in last ${INTERVAL}s" >> "$LOG_FILE"
    echo "[$TIMESTAMP] Details:" >> "$LOG_FILE"
    grep -i -E "$(printf '%s|' "${ERROR_PATTERNS[@]}" | sed 's/|$//')" "$TEMP_FILE" \
      | tail -n 200 >> "$LOG_FILE" || true
    echo "------------------------------------------------------------" >> "$LOG_FILE"
  fi

  # Rotate logs if needed
  rotate_logs

  # Wait before next scan
  sleep "$INTERVAL"
done

