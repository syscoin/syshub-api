# Quick Start: Encryption Key Management

## 🚀 For Immediate Production Use

### Step 1: Generate Your First Key (2 minutes)

```bash
# Generate a secure 256-bit encryption key
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

**Copy the output**, it will look like:
```
Kx7vJ2mP9nQ3rT8wY4zC1dF5gH6jK0lM2nO3pQ4rS5tU6vW7xY8zA9B=
```

### Step 2: Store the Key Securely

#### Option A: Development (.env file)

```bash
# Add to .env file
echo "KEY_FOR_ENCRYPTION=Kx7vJ2mP9nQ3rT8wY4zC1dF5gH6jK0lM2nO3pQ4rS5tU6vW7xY8zA9B=" >> .env

# Secure the file
chmod 600 .env

# Verify it's in .gitignore
grep -q "^\.env$" .gitignore || echo ".env" >> .gitignore
```

#### Option B: Production (Google Cloud Secret Manager) - RECOMMENDED

```bash
# 1. Install dependency
npm install @google-cloud/secret-manager

# 2. Run setup script
node scripts/setup-secret-manager.js

# Follow the prompts - it will:
# - Generate a new key
# - Store it in Secret Manager
# - Give you integration code
```

### Step 3: Verify It Works

```bash
# Run encryption tests
node scripts/test-encryption.js

# You should see:
# ✅ ALL TESTS PASSED!
```

**Done!** Your encryption is now secure. 🎉

---

## 🔄 Key Rotation (Every 90 days)

### Quick Rotation

```bash
# 1. Preview what will change (safe, no modifications)
node scripts/rotate-encryption-key.js --dry-run

# 2. Review the output, then execute
node scripts/rotate-encryption-key.js

# 3. Restart your application
pm2 restart syshub-api
# or
kubectl rollout restart deployment syshub-api
```

**That's it!** All user 2FA secrets are now encrypted with the new key.

---

## 📊 Three Storage Methods Compared

| Feature | .env File | Google Secret Manager | AWS Secrets Manager |
|---------|-----------|----------------------|---------------------|
| **Setup Time** | 30 seconds | 5 minutes | 5 minutes |
| **Cost** | Free | ~$0.06/month | ~$0.40/month |
| **Security** | ⚠️ Basic | ✅ Enterprise | ✅ Enterprise |
| **Rotation** | Manual | Automated | Automated |
| **Audit Logs** | ❌ No | ✅ Yes | ✅ Yes |
| **Use Case** | Development | Production | AWS-hosted |

### Our Recommendation

- **Development/Testing:** Use `.env` file
- **Production:** Use Google Cloud Secret Manager (you're already on Firebase/Google Cloud)

---

## 🆘 Emergency: Key Compromised

If your encryption key is leaked or compromised:

```bash
# 1. IMMEDIATE: Generate new key and rotate
node scripts/rotate-encryption-key.js --force

# 2. Revoke all user sessions (they'll need to re-login)
# Run this in Firebase Console or via script

# 3. Check audit logs for unauthorized access
gcloud logging read "resource.type=secretmanager_secret" --limit 100

# 4. Notify users if needed
# (Use Firebase Cloud Messaging or email)

# 5. Document incident
# Create incident report with timeline
```

**Time to complete:** ~15 minutes

---

## ✅ Security Checklist

Before deploying to production:

- [ ] Generated key using cryptographically secure random function
- [ ] Key is at least 256 bits (32 bytes)
- [ ] Key stored in Secret Manager (not .env in production)
- [ ] `.env` file in `.gitignore`
- [ ] Tested encryption/decryption with test suite
- [ ] Set up key rotation schedule (every 90 days)
- [ ] Documented key location for team
- [ ] Set up monitoring/alerts for key access

---

## 📅 Maintenance Schedule

| Task | Frequency | Command |
|------|-----------|---------|
| **Key Rotation** | Every 90 days | `node scripts/rotate-encryption-key.js` |
| **Audit Key Access** | Weekly | Check Secret Manager logs |
| **Test Encryption** | After deployment | `node scripts/test-encryption.js` |
| **Backup Keys** | Before rotation | Automated by Secret Manager |

---

## 💡 Common Questions

**Q: What if I lose the encryption key?**
A: Users will need to re-setup their 2FA. The key cannot be recovered.

**Q: Can I rotate the key without downtime?**
A: Yes! The rotation script re-encrypts all data automatically.

**Q: Do I need to notify users when rotating keys?**
A: No, rotation is transparent to users. Their 2FA continues working.

**Q: How do I backup the key?**
A: Secret Manager handles backups automatically. For .env, store encrypted backup in secure location.

**Q: What if the rotation script fails?**
A: The script validates before modifying data. Failed users are logged and can be retried.

---

## 📞 Need Help?

1. **Read full documentation:** `docs/ENCRYPTION_KEY_MANAGEMENT.md`
2. **Run tests:** `node scripts/test-encryption.js`
3. **Check logs:** `scripts/rotation-log-*.json`
4. **Review audit report:** `SECURITY_AUDIT_REPORT.md` (CRIT-001)

---

**Quick Reference:**

```bash
# Generate key
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Setup Secret Manager
node scripts/setup-secret-manager.js

# Test encryption
node scripts/test-encryption.js

# Rotate key (preview)
node scripts/rotate-encryption-key.js --dry-run

# Rotate key (execute)
node scripts/rotate-encryption-key.js
```

**You're all set!** 🎉
