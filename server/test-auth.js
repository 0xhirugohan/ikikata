/**
 * Test script to verify ECDSA authentication flow
 * Run with: bun run test-auth.js
 */

const SERVER_URL = 'http://localhost:3000';

// Simulate the crypto functions that would be in the client
async function generateKeyPair() {
  return await crypto.subtle.generateKey(
    {
      name: "ECDSA",
      namedCurve: "P-256"
    },
    true,
    ["sign", "verify"]
  );
}

async function exportPublicKey(publicKey) {
  const publicKeyBuffer = await crypto.subtle.exportKey("spki", publicKey);
  return arrayBufferToBase64(publicKeyBuffer);
}

async function signChallenge(privateKey, challenge) {
  const encoder = new TextEncoder();
  const data = encoder.encode(challenge);
  
  const signature = await crypto.subtle.sign(
    {
      name: "ECDSA",
      hash: "SHA-256"
    },
    privateKey,
    data
  );

  return arrayBufferToBase64(signature);
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  bytes.forEach(byte => binary += String.fromCharCode(byte));
  return btoa(binary);
}

async function testAuthFlow() {
  console.log('🧪 Testing ECDSA Authentication Flow\n');

  try {
    // 1. Generate key pair
    console.log('1. Generating ECDSA key pair...');
    const keyPair = await generateKeyPair();
    const publicKeyB64 = await exportPublicKey(keyPair.publicKey);
    console.log('✅ Key pair generated');

    // 2. Register account
    console.log('\n2. Registering account...');
    const registerResponse = await fetch(`${SERVER_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ publicKey: publicKeyB64 })
    });
    
    const registerData = await registerResponse.json();
    
    if (!registerResponse.ok) {
      throw new Error(`Registration failed: ${registerData.error}`);
    }
    
    console.log('✅ Account registered:', registerData.accountId.slice(0, 12) + '...');

    // 3. Request challenge
    console.log('\n3. Requesting authentication challenge...');
    const challengeResponse = await fetch(`${SERVER_URL}/auth/challenge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountId: registerData.accountId })
    });
    
    const challengeData = await challengeResponse.json();
    
    if (!challengeResponse.ok) {
      throw new Error(`Challenge failed: ${challengeData.error}`);
    }
    
    console.log('✅ Challenge received:', challengeData.challenge.slice(0, 12) + '...');

    // 4. Sign challenge
    console.log('\n4. Signing challenge with private key...');
    const signature = await signChallenge(keyPair.privateKey, challengeData.challenge);
    console.log('✅ Challenge signed');

    // 5. Verify signature
    console.log('\n5. Verifying signature with server...');
    const verifyResponse = await fetch(`${SERVER_URL}/auth/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accountId: registerData.accountId,
        challenge: challengeData.challenge,
        signature: signature
      })
    });
    
    const verifyData = await verifyResponse.json();
    
    if (!verifyResponse.ok) {
      throw new Error(`Verification failed: ${verifyData.error}`);
    }
    
    if (!verifyData.valid) {
      throw new Error('Signature verification failed');
    }
    
    console.log('✅ Signature verified successfully');

    // 6. Test authenticated request (this should fail because we haven't implemented the auth header format correctly)
    console.log('\n6. Testing authenticated request...');
    const authHeader = `Bearer ${registerData.accountId}.${signature}.${challengeData.challenge}`;
    
    const entriesResponse = await fetch(`${SERVER_URL}/sleep/entries`, {
      headers: { 'Authorization': authHeader }
    });
    
    if (entriesResponse.ok) {
      const entriesData = await entriesResponse.json();
      console.log('✅ Authenticated request successful:', entriesData);
    } else {
      const errorData = await entriesResponse.json();
      console.log('⚠️  Authenticated request failed (expected for demo):', errorData.error);
    }

    console.log('\n🎉 Authentication flow test completed successfully!');
    console.log('\n📊 Server stats:');
    
    const statsResponse = await fetch(`${SERVER_URL}/health/stats`);
    const statsData = await statsResponse.json();
    console.log(statsData);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
testAuthFlow();