#!/bin/sh
# Monthly Encryption Key Rotation Script
# Runs via cron in sidecar container

set -e

LOG_FILE="/var/log/key-rotation-$(date +%Y%m%d-%H%M%S).log"

echo "========================================"
echo "Starting encryption key rotation"
echo "Date: $(date)"
echo "========================================"

# Change to app directory
cd /app

# Run rotation script (--force to skip confirmation)
if node scripts/rotate-encryption-key.js --force 2>&1 | tee "$LOG_FILE"; then
  echo "✅ Key rotation completed successfully"

  # Restart API container to load new key
  echo "🔄 Restarting API container..."
  if docker restart syshub-api-api-1 2>&1 | tee -a "$LOG_FILE"; then
    echo "✅ API container restarted successfully"
  else
    echo "❌ Failed to restart API container"
    exit 1
  fi

  echo "========================================"
  echo "Key rotation completed at $(date)"
  echo "========================================"
else
  echo "❌ Key rotation failed"
  exit 1
fi
