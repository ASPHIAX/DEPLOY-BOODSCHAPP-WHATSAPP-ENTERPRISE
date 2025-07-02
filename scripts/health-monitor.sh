#!/bin/sh
# Health monitoring script for WhatsApp service

# Function to check zombie processes
check_zombies() {
    ZOMBIE_COUNT=$(ps aux | grep -c "[Cc]hrom.*<defunct>")
    if [ $ZOMBIE_COUNT -gt 5 ]; then
        echo "[WARNING] Found $ZOMBIE_COUNT zombie Chrome processes"
        return 1
    fi
    return 0
}

# Function to check if service is responding
check_service() {
    curl -s http://localhost:3000/api/health > /dev/null 2>&1
    return $?
}

# Function to check memory usage
check_memory() {
    MEMORY_PERCENT=$(ps aux | grep "node src/index.js" | grep -v grep | awk '{print $4}' | head -1)
    if [ ! -z "$MEMORY_PERCENT" ]; then
        MEMORY_INT=$(echo $MEMORY_PERCENT | cut -d. -f1)
        if [ $MEMORY_INT -gt 80 ]; then
            echo "[WARNING] High memory usage: $MEMORY_PERCENT%"
            return 1
        fi
    fi
    return 0
}

# Main monitoring
echo "[$(date)] Health check starting..."

ISSUES=0

if ! check_service; then
    echo "[ERROR] Service not responding on health endpoint"
    ISSUES=$((ISSUES + 1))
fi

if ! check_zombies; then
    ISSUES=$((ISSUES + 1))
fi

if ! check_memory; then
    ISSUES=$((ISSUES + 1))
fi

if [ $ISSUES -gt 0 ]; then
    echo "[$(date)] Health check found $ISSUES issues"
    if [ $ISSUES -gt 1 ]; then
        echo "[ACTION] Triggering service restart due to multiple issues"
        /app/daily-restart.sh
    fi
else
    echo "[$(date)] Health check passed"
fi
