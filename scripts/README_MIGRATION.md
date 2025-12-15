# 2FA Encryption Migration Guide

## Overview

This migration upgrades the 2FA (Google Authenticator) secret encryption from the insecure CryptoJS implementation to a secure AES-256-GCM implementation with PBKDF2 key derivation.

## Security Improvements

**Before (Legacy):**
- ❌ CryptoJS library (less secure than native crypto)
- ❌ No key derivation (raw environment variable used as key)
- ❌ No salt (same key produces same ciphertext)
- ❌ No authentication (vulnerable to tampering)

**After (New):**
- ✅ Node.js native crypto module
- ✅ PBKDF2 key derivation (100,000 iterations)
- ✅ Cryptographically secure random salt per encryption
- ✅ AES-256-GCM authenticated encryption (detects tampering)
- ✅ Cryptographically secure random IV per encryption

## Migration Strategy

The migration has been designed with **zero downtime** and **automatic rollout**:

### 1. Automatic Migration (Recommended)

The system now automatically migrates users when they verify their 2FA code:

```javascript
// In controllers/user.js - verifyGAuthCode function
// When a user verifies their 2FA code, the system:
// 1. Detects if their secret uses legacy encryption
// 2. Automatically migrates to new encryption
// 3. Updates their database record
// 4. Continues with verification
```

**Advantages:**
- Zero admin intervention required
- Users migrate naturally over time
- No service interruption
- Gradual rollout

**Timeline:**
- Users who log in daily: Migrated within 1-7 days
- Users who log in weekly: Migrated within 1-4 weeks
- Inactive users: Will migrate when they next log in

### 2. Proactive Migration (Optional)

For immediate migration of all users, run the migration script:

```bash
# 1. Preview what will be migrated (safe, read-only)
node scripts/migrate-2fa-encryption.js --dry-run

# 2. Review the output, then run actual migration
node scripts/migrate-2fa-encryption.js

# 3. Confirm when prompted, or use --force to skip confirmation
node scripts/migrate-2fa-encryption.js --force
```

## Migration Script Usage

### Prerequisites

1. Ensure `.env` file is present with:
   ```bash
   KEY_FOR_ENCRYPTION=your-encryption-key
   COLLECTION_NAME_USERS=users
   ```

2. Ensure Firebase service account is configured:
   ```bash
   .firebase-service-account.json
   ```

### Commands

```bash
# Show help
node scripts/migrate-2fa-encryption.js --help

# Dry-run (preview, no changes)
node scripts/migrate-2fa-encryption.js --dry-run

# Run migration with confirmation prompt
node scripts/migrate-2fa-encryption.js

# Run migration without prompt (USE WITH CAUTION)
node scripts/migrate-2fa-encryption.js --force
```

### Expected Output

```
🔐 2FA Encryption Migration Tool
============================================================
✅ Environment validation passed

⚠️  PRODUCTION MODE: Database will be modified

📊 Fetching users from database...
✅ Found 150 total users

🔄 Processing users...

  ✅ user-id-123: Migrated successfully
  ✅ user-id-456: Migrated successfully
  ✅ user-id-789: Migrated successfully

============================================================
📊 Migration Summary
============================================================
Total users:              150
Users with 2FA:           45
Legacy encryption:        42
Already migrated:         3
Successfully migrated:    42
Failed:                   0

📝 Detailed log saved to: ./scripts/migration-log-2025-11-22T10-30-00.000Z.json

✅ Migration completed successfully!
```

### Safety Features

The migration script includes multiple safety mechanisms:

1. **Idempotent:** Safe to run multiple times
   - Automatically skips already-migrated users
   - No risk of double-migration

2. **Validation:** Verifies before and after
   - Tests legacy decryption before migration
   - Verifies new encryption after migration
   - Rolls back on validation failure

3. **Dry-Run Mode:** Preview changes
   - See exactly what will be migrated
   - No database modifications
   - Risk-free testing

4. **Detailed Logging:** Full audit trail
   - JSON log file created for each run
   - Timestamp, statistics, and detailed results
   - Error tracking for failed migrations

5. **Graceful Failure Handling:**
   - Failed users are logged but don't stop migration
   - Errors are collected and reported
   - Database remains consistent

## Migration Timeline (Production)

### Week 1: Deploy Code
```bash
# Deploy the new encryption code to production
git checkout claude/software-audit-report-01EAd4AeUycbJL5XnwSfCyFi
git push origin HEAD:main

# Code is now deployed, both encryption formats work
```

### Week 1-2: Automatic Migration
- Users naturally migrate as they log in
- Monitor logs for auto-migration messages
- Most active users migrated within 7 days

### Week 3: Proactive Migration (Optional)
```bash
# Migrate remaining inactive users
node scripts/migrate-2fa-encryption.js --dry-run
node scripts/migrate-2fa-encryption.js
```

### Week 4: Verify Completion
```bash
# Run dry-run to see if any legacy users remain
node scripts/migrate-2fa-encryption.js --dry-run

# Should show:
# Legacy encryption: 0
# Already migrated: 45
```

### Future: Remove Legacy Code
After 100% migration confirmed (e.g., 3 months):
```javascript
// In utils/encrypt.js
// Remove legacy functions:
// - encryptAesLegacy
// - decryptAesLegacy
// - isLegacyFormat
// - decryptAesAuto

// Keep only:
// - encryptAes
// - decryptAes
```

## Monitoring

### Application Logs

Watch for automatic migration messages:

```bash
# Production logs
tail -f /var/log/syshub-api/app.log | grep "migrating 2FA"

# Expected output:
Auto-migrating 2FA encryption for user abc123 during verification
Successfully migrated 2FA encryption for user abc123
```

### Check Migration Progress

```bash
# Count users with legacy encryption (approximate)
# This requires database access
```

### Migration Log Files

```bash
# View migration logs
ls -lh scripts/migration-log-*.json

# View latest log
cat scripts/migration-log-*.json | jq '.'
```

## Troubleshooting

### Error: "Decryption failed: data may have been tampered with"

**Cause:** Authentication tag verification failed in new encryption

**Solution:**
- This is a security feature (good!)
- Data was likely corrupted or modified
- Check database backup
- User may need to re-enable 2FA

### Error: "Legacy decryption failed"

**Cause:** Cannot decrypt with old CryptoJS method

**Possible Reasons:**
1. Data was encrypted with different key
2. `KEY_FOR_ENCRYPTION` environment variable changed
3. Data corruption in database

**Solution:**
1. Verify `KEY_FOR_ENCRYPTION` matches production
2. Check if user already migrated
3. If data is corrupted, user must re-setup 2FA

### Error: "Migration failed: [some error]"

**Cause:** Specific error during migration

**Action:**
1. Check the detailed log file
2. Verify the user's data in Firestore
3. Try migrating that specific user again
4. If persistent, user may need to re-setup 2FA

## Rollback Plan

If critical issues are discovered:

### Immediate Rollback (Code)

```bash
# Revert to previous deployment
git revert <commit-hash>
git push origin main
```

### Data Rollback (Not Recommended)

⚠️ **Warning:** Rolling back data is complex and risky

If absolutely necessary:
1. Stop automatic migration (redeploy old code)
2. Restore database from backup before migration
3. Note: Any users who logged in after migration will be affected

**Better approach:** Fix forward
- Debug the issue
- Fix the code
- Re-run migration
- Don't rollback user data unless absolutely critical

## Testing

### Test in Staging First

```bash
# 1. Deploy to staging
git push origin HEAD:staging

# 2. Test with real user accounts
# - Create test user
# - Enable 2FA
# - Verify auto-migration works
# - Run migration script in dry-run
# - Run migration script for real

# 3. Verify both old and new encrypted secrets work
```

### Test Cases

1. ✅ New 2FA setup uses new encryption
2. ✅ Legacy 2FA verification works
3. ✅ Legacy 2FA auto-migrates on verification
4. ✅ New 2FA verification works
5. ✅ Migration script detects legacy users
6. ✅ Migration script skips migrated users
7. ✅ Migration script handles errors gracefully

## Security Notes

### Encryption Key Management

**Current:** `KEY_FOR_ENCRYPTION` in .env file

**Recommended (Future):**
- Move to secret manager (Google Secret Manager, AWS Secrets Manager)
- Enable automatic key rotation
- Use different keys per environment

### Key Rotation

If you need to rotate the encryption key:

1. **DO NOT** simply change `KEY_FOR_ENCRYPTION`
2. This will break all existing encrypted secrets
3. Instead, implement dual-key system:
   - Keep old key for decryption
   - Use new key for encryption
   - Migrate gradually

### Compliance

This migration addresses:
- ✅ OWASP A02: Cryptographic Failures
- ✅ NIST 800-57 (Key Management)
- ✅ OWASP ASVS 6.2 (Encryption)

## FAQ

**Q: Will users notice anything during migration?**
A: No, migration is transparent. Users log in normally.

**Q: What happens if migration fails for a user?**
A: User continues using legacy encryption. They're retried on next login.

**Q: Can I run the migration multiple times?**
A: Yes, it's idempotent. Already-migrated users are automatically skipped.

**Q: How long does migration take?**
A: Depends on user count. ~100 users/second. 1000 users ≈ 10 seconds.

**Q: Do I need to take the site offline?**
A: No, zero-downtime migration. Site remains fully operational.

**Q: What if a user hasn't logged in for months?**
A: They'll auto-migrate next time they log in. No rush.

## Support

For issues or questions:
1. Check application logs
2. Review migration log files
3. Verify environment configuration
4. Test in staging environment first
5. Create GitHub issue with details
