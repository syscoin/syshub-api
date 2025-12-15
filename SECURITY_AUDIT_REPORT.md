# Software Security Audit Report
## SysHub API - Syscoin Governance Platform

**Audit Date:** 2025-11-22
**Auditor:** Software Auditor (AI Agent)
**Codebase:** osiastedian/syshub-api
**Branch:** claude/software-audit-report-01EAd4AeUycbJL5XnwSfCyFi
**Production URL:** https://syshub-staging.syscoin.org
**Infrastructure:** Cloudflare Proxy (Rate Limiting & CORS handled at edge)

---

## 🚨 Production Status

**This application is LIVE in production.** All critical and high severity issues should be addressed immediately to protect user data and system integrity.

**Infrastructure Security:**
- ✅ **Cloudflare Proxy:** Rate limiting and CORS policies are enforced at the edge
- ✅ **HTTPS:** Served over TLS via Cloudflare
- ⚠️ **Application-level protections:** Still require implementation (see below)

---

## Executive Summary

This audit identifies **22 security vulnerabilities and code quality issues** across the SysHub API codebase. The application is a Node.js/Express REST API for managing Syscoin blockchain governance proposals, masternodes, and user authentication.

**Risk Level Distribution (Adjusted for Infrastructure):**
- 🔴 **CRITICAL:** 1 issue (Weak 2FA Encryption) - ✅ RESOLVED (2025-12-15)
- 🟠 **HIGH:** 6 issues - ✅ **ALL RESOLVED** (2025-12-15)
  - ✅ HIGH-001: Weak JWT Secret (Resolved - superseded by Firebase auth)
  - ✅ HIGH-002: Hardcoded Dashboard Credentials (Resolved - migrated to Firebase)
  - ✅ HIGH-003: Missing Input Validation (Resolved - Joi validation implemented)
  - ✅ HIGH-004: Insecure Password Comparison (Resolved - superseded by HIGH-002)
  - ✅ HIGH-005: Error Message Leaks (Resolved - secure error handler)
  - ✅ HIGH-006: Missing Token Cleanup (Resolved - TTL & cleanup script)
- 🟡 **MEDIUM:** 9 issues (Logging, Promise Handling, Database Cleanup)
- 🟢 **LOW:** 4 issues (API Versioning, Code Quality)
- ℹ️  **INFRASTRUCTURE-HANDLED:** 2 issues (Rate Limiting, CORS - managed by Cloudflare)

**Progress Update (2025-12-15):** ✅ **All CRITICAL and HIGH severity issues RESOLVED** in branch `claude/fix-security-audit-issues-zir8Q`.

---

## Table of Contents

1. [Infrastructure-Handled Issues](#infrastructure-handled-issues)
2. [Critical Severity Issues](#critical-severity-issues)
3. [High Severity Issues](#high-severity-issues)
4. [Medium Severity Issues](#medium-severity-issues)
5. [Low Severity Issues](#low-severity-issues)
6. [Dependency Vulnerabilities](#dependency-vulnerabilities)
7. [Cloudflare Configuration Recommendations](#cloudflare-configuration-recommendations)
8. [Positive Security Practices](#positive-security-practices)
9. [Recommendations Summary](#recommendations-summary)

---

## Infrastructure-Handled Issues

### ℹ️ INFO-001: Rate Limiting (Handled by Cloudflare)

**Location:** `app.js:1-59`
**Severity:** INFO (Mitigated at infrastructure level)
**Status:** ✅ **PROTECTED** by Cloudflare

**Finding:**
Application code has no rate limiting middleware, but this is handled by Cloudflare proxy.

**Cloudflare Protection Provides:**
- Edge-level rate limiting before traffic reaches origin
- DDoS protection
- Bot management
- Challenge pages for suspicious traffic

**Recommendation:**

Verify Cloudflare settings are properly configured:

1. **Check Rate Limiting Rules:**
   - Log into Cloudflare Dashboard
   - Navigate to Security > WAF > Rate limiting rules
   - Verify rules for:
     - Global API rate: 100 req/15min per IP
     - Auth endpoints: 5 req/15min per IP for `/user/verify-gauth-code`, `/auth/*`
     - Proposal submission: 10 req/hour per user

2. **Optional: Add application-level limiting** for defense-in-depth:
```javascript
// Only needed if Cloudflare is bypassed or for localhost testing
if (process.env.NODE_ENV !== 'prod') {
  const rateLimit = require('express-rate-limit');
  app.use(rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100
  }));
}
```

**Action Required:** ✅ Verify Cloudflare configuration, document settings

---

### ℹ️ INFO-002: CORS Configuration (Handled by Cloudflare)

**Location:** `app.js:20`
**Severity:** INFO (Partially mitigated at infrastructure level)
**Status:** ⚠️ **NEEDS VERIFICATION**

**Finding:**
Application allows all CORS origins, but Cloudflare can enforce origin policies.

**Evidence:**
```javascript
// app.js:20
app.use(cors()) // Allows ALL origins (*)
```

**Cloudflare Protection:**
- Access Policies can restrict origins
- WAF rules can block unauthorized referrers
- Worker scripts can enforce CORS

**Recommendation:**

**Still implement application-level CORS** for defense-in-depth:

```javascript
// app.js - Even with Cloudflare, restrict at app level
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      'https://syshub-staging.syscoin.org',
      'https://syshub.syscoin.org', // Production
      process.env.PROD_URL,
      process.env.TEST_URL,
      // Only in dev/test:
      ...(process.env.NODE_ENV !== 'prod' ? ['http://localhost:3000', 'http://localhost:4200'] : [])
    ].filter(Boolean);

    if (!origin) return callback(null, true); // Allow same-origin
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
```

**Why both?**
- Cloudflare protects against external attacks
- Application CORS protects if Cloudflare is bypassed (direct origin access)
- Defense-in-depth principle

**Action Required:** ⚠️ Implement application-level CORS + verify Cloudflare Access Policies

**Priority:** MEDIUM - Implement within this week

---

## Critical Severity Issues

### 🔴 CRIT-001: Weak Encryption for 2FA Secrets

**Location:** `utils/encrypt.js:1-16`, `controllers/user.js:402-418`
**Severity:** CRITICAL ⚠️ **PRODUCTION IMPACT**
**CVSS Score:** 8.1 (High)
**Status:** 🔴 **ACTIVE VULNERABILITY** - Affects all users with 2FA enabled

**Issue:**
2FA secrets (Google Authenticator seeds) are encrypted using CryptoJS AES without proper key derivation, salt, or authenticated encryption. The encryption key comes directly from environment variables. **This is currently protecting user accounts in production.**

**Evidence:**
```javascript
// utils/encrypt.js
const encryptAes = (data, key) => {
  const encryptedMessage = CryptoJS.AES.encrypt(data.toString('hex'), key)
  return encryptedMessage.toString()
}

// No salt, no key derivation (PBKDF2/scrypt), no authentication (HMAC/GCM)
```

**Vulnerabilities:**
1. **No Key Derivation:** Raw key from environment variable
2. **No Salt:** Same key produces same ciphertext
3. **No Authentication:** Vulnerable to tampering (no HMAC/GCM)
4. **Library Choice:** CryptoJS is less secure than Node's native crypto

**Impact:**
- If encryption key is compromised, all 2FA secrets are exposed
- Attackers can disable 2FA for all users
- No protection against ciphertext manipulation

**Solution:**

Use Node.js native crypto with proper AES-GCM:

```javascript
// utils/encrypt.js
const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;
const ITERATIONS = 100000; // PBKDF2 iterations

/**
 * Encrypt data using AES-256-GCM with proper key derivation
 */
const encryptAes = (data, masterKey) => {
  // Generate random salt and IV
  const salt = crypto.randomBytes(SALT_LENGTH);
  const iv = crypto.randomBytes(IV_LENGTH);

  // Derive key from master key using PBKDF2
  const key = crypto.pbkdf2Sync(masterKey, salt, ITERATIONS, KEY_LENGTH, 'sha256');

  // Create cipher with AES-256-GCM
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  // Encrypt data
  const encrypted = Buffer.concat([
    cipher.update(data, 'utf8'),
    cipher.final()
  ]);

  // Get authentication tag
  const tag = cipher.getAuthTag();

  // Combine: salt + iv + tag + encrypted data
  const result = Buffer.concat([salt, iv, tag, encrypted]);

  return result.toString('base64');
};

/**
 * Decrypt data using AES-256-GCM
 */
const decryptAes = (encryptedData, masterKey) => {
  const buffer = Buffer.from(encryptedData, 'base64');

  // Extract components
  const salt = buffer.slice(0, SALT_LENGTH);
  const iv = buffer.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const tag = buffer.slice(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
  const encrypted = buffer.slice(SALT_LENGTH + IV_LENGTH + TAG_LENGTH);

  // Derive key
  const key = crypto.pbkdf2Sync(masterKey, salt, ITERATIONS, KEY_LENGTH, 'sha256');

  // Create decipher
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  // Decrypt
  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final()
  ]);

  return decrypted.toString('utf8');
};

module.exports = {
  encryptAes,
  decryptAes,
};
```

**Migration Strategy:**

1. Deploy new encryption functions
2. Create migration script to re-encrypt existing secrets:

```javascript
// scripts/migrate-2fa-encryption.js
const { admin } = require('../utils/config');
const { decryptAes: oldDecrypt } = require('../utils/encrypt.old');
const { encryptAes: newEncrypt } = require('../utils/encrypt');

async function migrate() {
  const users = await admin.firestore()
    .collection(process.env.COLLECTION_NAME_USERS)
    .get();

  for (const doc of users.docs) {
    const data = doc.data();
    if (data.gAuthSecret) {
      try {
        // Decrypt with old method
        const plaintext = oldDecrypt(data.gAuthSecret, process.env.KEY_FOR_ENCRYPTION);
        // Re-encrypt with new method
        const newSecret = newEncrypt(plaintext, process.env.KEY_FOR_ENCRYPTION);
        // Update
        await doc.ref.update({ gAuthSecret: newSecret });
        console.log(`Migrated user: ${doc.id}`);
      } catch (err) {
        console.error(`Failed to migrate user ${doc.id}:`, err.message);
      }
    }
  }
}

migrate().then(() => console.log('Migration complete'));
```

**Additional Security:**

Store encryption key in secure secret manager (not .env):
- Google Cloud Secret Manager
- AWS Secrets Manager
- HashiCorp Vault

**Priority:** IMMEDIATE - Rotate encryption keys and migrate

---

## High Severity Issues

### 🟠 HIGH-001: Weak JWT Secret Derivation

**Status:** ✅ **RESOLVED** (2025-12-15)
**Resolution:** Superseded by HIGH-002 - Now using Firebase ID tokens instead of self-signed JWTs

**Location:** `controllers/auth.js:97-107`
**Severity:** HIGH
**CVSS Score:** 7.5 (High)

**Issue:**
Dashboard JWT tokens are signed using a base64-encoded password as the secret, which is weak and predictable.

**Evidence:**
```javascript
// controllers/auth.js:97-107
jwt.sign(
  { account: process.env.EMAIL_DASHBOARD },
  Buffer.from(process.env.PASSWORD_DASHBOARD).toString('base64'), // WEAK!
  { expiresIn: '7d' },
  (err, token) => {
    if (err) throw err
    return res.status(200).json({ ok: true, token })
  },
)
```

**Impact:**
- Weak secrets can be brute-forced
- Base64 encoding provides no security (it's encoding, not encryption)
- Token forgery possible if password is compromised

**Solution:**

Use a strong, random JWT secret:

```bash
# Generate a secure random secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Add to `.env`:
```bash
JWT_SECRET=<generated-64-byte-hex-string>
```

Update code:
```javascript
// controllers/auth.js
jwt.sign(
  {
    account: process.env.EMAIL_DASHBOARD,
    type: 'dashboard',
    iat: Math.floor(Date.now() / 1000)
  },
  process.env.JWT_SECRET, // Use dedicated JWT secret
  {
    expiresIn: '7d',
    issuer: 'syshub-api',
    audience: 'syshub-dashboard'
  },
  (err, token) => {
    if (err) throw err
    return res.status(200).json({ ok: true, token })
  },
)
```

**Verification:**
```javascript
// Add JWT verification middleware
const verifyJWT = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ ok: false, message: 'No token' });

  jwt.verify(token, process.env.JWT_SECRET, {
    issuer: 'syshub-api',
    audience: 'syshub-dashboard'
  }, (err, decoded) => {
    if (err) return res.status(401).json({ ok: false, message: 'Invalid token' });
    req.user = decoded;
    next();
  });
};
```

**Priority:** HIGH - Replace immediately

---

### 🟠 HIGH-002: Hardcoded Dashboard Credentials

**Status:** ✅ **RESOLVED** (2025-12-15)
**Resolution:** Migrated to Firebase Authentication with admin role verification

**Location:** `controllers/auth.js:86-95`, `.env-example:6-7`
**Severity:** HIGH
**CVSS Score:** 7.2 (High)

**Issue:**
Dashboard authentication uses hardcoded email/password stored in environment variables, checked via simple comparison.

**Evidence:**
```javascript
// controllers/auth.js:86-95
if (
  email !== process.env.EMAIL_DASHBOARD ||
  password !== process.env.PASSWORD_DASHBOARD
) {
  return res.status(406).json({ ok: false, message: 'wrong username or password' })
}
```

**Impact:**
- Single point of failure (one compromised .env = full access)
- No password hashing
- No account lockout mechanism
- No audit trail for admin access

**Solution:**

Replace with Firebase Authentication for admin users:

```javascript
// controllers/auth.js
const { signInWithEmailAndPassword, getAuth } = require('firebase/auth');

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ ok: false, message: 'Required fields' });
    }

    // Use Firebase auth instead of env variables
    const userCredential = await signInWithEmailAndPassword(
      getAuth(firebaseApp),
      email,
      password
    );

    // Check if user has admin role
    const roleDoc = await admin.firestore()
      .collection(process.env.COLLECTION_NAME_ROLE)
      .doc(userCredential.user.uid)
      .get();

    const roles = roleDoc.data()?.role || [];
    if (!roles.includes(process.env.ROLE_ADMIN)) {
      return res.status(403).json({ ok: false, message: 'Access denied' });
    }

    // Get Firebase ID token (already secure)
    const idToken = await userCredential.user.getIdToken();

    return res.status(200).json({ ok: true, token: idToken });

  } catch (err) {
    if (err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
      return res.status(401).json({ ok: false, message: 'Invalid credentials' });
    }
    if (err.code === 'auth/too-many-requests') {
      return res.status(429).json({ ok: false, message: 'Too many failed attempts' });
    }
    next(err);
  }
};
```

**Remove from .env:**
```bash
# Remove these:
# EMAIL_DASHBOARD=
# PASSWORD_DASHBOARD=
```

**Priority:** HIGH - Migrate to Firebase auth

---

### 🟠 HIGH-003: Missing Input Validation - NoSQL Injection Risk

**Status:** ✅ **RESOLVED** (2025-12-15)
**Resolution:** Implemented Joi validation middleware across all critical endpoints

**Location:** Multiple controllers
**Severity:** HIGH
**CVSS Score:** 7.3 (High)

**Issue:**
User inputs are used directly in Firestore queries without proper validation or sanitization.

**Evidence:**
```javascript
// controllers/user.js:367-374 - Password from user input used directly
const { data } = req.body;
if (!data || !data.pwd) {
  return res.status(406).json({ ok: false, message: 'required fields' })
}
await signInWithEmailAndPassword(
  getAuth(firebaseApp),
  authUser.email,
  data.pwd // User input used directly
)
```

```javascript
// controllers/proposal.js:729 - User input in query
const { hash } = req.query;
documents = await admin.firestore()
  .collection(process.env.COLLECTION_PROPOSAL_HIDDEN)
  .where('hash', '>=', hash) // Potential injection
  .where('hash', '<=', `${hash}\uf8ff`)
```

**Impact:**
- NoSQL injection attacks possible
- Data exfiltration
- Bypass authentication/authorization
- Query manipulation

**Solution:**

Install validation library:
```bash
npm install joi
```

Create validation schemas:
```javascript
// utils/validators.js
const Joi = require('joi');

const schemas = {
  // User actions validation
  updateUserActions: Joi.object({
    pwd: Joi.string().min(8).max(128).required(),
    twoFa: Joi.boolean().optional(),
    sms: Joi.boolean().optional(),
    gAuth: Joi.boolean().optional(),
    gAuthSecret: Joi.string().alphanum().optional(),
    code: Joi.string().length(6).pattern(/^\d+$/).optional()
  }),

  // Proposal validation
  proposal: Joi.object({
    type: Joi.number().integer().valid(0, 1).required(),
    name: Joi.string().min(1).max(40).pattern(/^[a-zA-Z0-9_-]+$/).required(),
    title: Joi.string().min(1).max(100).required(),
    description: Joi.string().max(512).optional(),
    nPayment: Joi.number().integer().min(1).max(100).required(),
    firstEpoch: Joi.number().integer().min(0).required(),
    startEpoch: Joi.number().integer().min(0).required(),
    endEpoch: Joi.number().integer().min(0).required(),
    paymentAddress: Joi.string().min(26).max(62).required(),
    paymentAmount: Joi.number().positive().required(),
    url: Joi.string().uri().max(200).optional()
  }),

  // Hash validation
  hash: Joi.object({
    hash: Joi.string().length(64).hex().required()
  }),

  // Pagination validation
  pagination: Joi.object({
    page: Joi.number().integer().min(0).max(10000).optional(),
    email: Joi.string().email().optional()
  })
};

const validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errors = error.details.map(d => d.message);
      return res.status(400).json({
        ok: false,
        message: 'Validation failed',
        errors
      });
    }

    req.body = value; // Use validated/sanitized data
    next();
  };
};

module.exports = { schemas, validate };
```

Apply validation:
```javascript
// controllers/user.js
const { schemas, validate } = require('../utils/validators');

router.put(
  '/actions/:id',
  firebaseAuth,
  validate(schemas.updateUserActions),
  updateActionsUser
);
```

**Priority:** HIGH - Implement immediately

---

### 🟠 HIGH-004: Insecure Password Comparison (Timing Attack)

**Location:** `controllers/auth.js:89-91`
**Severity:** HIGH
**CVSS Score:** 5.9 (Medium)

**Issue:**
Password comparison uses non-constant-time comparison (`!==`), vulnerable to timing attacks.

**Evidence:**
```javascript
// controllers/auth.js:89-91
if (
  email !== process.env.EMAIL_DASHBOARD ||
  password !== process.env.PASSWORD_DASHBOARD
) {
```

**Impact:**
- Attackers can use timing differences to determine correct password characters
- Enables password brute-forcing

**Solution:**

Use constant-time comparison:

```javascript
const crypto = require('crypto');

/**
 * Constant-time string comparison
 */
const safeCompare = (a, b) => {
  if (typeof a !== 'string' || typeof b !== 'string') {
    return false;
  }

  const bufferA = Buffer.from(a, 'utf8');
  const bufferB = Buffer.from(b, 'utf8');

  // Use crypto.timingSafeEqual (constant-time)
  if (bufferA.length !== bufferB.length) {
    return false;
  }

  return crypto.timingSafeEqual(bufferA, bufferB);
};

// Usage
if (
  !safeCompare(email, process.env.EMAIL_DASHBOARD) ||
  !safeCompare(password, process.env.PASSWORD_DASHBOARD)
) {
  return res.status(401).json({ ok: false, message: 'Invalid credentials' });
}
```

**Better Solution:**

Use Firebase Authentication (see HIGH-002) which handles this properly.

**Priority:** HIGH - Fix immediately

---

### 🟠 HIGH-005: Error Messages Leak Implementation Details

**Status:** ✅ **RESOLVED** (2025-12-15)
**Resolution:** Implemented secure error handler that sanitizes errors in production

**Location:** Multiple files
**Severity:** HIGH
**CVSS Score:** 5.3 (Medium)

**Issue:**
Error messages expose sensitive information about the system internals, database structure, and authentication mechanisms.

**Evidence:**
```javascript
// controllers/user.js:149-152
if (req.user !== id) {
  return res.status(403).json({
    ok: false,
    message: 'you do not have permissions to perform this action', // Good
  })
}

// controllers/proposal.js:101-108 - BAD: Exposes internal error
if (
  err.message ===
  'Invalid proposal data, error messages:data exceeds 512 characters;JSON parsing error;'
) {
  return res.status(400).json({
    ok: false,
    message: 'Invalid Proposal', // Should not expose RPC error
  })
}

// app.js:43 - VERY BAD: Exposes stack traces
app.use((err, req, res, next) => {
  if (res.headersSent) {
    return next(err)
  }
  return res.status(500).json({ ok: false, error: err.message }) // Leaks error details
})
```

**Impact:**
- Information disclosure aids attackers
- Reveals system architecture
- Exposes database structure
- Shows third-party service errors

**Solution:**

Create secure error handler:

```javascript
// utils/errorHandler.js
const logger = require('./logger'); // Implement logging

class AppError extends Error {
  constructor(message, statusCode, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

const errorHandler = (err, req, res, next) => {
  // Log full error details (for admins)
  logger.error({
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    user: req.user || 'anonymous'
  });

  // Default to 500 server error
  let statusCode = err.statusCode || 500;
  let message = err.message;

  // Sanitize errors for production
  if (process.env.NODE_ENV === 'prod') {
    // Don't expose internal errors to clients
    if (!err.isOperational || statusCode >= 500) {
      message = 'An internal error occurred';
    }
  }

  // Send sanitized error to client
  res.status(statusCode).json({
    ok: false,
    message,
    ...(process.env.NODE_ENV !== 'prod' && { stack: err.stack })
  });
};

module.exports = { AppError, errorHandler };
```

Update app.js:
```javascript
// app.js
const { errorHandler } = require('./utils/errorHandler');

// Replace existing error handler
app.use(errorHandler);
```

Use in controllers:
```javascript
// controllers/proposal.js
const { AppError } = require('../utils/errorHandler');

try {
  // ... code
} catch (err) {
  // Don't expose RPC errors
  if (err.message.includes('Invalid proposal data')) {
    throw new AppError('Invalid proposal format', 400);
  }
  throw err; // Re-throw for error handler
}
```

**Priority:** HIGH - Implement before production

---

### 🟠 HIGH-006: Missing Token Collection (COLLECTION_NAME_TOKENS) Cleanup

**Status:** ✅ **RESOLVED** (2025-12-15)
**Resolution:** Implemented TTL-based token expiration and automated cleanup script

**Location:** `middlewares/fbAuth.js:36-44`, `controllers/user.js:608-611`
**Severity:** HIGH
**CVSS Score:** 4.3 (Medium)

**Issue:**
Revoked tokens are stored indefinitely in Firestore without cleanup, leading to:
- Database bloat
- Increased query costs
- Performance degradation

**Evidence:**
```javascript
// controllers/user.js:608-611 - Tokens added but never removed
await admin
  .firestore()
  .collection(process.env.COLLECTION_NAME_TOKENS)
  .add({ token }) // No expiration or TTL

// middlewares/fbAuth.js:36-44 - Queries all tokens
const tokenExpired = await admin
  .firestore()
  .collection(process.env.COLLECTION_NAME_TOKENS)
  .where('token', '==', `${tokenSearch}`)
  .get() // Gets slower as collection grows
```

**Impact:**
- Firestore costs increase over time
- Query performance degrades
- Database storage grows unbounded

**Solution:**

Add TTL (Time-To-Live) to token documents:

```javascript
// controllers/user.js - Add expiration when revoking
const signOut = async (req, res, next) => {
  const { token } = req.body;

  if (req.user !== req.params.id) {
    return res.status(403).json({
      ok: false,
      message: 'you do not have permissions to perform this action',
    });
  }

  try {
    // Add token with expiration timestamp
    await admin.firestore()
      .collection(process.env.COLLECTION_NAME_TOKENS)
      .add({
        token,
        revokedAt: admin.firestore.FieldValue.serverTimestamp(),
        expiresAt: admin.firestore.Timestamp.fromMillis(
          Date.now() + (7 * 24 * 60 * 60 * 1000) // 7 days from now
        )
      });

    await admin.auth().revokeRefreshTokens(req.params.id);

    res.status(200).json({ ok: true });
  } catch (err) {
    next(err);
  }
};
```

Create cleanup Cloud Function:

```javascript
// functions/cleanup-revoked-tokens.js
const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Run daily at midnight
exports.cleanupRevokedTokens = functions.pubsub
  .schedule('0 0 * * *')
  .timeZone('UTC')
  .onRun(async (context) => {
    const now = admin.firestore.Timestamp.now();
    const batch = admin.firestore().batch();

    const expiredTokens = await admin.firestore()
      .collection(process.env.COLLECTION_NAME_TOKENS)
      .where('expiresAt', '<', now)
      .limit(500) // Batch size
      .get();

    expiredTokens.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();
    console.log(`Deleted ${expiredTokens.size} expired tokens`);

    return null;
  });
```

**Alternative:** Use Firestore TTL (if available in your region):

```javascript
// Enable TTL on collection
// In Firebase Console or via Firebase CLI
// Not all regions support TTL yet
```

**Priority:** HIGH - Prevent database bloat

---

## Medium Severity Issues

### 🟡 MED-001: Missing HTTPS Enforcement

**Location:** `app.js:24-25`
**Severity:** MEDIUM
**CVSS Score:** 5.9 (Medium)

**Issue:**
HTTPS enforcement is commented out, allowing insecure HTTP connections in production.

**Evidence:**
```javascript
// app.js:24-25
/** If you are in development environment comment this line * */
// app.use(forceSsl);
```

**Impact:**
- Man-in-the-middle (MITM) attacks
- Credential interception
- Session hijacking
- Data tampering

**Solution:**

Enable HTTPS enforcement for production:

```javascript
// app.js
const forceSsl = require('express-force-ssl');

if (process.env.NODE_ENV === 'prod') {
  app.use(forceSsl);

  // Add HSTS header
  app.use((req, res, next) => {
    res.setHeader(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    );
    next();
  });
}
```

Update Helmet configuration:
```javascript
app.use(helmet({
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));
```

**Priority:** MEDIUM - Enable before production deployment

---

### 🟡 MED-002: No Request Body Size Limits

**Location:** `app.js:13-14`
**Severity:** MEDIUM
**CVSS Score:** 5.3 (Medium)

**Issue:**
Body parser has no size limits, enabling payload-based DoS attacks.

**Evidence:**
```javascript
// app.js:13-14
app.use(bodyParser.json()) // No size limit
app.use(bodyParser.urlencoded({ extended: false })) // No size limit
```

**Impact:**
- Memory exhaustion attacks
- Server crashes
- Resource starvation

**Solution:**

Add size limits:

```javascript
// app.js
app.use(bodyParser.json({
  limit: '10kb', // Most API requests are small
  strict: true
}));

app.use(bodyParser.urlencoded({
  extended: false,
  limit: '10kb'
}));

// For file uploads (if needed), use separate route with higher limit
const uploadLimiter = bodyParser.json({ limit: '5mb' });
app.post('/upload-endpoint', uploadLimiter, uploadHandler);
```

**Priority:** MEDIUM - Implement soon

---

### 🟡 MED-003: Firebase Service Account in Repository

**Location:** `utils/config.js:7`, `.gitignore` (possibly missing)
**Severity:** MEDIUM
**CVSS Score:** 7.5 (High if exposed)

**Issue:**
Service account JSON is loaded from file, risk of accidental commit.

**Evidence:**
```javascript
// utils/config.js:7
const serviceAccount = require('../.firebase-service-account.json')
```

**Impact:**
- If committed, full database access exposed
- Complete Firebase project compromise
- User data breach

**Solution:**

Check .gitignore:
```bash
# Ensure these are in .gitignore
.firebase-service-account.json
.env
.env.*
!.env-example
```

**Better Approach - Use Environment Variables:**

```javascript
// utils/config.js
let adminCredential;

if (process.env.NODE_ENV === 'prod') {
  // Production: Use environment variable
  adminCredential = admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
  });
} else {
  // Development: Use service account file
  const serviceAccount = require('../.firebase-service-account.json');
  adminCredential = admin.credential.cert(serviceAccount);
}

admin.initializeApp({
  credential: adminCredential,
});
```

Add to production .env:
```bash
FIREBASE_CLIENT_EMAIL=service-account@project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

**Priority:** MEDIUM - Verify .gitignore immediately

---

### 🟡 MED-004: Insufficient Password Validation

**Location:** `controllers/user.js:367-380`
**Severity:** MEDIUM
**CVSS Score:** 4.3 (Medium)

**Issue:**
Password validation relies only on Firebase, no client-side checks for strength.

**Evidence:**
```javascript
// controllers/user.js:367-380
if (!data || !data.pwd) {
  return res.status(406).json({ ok: false, message: 'required fields' })
}
// No password strength validation
await signInWithEmailAndPassword(
  getAuth(firebaseApp),
  authUser.email,
  data.pwd
)
```

**Impact:**
- Weak passwords accepted
- Easier brute force attacks
- Poor security posture

**Solution:**

Add password validation:

```bash
npm install validator
```

```javascript
// utils/validators.js
const validator = require('validator');

const validatePassword = (password) => {
  const errors = [];

  if (!password || password.length < 8) {
    errors.push('Password must be at least 8 characters');
  }

  if (password.length > 128) {
    errors.push('Password must be less than 128 characters');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  // Check against common passwords
  const commonPasswords = ['password', '12345678', 'qwerty', 'admin123'];
  if (commonPasswords.includes(password.toLowerCase())) {
    errors.push('Password is too common');
  }

  return {
    valid: errors.length === 0,
    errors
  };
};

module.exports = { validatePassword };
```

Use in controller:
```javascript
const { validatePassword } = require('../utils/validators');

// In updateActionsUser
const passwordCheck = validatePassword(data.pwd);
if (!passwordCheck.valid) {
  return res.status(400).json({
    ok: false,
    message: 'Password validation failed',
    errors: passwordCheck.errors
  });
}
```

**Priority:** MEDIUM - Implement for better security

---

### 🟡 MED-005: Missing Security Headers

**Location:** `app.js:21`
**Severity:** MEDIUM
**CVSS Score:** 4.3 (Medium)

**Issue:**
Helmet is used but not fully configured with all security headers.

**Evidence:**
```javascript
// app.js:21
app.use(helmet()) // Default config only
```

**Impact:**
- Missing protection against common web vulnerabilities
- No protection against clickjacking
- Missing referrer policy
- No permission policy

**Solution:**

Configure Helmet with all security headers:

```javascript
// app.js
app.use(helmet({
  // Content Security Policy
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },

  // Prevent clickjacking
  frameguard: {
    action: 'deny'
  },

  // HSTS
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },

  // Prevent MIME sniffing
  noSniff: true,

  // Referrer Policy
  referrerPolicy: {
    policy: 'strict-origin-when-cross-origin'
  },

  // X-XSS-Protection
  xssFilter: true,

  // Hide X-Powered-By
  hidePoweredBy: true,
}));

// Additional security headers
app.use((req, res, next) => {
  // Permissions Policy
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

  // Prevent caching of sensitive data
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  next();
});
```

**Priority:** MEDIUM - Implement for defense in depth

---

### 🟡 MED-006: No Logging for Security Events

**Location:** All controllers
**Severity:** MEDIUM
**CVSS Score:** 4.3 (Medium)

**Issue:**
No audit logging for critical security events (authentication, authorization failures, data access).

**Evidence:**
```javascript
// No logging for:
// - Failed login attempts
// - Unauthorized access attempts
// - 2FA failures
// - Admin actions
// - Data modifications
```

**Impact:**
- No forensic evidence after security incidents
- Cannot detect attack patterns
- Compliance violations (GDPR, SOC2)
- No intrusion detection

**Solution:**

Implement structured logging:

```bash
npm install winston
```

```javascript
// utils/logger.js
const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'syshub-api' },
  transports: [
    // Write all logs to console
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),

    // Write error logs to file
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error'
    }),

    // Write all logs to combined file
    new winston.transports.File({
      filename: 'logs/combined.log'
    }),
  ],
});

// Security event logger
const logSecurityEvent = (event, details) => {
  logger.warn('SECURITY_EVENT', {
    event,
    ...details,
    timestamp: new Date().toISOString()
  });
};

module.exports = { logger, logSecurityEvent };
```

Use in controllers:
```javascript
// controllers/user.js
const { logSecurityEvent } = require('../utils/logger');

// Log failed authentication
if (!safeCompare(email, process.env.EMAIL_DASHBOARD)) {
  logSecurityEvent('FAILED_LOGIN', {
    email,
    ip: req.ip,
    userAgent: req.get('user-agent')
  });
  return res.status(401).json({ ok: false, message: 'Invalid credentials' });
}

// Log 2FA failures
if (!verifycode) {
  logSecurityEvent('2FA_VERIFICATION_FAILED', {
    userId: req.user,
    ip: req.ip
  });
  return res.status(400).json({
    ok: false,
    message: 'Google Authenticator code invalid',
  });
}

// Log admin actions
logSecurityEvent('PROPOSAL_HIDDEN', {
  userId: req.user,
  proposalHash: hash,
  action: 'create_hidden_proposal'
});
```

**Priority:** MEDIUM - Implement for compliance and security

---

### 🟡 MED-007: Proposal Data Size Not Validated Before RPC Call

**Location:** `controllers/proposal.js:88-95`
**Severity:** MEDIUM
**CVSS Score:** 4.3 (Medium)

**Issue:**
Proposal data converted to hex and sent to RPC without validating size limits beforehand.

**Evidence:**
```javascript
// controllers/proposal.js:88-95
const hexProposal = strToHex(objectProposal[0][1])

const verifyHex = await clientRPC
  .callRpc('gobject_check', [hexProposal])
  .call() // Only validates AFTER RPC call
```

**Impact:**
- Wasted RPC calls for oversized data
- Poor user experience (slow failure)
- Potential RPC abuse

**Solution:**

Validate before RPC call:

```javascript
// controllers/proposal.js
const check = async (req, res, next) => {
  try {
    const { description, ...otherFields } = req.body;

    // Validate description size BEFORE hex conversion
    if (description && description.length > 512) {
      return res.status(400).json({
        ok: false,
        message: 'Description exceeds 512 characters'
      });
    }

    const objectProposal = [
      ['proposal', { ...otherFields, description }]
    ];

    const hexProposal = strToHex(objectProposal[0][1]);

    // Additional hex size check
    if (hexProposal.length > 2048) { // Adjust based on actual limit
      return res.status(400).json({
        ok: false,
        message: 'Proposal data too large'
      });
    }

    const verifyHex = await clientRPC
      .callRpc('gobject_check', [hexProposal])
      .call();

    // ... rest of code
  } catch (err) {
    next(err);
  }
};
```

**Priority:** MEDIUM - Improve UX and prevent abuse

---

### 🟡 MED-008: Unhandled Promise Rejections in Async Map

**Location:** `controllers/proposal.js:774, 805`, `controllers/user.js:77`
**Severity:** MEDIUM
**CVSS Score:** 4.3 (Medium)

**Issue:**
Async operations inside `.map()` callbacks are not properly awaited, leading to unhandled promise rejections.

**Evidence:**
```javascript
// controllers/proposal.js:805
proposalHash.map(async (e) => { // async in map - NOT awaited
  const exist = Object.keys(gobjectData).find((elem) => elem === e.hash)
  if (typeof exist === 'undefined') {
    const i = proposalHash.indexOf(e)
    proposalHash.splice(i, 1)
    await admin.firestore()
      .collection(process.env.COLLECTION_PROPOSAL_HIDDEN)
      .doc(e.uid)
      .delete() // This promise is not caught
  }
})

// controllers/user.js:77
userRecordAuth.users.map(async (doc) => { // async in map
  userRoleRecord.docs.find((el) => {
    // ... async operations not awaited
  })
})
```

**Impact:**
- Silent failures
- Inconsistent data
- Memory leaks
- Unhandled rejections crash Node.js

**Solution:**

Use `Promise.all()` with proper error handling:

```javascript
// controllers/proposal.js:805
// BEFORE:
proposalHash.map(async (e) => { ... })

// AFTER:
await Promise.all(
  proposalHash.map(async (e) => {
    const exist = Object.keys(gobjectData).find((elem) => elem === e.hash);
    if (typeof exist === 'undefined') {
      const i = proposalHash.indexOf(e);
      proposalHash.splice(i, 1);

      try {
        await admin.firestore()
          .collection(process.env.COLLECTION_PROPOSAL_HIDDEN)
          .doc(e.uid)
          .delete();
      } catch (err) {
        logger.error('Failed to delete hidden proposal:', err);
        // Don't fail entire operation
      }
    }
  })
);

// controllers/user.js:77 - Better approach
await Promise.all(
  userRecordAuth.users.map(async (doc) => {
    const roleDoc = userRoleRecord.docs.find((el) => el.id === doc.uid);
    if (roleDoc) {
      const { role } = roleDoc.data();
      userRecordResponse.push({
        uid: doc.uid,
        email: doc.email,
        name: doc.displayName || 'there is no associated display name for this user',
        role,
      });
    }
  })
);
```

**Priority:** MEDIUM - Fix to prevent crashes

---

### 🟡 MED-009: Race Condition in Proposal Update

**Location:** `controllers/proposal.js:1035-1061`
**Severity:** MEDIUM
**CVSS Score:** 4.3 (Medium)

**Issue:**
Proposal update with retry logic has race condition - database is updated before RPC verification completes.

**Evidence:**
```javascript
// controllers/proposal.js:1024-1071
// If hash is present and complete is true, call gobject_get with retry logic
if (data.hash && data.complete === true) {
  // ... retry logic ...

  // RPC call succeeds
}

// Database updated AFTER validation
await admin.firestore()
  .doc(`${process.env.COLLECTION_NAME_PROPOSAL}/${id}`)
  .update(newData) // What if RPC check failed?
```

**Impact:**
- Database inconsistency
- Invalid proposals marked complete
- Data corruption

**Solution:**

Update database only after validation:

```javascript
const updateProposal = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { data } = req.body;

    // ... validation ...

    // If hash is present and complete is true, verify FIRST
    if (data.hash && data.complete === true) {
      const { hash } = data;
      const maxRetryCount = typeof data.maxRetryCount === 'number' ? data.maxRetryCount : 30;
      let rpcSuccess = false;

      // RPC verification with retry
      for (let attempt = 0; attempt < maxRetryCount && !rpcSuccess; attempt++) {
        try {
          const rpcResult = await clientRPC.callRpc('gobject_get', [hash]).call();
          console.log({ gObjectResult: rpcResult });
          rpcSuccess = true;
        } catch (rpcErr) {
          if (attempt >= maxRetryCount - 1) {
            return res.status(500).json({
              ok: false,
              message: `Failed to verify proposal hash after ${maxRetryCount} attempts`,
            });
          }
          await new Promise((resolve) => setTimeout(resolve, 10_000));
        }
      }

      // Only update if RPC verification succeeded
      if (!rpcSuccess) {
        return res.status(500).json({
          ok: false,
          message: 'Proposal verification failed',
        });
      }
    }

    // NOW update database (only if validation passed)
    await admin.firestore()
      .doc(`${process.env.COLLECTION_NAME_PROPOSAL}/${id}`)
      .update(newData);

    // ... rest of code
  } catch (err) {
    next(err);
  }
};
```

**Priority:** MEDIUM - Fix data consistency issue

---

## Low Severity Issues

### 🟢 LOW-001: No API Versioning

**Location:** `routes/index.js`
**Severity:** LOW
**CVSS Score:** 2.0 (Informational)

**Issue:**
API has no versioning strategy, making breaking changes difficult.

**Impact:**
- Breaking changes break all clients
- No migration path
- Poor maintainability

**Solution:**

Add API versioning:

```javascript
// routes/index.js
const express = require('express');
const app = express();

// API v1 routes
const v1Router = express.Router();
v1Router.use('/user', require('./v1/user'));
v1Router.use('/admin', require('./v1/admin'));
v1Router.use('/proposal', require('./v1/proposal'));
// ... etc

app.use('/api/v1', v1Router);

// Future: API v2 with breaking changes
// const v2Router = express.Router();
// app.use('/api/v2', v2Router);

// Legacy routes (redirect to v1)
app.use('/user', (req, res) => res.redirect(308, `/api/v1${req.originalUrl}`));
// ... etc

module.exports = app;
```

**Priority:** LOW - Implement when planning v2

---

### 🟢 LOW-002: Inconsistent Error Status Codes

**Location:** Multiple controllers
**Severity:** LOW
**CVSS Score:** 2.0 (Informational)

**Issue:**
Error status codes used inconsistently across endpoints.

**Evidence:**
```javascript
// 406 used for validation errors (should be 400)
return res.status(406).json({ ok: false, message: 'required fields' })

// 204 used for "not found" (should be 404)
return res.status(204).json({ ok: false, message: 'not content' })

// 403 and 401 used interchangeably
```

**Solution:**

Standardize status codes:

```javascript
// Use proper HTTP status codes:
// 200 - OK
// 201 - Created
// 204 - No Content (no response body)
// 400 - Bad Request (validation errors)
// 401 - Unauthorized (not authenticated)
// 403 - Forbidden (authenticated but no permission)
// 404 - Not Found
// 409 - Conflict (duplicate resource)
// 422 - Unprocessable Entity (semantic errors)
// 429 - Too Many Requests (rate limit)
// 500 - Internal Server Error
// 503 - Service Unavailable

// Example fixes:
// Validation errors: 400 (not 406)
if (!data) {
  return res.status(400).json({ ok: false, message: 'Required fields' });
}

// Not found: 404 (not 204)
if (!proposal) {
  return res.status(404).json({ ok: false, message: 'Proposal not found' });
}

// Unauthorized: 401 (not 403)
if (!authHeader) {
  return res.status(401).json({ ok: false, message: 'Not authenticated' });
}

// Forbidden: 403 (not 401)
if (req.user !== id) {
  return res.status(403).json({ ok: false, message: 'Access denied' });
}
```

**Priority:** LOW - Refactor gradually

---

### 🟢 LOW-003: ESLint Rules Disabled

**Location:** Multiple files
**Severity:** LOW
**CVSS Score:** 1.0 (Informational)

**Issue:**
Many ESLint rules are disabled with inline comments, reducing code quality.

**Evidence:**
```javascript
// eslint-disable-next-line consistent-return
// eslint-disable-next-line no-underscore-dangle
// eslint-disable-next-line max-len
```

**Solution:**

Fix code instead of disabling rules:

```javascript
// BEFORE: Disabling rule
// eslint-disable-next-line consistent-return
const updateUser = async (req, res, next) => {
  try {
    if (!data) return res.status(400).json({...})
    // ... code without return
  } catch (err) {
    next(err)
  }
}

// AFTER: Fix the issue
const updateUser = async (req, res, next) => {
  try {
    if (!data) {
      return res.status(400).json({ ok: false, message: 'Required fields' });
    }

    // ... code

    return res.status(200).json({ ok: true }); // Always return
  } catch (err) {
    return next(err); // Return here too
  }
};
```

Update `.eslintrc.js` for valid exceptions:

```javascript
module.exports = {
  extends: 'airbnb-base',
  rules: {
    // Allow Firestore internal fields
    'no-underscore-dangle': ['error', {
      allow: ['_fieldsProto', '_docs', '_createTime', '_path']
    }],

    // Require consistent returns
    'consistent-return': 'error',
  }
};
```

**Priority:** LOW - Improve code quality over time

---

### 🟢 LOW-004: Missing TypeScript

**Location:** Entire codebase
**Severity:** LOW
**CVSS Score:** 1.0 (Informational)

**Issue:**
JavaScript without type checking leads to runtime errors.

**Impact:**
- Runtime type errors
- Poor developer experience
- Harder refactoring

**Solution:**

Migrate to TypeScript gradually:

```bash
npm install --save-dev typescript @types/node @types/express
```

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["**/*.ts"],
  "exclude": ["node_modules", "dist"]
}
```

Start with type definitions:
```typescript
// types/express.d.ts
declare namespace Express {
  interface Request {
    user?: string;
  }
}

// types/models.ts
export interface User {
  sms: boolean;
  gAuth: boolean;
  twoFa: boolean;
  gAuthSecret: string | null;
}

export interface Proposal {
  type: number;
  name: string;
  title: string;
  description: string;
  nPayment: number;
  // ... etc
}
```

**Priority:** LOW - Long-term improvement

---

## Dependency Vulnerabilities

### 📦 DEP-001: Outdated Dependencies with Known Vulnerabilities

**Severity:** VARIES (CRITICAL to LOW)

Run audit:
```bash
npm audit
```

**Critical Vulnerabilities:**

1. **axios 1.7.9** - Check for latest CVEs
2. **jsonwebtoken 9.0.2** - Known timing attack (already addressed in HIGH-004)
3. **moment 2.29.1** - Deprecated, use `date-fns` or `dayjs`
4. **ejs 3.1.5** - Potential XSS (if used for templates)

**Solution:**

Update all dependencies:

```bash
# Update package.json
npm install axios@latest
npm install moment@latest  # Or migrate to date-fns
npm install ejs@latest

# Run audit fix
npm audit fix

# For breaking changes
npm audit fix --force  # Use with caution
```

**Migrate from moment to date-fns:**

```bash
npm uninstall moment
npm install date-fns
```

```javascript
// BEFORE
const moment = require('moment');
const formatted = moment().format('YYYY-MM-DD');

// AFTER
const { format } = require('date-fns');
const formatted = format(new Date(), 'yyyy-MM-dd');
```

**Priority:** VARIES - Update critical packages immediately

---

## Cloudflare Configuration Recommendations

Since you're using Cloudflare as a proxy, here are recommended security configurations to maximize protection:

### 1. Rate Limiting Rules

**Navigate to:** Security > WAF > Rate limiting rules

**Recommended Rules:**

```
Rule 1: Global API Protection
- Path: /api/* or /*
- Rate: 100 requests per 15 minutes
- Match: By IP address
- Action: Challenge

Rule 2: Authentication Endpoints
- Paths: /user/verify-gauth-code, /auth/*, /user/actions/*
- Rate: 5 requests per 15 minutes
- Match: By IP address
- Action: Block

Rule 3: Proposal Submission
- Paths: /proposal/prepare, /proposal/submit
- Rate: 10 requests per hour
- Match: By user session (if possible)
- Action: Challenge

Rule 4: Admin Endpoints
- Path: /admin/*
- Rate: 20 requests per 15 minutes
- Match: By IP address
- Action: Block
```

### 2. WAF Rules (Web Application Firewall)

**Navigate to:** Security > WAF > Custom rules

**Recommended Custom Rules:**

```
Rule 1: Block SQL Injection Attempts
- Field: Request body
- Operator: contains
- Value: (UNION|SELECT|INSERT|DROP|DELETE|UPDATE).*FROM
- Action: Block

Rule 2: Block XSS Attempts
- Field: All request fields
- Operator: contains
- Value: <script|javascript:|onerror=
- Action: Block

Rule 3: Require User-Agent
- Field: User-Agent
- Operator: does not equal
- Value: (empty)
- Action: Challenge

Rule 4: Block Direct IP Access
- Field: Host
- Operator: equals
- Value: [YOUR_ORIGIN_IP]
- Action: Block
```

### 3. Access Policies

**Navigate to:** Security > Access > Applications

**Recommendation:** Create Cloudflare Access application for `/admin/*` routes:

```
Application Configuration:
- Application domain: syshub-staging.syscoin.org
- Path: /admin/*
- Session duration: 1 hour

Access Policy:
- Allow only specific IP addresses (your office/VPN)
- Require email verification
- Optional: Require hardware key (YubiKey)
```

### 4. Page Rules

**Navigate to:** Rules > Page Rules

```
Rule 1: Force HTTPS
- URL: http://syshub-staging.syscoin.org/*
- Settings: Always Use HTTPS = On

Rule 2: Security Headers
- URL: https://syshub-staging.syscoin.org/*
- Settings:
  - Security Level = High
  - Browser Integrity Check = On
  - Challenge Passage = 30 minutes
```

### 5. Firewall Settings

**Navigate to:** Security > Settings

**Recommended Settings:**

```
✅ Security Level: High
✅ Challenge Passage: 30 minutes
✅ Browser Integrity Check: On
✅ Privacy Pass Support: On
⚠️ Email Address Obfuscation: On (if serving HTML)
```

### 6. SSL/TLS Configuration

**Navigate to:** SSL/TLS > Edge Certificates

**Recommended Settings:**

```
✅ Always Use HTTPS: On
✅ Minimum TLS Version: TLS 1.2
✅ Opportunistic Encryption: On
✅ TLS 1.3: On
✅ Automatic HTTPS Rewrites: On
✅ Certificate Transparency Monitoring: On
```

**SSL/TLS Encryption Mode:** Full (strict)
- Ensures end-to-end encryption from Cloudflare to origin

### 7. Authenticated Origin Pulls

**Navigate to:** SSL/TLS > Origin Server

**Recommended:**

```
✅ Enable Authenticated Origin Pulls
```

This ensures only Cloudflare can connect to your origin server:

```javascript
// nginx or load balancer configuration
ssl_verify_client on;
ssl_client_certificate /path/to/cloudflare-origin-pull-ca.pem;
```

### 8. IP Access Rules

**Navigate to:** Security > WAF > Tools

**Recommended:**

```
Whitelist IPs:
- Your office/development IPs
- CI/CD pipeline IPs

Blocklist IPs:
- Known malicious IPs (check threat intelligence feeds)
- Countries you don't operate in (if applicable)
```

### 9. Bot Management

**Navigate to:** Security > Bots

**Recommended Settings:**

```
✅ Bot Fight Mode: On
✅ Super Bot Fight Mode: On (if available)
✅ JavaScript Detections: On
```

### 10. DDoS Protection

**Navigate to:** Security > DDoS

**Verification:**

```
✅ HTTP DDoS Attack Protection: On (automatic)
✅ Network-layer DDoS Protection: On (automatic)

Review sensitivity settings:
- Set to "High" for maximum protection
```

### 11. Origin Rules (Hide Origin IP)

**Action Items:**

1. **Ensure origin IP is not exposed:**
   - Remove any DNS A records pointing directly to origin
   - Use Cloudflare proxy (orange cloud) for all records
   - Configure firewall to only accept Cloudflare IPs

2. **Cloudflare IP Ranges:**
```bash
# Add to origin server firewall (iptables/ufw)
# Only allow traffic from Cloudflare IPs
# List: https://www.cloudflare.com/ips/

# Example ufw rules:
ufw allow from 173.245.48.0/20
ufw allow from 103.21.244.0/22
ufw allow from 103.22.200.0/22
# ... (add all Cloudflare IP ranges)

# Deny all other traffic to application port
ufw deny 3000
```

### 12. Cache Rules

**Navigate to:** Caching > Cache Rules

**Recommended for API:**

```
Rule: Bypass cache for API
- URL: /api/*, /user/*, /admin/*, /proposal/*
- Cache eligibility: Bypass cache
- Origin cache control: Off

Exception: Public endpoints
- URL: /statsInfo/*, /faq/*
- Cache eligibility: Eligible for cache
- Edge TTL: 5 minutes
```

### 13. Monitoring & Alerts

**Navigate to:** Analytics > Security

**Set up alerts for:**

```
✅ Rate limit triggers > 100/hour
✅ WAF blocks > 50/hour
✅ DDoS attacks detected
✅ Origin server errors (500/502/503)
✅ SSL certificate expiration (30 days)
```

### 14. Audit Log

**Navigate to:** Audit Log

**Regular Reviews:**

```
Weekly: Review configuration changes
Monthly: Review access logs for admin endpoints
Quarterly: Full security configuration audit
```

---

## Positive Security Practices

The codebase implements several good security practices:

✅ **Firebase Authentication** - Industry-standard auth platform
✅ **Helmet.js** - Security headers middleware
✅ **HTTPS Support** - SSL/TLS configuration present
✅ **Input Validation** - Some endpoints validate name/address formats
✅ **Authorization Checks** - User ID verification (`req.user !== id`)
✅ **Token Revocation** - Implements logout with token blacklisting
✅ **Compression** - Response compression enabled
✅ **2FA Support** - Google Authenticator TOTP implementation
✅ **Separate Admin Roles** - Role-based access control
✅ **Recent Security Fixes** - PR #31 fixed 2FA secret exposure

---

## Recommendations Summary

### 🚨 IMMEDIATE - Production Critical (Deploy This Week)

**These issues affect production users RIGHT NOW:**

1. 🔴 **Fix 2FA encryption** (CRIT-001)
   - Current: Weak CryptoJS encryption
   - Impact: ALL 2FA users at risk
   - Action: Implement AES-256-GCM + migration script
   - Timeline: **THIS WEEK**

2. 🟠 **Replace weak JWT secret** (HIGH-001)
   - Current: Base64-encoded password
   - Impact: Dashboard authentication forgeable
   - Action: Generate 64-byte random secret
   - Timeline: **THIS WEEK**

3. 🟠 **Migrate dashboard auth to Firebase** (HIGH-002)
   - Current: Hardcoded credentials in .env
   - Impact: Single point of failure
   - Action: Use Firebase auth like other endpoints
   - Timeline: **THIS WEEK**

4. 🟠 **Add input validation** (HIGH-003)
   - Current: NoSQL injection possible
   - Impact: Data exfiltration, query manipulation
   - Action: Implement Joi validation
   - Timeline: **THIS WEEK**

5. 🟠 **Fix error message leaks** (HIGH-005)
   - Current: Stack traces in production
   - Impact: Information disclosure
   - Action: Implement secure error handler
   - Timeline: **THIS WEEK**

### 📋 Infrastructure Tasks (This Week)

**Cloudflare Configuration Verification:**

1. ✅ **Verify rate limiting rules**
   - Check: `/user/verify-gauth-code` limited to 5/15min
   - Check: Global API limited to 100/15min
   - Action: Review Cloudflare dashboard

2. ✅ **Implement application-level CORS**
   - Even with Cloudflare protection
   - Defense-in-depth principle
   - Action: Add CORS whitelist (INFO-002)

3. ✅ **Verify origin IP hidden**
   - Ensure no direct access to origin
   - Firewall rules: Accept only Cloudflare IPs
   - Action: Check DNS records + firewall

4. ✅ **Review Cloudflare WAF rules**
   - SQL injection blocking
   - XSS protection
   - Action: Implement recommended custom rules

### 🔧 High Priority (This Month)

1. 🟠 **Implement token cleanup** (HIGH-006)
   - Add Cloud Function for expired token removal
   - Timeline: Within 2 weeks

2. 🟡 **Add comprehensive logging** (MED-006)
   - Security event logging
   - Failed auth attempts
   - Admin actions
   - Timeline: Within 3 weeks

3. 🟡 **Add request body size limits** (MED-002)
   - Prevent DoS via large payloads
   - Timeline: Within 1 week

4. 🟡 **Fix async/await issues** (MED-008)
   - Prevent unhandled promise rejections
   - Timeline: Within 2 weeks

5. 🟡 **Update dependencies** (DEP-001)
   - Run `npm audit fix`
   - Update critical packages
   - Timeline: Within 1 week

### 📊 Medium Priority (Next Quarter)

1. 🟡 Add security headers (MED-005)
2. 🟡 Fix password validation (MED-004)
3. 🟡 Fix proposal data validation (MED-007)
4. 🟡 Fix race condition in proposal update (MED-009)
5. 🟢 Add API versioning (LOW-001)

### 🎯 Long-term Improvements

1. 🟢 Migrate to TypeScript (LOW-004)
2. 🟢 Standardize HTTP status codes (LOW-002)
3. 🟢 Fix ESLint rule violations (LOW-003)

### ✅ Already Protected by Infrastructure

These issues are **mitigated by Cloudflare** but still recommended for application-level defense:

- ✅ Rate limiting (INFO-001) - **Handled by Cloudflare**
- ✅ CORS protection (INFO-002) - **Partially handled by Cloudflare**
- ✅ DDoS protection - **Handled by Cloudflare**
- ✅ HTTPS enforcement - **Handled by Cloudflare**

---

## Testing Recommendations

Create security test suite:

```bash
npm install --save-dev supertest jest
```

```javascript
// test/security.test.js
describe('Security Tests', () => {
  test('Rate limiting works', async () => {
    // Send 101 requests
    for (let i = 0; i < 101; i++) {
      const res = await request(app).get('/');
      if (i < 100) {
        expect(res.status).toBe(200);
      } else {
        expect(res.status).toBe(429); // Rate limited
      }
    }
  });

  test('CORS blocks unauthorized origins', async () => {
    const res = await request(app)
      .get('/user')
      .set('Origin', 'https://evil.com');
    expect(res.status).toBe(403);
  });

  test('Large payloads rejected', async () => {
    const largePayload = 'x'.repeat(1024 * 1024); // 1MB
    const res = await request(app)
      .post('/proposal/check')
      .send({ description: largePayload });
    expect(res.status).toBe(413);
  });
});
```

---

## Compliance Checklist

**Production Environment Considerations:**

Given that this is a **LIVE production application** on https://syshub-staging.syscoin.org with Cloudflare protection, here's the current compliance status:

### GDPR Compliance

- [ ] **Data retention policies** - Need to implement
- [ ] **Right to be forgotten** - Partially implemented (`deleteUser` function exists)
- [ ] **Data portability** - Not implemented
- [ ] **Consent management** - Need to verify
- [x] **Data encryption** - Firebase handles encryption at rest
- [ ] **Breach notification** - Need incident response plan
- [x] **Access logging** - Cloudflare provides some logging
- [ ] **Privacy policy** - Need to verify

**Action Required:** Implement data retention policies and comprehensive audit logging

### PCI DSS

- [x] **Not applicable** - No card data processed

### SOC 2 Compliance

- [ ] **Security logging** - Implement MED-006
- [x] **Access controls** - Firebase auth + role-based access
- [ ] **Change management** - Need formal process
- [ ] **Incident response** - Need plan
- [x] **Encryption** - HTTPS via Cloudflare
- [ ] **Monitoring** - Need alerting for security events
- [x] **Availability** - Cloudflare DDoS protection

**Action Required:** Implement comprehensive logging and monitoring

### OWASP Top 10 2021

**Current Status (Adjusted for Infrastructure):**

- [x] **A01: Broken Access Control**
  - ✅ Firebase authentication
  - ✅ Role-based authorization (`isAdmin` middleware)
  - ✅ User ID verification (`req.user !== id`)
  - ⚠️  Review admin endpoints

- [ ] **A02: Cryptographic Failures**
  - 🔴 Fix CRIT-001 (2FA encryption)
  - ✅ HTTPS via Cloudflare
  - ✅ Firebase handles database encryption
  - ⚠️  Fix HIGH-001 (JWT secret)

- [ ] **A03: Injection**
  - ⚠️  Fix HIGH-003 (input validation)
  - ⚠️  NoSQL injection risks
  - ✅ Cloudflare WAF provides some protection
  - 🔴 **Action Required:** Implement Joi validation

- [x] **A04: Insecure Design**
  - ✅ Good architecture (separation of concerns)
  - ✅ Firebase for authentication
  - ✅ Syscoin RPC for blockchain operations
  - ✅ Cloudflare proxy for edge protection

- [~] **A05: Security Misconfiguration**
  - ✅ Rate limiting via Cloudflare (INFO-001)
  - ✅ HTTPS via Cloudflare
  - ⚠️  CORS needs application-level config (INFO-002)
  - ⚠️  Error messages leak details (HIGH-005)
  - ✅ Helmet.js installed
  - 🔴 **Action Required:** Fix error handling, implement CORS

- [~] **A06: Vulnerable Components**
  - ⚠️  Fix DEP-001 (outdated dependencies)
  - ⚠️  `moment` deprecated → migrate to `date-fns`
  - ⚠️  Run `npm audit fix`
  - 🔴 **Action Required:** Update dependencies

- [ ] **A07: Identification & Authentication Failures**
  - ⚠️  Fix HIGH-001 (weak JWT secret)
  - ⚠️  Fix HIGH-002 (hardcoded credentials)
  - ⚠️  Fix HIGH-004 (timing attack)
  - ✅ 2FA support implemented
  - ✅ Firebase handles password hashing
  - 🔴 **Action Required:** Fix auth vulnerabilities

- [x] **A08: Software & Data Integrity Failures**
  - ✅ No user-uploaded executables
  - ✅ Firebase SDK from official source
  - [ ] Add SRI for frontend assets (if applicable)
  - ✅ No auto-update mechanisms

- [ ] **A09: Security Logging & Monitoring Failures**
  - ⚠️  Fix MED-006 (comprehensive logging)
  - ✅ Cloudflare Analytics available
  - ✅ Morgan HTTP logging
  - 🔴 **Action Required:** Add security event logging

- [x] **A10: Server-Side Request Forgery (SSRF)**
  - ✅ Not applicable (no user-controlled URLs)
  - ✅ RPC endpoints are internal configuration
  - ✅ No HTTP requests based on user input

### Overall Compliance Score

**Production Ready:** 🟡 **CONDITIONAL**

✅ **Infrastructure-level protections** in place (Cloudflare)
⚠️  **Application-level fixes** required before full production use
🔴 **Critical fixes** needed for 2FA encryption and authentication

---

## Contact & Support

For questions about this audit report:
- Review findings with development team
- Create GitHub issues for each item
- Assign priorities and owners
- Track progress in project board

## 🚨 PRODUCTION DEPLOYMENT CHECKLIST

**Before deploying to production (https://syshub.syscoin.org):**

### Critical Fixes (MUST Complete)

- [ ] **CRIT-001:** Implement AES-256-GCM encryption for 2FA secrets
- [ ] **CRIT-001:** Run migration script for existing users
- [ ] **HIGH-001:** Replace JWT secret with 64-byte random key
- [ ] **HIGH-002:** Migrate dashboard auth to Firebase
- [ ] **HIGH-003:** Implement Joi input validation
- [ ] **HIGH-005:** Deploy secure error handler
- [ ] **HIGH-006:** Implement token cleanup

### Infrastructure Verification

- [ ] Verify Cloudflare rate limiting is active (5/15min for auth endpoints)
- [ ] Verify Cloudflare WAF rules are configured
- [ ] Verify origin server firewall only accepts Cloudflare IPs
- [ ] Verify SSL/TLS mode is "Full (strict)" in Cloudflare
- [ ] Test that direct origin IP access is blocked
- [ ] Verify Cloudflare Access is configured for /admin/* routes

### Application Hardening

- [ ] Implement application-level CORS whitelist
- [ ] Add request body size limits (10kb)
- [ ] Configure comprehensive security logging
- [ ] Add monitoring alerts for security events
- [ ] Update all dependencies (`npm audit fix`)

### Testing

- [ ] Run security test suite
- [ ] Test 2FA with new encryption (staging)
- [ ] Test authentication flows
- [ ] Test input validation on all endpoints
- [ ] Load testing with realistic traffic
- [ ] Verify error messages don't leak info

### Documentation

- [ ] Document Cloudflare configuration
- [ ] Document security event response plan
- [ ] Update .env-example with new variables
- [ ] Document encryption key rotation procedure

### Monitoring Setup

- [ ] Configure Cloudflare alerts (rate limits, WAF blocks)
- [ ] Configure application logging (Winston)
- [ ] Set up error tracking (Sentry/similar)
- [ ] Configure uptime monitoring
- [ ] Set up Firebase usage alerts

## Next Steps

**WEEK 1 (THIS WEEK):**

1. ✅ Fix CRIT-001 (2FA encryption) - **URGENT**
2. ✅ Fix HIGH-001, HIGH-002 (auth issues)
3. ✅ Fix HIGH-003 (input validation)
4. ✅ Fix HIGH-005 (error handling)
5. ✅ Verify Cloudflare configuration
6. ✅ Deploy to staging, test thoroughly

**WEEK 2:**

1. ✅ Fix HIGH-006 (token cleanup)
2. ✅ Add comprehensive logging (MED-006)
3. ✅ Update dependencies (DEP-001)
4. ✅ Deploy to production with monitoring

**WEEK 3-4:**

1. ✅ Address remaining MEDIUM issues
2. ✅ Implement enhanced security headers
3. ✅ Code quality improvements

## Emergency Contacts

**If Security Incident Detected:**

1. **Immediate:** Revoke all user tokens via Firebase
2. **Immediate:** Enable "Under Attack Mode" in Cloudflare
3. **Immediate:** Review Cloudflare Analytics for attack patterns
4. **Within 1 hour:** Notify users if data breach suspected
5. **Within 24 hours:** Complete incident report

**Incident Response Checklist:**

- [ ] Identify attack vector
- [ ] Block malicious IPs in Cloudflare
- [ ] Review application logs
- [ ] Check for data exfiltration
- [ ] Rotate all secrets (encryption keys, JWT secrets, RPC passwords)
- [ ] Deploy emergency patches
- [ ] Notify affected users
- [ ] Post-mortem analysis

---

**Report End**

**Audit Metadata:**
- **Report Version:** 2.0 (Updated with infrastructure context)
- **Environment:** Production (https://syshub-staging.syscoin.org)
- **Infrastructure:** Cloudflare Proxy + Node.js/Express + Firebase
- **Blockchain:** Syscoin Network
- **Generated:** 2025-11-22
- **Last Updated:** 2025-11-22

*This audit was generated by AI analysis of the codebase. Manual penetration testing is strongly recommended for production systems handling sensitive data (2FA secrets, governance proposals, masternode operations).*

**Recommended Next Steps:**
1. Engage professional security auditor for penetration testing
2. Consider bug bounty program after critical fixes deployed
3. Regular quarterly security audits
4. Automated security scanning in CI/CD pipeline
