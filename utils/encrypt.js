const crypto = require('crypto');
const CryptoJS = require('crypto-js');

// ============================================================================
// LEGACY ENCRYPTION (INSECURE - ONLY FOR MIGRATION)
// ============================================================================
// These functions use the old CryptoJS implementation and should ONLY be used
// during migration to decrypt existing data. DO NOT USE for new encryptions.
// ============================================================================

const encryptAesLegacy = (data, key) => {
  const encryptedMessage = CryptoJS.AES.encrypt(data.toString('hex'), key);
  return encryptedMessage.toString();
};

const decryptAesLegacy = (data, key) => {
  const decryptedBytes = CryptoJS.AES.decrypt(data, key);
  return decryptedBytes.toString(CryptoJS.enc.Utf8);
};

// ============================================================================
// SECURE ENCRYPTION (AES-256-GCM with PBKDF2)
// ============================================================================
// This implementation uses proper key derivation, authenticated encryption,
// and cryptographically secure random values.
// ============================================================================

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 128 bits for GCM
const SALT_LENGTH = 64; // 512 bits
const TAG_LENGTH = 16; // 128 bits auth tag
const KEY_LENGTH = 32; // 256 bits for AES-256
const ITERATIONS = 100000; // PBKDF2 iterations (OWASP recommendation)

/**
 * Encrypt data using AES-256-GCM with proper key derivation
 *
 * @param {string} data - Plaintext data to encrypt
 * @param {string} masterKey - Master encryption key from environment
 * @returns {string} Base64-encoded encrypted data (salt + iv + tag + ciphertext)
 *
 * Format: base64(salt[64] + iv[16] + tag[16] + ciphertext[variable])
 */
const encryptAes = (data, masterKey) => {
  try {
    // Validate inputs
    if (!data || typeof data !== 'string') {
      throw new Error('Data must be a non-empty string');
    }
    if (!masterKey || typeof masterKey !== 'string') {
      throw new Error('Master key must be a non-empty string');
    }

    // Generate cryptographically secure random salt and IV
    const salt = crypto.randomBytes(SALT_LENGTH);
    const iv = crypto.randomBytes(IV_LENGTH);

    // Derive encryption key from master key using PBKDF2
    const key = crypto.pbkdf2Sync(
      masterKey,
      salt,
      ITERATIONS,
      KEY_LENGTH,
      'sha256'
    );

    // Create cipher with AES-256-GCM
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    // Encrypt data
    const encrypted = Buffer.concat([
      cipher.update(data, 'utf8'),
      cipher.final()
    ]);

    // Get authentication tag (provides integrity verification)
    const tag = cipher.getAuthTag();

    // Combine: salt + iv + tag + encrypted data
    const result = Buffer.concat([salt, iv, tag, encrypted]);

    // Return as base64 string
    return result.toString('base64');
  } catch (err) {
    throw new Error(`Encryption failed: ${err.message}`);
  }
};

/**
 * Decrypt data using AES-256-GCM
 *
 * @param {string} encryptedData - Base64-encoded encrypted data
 * @param {string} masterKey - Master encryption key from environment
 * @returns {string} Decrypted plaintext
 *
 * @throws {Error} If authentication tag verification fails (data tampering detected)
 */
const decryptAes = (encryptedData, masterKey) => {
  try {
    // Validate inputs
    if (!encryptedData || typeof encryptedData !== 'string') {
      throw new Error('Encrypted data must be a non-empty string');
    }
    if (!masterKey || typeof masterKey !== 'string') {
      throw new Error('Master key must be a non-empty string');
    }

    // Decode from base64
    const buffer = Buffer.from(encryptedData, 'base64');

    // Verify minimum length (salt + iv + tag)
    const minLength = SALT_LENGTH + IV_LENGTH + TAG_LENGTH;
    if (buffer.length < minLength) {
      throw new Error('Invalid encrypted data: too short');
    }

    // Extract components
    let offset = 0;
    const salt = buffer.subarray(offset, offset + SALT_LENGTH);
    offset += SALT_LENGTH;

    const iv = buffer.subarray(offset, offset + IV_LENGTH);
    offset += IV_LENGTH;

    const tag = buffer.subarray(offset, offset + TAG_LENGTH);
    offset += TAG_LENGTH;

    const encrypted = buffer.subarray(offset);

    // Derive key using same parameters as encryption
    const key = crypto.pbkdf2Sync(
      masterKey,
      salt,
      ITERATIONS,
      KEY_LENGTH,
      'sha256'
    );

    // Create decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);

    // Set authentication tag (will throw if tampered)
    decipher.setAuthTag(tag);

    // Decrypt
    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final() // This will throw if auth tag verification fails
    ]);

    return decrypted.toString('utf8');
  } catch (err) {
    // Authentication failure indicates data tampering
    if (err.message.includes('Unsupported state') ||
        err.message.includes('auth') ||
        err.message.includes('tag')) {
      throw new Error('Decryption failed: data may have been tampered with');
    }
    throw new Error(`Decryption failed: ${err.message}`);
  }
};

/**
 * Detect if encrypted data uses legacy or new format
 *
 * @param {string} encryptedData - Encrypted data to check
 * @returns {boolean} true if legacy format, false if new format
 */
const isLegacyFormat = (encryptedData) => {
  try {
    // Legacy format is not base64-decodable to exact expected length
    // or starts with CryptoJS specific characters
    if (!encryptedData || typeof encryptedData !== 'string') {
      return true; // Assume legacy for safety
    }

    // Try to decode as new format
    const buffer = Buffer.from(encryptedData, 'base64');
    const expectedMinLength = SALT_LENGTH + IV_LENGTH + TAG_LENGTH;

    // New format has specific minimum length
    if (buffer.length < expectedMinLength) {
      return true; // Too short for new format
    }

    // Legacy CryptoJS format typically starts with 'U2F' when base64 encoded
    // (because it starts with 'Salted__' in the ciphertext)
    if (encryptedData.startsWith('U2F')) {
      return true;
    }

    // If we can't determine, assume it's new format
    return false;
  } catch (err) {
    return true; // On error, assume legacy for safety
  }
};

/**
 * Migrate encrypted data from legacy to new format
 *
 * @param {string} legacyEncrypted - Legacy encrypted data
 * @param {string} masterKey - Master encryption key
 * @returns {string} New format encrypted data
 */
const migrateEncryption = (legacyEncrypted, masterKey) => {
  try {
    // Decrypt using legacy method
    const plaintext = decryptAesLegacy(legacyEncrypted, masterKey);

    // Re-encrypt using new secure method
    const newEncrypted = encryptAes(plaintext, masterKey);

    return newEncrypted;
  } catch (err) {
    throw new Error(`Migration failed: ${err.message}`);
  }
};

/**
 * Smart decrypt that handles both legacy and new formats
 *
 * @param {string} encryptedData - Encrypted data (any format)
 * @param {string} masterKey - Master encryption key
 * @returns {string} Decrypted plaintext
 */
const decryptAesAuto = (encryptedData, masterKey) => {
  try {
    // Try new format first
    return decryptAes(encryptedData, masterKey);
  } catch (err) {
    // If new format fails, try legacy format
    try {
      return decryptAesLegacy(encryptedData, masterKey);
    } catch (legacyErr) {
      throw new Error(`Failed to decrypt with both new and legacy methods: ${err.message}`);
    }
  }
};

module.exports = {
  // Primary functions (secure)
  encryptAes,
  decryptAes,

  // Legacy functions (ONLY for migration)
  encryptAesLegacy,
  decryptAesLegacy,

  // Migration helpers
  isLegacyFormat,
  migrateEncryption,
  decryptAesAuto,

  // Constants (for testing/verification)
  ENCRYPTION_CONFIG: {
    algorithm: ALGORITHM,
    ivLength: IV_LENGTH,
    saltLength: SALT_LENGTH,
    tagLength: TAG_LENGTH,
    keyLength: KEY_LENGTH,
    iterations: ITERATIONS,
  }
};
