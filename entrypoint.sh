#!/bin/sh
# Enterprise-grade Auto-start script for WhatsApp service
echo "ENTERPRISE STARTUP: $(date)"
echo "Working directory: $(pwd)"
echo "Files in /app:"
ls -la /app/

# Clean up any previous locks
rm -rf /app/.wwebjs_auth/session/SingletonLock 2>/dev/null || true
rm -rf /app/.wwebjs_auth/session/SingletonCookie 2>/dev/null || true
rm -rf /app/.wwebjs_auth/session/SingletonSocket 2>/dev/null || true

# Kill any zombie chrome processes
pkill -f chromium || true
pkill -f chrome || true

# Enterprise startup check
cd /app
echo "CHECKING FILES:"
echo "src/index.js exists:" 
ls -la src/index.js 2>/dev/null || echo "NOT FOUND"

echo "STARTING ENTERPRISE SERVICE:"
exec node src/index.js