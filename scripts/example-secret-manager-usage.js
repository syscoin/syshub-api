/**
 * Example: How to use Google Cloud Secret Manager in your application
 *
 * This replaces loading KEY_FOR_ENCRYPTION from .env file
 */

const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');

// Cache for secrets to avoid repeated API calls
let secretCache = {};

/**
 * Get encryption key from Google Cloud Secret Manager
 *
 * @param {string} version - Version number or 'latest' (default)
 * @returns {Promise<string>} Encryption key
 */
async function getEncryptionKey(version = 'latest') {
  const cacheKey = `encryption-key-${version}`;

  // Return cached value if available
  if (secretCache[cacheKey]) {
    return secretCache[cacheKey];
  }

  const client = new SecretManagerServiceClient();
  const projectId = process.env.GOOGLE_CLOUD_PROJECT || process.env.FIREBASE_PROJECT_ID;
  const secretName = `projects/${projectId}/secrets/syshub-2fa-encryption-key/versions/${version}`;

  try {
    const [accessResponse] = await client.accessSecretVersion({
      name: secretName,
    });

    const key = accessResponse.payload.data.toString('utf8');

    // Cache the key for 1 hour (3600000 ms)
    secretCache[cacheKey] = key;
    setTimeout(() => {
      delete secretCache[cacheKey];
    }, 3600000);

    return key;
  } catch (err) {
    console.error('Failed to load encryption key from Secret Manager:', err.message);

    // Fallback to .env in development
    if (process.env.NODE_ENV !== 'prod' && process.env.KEY_FOR_ENCRYPTION) {
      console.warn('⚠️  Using KEY_FOR_ENCRYPTION from .env (development only)');
      return process.env.KEY_FOR_ENCRYPTION;
    }

    throw new Error('Encryption key not available');
  }
}

// ============================================================================
// USAGE IN utils/config.js or utils/encrypt.js
// ============================================================================

/**
 * Option 1: Load key at startup (simple)
 */
let ENCRYPTION_KEY;

async function initializeEncryptionKey() {
  ENCRYPTION_KEY = await getEncryptionKey();
  console.log('✅ Encryption key loaded from Secret Manager');
}

// Call during app initialization
// initializeEncryptionKey();

/**
 * Option 2: Load key on-demand (more flexible for rotation)
 */
async function encryptAesWithSecretManager(data) {
  const { encryptAes } = require('./encrypt');
  const key = await getEncryptionKey(); // Always gets latest
  return encryptAes(data, key);
}

async function decryptAesWithSecretManager(encryptedData) {
  const { decryptAes } = require('./encrypt');
  const key = await getEncryptionKey();
  return decryptAes(encryptedData, key);
}

// ============================================================================
// MODIFIED utils/config.js
// ============================================================================

/**
 * Add this to utils/config.js
 */
async function getConfig() {
  // Load encryption key from Secret Manager
  const encryptionKey = await getEncryptionKey();

  return {
    encryptionKey,
    // ... other config
  };
}

// Export async config loader
module.exports = {
  getConfig,
  getEncryptionKey,
};

// ============================================================================
// USAGE EXAMPLE
// ============================================================================

async function exampleUsage() {
  const { encryptAes, decryptAes } = require('../utils/encrypt');

  // Get latest key
  const key = await getEncryptionKey();

  // Use it
  const encrypted = encryptAes('secret-data', key);
  const decrypted = decryptAes(encrypted, key);

  console.log('Decrypted:', decrypted);
}

module.exports = {
  getEncryptionKey,
  initializeEncryptionKey,
  encryptAesWithSecretManager,
  decryptAesWithSecretManager,
};
