/**
 * Authentication routes
 */

import { Hono } from 'hono';
import { db } from '../database';
import { generateChallenge, validatePublicKey } from '../crypto';

const auth = new Hono();

/**
 * POST /auth/register
 * Register a new account with public key
 */
auth.post('/register', async (c) => {
  try {
    const body = await c.req.json();
    const { publicKey } = body;

    if (!publicKey || typeof publicKey !== 'string') {
      return c.json({ error: 'Public key is required' }, 400);
    }

    // Validate public key format
    const isValidKey = await validatePublicKey(publicKey);
    if (!isValidKey) {
      return c.json({ error: 'Invalid public key format' }, 400);
    }

    // Create account
    const result = await db.createAccount(publicKey);

    if (!result.success) {
      return c.json({ error: result.error }, 400);
    }

    return c.json({
      success: true,
      accountId: result.accountId,
      message: 'Account registered successfully'
    });

  } catch (error) {
    console.error('Registration error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

/**
 * POST /auth/challenge
 * Request an authentication challenge
 */
auth.post('/challenge', async (c) => {
  try {
    const body = await c.req.json();
    const { accountId } = body;

    if (!accountId || typeof accountId !== 'string') {
      return c.json({ error: 'Account ID is required' }, 400);
    }

    // Check if account exists
    if (!db.accountExists(accountId)) {
      return c.json({ error: 'Account not found' }, 404);
    }

    // Generate challenge
    const challenge = generateChallenge();
    const expiresAt = Date.now() + (5 * 60 * 1000); // 5 minutes

    // Store challenge
    db.storeChallenge(accountId, challenge, expiresAt);

    return c.json({
      challenge,
      expiresAt,
      message: 'Challenge generated successfully'
    });

  } catch (error) {
    console.error('Challenge generation error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

/**
 * POST /auth/verify
 * Verify a signed challenge (for testing purposes)
 * In practice, verification happens in the auth middleware
 */
auth.post('/verify', async (c) => {
  try {
    const body = await c.req.json();
    const { accountId, challenge, signature } = body;

    if (!accountId || !challenge || !signature) {
      return c.json({ error: 'Account ID, challenge, and signature are required' }, 400);
    }

    // Get account
    const account = db.getAccount(accountId);
    if (!account) {
      return c.json({ error: 'Account not found' }, 404);
    }

    // Get challenge data
    const challengeData = db.getChallenge(challenge);
    if (!challengeData) {
      return c.json({ error: 'Invalid or expired challenge' }, 400);
    }

    if (challengeData.expiresAt < Date.now()) {
      return c.json({ error: 'Challenge expired' }, 400);
    }

    // Import and verify
    const { importPublicKey, verifySignature } = await import('../crypto');
    const publicKey = await importPublicKey(account.publicKey);
    const isValid = await verifySignature(publicKey, signature, challenge);

    return c.json({
      valid: isValid,
      accountId: account.accountId,
      message: isValid ? 'Signature verified successfully' : 'Invalid signature'
    });

  } catch (error) {
    console.error('Verification error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

/**
 * GET /auth/account/:accountId
 * Get account information (public data only)
 */
auth.get('/account/:accountId', async (c) => {
  try {
    const accountId = c.req.param('accountId');
    
    const account = db.getAccount(accountId);
    if (!account) {
      return c.json({ error: 'Account not found' }, 404);
    }

    // Return public account data only (no private key info)
    return c.json({
      accountId: account.accountId,
      createdAt: account.createdAt,
      // TODO: Add email when email binding is implemented
      // email: account.email
    });

  } catch (error) {
    console.error('Account retrieval error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

export default auth;