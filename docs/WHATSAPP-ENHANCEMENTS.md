# WhatsApp Service Enhancements

## Overview
These enhancements improve the reliability and stability of the WhatsApp service by implementing automated monitoring and restart mechanisms.

## Components

### 1. Daily Restart Script (`daily-restart.sh`)
- **Purpose**: Prevent zombie process accumulation
- **Schedule**: Runs daily at 3 AM
- **Features**:
  - Kills zombie chromium processes
  - Removes lock files
  - Gracefully restarts the WhatsApp service
  - Logs all actions to restart.log

### 2. Health Monitor Script (`health-monitor.sh`)
- **Purpose**: Monitor service health and trigger restarts when needed
- **Checks**:
  - Service response on health endpoint
  - Zombie process count (threshold: 5)
  - Memory usage (threshold: 80%)
- **Actions**:
  - Logs warnings for individual issues
  - Triggers restart if multiple issues detected

### 3. Cron Configuration
```cron
# Daily restart at 3 AM
0 3 * * * /app/daily-restart.sh >> /app/cron.log 2>&1

# Health check every 30 minutes
*/30 * * * * /app/health-monitor.sh >> /app/health.log 2>&1
```

## Installation

1. Copy scripts to the container:
```bash
docker cp scripts/daily-restart.sh BOODSCHAPP-WHATSAPP-MCP:/app/
docker cp scripts/health-monitor.sh BOODSCHAPP-WHATSAPP-MCP:/app/
```

2. Install cron job:
```bash
docker exec BOODSCHAPP-WHATSAPP-MCP sh -c 'crontab /tmp/whatsapp-cron'
```

## Monitoring

Check logs:
```bash
# Restart logs
docker exec BOODSCHAPP-WHATSAPP-MCP tail -f /app/restart.log

# Health check logs
docker exec BOODSCHAPP-WHATSAPP-MCP tail -f /app/health.log

# Cron execution logs
docker exec BOODSCHAPP-WHATSAPP-MCP tail -f /app/cron.log
```

## Future Enhancements

1. **WhatsApp Business API Migration**
   - More stable than WhatsApp Web automation
   - Better support for high-volume messaging
   - Official API with proper webhooks

2. **Enhanced Monitoring**
   - Integration with monitoring systems (Prometheus/Grafana)
   - Alert notifications via email/Slack
   - Performance metrics tracking

3. **Message Flow Validation**
   - Add test messages to health checks
   - Validate end-to-end message processing
   - Track response times

## Troubleshooting

If the service becomes unresponsive:
1. Check for zombie processes: `ps aux | grep defunct`
2. Review logs: `docker logs BOODSCHAPP-WHATSAPP-MCP`
3. Manual restart: `docker exec BOODSCHAPP-WHATSAPP-MCP /app/daily-restart.sh`
