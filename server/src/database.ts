/**
 * Simple in-memory database for development
 * TODO: Replace with proper database (SQLite/PostgreSQL) in production
 */

import type { PublicKeyData, AuthChallenge } from "./crypto";

interface SleepEntry {
	id: string;
	accountId: string;
	date: string;
	sleepQuality: "good" | "fair" | "poor";
	morningEnergy: "energized" | "alert" | "tired" | "exhausted";
	timeToFallAsleep: "under-10" | "10-20" | "20-30" | "30-60" | "over-60";
	afternoonEnergy: "energized" | "alert" | "tired" | "exhausted";
	notes: string;
	stressLevel?: number;
	screenTime?: number;
	roomTemp?: number;
	caffeineTime?: string;
	exerciseTime?: string;
	preBedtimeActivities?: string;
	anxietyLevel?: number;
	createdAt: string;
}

class Database {
	private accounts: Map<string, PublicKeyData> = new Map();
	private challenges: Map<string, AuthChallenge> = new Map();
	private sleepEntries: Map<string, SleepEntry[]> = new Map();

	// Account Management

	/**
	 * Register a new account with public key
	 */
	async createAccount(
		publicKey: string,
	): Promise<{ success: boolean; accountId?: string; error?: string }> {
		try {
			// Import and validate the public key
			const crypto = await import("./crypto");
			const importedKey = await crypto.importPublicKey(publicKey);
			const accountId =
				await crypto.generateAccountIdFromPublicKey(importedKey);

			// Check if account already exists
			if (this.accounts.has(accountId)) {
				return { success: false, error: "Account already exists" };
			}

			// Store account
			const accountData: PublicKeyData = {
				accountId,
				publicKey,
				createdAt: new Date().toISOString(),
			};

			this.accounts.set(accountId, accountData);
			this.sleepEntries.set(accountId, []); // Initialize empty sleep entries

			return { success: true, accountId };
		} catch (error) {
			return { success: false, error: "Invalid public key" };
		}
	}

	/**
	 * Get account by account ID
	 */
	getAccount(accountId: string): PublicKeyData | null {
		return this.accounts.get(accountId) || null;
	}

	/**
	 * Check if account exists
	 */
	accountExists(accountId: string): boolean {
		return this.accounts.has(accountId);
	}

	// Challenge Management

	/**
	 * Store an authentication challenge
	 */
	storeChallenge(
		accountId: string,
		challenge: string,
		expiresAt: number,
	): void {
		this.challenges.set(challenge, {
			challenge,
			expiresAt,
			accountId,
		});
	}

	/**
	 * Get and remove a challenge (single use)
	 */
	getChallenge(challenge: string): AuthChallenge | null {
		const challengeData = this.challenges.get(challenge);
		if (challengeData) {
			this.challenges.delete(challenge);
			return challengeData;
		}
		return null;
	}

	/**
	 * Clean up expired challenges
	 */
	cleanupExpiredChallenges(): void {
		const now = Date.now();
		for (const [challenge, data] of this.challenges) {
			if (data.expiresAt < now) {
				this.challenges.delete(challenge);
			}
		}
	}

	// Sleep Data Management

	/**
	 * Add sleep entry for an account
	 */
	addSleepEntry(
		accountId: string,
		entry: Omit<SleepEntry, "accountId" | "createdAt">,
	): boolean {
		const entries = this.sleepEntries.get(accountId);
		if (!entries) return false;

		const sleepEntry: SleepEntry = {
			...entry,
			accountId,
			createdAt: new Date().toISOString(),
		};

		entries.push(sleepEntry);
		return true;
	}

	/**
	 * Get sleep entries for an account
	 */
	getSleepEntries(accountId: string, limit?: number): SleepEntry[] {
		const entries = this.sleepEntries.get(accountId) || [];

		// Sort by date (newest first)
		const sorted = entries.sort(
			(a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
		);

		return limit ? sorted.slice(0, limit) : sorted;
	}

	/**
	 * Update sleep entry
	 */
	updateSleepEntry(
		accountId: string,
		entryId: string,
		updates: Partial<SleepEntry>,
	): boolean {
		const entries = this.sleepEntries.get(accountId);
		if (!entries) return false;

		const entryIndex = entries.findIndex((e) => e.id === entryId);
		if (entryIndex === -1) return false;

		entries[entryIndex] = { ...entries[entryIndex], ...updates } as SleepEntry;
		return true;
	}

	/**
	 * Delete sleep entry
	 */
	deleteSleepEntry(accountId: string, entryId: string): boolean {
		const entries = this.sleepEntries.get(accountId);
		if (!entries) return false;

		const entryIndex = entries.findIndex((e) => e.id === entryId);
		if (entryIndex === -1) return false;

		entries.splice(entryIndex, 1);
		return true;
	}

	// Statistics

	/**
	 * Get database statistics
	 */
	getStats() {
		return {
			totalAccounts: this.accounts.size,
			activeChallenges: this.challenges.size,
			totalSleepEntries: Array.from(this.sleepEntries.values()).reduce(
				(sum, entries) => sum + entries.length,
				0,
			),
		};
	}
}

// Singleton instance
export const db = new Database();

// Cleanup expired challenges every 5 minutes
setInterval(
	() => {
		db.cleanupExpiredChallenges();
	},
	5 * 60 * 1000,
);
