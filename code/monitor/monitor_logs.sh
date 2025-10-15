#!/usr/bin/env bash
set -euo pipefail

#  Log locations & thresholds

LOG_FILE="/var/log/petfinder.log"
MAX_ERRORS=5
INTERVAL=60  # seconds
TEMP_FILE="/tmp/petfinder_logs.tmp"
FIRST_RUN=true

# Containers to monitor
CONTAINERS=("my-node-backend" "my-angular-frontend")

# Set to true to see all logs in console, false for file only
VERBOSE=${VERBOSE:-true}

# Helper function to log with console output

log_msg() {
  local msg="$1"
  if [ "$VERBOSE" = true ]; then
    echo "$msg" | tee -a "$LOG_FILE"
  else
    echo "$msg" >> "$LOG_FILE"
  fi
}

# 🛠 Setup logging permissions

sudo mkdir -p "$(dirname "$LOG_FILE")"
if [ ! -f "$LOG_FILE" ]; then
  sudo touch "$LOG_FILE"
  sudo chmod 666 "$LOG_FILE"
fi
touch "$TEMP_FILE"

# Common error patterns
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

# Log rotation function

rotate_logs() {
  if [ -f "$LOG_FILE" ] && [ "$(stat -c%s "$LOG_FILE")" -gt $((5 * 1024 * 1024)) ]; then
    log_msg "🔄 Rotating logs..."
    for i in 5 4 3 2 1; do
      if [ -f "${LOG_FILE}.${i}" ]; then
        mv "${LOG_FILE}.${i}" "${LOG_FILE}.$((i+1))"
      fi
    done
    mv "$LOG_FILE" "${LOG_FILE}.1" || true
    touch "$LOG_FILE"
    chmod 666 "$LOG_FILE"
  fi
}


# Wait for containers to start

echo "Waiting for containers to start..."
for i in {1..10}; do
  if docker ps --format '{{.Names}}' | grep -q "my-node-backend" && \
     docker ps --format '{{.Names}}' | grep -q "my-angular-frontend"; then
    log_msg "[$(date '+%Y-%m-%d %H:%M:%S')] ✅ Containers are up, monitoring started."
    break
  fi
  echo "⚙️  Containers not ready yet (attempt $i/10), retrying in 5s..."
  sleep 5
done

# Continuous monitoring loop

while true; do
  : > "$TEMP_FILE"
  
  {
    echo ""
    echo "Monitoring cycle started at $(date '+%Y-%m-%d %H:%M:%S')"
  } | tee -a "$LOG_FILE"
  
  for c in "${CONTAINERS[@]}"; do
    if docker ps --format '{{.Names}}' | grep -q "^${c}$"; then
      echo "📦 Fetching logs from container: $c" | tee -a "$LOG_FILE"
      if [ "$FIRST_RUN" = true ]; then
        # First time, fetch all logs
        docker logs --timestamps "$c" 2>&1 | sed "s/^/[$c] /" >> "$TEMP_FILE" || true
      else
        # Subsequent runs, only fetch recent logs
        docker logs --since "${INTERVAL}s" --timestamps "$c" 2>&1 | sed "s/^/[$c] /" >> "$TEMP_FILE" || true
      fi
    else
      log_msg "[$(date '+%Y-%m-%d %H:%M:%S')] ⚠️  Container $c not running or not found"
    fi
  done
  
  FIRST_RUN=false
  
  # Display and save collected logs
  if [ -s "$TEMP_FILE" ]; then
    {
      echo ""
      echo "Container Logs:"
      echo "────────────────────────────────────────────────────────────"
      cat "$TEMP_FILE"
      echo "────────────────────────────────────────────────────────────"
    } | tee -a "$LOG_FILE"
  fi
  
  # Count "real" error matches
  ERR_COUNT=0
  for pattern in "${ERROR_PATTERNS[@]}"; do
    ERR_COUNT=$((ERR_COUNT + $(grep -i -c -- "$pattern" "$TEMP_FILE" || true)))
  done
  
  # Write alerts if threshold exceeded
  if (( ERR_COUNT >= MAX_ERRORS )); then
    TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
    echo ""
    echo "🚨🚨"
    {
      echo "[$TIMESTAMP] 🚨 ALERT: ${ERR_COUNT} errors detected across containers in last ${INTERVAL}s"
      echo "[$TIMESTAMP] Error Details:"
      echo ""
      grep -i -E "$(printf '%s|' "${ERROR_PATTERNS[@]}" | sed 's/|$//')" "$TEMP_FILE" | tail -n 200 || true
      echo ""
      echo "------------------------------------------------------------"
    } | tee -a "$LOG_FILE"
    echo "🚨🚨"
  else
    {
      echo ""
      echo "✅ No critical errors detected (found $ERR_COUNT error pattern matches, threshold is $MAX_ERRORS)"
    } | tee -a "$LOG_FILE"
  fi
  
  # Heartbeat log
  log_msg "[$(date '+%Y-%m-%d %H:%M:%S')] ✅ Monitor cycle complete"
  
  rotate_logs
  
  echo ""
  echo "Sleeping for ${INTERVAL} seconds..."
  echo ""
  
  sleep "$INTERVAL"
done
