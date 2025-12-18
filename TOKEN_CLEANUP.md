# Token Cleanup Guide

## Overview

Revoked Firebase tokens are stored in Firestore to prevent reuse. Without cleanup, this collection grows indefinitely, causing:
- 📈 Increased Firestore storage costs
- 🐌 Slower token validation queries
- 💾 Database bloat

This system automatically expires and cleans up old revoked tokens.

## How It Works

### 1. Token Revocation with Expiration

When a user signs out, tokens are stored with expiration timestamps:

```javascript
// controllers/user.js
{
  token: "abc123...",
  revokedAt: Timestamp(2025-12-15 10:30:00),
  expiresAt: Timestamp(2025-12-22 10:30:00)  // 7 days later
}
```

**Why 7 days?**
- Firebase ID tokens expire after 1 hour
- Refresh tokens can last longer
- 7 days provides safety margin to prevent token reuse
- After 7 days, expired tokens are safe to delete

### 2. Automatic Cleanup Script

The cleanup script (`scripts/cleanup-revoked-tokens.js`) removes expired tokens:

```bash
# Manual run
node scripts/cleanup-revoked-tokens.js

# Dry run (see what would be deleted)
DRY_RUN=true node scripts/cleanup-revoked-tokens.js
```

## Configuration

### Environment Variables

```bash
# In .env file

# How long to keep revoked tokens (default: 7 days)
REVOKED_TOKEN_TTL_DAYS=7

# Number of tokens to process per batch (default: 500)
# Increase for faster cleanup, decrease for lower memory usage
CLEANUP_BATCH_SIZE=500

# Dry run mode - preview deletions without actually deleting
# DRY_RUN=true
```

### Adjusting TTL

**Shorter TTL (3-5 days):**
- ✅ Less database storage
- ✅ Faster cleanup
- ⚠️ Must ensure refresh tokens don't last longer

**Longer TTL (14-30 days):**
- ✅ Extra safety margin
- ✅ Better for compliance/audit requirements
- ⚠️ More storage usage

**Recommended:** Keep at 7 days unless you have specific requirements

## Scheduling the Cleanup

### Option 1: Docker Compose (Recommended) ✅

**If using Docker Compose**, the cron service is already configured and runs automatically!

```bash
# Start both API and cron services
docker-compose up -d

# Check cron service logs
docker-compose logs -f cron

# View token cleanup logs
docker-compose exec cron cat /app/logs/token-cleanup.log
```

**How it works:**
- Uses the same GitHub Package image as the API
- Overrides command to run cron daemon
- Automatically runs token cleanup daily at 2 AM UTC
- Logs to `/app/logs/token-cleanup.log`

**Customize schedule:**

Edit `docker-compose.yml` cron service command section:

```yaml
cron:
  # ... other config
  command:
    - -c
    - |
      # Change this line for different schedule:
      echo "0 2 * * * cd /app && node scripts/cleanup-revoked-tokens.js >> /app/logs/token-cleanup.log 2>&1" >> /tmp/crontab
      # Examples:
      # Twice daily: 0 2,14 * * *
      # Every hour: 0 * * * *
      # Every Sunday: 0 2 * * 0
```

Then restart:
```bash
docker-compose up -d --force-recreate cron
```

### Option 2: Cron Job (Linux/Mac)

For non-Docker deployments:

```bash
# Edit crontab
crontab -e

# Add this line to run daily at 2 AM
0 2 * * * cd /path/to/syshub-api && node scripts/cleanup-revoked-tokens.js >> logs/token-cleanup.log 2>&1
```

**Cron schedule examples:**
```bash
# Every day at 2 AM
0 2 * * *

# Every Sunday at 3 AM
0 3 * * 0

# Twice daily (2 AM and 2 PM)
0 2,14 * * *

# Every hour
0 * * * *
```

### Option 3: systemd Timer (Linux)

Create a service file:
```ini
# /etc/systemd/system/token-cleanup.service
[Unit]
Description=Cleanup expired revoked tokens
After=network.target

[Service]
Type=oneshot
User=syshub
WorkingDirectory=/path/to/syshub-api
Environment="NODE_ENV=prod"
ExecStart=/usr/bin/node /path/to/syshub-api/scripts/cleanup-revoked-tokens.js
StandardOutput=append:/var/log/syshub/token-cleanup.log
StandardError=append:/var/log/syshub/token-cleanup-error.log
```

Create a timer:
```ini
# /etc/systemd/system/token-cleanup.timer
[Unit]
Description=Run token cleanup daily
Requires=token-cleanup.service

[Timer]
OnCalendar=daily
OnCalendar=02:00
Persistent=true

[Install]
WantedBy=timers.target
```

Enable and start:
```bash
sudo systemctl enable token-cleanup.timer
sudo systemctl start token-cleanup.timer
sudo systemctl status token-cleanup.timer
```

### Option 3: Node Scheduler (In-App)

Add to your application:

```bash
npm install node-cron
```

```javascript
// app.js or separate scheduler file
const cron = require('node-cron');
const { exec } = require('child_process');

// Run daily at 2 AM
cron.schedule('0 2 * * *', () => {
  console.log('Running token cleanup...');
  exec('node scripts/cleanup-revoked-tokens.js', (error, stdout, stderr) => {
    if (error) {
      console.error('Token cleanup error:', error);
      return;
    }
    console.log(stdout);
  });
});
```

**Note:** This requires the application to be running 24/7. Prefer cron/systemd for production.

### Option 4: Cloud Scheduler (Google Cloud)

If using Google Cloud Platform:

```bash
# Create Cloud Scheduler job
gcloud scheduler jobs create http token-cleanup \
  --schedule="0 2 * * *" \
  --uri="https://your-app.com/admin/cleanup-tokens" \
  --http-method=POST \
  --oidc-service-account-email=scheduler@your-project.iam.gserviceaccount.com
```

Then create an admin endpoint that calls the cleanup script.

## Monitoring

### Check Cleanup Logs

```bash
# View recent cleanup runs
tail -f logs/token-cleanup.log

# Check for errors
grep "❌" logs/token-cleanup.log

# See deletion stats
grep "Deleted" logs/token-cleanup.log
```

### Monitor Database Size

```bash
# Run script with monitoring
node scripts/cleanup-revoked-tokens.js

# Output shows:
# - Number of expired tokens found
# - Number deleted
# - Remaining tokens in database
# - Execution time
```

### Firestore Console

1. Go to Firebase Console → Firestore Database
2. Navigate to your `COLLECTION_NAME_TOKENS` collection
3. Monitor document count over time
4. Should see it decrease after cleanup runs

## Testing

### Dry Run Mode

Test without actually deleting:

```bash
DRY_RUN=true node scripts/cleanup-revoked-tokens.js
```

Output:
```
[2025-12-15T10:30:00Z] Starting token cleanup...
🔍 DRY RUN MODE - No tokens will be deleted
Found 150 expired tokens in this batch
Would delete 150 tokens (DRY RUN)
✓ Would delete 150 expired token(s) in 0.45s
📊 Remaining revoked tokens in database: 500
```

### Manual Testing

1. **Create test revoked token:**
   ```javascript
   // In Firebase Console or via API
   await admin.firestore()
     .collection(process.env.COLLECTION_NAME_TOKENS)
     .add({
       token: 'test-token',
       revokedAt: admin.firestore.FieldValue.serverTimestamp(),
       expiresAt: admin.firestore.Timestamp.fromMillis(Date.now() - 1000) // Already expired
     });
   ```

2. **Run cleanup:**
   ```bash
   node scripts/cleanup-revoked-tokens.js
   ```

3. **Verify deletion:**
   - Check Firestore Console
   - Test token should be gone

## Troubleshooting

### "No expired tokens to clean up"

✅ This is normal! Means your database is healthy and no tokens have expired yet.

### High number of expired tokens

If you see thousands of expired tokens:
- Run cleanup more frequently (daily instead of weekly)
- Increase `CLEANUP_BATCH_SIZE` to process faster
- Check if cleanup has been running regularly

### Permission errors

```
Error: Missing or insufficient permissions
```

**Solution:** Ensure Firebase service account has Firestore write permissions:
1. Go to Firebase Console → Project Settings → Service Accounts
2. Verify permissions include `Cloud Datastore User`

### Memory issues

If cleanup fails on large datasets:
- Reduce `CLEANUP_BATCH_SIZE` (try 100 or 250)
- Run cleanup more frequently to keep datasets smaller

## Performance Impact

### Firestore Costs

**Before cleanup:**
- 1000 signouts/day = 365,000 documents/year
- Storage: ~50MB/year (at ~140 bytes/doc)
- Query cost: Increases linearly with size

**With cleanup (7-day TTL):**
- Max ~7,000 documents at any time
- Storage: ~1MB steady state
- Query cost: Constant, fast lookups

**Estimated savings:**
- 98% reduction in storage
- 50x faster token validation queries
- Lower Firestore read costs

### Cleanup Performance

Typical cleanup run:
- **500 tokens:** ~0.5 seconds
- **5,000 tokens:** ~5 seconds
- **50,000 tokens:** ~50 seconds

Batch processing prevents memory issues and timeouts.

## Best Practices

1. **Schedule daily cleanup** - Prevents accumulation
2. **Monitor logs** - Watch for errors or unusual patterns
3. **Keep default 7-day TTL** - Good balance of safety and efficiency
4. **Run in off-peak hours** - Minimize Firestore contention (2-4 AM)
5. **Set up alerts** - Get notified if cleanup fails
6. **Test after deployment** - Verify cleanup works in your environment

## Migration

If you have existing tokens without `expiresAt`:

```javascript
// One-time migration script
const admin = require('firebase-admin');

async function migrateOldTokens() {
  const tokens = await admin.firestore()
    .collection(process.env.COLLECTION_NAME_TOKENS)
    .where('expiresAt', '==', null)
    .get();

  const batch = admin.firestore().batch();
  const now = Date.now();

  tokens.docs.forEach((doc) => {
    batch.update(doc.ref, {
      revokedAt: admin.firestore.FieldValue.serverTimestamp(),
      expiresAt: admin.firestore.Timestamp.fromMillis(now + (7 * 24 * 60 * 60 * 1000))
    });
  });

  await batch.commit();
  console.log(`Migrated ${tokens.size} old tokens`);
}
```

## Summary

- ✅ Revoked tokens now auto-expire after 7 days
- ✅ Cleanup script removes expired tokens automatically
- ✅ Schedule with cron/systemd for production
- ✅ Monitor with logs and Firestore Console
- ✅ Saves storage costs and improves performance

**Next steps:**
1. Set `COLLECTION_NAME_TOKENS` in your `.env`
2. Test cleanup script: `DRY_RUN=true node scripts/cleanup-revoked-tokens.js`
3. Schedule daily cleanup (cron recommended)
4. Monitor logs after first run
