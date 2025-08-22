/**
 * Authentication routes for D1 database
 */

import { Hono } from "hono";
import type { D1Database as CloudflareD1Database } from "@cloudflare/workers-types";
import { D1Database } from "../database-d1";
import { generateChallenge, validatePublicKey } from "../crypto";

type Bindings = {
	DB: CloudflareD1Database;
};

const auth = new Hono<{ Bindings: Bindings }>();

/**
 * POST /auth/register
 * Register a new account with public key
 */
auth.post("/register", async (c) => {
	try {
		const { createD1Database } = await import("../database-d1");
		const db = new D1Database(c.env.DB);

		const body = await c.req.json();
		const { publicKey } = body;

		if (!publicKey || typeof publicKey !== "string") {
			return c.json({ error: "Public key is required" }, 400);
		}

		// Validate public key format
		const isValidKey = await validatePublicKey(publicKey);
		if (!isValidKey) {
			return c.json({ error: "Invalid public key format" }, 400);
		}

		// Create account
		const result = await db.createAccount(publicKey);

		if (!result.success) {
			return c.json({ error: result.error }, 400);
		}

		return c.json({
			success: true,
			accountId: result.accountId,
			message: "Account registered successfully",
		});
	} catch (error) {
		console.error("Registration error:", error);
		return c.json({ error: "Internal server error" }, 500);
	}
});

/**
 * POST /auth/challenge
 * Request an authentication challenge
 */
auth.post("/challenge", async (c) => {
	try {
		const { createD1Database } = await import("../database-d1");
		const db = new D1Database(c.env.DB);

		const body = await c.req.json();
		const { accountId } = body;

		if (!accountId || typeof accountId !== "string") {
			return c.json({ error: "Account ID is required" }, 400);
		}

		// Check if account exists
		const accountExists = await db.accountExists(accountId);
		if (!accountExists) {
			return c.json({ error: "Account not found" }, 404);
		}

		// Generate challenge
		const challenge = generateChallenge();
		const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

		// Store challenge
		await db.storeChallenge(accountId, challenge, expiresAt);

		return c.json({
			challenge,
			expiresAt,
			message: "Challenge generated successfully",
		});
	} catch (error) {
		console.error("Challenge generation error:", error);
		return c.json({ error: "Internal server error" }, 500);
	}
});

/**
 * POST /auth/verify
 * Verify a signed challenge (for testing purposes)
 */
auth.post("/verify", async (c) => {
	try {
		const { createD1Database } = await import("../database-d1");
		const db = new D1Database(c.env.DB);

		const body = await c.req.json();
		const { accountId, challenge, signature } = body;

		if (!accountId || !challenge || !signature) {
			return c.json(
				{ error: "Account ID, challenge, and signature are required" },
				400,
			);
		}

		// Get account
		const account = await db.getAccount(accountId);
		if (!account) {
			return c.json({ error: "Account not found" }, 404);
		}

		// Get challenge data
		const challengeData = await db.getChallenge(challenge);
		if (!challengeData) {
			return c.json({ error: "Invalid or expired challenge" }, 400);
		}

		if (challengeData.expiresAt < Date.now()) {
			return c.json({ error: "Challenge expired" }, 400);
		}

		// Import and verify
		const { importPublicKey, verifySignature } = await import("../crypto");
		const publicKey = await importPublicKey(account.publicKey);
		const isValid = await verifySignature(publicKey, signature, challenge);

		return c.json({
			valid: isValid,
			accountId: account.accountId,
			message: isValid
				? "Signature verified successfully"
				: "Invalid signature",
		});
	} catch (error) {
		console.error("Verification error:", error);
		return c.json({ error: "Internal server error" }, 500);
	}
});

/**
 * GET /auth/account/:accountId
 * Get account information (public data only)
 */
auth.get("/account/:accountId", async (c) => {
	try {
		const { createD1Database } = await import("../database-d1");
		const db = new D1Database(c.env.DB);

		const accountId = c.req.param("accountId");

		const account = await db.getAccount(accountId);
		if (!account) {
			return c.json({ error: "Account not found" }, 404);
		}

		// Return public account data only (no private key info)
		return c.json({
			accountId: account.accountId,
			createdAt: account.createdAt,
			// TODO: Add email when email binding is implemented
			// email: account.email
		});
	} catch (error) {
		console.error("Account retrieval error:", error);
		return c.json({ error: "Internal server error" }, 500);
	}
});

export default auth;
