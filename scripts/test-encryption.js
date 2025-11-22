#!/usr/bin/env node

/**
 * Test script for encryption functions
 * Verifies that new AES-256-GCM encryption works correctly
 */

const {
  encryptAes,
  decryptAes,
  encryptAesLegacy,
  decryptAesLegacy,
  isLegacyFormat,
  migrateEncryption,
  decryptAesAuto,
  ENCRYPTION_CONFIG
} = require('../utils/encrypt');

// Test data
const TEST_KEY = 'test-encryption-key-12345678901234567890';
const TEST_DATA = '6DTFQJCJXV7A5TPP'; // Example TOTP secret

console.log('🔐 Testing Encryption Functions\n');
console.log('='.repeat(60));

// Test 1: New encryption/decryption
console.log('\n✅ Test 1: New AES-256-GCM Encryption');
console.log('-'.repeat(60));
try {
  const encrypted = encryptAes(TEST_DATA, TEST_KEY);
  console.log(`Original:  ${TEST_DATA}`);
  console.log(`Encrypted: ${encrypted.substring(0, 50)}...`);
  console.log(`Length:    ${encrypted.length} characters`);

  const decrypted = decryptAes(encrypted, TEST_KEY);
  console.log(`Decrypted: ${decrypted}`);

  if (decrypted === TEST_DATA) {
    console.log('✅ PASSED: Encryption/decryption successful');
  } else {
    console.log('❌ FAILED: Decrypted data does not match original');
    process.exit(1);
  }
} catch (err) {
  console.log(`❌ FAILED: ${err.message}`);
  process.exit(1);
}

// Test 2: Encryption is random (different each time)
console.log('\n✅ Test 2: Encryption Randomness');
console.log('-'.repeat(60));
try {
  const encrypted1 = encryptAes(TEST_DATA, TEST_KEY);
  const encrypted2 = encryptAes(TEST_DATA, TEST_KEY);

  console.log(`Encryption 1: ${encrypted1.substring(0, 50)}...`);
  console.log(`Encryption 2: ${encrypted2.substring(0, 50)}...`);

  if (encrypted1 !== encrypted2) {
    console.log('✅ PASSED: Each encryption is unique (good!)');
  } else {
    console.log('❌ FAILED: Encryptions are identical (bad!)');
    process.exit(1);
  }

  // Both should decrypt to same value
  const decrypted1 = decryptAes(encrypted1, TEST_KEY);
  const decrypted2 = decryptAes(encrypted2, TEST_KEY);

  if (decrypted1 === decrypted2 && decrypted1 === TEST_DATA) {
    console.log('✅ PASSED: Both decrypt to same original value');
  } else {
    console.log('❌ FAILED: Decryption mismatch');
    process.exit(1);
  }
} catch (err) {
  console.log(`❌ FAILED: ${err.message}`);
  process.exit(1);
}

// Test 3: Tampering detection
console.log('\n✅ Test 3: Tampering Detection (Authentication Tag)');
console.log('-'.repeat(60));
try {
  const encrypted = encryptAes(TEST_DATA, TEST_KEY);

  // Tamper with the encrypted data
  const tampered = encrypted.slice(0, -5) + 'AAAAA';

  try {
    decryptAes(tampered, TEST_KEY);
    console.log('❌ FAILED: Tampering was not detected!');
    process.exit(1);
  } catch (err) {
    if (err.message.includes('tampered')) {
      console.log('✅ PASSED: Tampering detected successfully');
      console.log(`   Error: ${err.message}`);
    } else {
      console.log(`⚠️  Warning: Different error: ${err.message}`);
    }
  }
} catch (err) {
  console.log(`❌ FAILED: ${err.message}`);
  process.exit(1);
}

// Test 4: Legacy encryption (for comparison)
console.log('\n✅ Test 4: Legacy CryptoJS Encryption');
console.log('-'.repeat(60));
try {
  const legacyEncrypted = encryptAesLegacy(TEST_DATA, TEST_KEY);
  console.log(`Legacy encrypted: ${legacyEncrypted.substring(0, 50)}...`);

  const legacyDecrypted = decryptAesLegacy(legacyEncrypted, TEST_KEY);
  console.log(`Legacy decrypted: ${legacyDecrypted}`);

  if (legacyDecrypted === TEST_DATA) {
    console.log('✅ PASSED: Legacy encryption still works (for migration)');
  } else {
    console.log('❌ FAILED: Legacy decryption failed');
    process.exit(1);
  }
} catch (err) {
  console.log(`❌ FAILED: ${err.message}`);
  process.exit(1);
}

// Test 5: Format detection
console.log('\n✅ Test 5: Format Detection');
console.log('-'.repeat(60));
try {
  const newEncrypted = encryptAes(TEST_DATA, TEST_KEY);
  const legacyEncrypted = encryptAesLegacy(TEST_DATA, TEST_KEY);

  const isNewLegacy = isLegacyFormat(newEncrypted);
  const isOldLegacy = isLegacyFormat(legacyEncrypted);

  console.log(`New format detected as legacy: ${isNewLegacy}`);
  console.log(`Old format detected as legacy: ${isOldLegacy}`);

  if (!isNewLegacy && isOldLegacy) {
    console.log('✅ PASSED: Format detection works correctly');
  } else {
    console.log('❌ FAILED: Format detection incorrect');
    process.exit(1);
  }
} catch (err) {
  console.log(`❌ FAILED: ${err.message}`);
  process.exit(1);
}

// Test 6: Migration
console.log('\n✅ Test 6: Migration from Legacy to New');
console.log('-'.repeat(60));
try {
  const legacyEncrypted = encryptAesLegacy(TEST_DATA, TEST_KEY);
  console.log(`Legacy: ${legacyEncrypted.substring(0, 50)}...`);

  const migrated = migrateEncryption(legacyEncrypted, TEST_KEY);
  console.log(`Migrated: ${migrated.substring(0, 50)}...`);

  // Verify migration worked
  const decrypted = decryptAes(migrated, TEST_KEY);
  if (decrypted === TEST_DATA) {
    console.log('✅ PASSED: Migration successful');
  } else {
    console.log('❌ FAILED: Migration produced wrong data');
    process.exit(1);
  }

  // Verify format changed
  if (!isLegacyFormat(migrated)) {
    console.log('✅ PASSED: Migrated format is new format');
  } else {
    console.log('❌ FAILED: Migrated format is still legacy');
    process.exit(1);
  }
} catch (err) {
  console.log(`❌ FAILED: ${err.message}`);
  process.exit(1);
}

// Test 7: Auto-decrypt (handles both formats)
console.log('\n✅ Test 7: Auto-Decrypt (Both Formats)');
console.log('-'.repeat(60));
try {
  const newEncrypted = encryptAes(TEST_DATA, TEST_KEY);
  const legacyEncrypted = encryptAesLegacy(TEST_DATA, TEST_KEY);

  const decryptedNew = decryptAesAuto(newEncrypted, TEST_KEY);
  const decryptedLegacy = decryptAesAuto(legacyEncrypted, TEST_KEY);

  console.log(`New format decrypted: ${decryptedNew}`);
  console.log(`Legacy format decrypted: ${decryptedLegacy}`);

  if (decryptedNew === TEST_DATA && decryptedLegacy === TEST_DATA) {
    console.log('✅ PASSED: Auto-decrypt handles both formats');
  } else {
    console.log('❌ FAILED: Auto-decrypt failed');
    process.exit(1);
  }
} catch (err) {
  console.log(`❌ FAILED: ${err.message}`);
  process.exit(1);
}

// Test 8: Wrong key fails
console.log('\n✅ Test 8: Wrong Key Detection');
console.log('-'.repeat(60));
try {
  const encrypted = encryptAes(TEST_DATA, TEST_KEY);
  const wrongKey = 'wrong-key-1234567890';

  try {
    decryptAes(encrypted, wrongKey);
    console.log('❌ FAILED: Wrong key was accepted!');
    process.exit(1);
  } catch (err) {
    console.log('✅ PASSED: Wrong key rejected');
    console.log(`   Error: ${err.message}`);
  }
} catch (err) {
  console.log(`❌ FAILED: ${err.message}`);
  process.exit(1);
}

// Show encryption configuration
console.log('\n📋 Encryption Configuration');
console.log('-'.repeat(60));
console.log(`Algorithm:        ${ENCRYPTION_CONFIG.algorithm}`);
console.log(`Key size:         ${ENCRYPTION_CONFIG.keyLength * 8} bits`);
console.log(`IV length:        ${ENCRYPTION_CONFIG.ivLength} bytes`);
console.log(`Salt length:      ${ENCRYPTION_CONFIG.saltLength} bytes`);
console.log(`Tag length:       ${ENCRYPTION_CONFIG.tagLength} bytes`);
console.log(`PBKDF2 iterations: ${ENCRYPTION_CONFIG.iterations.toLocaleString()}`);

// Summary
console.log('\n' + '='.repeat(60));
console.log('✅ ALL TESTS PASSED!');
console.log('='.repeat(60));
console.log('\nEncryption functions are working correctly.');
console.log('Ready for deployment to production.\n');

process.exit(0);
