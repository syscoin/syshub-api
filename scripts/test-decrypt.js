#!/usr/bin/env node

require('dotenv').config();
const { admin } = require('../utils/config');
const { decryptAesLegacy, isLegacyFormat } = require('../utils/encrypt');

async function testDecrypt() {
  console.log('\n🔍 Testing Address Decryption\n');
  console.log('='.repeat(60));

  // Get one address
  const addressesSnapshot = await admin
    .firestore()
    .collection(process.env.COLLECTION_NAME_ADDRESS)
    .limit(1)
    .get();

  if (addressesSnapshot.empty) {
    console.log('❌ No addresses found');
    return;
  }

  const doc = addressesSnapshot.docs[0];
  const addressData = doc.data();

  console.log(`\nAddress ID: ${doc.id}`);
  console.log('\nEncrypted Fields:');

  const fieldsToCheck = ['name', 'address', 'privateKey', 'txId', 'type'];

  for (const field of fieldsToCheck) {
    if (!addressData[field]) {
      console.log(`  ${field}: [not present]`);
      continue;
    }

    const encryptedValue = addressData[field];
    console.log(`\n  ${field}:`);
    console.log(`    Encrypted (first 50 chars): ${encryptedValue.substring(0, 50)}...`);
    console.log(`    Is legacy format: ${isLegacyFormat(encryptedValue)}`);

    // Try to decrypt with old key
    const oldKey = process.env.KEY_FOR_ENCRYPTION_OLD || 'test';
    const newKey = process.env.KEY_FOR_ENCRYPTION;

    console.log(`\n    Trying to decrypt with OLD key ('${oldKey}')...`);
    try {
      const decrypted = decryptAesLegacy(encryptedValue, oldKey);
      console.log(`    ✅ Success! Decrypted value: "${decrypted}"`);
      console.log(`    Length: ${decrypted.length} characters`);
    } catch (err) {
      console.log(`    ❌ Failed: ${err.message}`);
    }

    console.log(`\n    Trying to decrypt with NEW key...`);
    try {
      const decrypted = decryptAesLegacy(encryptedValue, newKey);
      console.log(`    ✅ Success! Decrypted value: "${decrypted}"`);
      console.log(`    Length: ${decrypted.length} characters`);
    } catch (err) {
      console.log(`    ❌ Failed: ${err.message}`);
    }
  }

  console.log('\n' + '='.repeat(60));
  process.exit(0);
}

testDecrypt().catch((err) => {
  console.error('\n❌ Error:', err.message);
  console.error(err.stack);
  process.exit(1);
});
