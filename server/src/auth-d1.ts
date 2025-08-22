/**
 * Authentication middleware for D1 database
 */

import type { Context, Next } from "hono";
import type { D1Database as CloudflareD1Database } from "@cloudflare/workers-types";
import { D1Database, createD1Database } from "./database-d1";
import { importPublicKey, verifySignature } from "./crypto";

export interface AuthenticatedUser {
	accountId: string;
	publicKey: string;
}

type Bindings = {
	DB: CloudflareD1Database;
};

type Variables = {
	user?: AuthenticatedUser;
};

/**
 * Authentication middleware - validates signature-based authentication
 */
export async function requireAuth(
	c: Context<{ Bindings: Bindings; Variables: Variables }>,
	next: Next,
) {
	const authHeader = c.req.header("Authorization");

	if (!authHeader || !authHeader.startsWith("Bearer ")) {
		return c.json({ error: "Missing or invalid authorization header" }, 401);
	}

	try {
		const db = createD1Database(c.env);

		const token = authHeader.substring(7);
		const [accountId, signature, challenge] = token.split(".");

		if (!accountId || !signature || !challenge) {
			return c.json({ error: "Invalid authorization token format" }, 401);
		}

		// Get account data
		const account = await db.getAccount(accountId);
		if (!account) {
			return c.json({ error: "Account not found" }, 401);
		}

		// Verify challenge exists and is not expired
		const challengeData = await db.getChallenge(challenge);
		if (!challengeData) {
			return c.json({ error: "Invalid or expired challenge" }, 401);
		}

		if (challengeData.expiresAt < Date.now()) {
			return c.json({ error: "Challenge expired" }, 401);
		}

		if (challengeData.accountId !== accountId) {
			return c.json({ error: "Challenge does not match account" }, 401);
		}

		// Import public key and verify signature
		const publicKey = await importPublicKey(account.publicKey);
		const isValid = await verifySignature(publicKey, signature, challenge);

		if (!isValid) {
			return c.json({ error: "Invalid signature" }, 401);
		}

		// Store user data in context for use in route handlers
		c.set("user", {
			accountId: account.accountId,
			publicKey: account.publicKey,
		} as AuthenticatedUser);

		await next();
	} catch (error) {
		console.error("Authentication error:", error);
		return c.json({ error: "Authentication failed" }, 401);
	}
}

/**
 * Get authenticated user from context
 */
export function getAuthenticatedUser(c: Context<{ Bindings: Bindings; Variables: Variables }>): AuthenticatedUser {
	const user = c.get("user") as AuthenticatedUser;
	if (!user) {
		throw new Error("No authenticated user found in context");
	}
	return user;
}
