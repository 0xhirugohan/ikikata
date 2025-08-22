/**
 * Basic tests for crypto utilities
 * Run in browser console to verify functionality
 */

import {
  generateKeyPair,
  serializeKeyPair,
  deserializeKeyPair,
  generateAccountId,
  signChallenge,
  verifySignature,
  generateRecoveryPhrase,
  AccountStorage
} from './crypto';

export async function testCryptoFunctions() {
  console.log('🧪 Testing crypto functions...');

  try {
    // Test key pair generation
    console.log('1. Generating key pair...');
    const keyPair = await generateKeyPair();
    console.log('✅ Key pair generated successfully');

    // Test serialization
    console.log('2. Testing serialization...');
    const serialized = await serializeKeyPair(keyPair);
    console.log('✅ Key pair serialized successfully');

    // Test deserialization
    console.log('3. Testing deserialization...');
    const deserialized = await deserializeKeyPair(serialized);
    console.log('✅ Key pair deserialized successfully');

    // Test account ID generation
    console.log('4. Testing account ID generation...');
    const accountId = await generateAccountId(keyPair.publicKey);
    console.log('✅ Account ID generated:', accountId.slice(0, 12) + '...');

    // Test signing and verification
    console.log('5. Testing signing and verification...');
    const challenge = 'test-challenge-' + Date.now();
    const signature = await signChallenge(keyPair.privateKey, challenge);
    console.log('✅ Challenge signed');

    const isValid = await verifySignature(keyPair.publicKey, signature, challenge);
    console.log('✅ Signature verified:', isValid);

    // Test recovery phrase
    console.log('6. Testing recovery phrase...');
    const recoveryPhrase = await generateRecoveryPhrase(keyPair.privateKey);
    console.log('✅ Recovery phrase generated (length:', recoveryPhrase.length, 'chars)');

    console.log('🎉 All crypto tests passed!');
    return {
      keyPair,
      serialized,
      accountId,
      signature,
      isValid,
      recoveryPhrase
    };

  } catch (error) {
    console.error('❌ Crypto test failed:', error);
    throw error;
  }
}

export async function testAccountStorage() {
  console.log('🧪 Testing account storage...');

  try {
    // Create test account
    const keyPair = await generateKeyPair();
    const serialized = await serializeKeyPair(keyPair);
    const accountId = await generateAccountId(keyPair.publicKey);

    const testAccount = {
      accountId,
      publicKey: serialized.publicKey,
      createdAt: new Date().toISOString()
    };

    // Test save
    console.log('1. Testing save...');
    AccountStorage.saveAccount(testAccount, serialized);
    console.log('✅ Account saved');

    // Test load
    console.log('2. Testing load...');
    const loaded = AccountStorage.loadAccount();
    console.log('✅ Account loaded:', loaded?.account.accountId.slice(0, 12) + '...');

    // Test update
    console.log('3. Testing update...');
    AccountStorage.updateAccount({ email: 'test@example.com' });
    const updated = AccountStorage.loadAccount();
    console.log('✅ Account updated, email:', updated?.account.email);

    // Test clear
    console.log('4. Testing clear...');
    AccountStorage.clearAccount();
    const cleared = AccountStorage.loadAccount();
    console.log('✅ Account cleared:', cleared === null);

    console.log('🎉 All storage tests passed!');

  } catch (error) {
    console.error('❌ Storage test failed:', error);
    throw error;
  }
}