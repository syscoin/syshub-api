# Encryption Key Management Guide

## Overview

This guide covers generating, storing, and rotating the encryption key used for 2FA (Google Authenticator) secrets in the SysHub API.

---

## 🔑 Generating Encryption Keys

### Requirements

- **Length:** 256 bits (32 bytes) for AES-256
- **Randomness:** Cryptographically secure random generation
- **Format:** Base64 or Hex encoding

### Generation Methods

#### Method 1: Node.js (Recommended)

```bash
# Generate base64-encoded key (recommended)
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Output example:
# Kx7vJ2mP9nQ3rT8wY4zC1dF5gH6jK0lM2nO3pQ4rS5tU6vW7xY8zA9B=
```

#### Method 2: OpenSSL

```bash
# Base64 format
openssl rand -base64 32

# Hex format
openssl rand -hex 32
```

#### Method 3: Python

```bash
python3 -c "import os, base64; print(base64.b64encode(os.urandom(32)).decode())"
```

### ❌ BAD Key Examples (NEVER USE)

```bash
# Too short
KEY_FOR_ENCRYPTION=mysecretkey

# Predictable
KEY_FOR_ENCRYPTION=password123

# Not random
KEY_FOR_ENCRYPTION=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
```

### ✅ GOOD Key Examples

```bash
# Cryptographically random, 32 bytes, base64-encoded
KEY_FOR_ENCRYPTION=Kx7vJ2mP9nQ3rT8wY4zC1dF5gH6jK0lM2nO3pQ4rS5tU6vW7xY8zA9B=

# Or hex-encoded
KEY_FOR_ENCRYPTION=a1b2c3d4e5f6789012345678901234567890123456789012345678901234
```

---

## 💾 Storage Options

### Option 1: Environment Variable (.env) - Development Only

**Use for:** Local development, testing

```bash
# .env
KEY_FOR_ENCRYPTION=your-base64-key-here
```

**Pros:**
- ✅ Simple setup
- ✅ Works locally
- ✅ No external dependencies

**Cons:**
- ❌ Visible in repository if committed
- ❌ Hard to rotate
- ❌ No audit trail
- ❌ Not secure for production

**Security Checklist:**
- ✅ Add `.env` to `.gitignore`
- ✅ Never commit actual keys
- ✅ Use `.env-example` with placeholder values
- ✅ Restrict file permissions: `chmod 600 .env`

---

### Option 2: Google Cloud Secret Manager (Recommended for Production)

**Use for:** Production, staging

#### Setup

1. **Install SDK:**
```bash
npm install @google-cloud/secret-manager
```

2. **Enable API:**
```bash
gcloud services enable secretmanager.googleapis.com
```

3. **Create Secret:**
```bash
# Generate key
KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")

# Store in Secret Manager
echo -n "$KEY" | gcloud secrets create syshub-2fa-encryption-key \
  --data-file=- \
  --replication-policy="automatic"
```

4. **Grant Access:**
```bash
gcloud secrets add-iam-policy-binding syshub-2fa-encryption-key \
  --member="serviceAccount:YOUR-SERVICE-ACCOUNT@PROJECT.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

5. **Use in Application:**
```javascript
// utils/secrets.js
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');

async function getEncryptionKey() {
  const client = new SecretManagerServiceClient();
  const projectId = process.env.FIREBASE_PROJECT_ID;

  const [version] = await client.accessSecretVersion({
    name: `projects/${projectId}/secrets/syshub-2fa-encryption-key/versions/latest`,
  });

  return version.payload.data.toString('utf8');
}

module.exports = { getEncryptionKey };
```

**Pros:**
- ✅ Centralized secret management
- ✅ Automatic encryption at rest
- ✅ Audit logging
- ✅ Easy rotation with versioning
- ✅ Fine-grained access control
- ✅ No secrets in code or .env

**Cons:**
- ❌ Requires Google Cloud setup
- ❌ Slight latency on first access
- ❌ Additional cost (minimal for low volume)

---

### Option 3: AWS Secrets Manager

**Use for:** If hosting on AWS

```bash
# Create secret
aws secretsmanager create-secret \
  --name syshub/2fa-encryption-key \
  --secret-string "$(node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")"
```

```javascript
// utils/secrets.js
const AWS = require('aws-sdk');
const secretsManager = new AWS.SecretsManager();

async function getEncryptionKey() {
  const data = await secretsManager.getSecretValue({
    SecretId: 'syshub/2fa-encryption-key'
  }).promise();

  return data.SecretString;
}
```

---

### Option 4: HashiCorp Vault

**Use for:** Multi-cloud or on-premise

```bash
# Store secret
vault kv put secret/syshub/encryption key=$(node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")
```

```javascript
const vault = require('node-vault')();

async function getEncryptionKey() {
  const result = await vault.read('secret/data/syshub/encryption');
  return result.data.data.key;
}
```

---

## 🔄 Key Rotation

### Why Rotate Keys?

- Security best practice (rotate every 90 days)
- Key compromise suspected
- Compliance requirements (PCI DSS, HIPAA)
- Employee turnover
- Before/after major incidents

### When to Rotate

**Regular Schedule:**
- Every 90 days (recommended)
- Every 180 days (minimum)
- Annually (compliance baseline)

**Immediate Rotation Required:**
- Key suspected compromised
- Former employee had access
- Security incident
- Compliance audit requirement

### Rotation Process

#### 1. Pre-Rotation Checklist

```bash
✅ Database backup created
✅ Current key documented
✅ Rotation script tested in staging
✅ Rollback plan prepared
✅ Team notified of maintenance window
✅ Monitoring alerts configured
```

#### 2. Generate New Key

```bash
# Generate new key
node scripts/rotate-encryption-key.js --dry-run
```

#### 3. Test in Staging

```bash
# Run in staging first
NODE_ENV=staging node scripts/rotate-encryption-key.js
```

#### 4. Execute Production Rotation

```bash
# Backup database
firebase firestore:export gs://YOUR-BUCKET/backup-$(date +%Y%m%d)

# Run rotation
node scripts/rotate-encryption-key.js

# For Secret Manager integration
node scripts/rotate-encryption-key.js --secret-manager
```

#### 5. Verification

```bash
# Test 2FA verification works
curl -X POST https://syshub-staging.syscoin.org/user/verify-gauth-code \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"code":"123456"}'

# Check logs for errors
tail -f /var/log/syshub-api/app.log | grep "2FA"
```

#### 6. Post-Rotation

```bash
✅ All users can verify 2FA
✅ No decryption errors in logs
✅ Old key backed up securely
✅ Rotation documented in audit log
✅ Team notified of completion
```

---

## 🔒 Security Best Practices

### DO:

✅ **Use cryptographically random keys**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

✅ **Store in secret manager (production)**
```bash
gcloud secrets create syshub-2fa-encryption-key
```

✅ **Rotate keys regularly**
```bash
# Every 90 days
node scripts/rotate-encryption-key.js
```

✅ **Audit key access**
```bash
gcloud logging read "resource.type=secretmanager_secret"
```

✅ **Use different keys per environment**
```
Development:  KEY_DEV_xxx
Staging:      KEY_STAGING_xxx
Production:   KEY_PROD_xxx
```

✅ **Backup keys securely**
```bash
# Encrypted backup
gpg -c encryption-keys-backup.txt
```

✅ **Document key changes**
```
2025-01-15: Rotated production key (scheduled)
2025-02-20: Emergency rotation (suspected leak)
```

### DON'T:

❌ **Commit keys to git**
```bash
# Add to .gitignore
.env
.env.local
.env.production
*.key
secrets.txt
```

❌ **Share keys via email/Slack**
```
Use secret sharing tools:
- 1Password
- LastPass
- Bitwarden
```

❌ **Use weak keys**
```bash
# BAD
KEY_FOR_ENCRYPTION=password123

# GOOD
KEY_FOR_ENCRYPTION=$(openssl rand -base64 32)
```

❌ **Hardcode keys in code**
```javascript
// BAD
const key = 'my-secret-key';

// GOOD
const key = process.env.KEY_FOR_ENCRYPTION;
```

❌ **Reuse keys across environments**
```
Each environment needs its own key!
```

---

## 🚨 Emergency Key Rotation

If you suspect a key has been compromised:

### Immediate Actions (< 1 hour)

1. **Revoke all user sessions:**
```javascript
// Revoke all Firebase tokens
const users = await admin.auth().listUsers();
for (const user of users.users) {
  await admin.auth().revokeRefreshTokens(user.uid);
}
```

2. **Generate and deploy new key:**
```bash
# Generate new key immediately
NEW_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")

# Update Secret Manager (immediate)
echo -n "$NEW_KEY" | gcloud secrets versions add syshub-2fa-encryption-key --data-file=-

# Restart application
kubectl rollout restart deployment syshub-api
```

3. **Re-encrypt all data:**
```bash
# Run migration with priority
node scripts/rotate-encryption-key.js --secret-manager
```

4. **Notify users:**
```javascript
// Send notification via Firebase
admin.messaging().sendMulticast({
  tokens: userTokens,
  notification: {
    title: 'Security Update',
    body: 'Please verify your 2FA setup still works.'
  }
});
```

### Post-Incident (< 24 hours)

```bash
✅ Incident report completed
✅ Root cause identified
✅ Access logs audited
✅ Security measures improved
✅ Team trained on new procedures
```

---

## 📊 Monitoring & Auditing

### Cloudwatch/Stackdriver Metrics

```javascript
// Log key usage
console.log({
  event: 'encryption_key_accessed',
  timestamp: new Date().toISOString(),
  userId: req.user,
  action: 'decrypt_2fa_secret'
});
```

### Secret Manager Audit Logs

```bash
# View access logs
gcloud logging read "resource.type=secretmanager_secret AND resource.labels.secret_id=syshub-2fa-encryption-key" --limit 100
```

### Alert on Suspicious Activity

```javascript
// Alert if key accessed from unexpected IP
if (!allowedIPs.includes(requestIP)) {
  sendAlert({
    severity: 'CRITICAL',
    message: `Encryption key accessed from unauthorized IP: ${requestIP}`
  });
}
```

---

## 🧪 Testing

### Test Key Generation

```bash
# Test script
node scripts/test-encryption.js

# Should output:
# ✅ ALL TESTS PASSED!
```

### Test Rotation (Dry-Run)

```bash
# Preview rotation without changes
node scripts/rotate-encryption-key.js --dry-run
```

### Test Decryption After Rotation

```javascript
// test/encryption-rotation.test.js
test('Old encrypted data works with new key after rotation', async () => {
  const oldKey = 'old-key-here';
  const newKey = 'new-key-here';

  const encrypted = encryptAes('test-data', oldKey);
  const reencrypted = reEncrypt(encrypted, oldKey, newKey);
  const decrypted = decryptAes(reencrypted, newKey);

  expect(decrypted).toBe('test-data');
});
```

---

## 📚 Compliance

### PCI DSS Requirements

- ✅ Rotate keys every 90 days
- ✅ Use keys at least 256 bits
- ✅ Restrict key access to authorized personnel
- ✅ Audit all key access
- ✅ Encrypt keys at rest

### GDPR Requirements

- ✅ Document key management procedures
- ✅ Implement access controls
- ✅ Audit trail of key changes
- ✅ Ability to delete user data (including encrypted)

### SOC 2 Requirements

- ✅ Formal key management policy
- ✅ Regular key rotation schedule
- ✅ Change management process
- ✅ Incident response plan
- ✅ Audit logs

---

## 🆘 Troubleshooting

### "Decryption failed" after rotation

**Cause:** Old key still in use

**Solution:**
```bash
# Verify new key loaded
echo $KEY_FOR_ENCRYPTION

# Restart application
pm2 restart syshub-api

# Check logs
tail -f logs/app.log
```

### Users can't verify 2FA

**Cause:** Encryption key mismatch

**Solution:**
```bash
# Verify key in Secret Manager matches
gcloud secrets versions access latest --secret=syshub-2fa-encryption-key

# Check user's encrypted data format
node scripts/check-user-encryption.js USER_ID
```

### Rotation script fails

**Cause:** Database permission issue

**Solution:**
```bash
# Verify Firebase credentials
cat .firebase-service-account.json

# Check Firestore permissions
gcloud projects get-iam-policy PROJECT_ID
```

---

## 📞 Support

For key management issues:

1. Check logs: `logs/app.log`
2. Test encryption: `node scripts/test-encryption.js`
3. Review rotation log: `scripts/rotation-log-*.json`
4. Verify key in Secret Manager
5. Create incident ticket with details

---

## 📖 References

- [OWASP Key Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Key_Management_Cheat_Sheet.html)
- [NIST SP 800-57 Key Management](https://csrc.nist.gov/publications/detail/sp/800-57-part-1/rev-5/final)
- [Google Cloud Secret Manager Docs](https://cloud.google.com/secret-manager/docs)
- [Node.js Crypto Documentation](https://nodejs.org/api/crypto.html)

---

**Last Updated:** 2025-11-22
**Version:** 1.0
**Owner:** Security Team
