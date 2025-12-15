#!/usr/bin/env node

/**
 * Encryption Key Rotation Script
 *
 * This script safely rotates the encryption key used for 2FA secrets
 * without breaking existing encrypted data.
 *
 * PROCESS:
 * 1. Generate new encryption key
 * 2. Configure dual-key decryption (old + new)
 * 3. Re-encrypt all 2FA secrets with new key
 * 4. Remove old key after migration complete
 *
 * USAGE:
 *   node scripts/rotate-encryption-key.js [--dry-run] [--secret-manager]
 *
 * OPTIONS:
 *   --dry-run          Preview changes without modifying database
 *   --secret-manager   Use Google Cloud Secret Manager
 *   --env             Use .env file (default)
 */

require('dotenv').config();
const crypto = require('crypto');
const { admin } = require('../utils/config');
const {
  decryptAes,
  encryptAes,
  decryptAesAuto
} = require('../utils/encrypt');
const readline = require('readline');
const fs = require('fs');

// Configuration
const DRY_RUN = process.argv.includes('--dry-run');
const USE_SECRET_MANAGER = process.argv.includes('--secret-manager');

// Statistics
const stats = {
  total: 0,
  withTwoFa: 0,
  reEncrypted: 0,
  failed: 0,
  errors: []
};

async function prompt(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

/**
 * Generate a new encryption key
 */
function generateNewKey() {
  return crypto.randomBytes(32).toString('base64');
}

/**
 * Decrypt with old key, encrypt with new key
 */
function reEncrypt(encryptedData, oldKey, newKey) {
  try {
    // Decrypt with old key
    const plaintext = decryptAesAuto(encryptedData, oldKey);

    // Encrypt with new key
    const newEncrypted = encryptAes(plaintext, newKey);

    return newEncrypted;
  } catch (err) {
    throw new Error(`Re-encryption failed: ${err.message}`);
  }
}

/**
 * Save new key to Secret Manager
 */
async function saveToSecretManager(newKey, projectId) {
  const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');
  const client = new SecretManagerServiceClient();

  const secretName = `projects/${projectId}/secrets/syshub-2fa-encryption-key`;

  try {
    // Add new version
    const [version] = await client.addSecretVersion({
      parent: secretName,
      payload: {
        data: Buffer.from(newKey, 'utf8'),
      },
    });

    console.log(`✅ New key version created: ${version.name}`);
    return version.name;
  } catch (err) {
    throw new Error(`Failed to save to Secret Manager: ${err.message}`);
  }
}

/**
 * Save new key to .env file
 */
function saveToEnv(newKey, oldKey) {
  const envPath = '.env';
  let envContent = '';

  try {
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
    }
  } catch (err) {
    console.error('⚠️  Could not read .env file:', err.message);
  }

  // Backup old .env
  const backupPath = `.env.backup-${Date.now()}`;
  if (envContent) {
    fs.writeFileSync(backupPath, envContent);
    console.log(`✅ Backed up .env to: ${backupPath}`);
  }

  // Update .env with new key (keep old key commented for reference)
  const now = new Date().toISOString();

  let newContent = envContent;

  // Comment out old key
  if (oldKey) {
    newContent = newContent.replace(
      `KEY_FOR_ENCRYPTION=${oldKey}`,
      `# KEY_FOR_ENCRYPTION_OLD=${oldKey} # Rotated ${now}`
    );
  }

  // Add new key
  if (!newContent.includes('KEY_FOR_ENCRYPTION=')) {
    newContent += `\n# Encryption key (rotated ${now})\n`;
    newContent += `KEY_FOR_ENCRYPTION=${newKey}\n`;
  } else {
    newContent = newContent.replace(
      /KEY_FOR_ENCRYPTION=.*/,
      `KEY_FOR_ENCRYPTION=${newKey} # Rotated ${now}`
    );
  }

  if (!DRY_RUN) {
    fs.writeFileSync(envPath, newContent);
    console.log('✅ Updated .env file with new key');
  } else {
    console.log('✅ [DRY-RUN] Would update .env file');
  }
}

/**
 * Main rotation function
 */
async function rotateKey() {
  console.log('\n🔄 Encryption Key Rotation\n');
  console.log('='.repeat(60));

  if (DRY_RUN) {
    console.log('\n⚠️  DRY-RUN MODE: No changes will be made\n');
  }

  // Get current key
  const oldKey = process.env.KEY_FOR_ENCRYPTION;
  if (!oldKey) {
    console.error('❌ KEY_FOR_ENCRYPTION not found in environment');
    process.exit(1);
  }

  console.log(`\nCurrent key: ${oldKey.substring(0, 20)}...`);

  // Generate new key
  console.log('\n🔑 Generating new encryption key...');
  const newKey = generateNewKey();
  console.log(`New key: ${newKey.substring(0, 20)}...`);

  // Confirm rotation
  if (!DRY_RUN) {
    console.log('\n⚠️  WARNING: This will re-encrypt all 2FA secrets!');
    console.log('Make sure you have a database backup before proceeding.\n');

    const confirm = await prompt('Continue with key rotation? (yes/no): ');
    if (confirm.toLowerCase() !== 'yes' && confirm.toLowerCase() !== 'y') {
      console.log('❌ Rotation cancelled');
      process.exit(0);
    }
  }

  // Save new key
  console.log('\n💾 Saving new key...');
  if (USE_SECRET_MANAGER) {
    const projectId = process.env.GOOGLE_CLOUD_PROJECT || process.env.FIREBASE_PROJECT_ID;
    if (!projectId) {
      console.error('❌ Project ID not found. Set GOOGLE_CLOUD_PROJECT or FIREBASE_PROJECT_ID');
      process.exit(1);
    }

    try {
      await saveToSecretManager(newKey, projectId);
    } catch (err) {
      console.error('❌ Failed to save to Secret Manager:', err.message);
      console.log('\nFalling back to .env file...');
      saveToEnv(newKey, oldKey);
    }
  } else {
    saveToEnv(newKey, oldKey);
  }

  // Get all users with 2FA
  console.log('\n📊 Fetching users with 2FA enabled...');
  const usersSnapshot = await admin
    .firestore()
    .collection(process.env.COLLECTION_NAME_USERS)
    .where('gAuth', '==', true)
    .get();

  stats.withTwoFa = usersSnapshot.size;
  console.log(`✅ Found ${stats.withTwoFa} users with 2FA enabled\n`);

  if (stats.withTwoFa === 0) {
    console.log('✅ No users to migrate');
    return;
  }

  // Re-encrypt all 2FA secrets
  console.log('🔄 Re-encrypting 2FA secrets with new key...\n');

  const results = [];

  for (const doc of usersSnapshot.docs) {
    const userId = doc.id;
    const userData = doc.data();

    try {
      if (!userData.gAuthSecret) {
        continue;
      }

      // Re-encrypt
      const newEncrypted = reEncrypt(userData.gAuthSecret, oldKey, newKey);

      // Verify new encryption works
      const verified = decryptAes(newEncrypted, newKey);
      if (!verified || verified.length === 0) {
        throw new Error('Verification failed');
      }

      // Update database
      if (!DRY_RUN) {
        await admin
          .firestore()
          .collection(process.env.COLLECTION_NAME_USERS)
          .doc(userId)
          .update({ gAuthSecret: newEncrypted });
      }

      stats.reEncrypted++;
      console.log(`  ✅ ${userId}: Re-encrypted successfully`);

      results.push({
        userId,
        status: 'success'
      });

    } catch (err) {
      stats.failed++;
      stats.errors.push({ userId, error: err.message });
      console.log(`  ❌ ${userId}: FAILED - ${err.message}`);

      results.push({
        userId,
        status: 'failed',
        error: err.message
      });
    }
  }

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Rotation Summary');
  console.log('='.repeat(60));
  console.log(`Users with 2FA:          ${stats.withTwoFa}`);
  console.log(`Successfully re-encrypted: ${stats.reEncrypted}`);
  console.log(`Failed:                   ${stats.failed}`);

  // Show errors
  if (stats.errors.length > 0) {
    console.log('\n❌ Errors:');
    stats.errors.forEach(({ userId, error }) => {
      console.log(`  - ${userId}: ${error}`);
    });
  }

  // Save log
  const logFilename = `rotation-log-${new Date().toISOString().replace(/:/g, '-')}.json`;
  const logPath = `./scripts/${logFilename}`;

  const logData = {
    timestamp: new Date().toISOString(),
    mode: DRY_RUN ? 'dry-run' : 'production',
    oldKey: oldKey.substring(0, 20) + '...',
    newKey: newKey.substring(0, 20) + '...',
    statistics: stats,
    results
  };

  fs.writeFileSync(logPath, JSON.stringify(logData, null, 2));
  console.log(`\n📝 Detailed log saved to: ${logPath}`);

  // Instructions
  if (!DRY_RUN && stats.failed === 0) {
    console.log('\n' + '='.repeat(60));
    console.log('✅ Key Rotation Complete!');
    console.log('='.repeat(60));

    console.log('\n📋 Next Steps:\n');

    console.log('1. Restart your application to load the new key\n');

    console.log('2. Verify 2FA still works for test users\n');

    console.log('3. Monitor for any 2FA verification failures\n');

    console.log('4. After confirming all users can verify 2FA:');
    console.log('   - Remove old key from .env backup files');
    console.log('   - Update production environment variables\n');

    console.log('5. Keep this log file for audit trail\n');

  } else if (DRY_RUN) {
    console.log('\n💡 Run without --dry-run to apply changes\n');
  } else {
    console.log('\n⚠️  Rotation completed with errors');
    console.log('Review the errors above and retry failed users.\n');
  }

  process.exit(stats.failed > 0 ? 1 : 0);
}

// Run rotation
rotateKey().catch((err) => {
  console.error('\n❌ FATAL ERROR:', err.message);
  console.error(err.stack);
  process.exit(1);
});
