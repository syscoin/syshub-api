#!/usr/bin/env node

/**
 * Setup Script: Configure Google Cloud Secret Manager for encryption keys
 *
 * This script helps migrate from .env file to Google Cloud Secret Manager
 * for better security and key rotation capabilities.
 *
 * PREREQUISITES:
 * 1. Google Cloud Project with Secret Manager API enabled
 * 2. Service account with Secret Manager permissions
 * 3. Install: npm install @google-cloud/secret-manager
 *
 * USAGE:
 *   node scripts/setup-secret-manager.js
 */

const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');
const crypto = require('crypto');
const readline = require('readline');

// Initialize client
const client = new SecretManagerServiceClient();

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

async function setupSecretManager() {
  console.log('\n🔐 Google Cloud Secret Manager Setup\n');
  console.log('='.repeat(60));

  // Get project ID
  const projectId = await prompt('\nEnter your Google Cloud Project ID: ');
  if (!projectId) {
    console.error('❌ Project ID is required');
    process.exit(1);
  }

  console.log('\n📋 This script will:');
  console.log('1. Generate a new 256-bit encryption key');
  console.log('2. Store it in Google Cloud Secret Manager');
  console.log('3. Provide code to access it from your application\n');

  const confirm = await prompt('Continue? (yes/no): ');
  if (confirm.toLowerCase() !== 'yes' && confirm.toLowerCase() !== 'y') {
    console.log('❌ Setup cancelled');
    process.exit(0);
  }

  // Generate new encryption key
  console.log('\n🔑 Generating new encryption key...');
  const newKey = crypto.randomBytes(32).toString('base64');
  console.log(`✅ Generated: ${newKey.substring(0, 20)}...`);

  // Create secret
  const parent = `projects/${projectId}`;
  const secretId = 'syshub-2fa-encryption-key';

  try {
    console.log(`\n📤 Creating secret: ${secretId}...`);

    // Create the secret
    const [secret] = await client.createSecret({
      parent: parent,
      secretId: secretId,
      secret: {
        replication: {
          automatic: {},
        },
      },
    });

    console.log(`✅ Secret created: ${secret.name}`);

    // Add secret version with the key
    const [version] = await client.addSecretVersion({
      parent: secret.name,
      payload: {
        data: Buffer.from(newKey, 'utf8'),
      },
    });

    console.log(`✅ Secret version created: ${version.name}`);

    // Print usage instructions
    console.log('\n' + '='.repeat(60));
    console.log('✅ Setup Complete!');
    console.log('='.repeat(60));

    console.log('\n📝 Next Steps:\n');

    console.log('1. Install dependency:');
    console.log('   npm install @google-cloud/secret-manager\n');

    console.log('2. Update utils/config.js to load secret:\n');
    console.log('   See: scripts/example-secret-manager-usage.js\n');

    console.log('3. Remove KEY_FOR_ENCRYPTION from .env file\n');

    console.log('4. Grant service account permission:');
    console.log(`   gcloud secrets add-iam-policy-binding ${secretId} \\`);
    console.log('     --member="serviceAccount:YOUR_SERVICE_ACCOUNT@PROJECT.iam.gserviceaccount.com" \\');
    console.log('     --role="roles/secretmanager.secretAccessor"\n');

    console.log(`Secret Name: ${secret.name}`);
    console.log(`Secret ID: ${secretId}`);
    console.log(`Project: ${projectId}\n`);

  } catch (err) {
    if (err.code === 6) { // ALREADY_EXISTS
      console.log('\n⚠️  Secret already exists');
      console.log('To add a new version (rotate key):');
      console.log(`   node scripts/rotate-encryption-key.js\n`);
    } else {
      console.error('\n❌ Error creating secret:', err.message);
      console.error('\nMake sure:');
      console.error('1. Secret Manager API is enabled');
      console.error('2. You have proper permissions');
      console.error('3. Service account credentials are configured\n');
      process.exit(1);
    }
  }
}

// Check if Secret Manager SDK is installed
try {
  require.resolve('@google-cloud/secret-manager');
  setupSecretManager().catch((err) => {
    console.error('❌ Fatal error:', err.message);
    process.exit(1);
  });
} catch (err) {
  console.log('\n⚠️  Google Cloud Secret Manager SDK not installed\n');
  console.log('Install it first:');
  console.log('  npm install @google-cloud/secret-manager\n');
  console.log('Then run this script again.\n');
  process.exit(1);
}
