# Docker Deployment Guide

## Overview

This application uses **GitHub Packages** for Docker images and includes Docker Compose configuration with two services:
1. **API Service** - Main Node.js API (from `ghcr.io/osiastedian/syshub-api`)
2. **Cron Service** - Scheduled tasks using the same image with different command

**Key Benefits:**
- ✅ No local build needed - uses pre-built GitHub Package
- ✅ Both services use the same image
- ✅ Cron service just overrides the command to run cron
- ✅ Automatic updates when new images are pushed

## Quick Start

### 1. Prerequisites

```bash
# Ensure Docker and Docker Compose are installed
docker --version
docker-compose --version

# Login to GitHub Container Registry (if image is private)
echo $GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin
```

### 2. Setup Environment

```bash
# Copy environment template
cp .env-example .env

# Edit .env with your configuration
nano .env
```

**Required variables:**
- Firebase configuration
- Collection names
- Encryption keys
- RPC credentials

### 3. Pull and Run

```bash
# Pull latest image from GitHub Packages
docker-compose pull

# Start services
docker-compose up -d

# View logs
docker-compose logs -f
```

**No build step needed!** Images are pre-built and published to GitHub Packages.

### 4. Verify Services

```bash
# Check service status
docker-compose ps

# Should show:
# Name              Command          State    Ports
# syshub-api_api_1   npm start       Up      0.0.0.0:3000->3000/tcp
# syshub-api_cron_1  /app/start...   Up

# Test API
curl http://localhost:3000/health

# Check cron logs
docker-compose logs cron
```

## Services

### API Service

**Port:** 3000 (configurable via `PORT_HTTP`)

**Health check:**
```bash
curl http://localhost:3000/health
```

**View logs:**
```bash
docker-compose logs -f api
```

### Cron Service

**Purpose:** Runs scheduled tasks automatically

**Configured tasks:**
- Token cleanup: Daily at 2 AM UTC

**View logs:**
```bash
docker-compose logs -f cron

# Or check the log file
docker-compose exec cron cat /app/logs/token-cleanup.log
```

**Verify cron jobs:**
```bash
docker-compose exec cron cat /etc/crontabs/root
```

## Configuration

### Cron Schedule

Edit `crontab` file to change schedule:

```bash
# Format: minute hour day month weekday command

# Daily at 2 AM UTC
0 2 * * * cd /app && /usr/local/bin/node scripts/cleanup-revoked-tokens.js >> /app/logs/token-cleanup.log 2>&1

# Twice daily (2 AM and 2 PM)
0 2,14 * * * cd /app && /usr/local/bin/node scripts/cleanup-revoked-tokens.js >> /app/logs/token-cleanup.log 2>&1

# Every hour
0 * * * * cd /app && /usr/local/bin/node scripts/cleanup-revoked-tokens.js >> /app/logs/token-cleanup.log 2>&1
```

**Apply changes:**
```bash
# Rebuild cron service
docker-compose up -d --build cron
```

### Environment Variables

**Via `.env` file (recommended):**
```bash
# .env
NODE_ENV=production
PORT_HTTP=3000
FIREBASE_PROJECT_ID=your-project
# ... etc
```

**Via docker-compose override:**
```yaml
# docker-compose.override.yml
version: '3.8'
services:
  api:
    environment:
      - DEBUG=true
      - LOG_LEVEL=debug
```

## Common Commands

### Start/Stop Services

```bash
# Start all services
docker-compose up -d

# Start specific service
docker-compose up -d api
docker-compose up -d cron

# Stop all services
docker-compose down

# Stop but keep volumes
docker-compose stop

# Restart a service
docker-compose restart api
```

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f api
docker-compose logs -f cron

# Last 100 lines
docker-compose logs --tail=100 api

# Since specific time
docker-compose logs --since 2025-12-15T10:00:00
```

### Execute Commands

```bash
# Run token cleanup manually
docker-compose exec cron node /app/scripts/cleanup-revoked-tokens.js

# Dry run
docker-compose exec -e DRY_RUN=true cron node /app/scripts/cleanup-revoked-tokens.js

# Access API container shell
docker-compose exec api sh

# Access cron container shell
docker-compose exec cron sh
```

### Update and Rebuild

```bash
# Pull latest code
git pull

# Rebuild images
docker-compose build

# Restart with new images
docker-compose up -d

# Or combine (rebuild and restart)
docker-compose up -d --build
```

## Production Deployment

### 1. Security Checklist

- [ ] Set `NODE_ENV=production` in `.env`
- [ ] Use strong encryption keys
- [ ] Never commit `.env` or Firebase credentials
- [ ] Configure Cloudflare proxy
- [ ] Set up proper Firebase security rules
- [ ] Enable Docker logging driver
- [ ] Configure resource limits

### 2. Resource Limits

Add to `docker-compose.yml`:

```yaml
services:
  api:
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 512M
        reservations:
          cpus: '0.5'
          memory: 256M
    restart: always

  cron:
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 256M
        reservations:
          cpus: '0.25'
          memory: 128M
    restart: always
```

### 3. Logging Configuration

**JSON logging driver:**
```yaml
services:
  api:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

**Syslog (for centralized logging):**
```yaml
services:
  api:
    logging:
      driver: "syslog"
      options:
        syslog-address: "tcp://192.168.0.1:514"
        tag: "syshub-api"
```

### 4. Health Checks

Add to `docker-compose.yml`:

```yaml
services:
  api:
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

### 5. Volumes for Logs

```yaml
services:
  api:
    volumes:
      - ./logs:/app/logs

  cron:
    volumes:
      - ./logs:/app/logs
```

Then create logs directory:
```bash
mkdir -p logs
chmod 755 logs
```

## Monitoring

### Container Health

```bash
# Check container status
docker-compose ps

# Check resource usage
docker stats

# Check specific container
docker stats syshub-api_cron_1
```

### Cron Job Monitoring

```bash
# Watch token cleanup logs
tail -f logs/token-cleanup.log

# Check last cleanup run
docker-compose exec cron tail /app/logs/token-cleanup.log

# Check cron daemon logs
docker-compose logs --tail=50 cron
```

### Alerts

**Set up monitoring alerts:**

1. **Container health:**
   ```bash
   # Check if containers are running
   docker-compose ps | grep -q "Up" || echo "Alert: Containers down!"
   ```

2. **Cron execution:**
   ```bash
   # Check if cleanup ran today
   grep "$(date +%Y-%m-%d)" logs/token-cleanup.log || echo "Alert: Cleanup hasn't run today"
   ```

3. **Disk space:**
   ```bash
   # Check Docker disk usage
   docker system df
   ```

## Troubleshooting

### Cron Jobs Not Running

**Check cron service logs:**
```bash
docker-compose logs cron
```

**Verify crontab:**
```bash
docker-compose exec cron cat /etc/crontabs/root
```

**Test script manually:**
```bash
docker-compose exec cron node /app/scripts/cleanup-revoked-tokens.js
```

**Check timezone:**
```bash
docker-compose exec cron date
# Should match your expected timezone (default: UTC)
```

### Permission Issues

```bash
# Fix log permissions
docker-compose exec cron chmod -R 755 /app/logs

# Check script permissions
docker-compose exec cron ls -la /app/scripts/
```

### Container Crashes

```bash
# View crash logs
docker-compose logs --tail=100 api

# Check exit code
docker-compose ps

# Restart with debug
docker-compose up api  # Without -d to see output
```

### Out of Memory

```bash
# Check memory usage
docker stats

# Add memory limits (see Production Deployment section)
# Or increase available memory in Docker settings
```

## Backup and Recovery

### Backup Configuration

```bash
# Backup .env file (store securely!)
cp .env .env.backup

# Backup Docker volumes (if using)
docker run --rm -v syshub-api_data:/data -v $(pwd):/backup alpine tar czf /backup/data-backup.tar.gz /data
```

### Disaster Recovery

```bash
# Stop services
docker-compose down

# Restore .env
cp .env.backup .env

# Rebuild and start
docker-compose up -d --build

# Verify
docker-compose ps
docker-compose logs -f
```

## Development vs Production

### Development

```yaml
# docker-compose.override.yml
version: '3.8'
services:
  api:
    volumes:
      - .:/app
      - /app/node_modules
    environment:
      - NODE_ENV=development
    command: npm run dev
```

```bash
docker-compose up
# Auto-reloads on code changes
```

### Production

```bash
# Use production .env
NODE_ENV=production

# Build optimized images
docker-compose build --no-cache

# Run in background
docker-compose up -d

# Monitor
docker-compose logs -f
```

## Cleanup

### Remove Everything

```bash
# Stop and remove containers, networks
docker-compose down

# Remove volumes too (WARNING: deletes data)
docker-compose down -v

# Remove images
docker-compose down --rmi all
```

### Clean Build Cache

```bash
# Remove build cache
docker builder prune

# Remove unused images
docker image prune -a

# Remove everything unused
docker system prune -a --volumes
```

## Best Practices

1. **Never commit `.env`** - Use `.env-example` as template
2. **Use Docker secrets** for sensitive data in production
3. **Set resource limits** to prevent resource exhaustion
4. **Enable health checks** for automatic recovery
5. **Use volume mounts** for logs in production
6. **Monitor container metrics** regularly
7. **Keep images updated** with security patches
8. **Use multi-stage builds** to reduce image size
9. **Run as non-root user** when possible
10. **Enable logging driver** for centralized logs

## Next Steps

- ✅ Configure environment variables
- ✅ Test locally with `docker-compose up`
- ✅ Verify cron jobs execute
- ✅ Set up monitoring and alerts
- ✅ Configure resource limits for production
- ✅ Set up automated backups
- ✅ Deploy to production environment
