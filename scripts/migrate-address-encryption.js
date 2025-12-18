#!/usr/bin/env node

/**
 * Migration Script: Upgrade Address Encryption from Legacy CryptoJS to AES-256-GCM
 *
 * This script migrates all existing voting address data from the insecure CryptoJS
 * encryption to the new secure AES-256-GCM implementation with PBKDF2.
 *
 * USAGE:
 *   node scripts/migrate-address-encryption.js [--dry-run] [--force]
 *
 * OPTIONS:
 *   --dry-run    Preview changes without modifying database
 *   --force      Skip confirmation prompt
 *   --help       Show this help message
 *
 * REQUIREMENTS:
 *   - .env file must be present in project root
 *   - KEY_FOR_ENCRYPTION must be set in .env
 *   - Firebase service account must be configured
 *
 * SAFETY:
 *   - Idempotent: Safe to run multiple times
 *   - Skips already-migrated addresses automatically
 *   - Validates decryption before re-encryption
 *   - Creates backup log of all changes
 */

require('dotenv').config();
const { admin } = require('../utils/config');
const {
  isLegacyFormat,
  migrateEncryption,
  decryptAesAuto,
  decryptAesLegacy
} = require('../utils/encrypt');
const readline = require('readline');

// Configuration
const DRY_RUN = process.argv.includes('--dry-run');
const FORCE = process.argv.includes('--force');
const HELP = process.argv.includes('--help');

// Statistics
const stats = {
  totalAddresses: 0,
  legacyFormat: 0,
  alreadyMigrated: 0,
  migrated: 0,
  failed: 0,
  errors: []
};

// Show help
if (HELP) {
  console.log(`
Migration Script: Upgrade Address Encryption

USAGE:
  node scripts/migrate-address-encryption.js [OPTIONS]

OPTIONS:
  --dry-run    Preview changes without modifying database
  --force      Skip confirmation prompt
  --help       Show this help message

EXAMPLES:
  # Preview migration
  node scripts/migrate-address-encryption.js --dry-run

  # Run migration with confirmation
  node scripts/migrate-address-encryption.js

  # Run migration without confirmation
  node scripts/migrate-address-encryption.js --force
`);
  process.exit(0);
}

// Validate environment
function validateEnvironment() {
  if (!process.env.KEY_FOR_ENCRYPTION) {
    console.error('❌ ERROR: KEY_FOR_ENCRYPTION not set in .env file');
    process.exit(1);
  }

  if (!process.env.COLLECTION_NAME_ADDRESS) {
    console.error('❌ ERROR: COLLECTION_NAME_ADDRESS not set in .env file');
    process.exit(1);
  }

  // Check for old key (needed for dual-key migration)
  if (!process.env.KEY_FOR_ENCRYPTION_OLD) {
    console.warn('⚠️  WARNING: KEY_FOR_ENCRYPTION_OLD not found');
    console.warn('   If addresses were encrypted with a different key, migration will fail');
    console.warn('   Set KEY_FOR_ENCRYPTION_OLD=test in .env if addresses use old key\n');
  }

  console.log('✅ Environment validation passed');
  console.log(`   Old key: ${(process.env.KEY_FOR_ENCRYPTION_OLD || 'N/A').substring(0, 20)}...`);
  console.log(`   New key: ${process.env.KEY_FOR_ENCRYPTION.substring(0, 20)}...`);
}

// Confirm with user
async function confirm(message) {
  if (FORCE) return true;

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(`${message} (yes/no): `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
    });
  });
}

// Migrate a single address
async function migrateAddress(addressId, addressData) {
  try {
    const fieldsToEncrypt = ['name', 'address', 'privateKey', 'txId', 'type'];
    const migratedFields = {};
    let hasLegacyField = false;
    let allFieldsMigrated = true;

    // Determine which key to use for decryption
    const oldKey = process.env.KEY_FOR_ENCRYPTION_OLD || process.env.KEY_FOR_ENCRYPTION;
    const newKey = process.env.KEY_FOR_ENCRYPTION;

    // Check each encrypted field
    for (const field of fieldsToEncrypt) {
      if (!addressData[field]) {
        continue; // Skip if field doesn't exist
      }

      const encryptedValue = addressData[field];

      // Check if this field uses legacy format
      if (isLegacyFormat(encryptedValue)) {
        hasLegacyField = true;

        // Validate that we can decrypt the legacy data
        try {
          // Try with old key first (if key was rotated)
          let plaintext;
          try {
            plaintext = decryptAesLegacy(encryptedValue, oldKey);
          } catch (err) {
            // If old key fails, try current key
            plaintext = decryptAesLegacy(encryptedValue, newKey);
          }

          if (!plaintext || plaintext.length === 0) {
            throw new Error(`Decrypted ${field} is empty`);
          }

          // Re-encrypt with new key and new format
          const { encryptAes } = require('../utils/encrypt');
          const newEncrypted = encryptAes(plaintext, newKey);

          // Verify new encryption works
          const verified = decryptAesAuto(newEncrypted, newKey);

          if (!verified || verified.length === 0) {
            throw new Error(`Verification failed for ${field}: decrypted data is empty`);
          }

          migratedFields[field] = newEncrypted;
        } catch (err) {
          throw new Error(`Failed to migrate field '${field}': ${err.message}`);
        }
      } else {
        allFieldsMigrated = allFieldsMigrated && false;
      }
    }

    // Determine status
    if (!hasLegacyField) {
      stats.alreadyMigrated++;
      return { status: 'skip', reason: 'Already migrated' };
    }

    stats.legacyFormat++;

    // Update database (unless dry-run)
    if (!DRY_RUN && Object.keys(migratedFields).length > 0) {
      await admin
        .firestore()
        .collection(process.env.COLLECTION_NAME_ADDRESS)
        .doc(addressId)
        .update(migratedFields);
    }

    stats.migrated++;
    return {
      status: 'migrated',
      fieldsUpdated: Object.keys(migratedFields),
      migratedFields
    };
  } catch (err) {
    stats.failed++;
    stats.errors.push({ addressId, error: err.message });
    return { status: 'failed', error: err.message };
  }
}

// Main migration function
async function runMigration() {
  console.log('\n🔐 Address Encryption Migration Tool');
  console.log('='.repeat(60));

  // Validate environment
  validateEnvironment();

  // Show mode
  if (DRY_RUN) {
    console.log('\n⚠️  DRY-RUN MODE: No changes will be made to database\n');
  } else {
    console.log('\n⚠️  PRODUCTION MODE: Database will be modified\n');
  }

  // Get confirmation
  if (!DRY_RUN && !FORCE) {
    const confirmed = await confirm(
      '⚠️  This will modify address data in production. Continue?'
    );

    if (!confirmed) {
      console.log('\n❌ Migration cancelled by user');
      process.exit(0);
    }
  }

  console.log('\n📊 Fetching addresses from database...');

  // Get all addresses
  const addressesSnapshot = await admin
    .firestore()
    .collection(process.env.COLLECTION_NAME_ADDRESS)
    .get();

  stats.totalAddresses = addressesSnapshot.size;
  console.log(`✅ Found ${stats.totalAddresses} total addresses\n`);

  // Process each address
  console.log('🔄 Processing addresses...\n');

  const results = [];
  let processed = 0;

  for (const doc of addressesSnapshot.docs) {
    const addressId = doc.id;
    const addressData = doc.data();

    processed++;

    // Show progress every 10 addresses
    if (processed % 10 === 0) {
      console.log(`Progress: ${processed}/${stats.totalAddresses} addresses processed...`);
    }

    // Migrate address
    const result = await migrateAddress(addressId, addressData);

    results.push({
      addressId,
      status: result.status,
      reason: result.reason || null,
      fieldsUpdated: result.fieldsUpdated || [],
      error: result.error || null
    });

    // Show detailed output for each migration
    if (result.status === 'migrated') {
      console.log(`  ✅ ${addressId}: Migrated successfully (${result.fieldsUpdated.join(', ')})`);
    } else if (result.status === 'failed') {
      console.log(`  ❌ ${addressId}: FAILED - ${result.error}`);
    }
  }

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Migration Summary');
  console.log('='.repeat(60));
  console.log(`Total addresses:          ${stats.totalAddresses}`);
  console.log(`Legacy encryption:        ${stats.legacyFormat}`);
  console.log(`Already migrated:         ${stats.alreadyMigrated}`);
  console.log(`Successfully migrated:    ${stats.migrated}`);
  console.log(`Failed:                   ${stats.failed}`);

  // Show errors if any
  if (stats.errors.length > 0) {
    console.log('\n❌ Errors:');
    stats.errors.forEach(({ addressId, error }) => {
      console.log(`  - ${addressId}: ${error}`);
    });
  }

  // Save detailed log
  const logFilename = `migration-addresses-log-${new Date().toISOString().replace(/:/g, '-')}.json`;
  const logPath = `./scripts/${logFilename}`;

  const logData = {
    timestamp: new Date().toISOString(),
    mode: DRY_RUN ? 'dry-run' : 'production',
    statistics: stats,
    results: results.filter(r => r.status !== 'skip')
  };

  const fs = require('fs');
  fs.writeFileSync(logPath, JSON.stringify(logData, null, 2));

  console.log(`\n📝 Detailed log saved to: ${logPath}`);

  // Exit with appropriate code
  if (stats.failed > 0) {
    console.log('\n⚠️  Migration completed with errors');
    process.exit(1);
  } else if (stats.migrated > 0) {
    console.log('\n✅ Migration completed successfully!');
    if (DRY_RUN) {
      console.log('\n💡 Run without --dry-run to apply changes');
    }
    process.exit(0);
  } else {
    console.log('\n✅ No addresses needed migration');
    process.exit(0);
  }
}

// Run migration
runMigration().catch((err) => {
  console.error('\n❌ FATAL ERROR:', err.message);
  console.error(err.stack);
  process.exit(1);
});
