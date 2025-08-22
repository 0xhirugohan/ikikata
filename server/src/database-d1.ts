/**
 * Cloudflare D1 database adapter
 * Replaces the in-memory database with SQLite-based D1
 */

import type { D1Database as CloudflareD1Database } from "@cloudflare/workers-types";
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

interface SleepAnalytics {
	total_entries: number;
	avg_sleep_quality?: number;
	avg_morning_energy?: number;
	avg_afternoon_energy?: number;
	avg_sleep_onset?: number;
	caffeine_percentage?: number;
	exercise_percentage?: number;
	recent_quality_trend?: string;
	recommendations: string[];
	averageSleepQuality?: number;
	averageMorningEnergy?: number;
	averageSleepOnset?: number;
}

interface SleepTrendData {
	period: unknown;
	entryCount: unknown;
	averageSleepQuality: number;
	averageMorningEnergy: number;
	averageSleepOnset: number;
	periodStart: unknown;
	periodEnd: unknown;
	avg_quality?: number;
	avg_morning_energy?: number;
	avg_afternoon_energy?: number;
	entry_count?: number;
}

interface CloudflareEnv {
	DB: CloudflareD1Database;
}

export class D1Database {
	constructor(private db: CloudflareD1Database) {}

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
			const existing = await this.db
				.prepare("SELECT account_id FROM accounts WHERE account_id = ?")
				.bind(accountId)
				.first();

			if (existing) {
				return { success: false, error: "Account already exists" };
			}

			// Insert new account
			await this.db
				.prepare("INSERT INTO accounts (account_id, public_key) VALUES (?, ?)")
				.bind(accountId, publicKey)
				.run();

			return { success: true, accountId };
		} catch (error) {
			console.error("Account creation error:", error);
			return { success: false, error: "Invalid public key" };
		}
	}

	/**
	 * Get account by account ID
	 */
	async getAccount(accountId: string): Promise<PublicKeyData | null> {
		const result = await this.db
			.prepare(
				"SELECT account_id, public_key, created_at FROM accounts WHERE account_id = ?",
			)
			.bind(accountId)
			.first();

		if (!result) return null;

		return {
			accountId: result.account_id as string,
			publicKey: result.public_key as string,
			createdAt: result.created_at as string,
		};
	}

	/**
	 * Check if account exists
	 */
	async accountExists(accountId: string): Promise<boolean> {
		const result = await this.db
			.prepare("SELECT 1 FROM accounts WHERE account_id = ? LIMIT 1")
			.bind(accountId)
			.first();

		return !!result;
	}

	// Challenge Management

	/**
	 * Store an authentication challenge
	 */
	async storeChallenge(
		accountId: string,
		challenge: string,
		expiresAt: number,
	): Promise<void> {
		await this.db
			.prepare(
				"INSERT INTO auth_challenges (challenge, account_id, expires_at) VALUES (?, ?, ?)",
			)
			.bind(challenge, accountId, expiresAt)
			.run();
	}

	/**
	 * Get and remove a challenge (single use)
	 */
	async getChallenge(challenge: string): Promise<AuthChallenge | null> {
		// Get challenge
		const result = await this.db
			.prepare(
				"SELECT challenge, account_id, expires_at FROM auth_challenges WHERE challenge = ?",
			)
			.bind(challenge)
			.first();

		if (!result) return null;

		// Delete challenge (single use)
		await this.db
			.prepare("DELETE FROM auth_challenges WHERE challenge = ?")
			.bind(challenge)
			.run();

		return {
			challenge: result.challenge as string,
			accountId: result.account_id as string,
			expiresAt: result.expires_at as number,
		};
	}

	/**
	 * Clean up expired challenges
	 */
	async cleanupExpiredChallenges(): Promise<void> {
		const now = Date.now();
		await this.db
			.prepare("DELETE FROM auth_challenges WHERE expires_at < ?")
			.bind(now)
			.run();
	}

	// Sleep Data Management

	/**
	 * Add sleep entry for an account
	 */
	async addSleepEntry(
		accountId: string,
		entry: Omit<SleepEntry, "accountId" | "createdAt">,
	): Promise<boolean> {
		try {
			await this.db
				.prepare(`
          INSERT INTO sleep_entries (
            id, account_id, date, sleep_quality, morning_energy, 
            time_to_fall_asleep, afternoon_energy, notes,
            stress_level, screen_time, room_temp, caffeine_time,
            exercise_time, pre_bedtime_activities, anxiety_level
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `)
				.bind(
					entry.id,
					accountId,
					entry.date,
					entry.sleepQuality,
					entry.morningEnergy,
					entry.timeToFallAsleep,
					entry.afternoonEnergy,
					entry.notes,
					entry.stressLevel || null,
					entry.screenTime || null,
					entry.roomTemp || null,
					entry.caffeineTime || null,
					entry.exerciseTime || null,
					entry.preBedtimeActivities || null,
					entry.anxietyLevel || null,
				)
				.run();

			return true;
		} catch (error) {
			console.error("Add sleep entry error:", error);
			return false;
		}
	}

	/**
	 * Get sleep entries for an account
	 */
	async getSleepEntries(
		accountId: string,
		limit?: number,
	): Promise<SleepEntry[]> {
		const query = limit
			? "SELECT * FROM sleep_entries WHERE account_id = ? ORDER BY date DESC LIMIT ?"
			: "SELECT * FROM sleep_entries WHERE account_id = ? ORDER BY date DESC";

		const stmt = this.db.prepare(query);
		const bound = limit ? stmt.bind(accountId, limit) : stmt.bind(accountId);
		const results = await bound.all();

		return results.results.map((row) => ({
			id: row.id as string,
			accountId: row.account_id as string,
			date: row.date as string,
			sleepQuality: row.sleep_quality as SleepEntry["sleepQuality"],
			morningEnergy: row.morning_energy as SleepEntry["morningEnergy"],
			timeToFallAsleep:
				row.time_to_fall_asleep as SleepEntry["timeToFallAsleep"],
			afternoonEnergy: row.afternoon_energy as SleepEntry["afternoonEnergy"],
			notes: row.notes as string,
			stressLevel: row.stress_level as number | undefined,
			screenTime: row.screen_time as number | undefined,
			roomTemp: row.room_temp as number | undefined,
			caffeineTime: row.caffeine_time as string | undefined,
			exerciseTime: row.exercise_time as string | undefined,
			preBedtimeActivities: row.pre_bedtime_activities as string | undefined,
			anxietyLevel: row.anxiety_level as number | undefined,
			createdAt: row.created_at as string,
		}));
	}

	/**
	 * Update sleep entry
	 */
	async updateSleepEntry(
		accountId: string,
		entryId: string,
		updates: Partial<SleepEntry>,
	): Promise<boolean> {
		try {
			// Build dynamic UPDATE query based on provided fields
			const fields = [];
			const values = [];

			if (updates.sleepQuality) {
				fields.push("sleep_quality = ?");
				values.push(updates.sleepQuality);
			}
			if (updates.morningEnergy) {
				fields.push("morning_energy = ?");
				values.push(updates.morningEnergy);
			}
			if (updates.timeToFallAsleep) {
				fields.push("time_to_fall_asleep = ?");
				values.push(updates.timeToFallAsleep);
			}
			if (updates.afternoonEnergy) {
				fields.push("afternoon_energy = ?");
				values.push(updates.afternoonEnergy);
			}
			if (updates.notes !== undefined) {
				fields.push("notes = ?");
				values.push(updates.notes);
			}
			if (updates.stressLevel !== undefined) {
				fields.push("stress_level = ?");
				values.push(updates.stressLevel);
			}
			if (updates.screenTime !== undefined) {
				fields.push("screen_time = ?");
				values.push(updates.screenTime);
			}
			if (updates.roomTemp !== undefined) {
				fields.push("room_temp = ?");
				values.push(updates.roomTemp);
			}
			if (updates.caffeineTime !== undefined) {
				fields.push("caffeine_time = ?");
				values.push(updates.caffeineTime);
			}
			if (updates.exerciseTime !== undefined) {
				fields.push("exercise_time = ?");
				values.push(updates.exerciseTime);
			}
			if (updates.preBedtimeActivities !== undefined) {
				fields.push("pre_bedtime_activities = ?");
				values.push(updates.preBedtimeActivities);
			}
			if (updates.anxietyLevel !== undefined) {
				fields.push("anxiety_level = ?");
				values.push(updates.anxietyLevel);
			}

			if (fields.length === 0) return false;

			values.push(entryId, accountId);

			const result = await this.db
				.prepare(
					`UPDATE sleep_entries SET ${fields.join(", ")} WHERE id = ? AND account_id = ?`,
				)
				.bind(...values)
				.run();

			return result.meta.changes > 0;
		} catch (error) {
			console.error("Update sleep entry error:", error);
			return false;
		}
	}

	/**
	 * Delete sleep entry
	 */
	async deleteSleepEntry(accountId: string, entryId: string): Promise<boolean> {
		try {
			const result = await this.db
				.prepare("DELETE FROM sleep_entries WHERE id = ? AND account_id = ?")
				.bind(entryId, accountId)
				.run();

			return result.meta.changes > 0;
		} catch (error) {
			console.error("Delete sleep entry error:", error);
			return false;
		}
	}

	// Analytics with SQL

	/**
	 * Get comprehensive sleep analytics using SQL
	 */
	async getSleepAnalytics(accountId: string): Promise<SleepAnalytics> {
		// Get basic stats
		const stats = await this.db
			.prepare(`
        SELECT 
          COUNT(*) as total_entries,
          AVG(CASE sleep_quality 
            WHEN 'good' THEN 3 
            WHEN 'fair' THEN 2 
            WHEN 'poor' THEN 1 
          END) as avg_sleep_quality,
          AVG(CASE morning_energy 
            WHEN 'energized' THEN 4 
            WHEN 'alert' THEN 3 
            WHEN 'tired' THEN 2 
            WHEN 'exhausted' THEN 1 
          END) as avg_morning_energy,
          AVG(CASE afternoon_energy 
            WHEN 'energized' THEN 4 
            WHEN 'alert' THEN 3 
            WHEN 'tired' THEN 2 
            WHEN 'exhausted' THEN 1 
          END) as avg_afternoon_energy,
          AVG(CASE time_to_fall_asleep 
            WHEN 'under-10' THEN 5 
            WHEN '10-20' THEN 4 
            WHEN '20-30' THEN 3 
            WHEN '30-60' THEN 2 
            WHEN 'over-60' THEN 1 
          END) as avg_sleep_onset
        FROM sleep_entries 
        WHERE account_id = ?
      `)
			.bind(accountId)
			.first();

		// Calculate streak (consecutive days)
		const recentEntries = await this.db
			.prepare(`
        SELECT date 
        FROM sleep_entries 
        WHERE account_id = ? 
        ORDER BY date DESC 
        LIMIT 30
      `)
			.bind(accountId)
			.all();

		let streak = 0;
		const today = new Date();
		const dates = recentEntries.results.map((r) => new Date(r.date as string));

		for (let i = 0; i < dates.length; i++) {
			const expectedDate = new Date(today);
			expectedDate.setDate(today.getDate() - i);
			expectedDate.setHours(0, 0, 0, 0);

			const entryDate = new Date(dates[i] || new Date());
			entryDate.setHours(0, 0, 0, 0);

			if (entryDate.getTime() === expectedDate.getTime()) {
				streak++;
			} else {
				break;
			}
		}

		return {
			total_entries: stats?.total_entries || 0,
			avg_sleep_quality: Number(stats?.avg_sleep_quality || 0),
			avg_morning_energy: Number(stats?.avg_morning_energy || 0),
			avg_afternoon_energy: Number(stats?.avg_afternoon_energy || 0),
			avg_sleep_onset: Number(stats?.avg_sleep_onset || 0),
			averageSleepQuality: Math.round(Number(stats?.avg_sleep_quality || 0) * 100) / 100,
			averageMorningEnergy: Math.round(Number(stats?.avg_morning_energy || 0) * 100) / 100,
			averageSleepOnset: Math.round(Number(stats?.avg_sleep_onset || 0) * 100) / 100,
			recommendations: this.generateRecommendations((stats as unknown as SleepAnalytics) || { total_entries: 0, recommendations: [] } as SleepAnalytics),
		} as SleepAnalytics;
	}

	/**
	 * Generate recommendations based on analytics
	 */
	private generateRecommendations(stats: SleepAnalytics): string[] {
		const recommendations: string[] = [];

		if (!stats || stats.total_entries === 0) {
			return ["Start tracking your sleep to get insights!"];
		}

		if ((stats.avg_sleep_quality || 0) < 2) {
			recommendations.push(
				"Consider improving your sleep environment or routine",
			);
		}
		if ((stats.avg_sleep_onset || 0) < 3) {
			recommendations.push(
				"Try to fall asleep faster - consider relaxation techniques",
			);
		}
		if ((stats.avg_morning_energy || 0) < 2.5) {
			recommendations.push("Focus on getting more restorative sleep");
		}
		if (stats.total_entries < 7) {
			recommendations.push("Track more days to get better insights");
		}

		if (recommendations.length === 0) {
			recommendations.push("Your sleep patterns look good! Keep it up.");
		}

		return recommendations;
	}

	// Statistics

	/**
	 * Get sleep trends over time periods
	 */
	async getSleepTrends(
		accountId: string,
		period: "week" | "month" | "quarter",
	): Promise<SleepTrendData[]> {
		let groupBy: string;
		let dateRange: string;

		switch (period) {
			case "week":
				groupBy = "strftime('%Y-%W', date)";
				dateRange = "date >= date('now', '-12 weeks')";
				break;
			case "month":
				groupBy = "strftime('%Y-%m', date)";
				dateRange = "date >= date('now', '-12 months')";
				break;
			case "quarter":
				groupBy =
					"strftime('%Y', date) || '-Q' || ((strftime('%m', date) - 1) / 3 + 1)";
				dateRange = "date >= date('now', '-2 years')";
				break;
		}

		const trends = await this.db
			.prepare(`
        SELECT 
          ${groupBy} as period,
          COUNT(*) as entry_count,
          AVG(CASE sleep_quality 
            WHEN 'good' THEN 3 
            WHEN 'fair' THEN 2 
            WHEN 'poor' THEN 1 
          END) as avg_sleep_quality,
          AVG(CASE morning_energy 
            WHEN 'energized' THEN 4 
            WHEN 'alert' THEN 3 
            WHEN 'tired' THEN 2 
            WHEN 'exhausted' THEN 1 
          END) as avg_morning_energy,
          AVG(CASE time_to_fall_asleep 
            WHEN 'under-10' THEN 5 
            WHEN '10-20' THEN 4 
            WHEN '20-30' THEN 3 
            WHEN '30-60' THEN 2 
            WHEN 'over-60' THEN 1 
          END) as avg_sleep_onset,
          MIN(date) as period_start,
          MAX(date) as period_end
        FROM sleep_entries 
        WHERE account_id = ? AND ${dateRange}
        GROUP BY ${groupBy}
        ORDER BY period
      `)
			.bind(accountId)
			.all();

		return trends.results.map((row: any) => ({
			period: row.period,
			entryCount: row.entry_count,
			averageSleepQuality: Math.round(Number(row.avg_sleep_quality || 0) * 100) / 100,
			averageMorningEnergy:
				Math.round(Number(row.avg_morning_energy || 0) * 100) / 100,
			averageSleepOnset: Math.round(Number(row.avg_sleep_onset || 0) * 100) / 100,
			periodStart: row.period_start,
			periodEnd: row.period_end,
		}));
	}

	/**
	 * Get database statistics
	 */
	async getStats() {
		const accountStats = await this.db
			.prepare("SELECT COUNT(*) as count FROM accounts")
			.first();

		const challengeStats = await this.db
			.prepare(
				"SELECT COUNT(*) as count FROM auth_challenges WHERE expires_at > ?",
			)
			.bind(Date.now())
			.first();

		const entryStats = await this.db
			.prepare("SELECT COUNT(*) as count FROM sleep_entries")
			.first();

		return {
			totalAccounts: accountStats?.count || 0,
			activeChallenges: challengeStats?.count || 0,
			totalSleepEntries: entryStats?.count || 0,
		};
	}
}

/**
 * Factory function to create D1 database instance
 */
export function createD1Database(env: { DB: CloudflareD1Database }): D1Database {
	return new D1Database(env.DB);
}

// Cleanup expired challenges every 5 minutes (in Workers, use scheduled events)
// This would be replaced with a Cloudflare Cron Trigger in production
