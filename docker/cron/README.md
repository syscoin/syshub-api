# Automatic Encryption Key Rotation Setup

This setup provides automated monthly encryption key rotation for 2FA secrets using a cron sidecar container.

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Docker Compose Stack                                    │
│                                                          │
│  ┌──────────────┐          ┌─────────────────────────┐ │
│  │   api        │◄─────────│  key-rotation-cron      │ │
│  │  (Node.js)   │  restart │  (Node.js + cron)       │ │
│  │              │          │                         │ │
│  │  - Serves    │          │  - Runs monthly         │ │
│  │    API       │          │  - Rotates key          │ │
│  │  - Uses      │          │  - Updates .env.api     │ │
│  │    .env.api  │          │  - Restarts API         │ │
│  └──────────────┘          └─────────────────────────┘ │
│         │                            │                  │
│         └────────────┬───────────────┘                  │
│                      │                                  │
│              ┌───────▼────────┐                        │
│              │  .env.api      │                        │
│              │  (shared)      │                        │
│              └────────────────┘                        │
└─────────────────────────────────────────────────────────┘
```

## 📋 Files Created

```
docker/
└── cron/
    ├── Dockerfile              # Cron container image
    ├── crontab                 # Cron schedule (monthly)
    ├── rotate-key-cron.sh      # Rotation script wrapper
    ├── docker-compose.cron.yml # Service definition
    └── README.md               # This file
```

## 🚀 Setup Instructions

### Step 1: Create Log Directory

```bash
# On your Hetzner staging server
cd /path/to/syshub-api
mkdir -p logs/key-rotation
chmod 755 logs/key-rotation
```

### Step 2: Update docker-compose.yml

Add the `key-rotation-cron` service to your existing `docker-compose.yml`:

```yaml
services:
  api:
    # ... existing api service ...

  # Add this new service:
  key-rotation-cron:
    build:
      context: .
      dockerfile: docker/cron/Dockerfile
    container_name: syshub-key-rotation-cron
    restart: unless-stopped
    env_file:
      - .env.api
    volumes:
      - .env.api:/app/.env:rw
      - .firebase-service-account.json:/app/.firebase-service-account.json:ro
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - ./logs/key-rotation:/var/log:rw
    network_mode: bridge
    extra_hosts:
      - "host.docker.internal:host-gateway"
    depends_on:
      - api
```

### Step 3: Build and Start Cron Container

```bash
# Build the cron image
docker-compose build key-rotation-cron

# Start the cron sidecar
docker-compose up -d key-rotation-cron

# Verify it's running
docker-compose ps key-rotation-cron
```

### Step 4: Verify Cron Schedule

```bash
# Check that cron is configured correctly
docker exec syshub-key-rotation-cron crontab -l

# Expected output:
# 0 2 1 * * /app/docker/cron/rotate-key-cron.sh >> /var/log/cron.log 2>&1
```

### Step 5: Test Manual Rotation (Optional)

Before waiting for the monthly schedule, test the rotation manually:

```bash
# Run rotation script manually inside the container
docker exec syshub-key-rotation-cron /app/docker/cron/rotate-key-cron.sh

# Check the logs
docker exec syshub-key-rotation-cron cat /var/log/cron.log

# Verify API restarted
docker-compose ps api
```

## 📅 Rotation Schedule

**Current Schedule**: 1st of every month at 2:00 AM UTC

To change the schedule, edit `docker/cron/crontab`:

```cron
# Every 90 days (recommended for production)
0 2 1 */3 * /app/docker/cron/rotate-key-cron.sh >> /var/log/cron.log 2>&1

# Every 30 days
0 2 1 * * /app/docker/cron/rotate-key-cron.sh >> /var/log/cron.log 2>&1

# Every Sunday at 3 AM (for testing)
0 3 * * 0 /app/docker/cron/rotate-key-cron.sh >> /var/log/cron.log 2>&1
```

After changing, rebuild and restart:
```bash
docker-compose build key-rotation-cron
docker-compose up -d key-rotation-cron
```

## 📊 Monitoring

### View Cron Logs

```bash
# View cron execution log
docker exec syshub-key-rotation-cron tail -f /var/log/cron.log

# View rotation logs on host
ls -lh logs/key-rotation/

# View latest rotation log
cat logs/key-rotation/key-rotation-*.log | tail -50
```

### View Rotation History

```bash
# View all rotation logs saved by the script
ls -lh scripts/rotation-log-*.json

# View latest rotation summary
cat scripts/rotation-log-$(ls -t scripts/rotation-log-*.json | head -1)
```

### Check Next Scheduled Run

```bash
# Check when cron will run next
docker exec syshub-key-rotation-cron date
docker exec syshub-key-rotation-cron cat /etc/cron.d/key-rotation
```

## 🔔 Alerting (Optional)

To get notified when rotations happen, modify `rotate-key-cron.sh` to send notifications:

### Option 1: Email Notification

```bash
# Add to rotate-key-cron.sh after successful rotation
echo "Key rotated successfully at $(date)" | \
  mail -s "SysHub Key Rotation Success" admin@example.com
```

### Option 2: Slack Webhook

```bash
# Add to rotate-key-cron.sh after successful rotation
curl -X POST -H 'Content-type: application/json' \
  --data '{"text":"🔐 SysHub staging key rotated successfully"}' \
  https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```

### Option 3: Discord Webhook

```bash
# Add to rotate-key-cron.sh after successful rotation
curl -H "Content-Type: application/json" \
  -d '{"content":"🔐 SysHub staging key rotated successfully"}' \
  https://discord.com/api/webhooks/YOUR/WEBHOOK
```

## 🛠️ Troubleshooting

### Cron Container Not Running

```bash
# Check container status
docker-compose ps key-rotation-cron

# Check logs
docker-compose logs key-rotation-cron

# Restart container
docker-compose restart key-rotation-cron
```

### Rotation Failed

```bash
# Check rotation logs
docker exec syshub-key-rotation-cron cat /var/log/cron.log

# Check script permissions
docker exec syshub-key-rotation-cron ls -l /app/docker/cron/rotate-key-cron.sh

# Run rotation manually for debugging
docker exec syshub-key-rotation-cron sh -x /app/docker/cron/rotate-key-cron.sh
```

### API Not Restarting After Rotation

```bash
# Check if docker socket is mounted
docker exec syshub-key-rotation-cron ls -l /var/run/docker.sock

# Check if cron container can access docker
docker exec syshub-key-rotation-cron docker ps

# Manually restart API
docker-compose restart api
```

### Permission Issues with .env.api

```bash
# Check .env.api permissions in container
docker exec syshub-key-rotation-cron ls -l /app/.env

# The volume should be mounted as :rw (read-write), not :ro
# Verify in docker-compose.yml:
# - .env.api:/app/.env:rw  ✅ Correct
# - .env.api:/app/.env:ro  ❌ Wrong
```

## 🔐 Security Considerations

### File Permissions

- `.env.api` on host: `chmod 600` (owner read/write only)
- `logs/key-rotation/`: `chmod 755` (owner full, others read)
- Rotation logs contain key previews (first 20 chars), keep secure

### Docker Socket Access

The cron container needs access to `/var/run/docker.sock` to restart the API container. This is a privileged operation. Consider:

1. **Network isolation**: The cron container is on the same network as API only
2. **Read-only socket**: Mounted as `:ro` to prevent container creation
3. **Minimal permissions**: Container only needs restart capability

### Key Backup

Before rotation, the script automatically:
- Backs up `.env` to `.env.backup-[timestamp]`
- Saves rotation log to `scripts/rotation-log-[timestamp].json`

Keep these backups for audit trail and emergency recovery.

## 📝 Maintenance

### Update Cron Image

When you update the API image, rebuild the cron image too:

```bash
docker-compose pull api
docker-compose build --no-cache key-rotation-cron
docker-compose up -d
```

### Clean Old Logs

```bash
# Remove rotation logs older than 90 days
find logs/key-rotation/ -name "*.log" -mtime +90 -delete
find scripts/ -name "rotation-log-*.json" -mtime +90 -delete

# Remove old .env backups
find . -name ".env.backup-*" -mtime +90 -delete
```

## 📞 Support

- **Documentation**: `/docs/ENCRYPTION_KEY_MANAGEMENT.md`
- **Quick Start**: `/docs/QUICK_START_KEY_MANAGEMENT.md`
- **Rotation Logs**: `/scripts/rotation-log-*.json`
- **Security Audit**: `/SECURITY_AUDIT_REPORT.md`

## ✅ Verification Checklist

After setup, verify:

- [ ] Cron container is running (`docker-compose ps`)
- [ ] Cron schedule is configured (`docker exec ... crontab -l`)
- [ ] Log directory exists and is writable
- [ ] `.env.api` is mounted as read-write in cron container
- [ ] Docker socket is accessible from cron container
- [ ] Manual test rotation succeeds
- [ ] API restarts successfully after rotation
- [ ] Rotation logs are created in `logs/key-rotation/`
- [ ] 2FA verification still works after rotation

---

**Next Key Rotation**: 1st of next month at 2:00 AM UTC 🗓️
