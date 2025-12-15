#!/usr/bin/env node

/**
 * Migration Script: Upgrade 2FA Encryption from Legacy CryptoJS to AES-256-GCM
 *
 * This script migrates all existing 2FA secrets from the insecure CryptoJS
 * encryption to the new secure AES-256-GCM implementation with PBKDF2.
 *
 * USAGE:
 *   node scripts/migrate-2fa-encryption.js [--dry-run] [--force]
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
 *   - Skips already-migrated users automatically
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
  total: 0,
  withTwoFa: 0,
  legacy: 0,
  alreadyMigrated: 0,
  migrated: 0,
  failed: 0,
  errors: []
};

// Show help
if (HELP) {
  console.log(`
Migration Script: Upgrade 2FA Encryption

USAGE:
  node scripts/migrate-2fa-encryption.js [OPTIONS]

OPTIONS:
  --dry-run    Preview changes without modifying database
  --force      Skip confirmation prompt
  --help       Show this help message

EXAMPLES:
  # Preview migration
  node scripts/migrate-2fa-encryption.js --dry-run

  # Run migration with confirmation
  node scripts/migrate-2fa-encryption.js

  # Run migration without confirmation
  node scripts/migrate-2fa-encryption.js --force
`);
  process.exit(0);
}

// Validate environment
function validateEnvironment() {
  if (!process.env.KEY_FOR_ENCRYPTION) {
    console.error('❌ ERROR: KEY_FOR_ENCRYPTION not set in .env file');
    process.exit(1);
  }

  if (!process.env.COLLECTION_NAME_USERS) {
    console.error('❌ ERROR: COLLECTION_NAME_USERS not set in .env file');
    process.exit(1);
  }

  console.log('✅ Environment validation passed');
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

// Migrate a single user
async function migrateUser(userId, userData) {
  try {
    const gAuthSecret = userData.gAuthSecret;

    if (!gAuthSecret) {
      return { status: 'skip', reason: 'No 2FA secret' };
    }

    // Check if already using new format
    if (!isLegacyFormat(gAuthSecret)) {
      stats.alreadyMigrated++;
      return { status: 'skip', reason: 'Already migrated' };
    }

    stats.legacy++;

    // Validate that we can decrypt the legacy data
    try {
      const plaintext = decryptAesLegacy(
        gAuthSecret,
        process.env.KEY_FOR_ENCRYPTION
      );

      if (!plaintext || plaintext.length === 0) {
        throw new Error('Decrypted data is empty');
      }
    } catch (err) {
      throw new Error(`Legacy decryption failed: ${err.message}`);
    }

    // Perform migration
    const newEncrypted = migrateEncryption(
      gAuthSecret,
      process.env.KEY_FOR_ENCRYPTION
    );

    // Verify new encryption works
    try {
      const verified = decryptAesAuto(
        newEncrypted,
        process.env.KEY_FOR_ENCRYPTION
      );

      if (!verified || verified.length === 0) {
        throw new Error('Verification failed: decrypted data is empty');
      }
    } catch (err) {
      throw new Error(`New encryption verification failed: ${err.message}`);
    }

    // Update database (unless dry-run)
    if (!DRY_RUN) {
      await admin
        .firestore()
        .collection(process.env.COLLECTION_NAME_USERS)
        .doc(userId)
        .update({ gAuthSecret: newEncrypted });
    }

    stats.migrated++;
    return { status: 'migrated', newEncrypted };
  } catch (err) {
    stats.failed++;
    stats.errors.push({ userId, error: err.message });
    return { status: 'failed', error: err.message };
  }
}

// Main migration function
async function runMigration() {
  console.log('\n🔐 2FA Encryption Migration Tool');
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
      '⚠️  This will modify user data in production. Continue?'
    );

    if (!confirmed) {
      console.log('\n❌ Migration cancelled by user');
      process.exit(0);
    }
  }

  console.log('\n📊 Fetching users from database...');

  // Get all users
  const usersSnapshot = await admin
    .firestore()
    .collection(process.env.COLLECTION_NAME_USERS)
    .get();

  stats.total = usersSnapshot.size;
  console.log(`✅ Found ${stats.total} total users\n`);

  // Process each user
  console.log('🔄 Processing users...\n');

  const results = [];
  let processed = 0;

  for (const doc of usersSnapshot.docs) {
    const userId = doc.id;
    const userData = doc.data();

    processed++;

    // Show progress every 10 users
    if (processed % 10 === 0) {
      console.log(`Progress: ${processed}/${stats.total} users processed...`);
    }

    // Check if user has 2FA enabled
    if (!userData.gAuth) {
      continue;
    }

    stats.withTwoFa++;

    // Migrate user
    const result = await migrateUser(userId, userData);

    results.push({
      userId,
      status: result.status,
      reason: result.reason || null,
      error: result.error || null
    });

    // Show detailed output for each migration
    if (result.status === 'migrated') {
      console.log(`  ✅ ${userId}: Migrated successfully`);
    } else if (result.status === 'failed') {
      console.log(`  ❌ ${userId}: FAILED - ${result.error}`);
    }
  }

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Migration Summary');
  console.log('='.repeat(60));
  console.log(`Total users:              ${stats.total}`);
  console.log(`Users with 2FA:           ${stats.withTwoFa}`);
  console.log(`Legacy encryption:        ${stats.legacy}`);
  console.log(`Already migrated:         ${stats.alreadyMigrated}`);
  console.log(`Successfully migrated:    ${stats.migrated}`);
  console.log(`Failed:                   ${stats.failed}`);

  // Show errors if any
  if (stats.errors.length > 0) {
    console.log('\n❌ Errors:');
    stats.errors.forEach(({ userId, error }) => {
      console.log(`  - ${userId}: ${error}`);
    });
  }

  // Save detailed log
  const logFilename = `migration-log-${new Date().toISOString().replace(/:/g, '-')}.json`;
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
    console.log('\n✅ No users needed migration');
    process.exit(0);
  }
}

// Run migration
runMigration().catch((err) => {
  console.error('\n❌ FATAL ERROR:', err.message);
  console.error(err.stack);
  process.exit(1);
});
