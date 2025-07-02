#!/bin/bash
# WhatsApp service health monitor

HEALTH_URL='http://localhost:3000/api/health'
LOG_FILE='/app/monitor.log'

echo "[$(date)] Checking WhatsApp health..." >> $LOG_FILE

# Get health status
HEALTH_CHECK=$(curl -s $HEALTH_URL)
echo "Health check response: $HEALTH_CHECK" >> $LOG_FILE

# Check if service is responding
if [ -z "$HEALTH_CHECK" ]; then
    echo "[$(date)] ERROR: Service not responding!" >> $LOG_FILE
    exit 1
fi

# Check for zombie chromium processes
ZOMBIE_COUNT=$(ps aux | grep -E '[chromium]|[chrome]' | wc -l)
if [ $ZOMBIE_COUNT -gt 10 ]; then
    echo "[$(date)] WARNING: $ZOMBIE_COUNT zombie processes detected!" >> $LOG_FILE
    echo "Consider restarting the container" >> $LOG_FILE
fi

# Check last log entry time
LAST_LOG=$(tail -1 /app/combined.log | grep -o '"timestamp":"[^"]*"' | cut -d'"' -f4)
echo "[$(date)] Last log entry: $LAST_LOG" >> $LOG_FILE
