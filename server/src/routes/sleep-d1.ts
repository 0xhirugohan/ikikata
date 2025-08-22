/**
 * Sleep tracking routes for D1 database
 */

import { Hono } from "hono";
import type { D1Database as CloudflareD1Database } from "@cloudflare/workers-types";
import { D1Database } from "../database-d1";
import { requireAuth, getAuthenticatedUser } from "../auth-d1";

type Bindings = {
	DB: CloudflareD1Database;
};

type Variables = {
	user?: any;
};

const sleep = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// Apply authentication middleware to all routes
sleep.use("*", requireAuth);

/**
 * POST /sleep/entries
 * Add a new sleep entry
 */
sleep.post("/entries", async (c) => {
	try {
		const db = new D1Database(c.env.DB);

		const user = getAuthenticatedUser(c);
		const body = await c.req.json();

		const {
			id,
			date,
			sleepQuality,
			morningEnergy,
			timeToFallAsleep,
			afternoonEnergy,
			notes,
			stressLevel,
			screenTime,
			roomTemp,
			caffeineTime,
			exerciseTime,
			preBedtimeActivities,
			anxietyLevel,
		} = body;

		// Validate required fields
		if (
			!id ||
			!date ||
			!sleepQuality ||
			!morningEnergy ||
			!timeToFallAsleep ||
			!afternoonEnergy
		) {
			return c.json({ error: "Missing required fields" }, 400);
		}

		// Validate sleep quality values
		const validSleepQuality = ["good", "fair", "poor"];
		const validEnergyLevel = ["energized", "alert", "tired", "exhausted"];
		const validSleepOnset = ["under-10", "10-20", "20-30", "30-60", "over-60"];

		if (!validSleepQuality.includes(sleepQuality)) {
			return c.json({ error: "Invalid sleep quality value" }, 400);
		}

		if (
			!validEnergyLevel.includes(morningEnergy) ||
			!validEnergyLevel.includes(afternoonEnergy)
		) {
			return c.json({ error: "Invalid energy level value" }, 400);
		}

		if (!validSleepOnset.includes(timeToFallAsleep)) {
			return c.json({ error: "Invalid sleep onset time value" }, 400);
		}

		// Validate date format (YYYY-MM-DD)
		const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
		if (!dateRegex.test(date)) {
			return c.json({ error: "Invalid date format. Use YYYY-MM-DD" }, 400);
		}

		// Add entry to database
		const success = await db.addSleepEntry(user.accountId, {
			id,
			date,
			sleepQuality,
			morningEnergy,
			timeToFallAsleep,
			afternoonEnergy,
			notes: notes || "",
			stressLevel,
			screenTime,
			roomTemp,
			caffeineTime,
			exerciseTime,
			preBedtimeActivities,
			anxietyLevel,
		});

		if (!success) {
			return c.json(
				{
					error:
						"Failed to add sleep entry. Entry might already exist for this date.",
				},
				409,
			);
		}

		return c.json({
			success: true,
			message: "Sleep entry added successfully",
		});
	} catch (error) {
		console.error("Add sleep entry error:", error);
		return c.json({ error: "Internal server error" }, 500);
	}
});

/**
 * GET /sleep/entries
 * Get sleep entries for authenticated user
 */
sleep.get("/entries", async (c) => {
	try {
		const db = new D1Database(c.env.DB);

		const user = getAuthenticatedUser(c);
		const limit = c.req.query("limit")
			? parseInt(c.req.query("limit")!)
			: undefined;
		const offset = c.req.query("offset") ? parseInt(c.req.query("offset")!) : 0;

		// Validate limit and offset
		if (limit && (limit < 1 || limit > 100)) {
			return c.json({ error: "Limit must be between 1 and 100" }, 400);
		}

		if (offset < 0) {
			return c.json({ error: "Offset must be non-negative" }, 400);
		}

		const entries = await db.getSleepEntries(user.accountId, limit);

		return c.json({
			entries,
			count: entries.length,
			hasMore: limit ? entries.length === limit : false,
		});
	} catch (error) {
		console.error("Get sleep entries error:", error);
		return c.json({ error: "Internal server error" }, 500);
	}
});

/**
 * GET /sleep/entries/:entryId
 * Get a specific sleep entry
 */
sleep.get("/entries/:entryId", async (c) => {
	try {
		const db = new D1Database(c.env.DB);

		const user = getAuthenticatedUser(c);
		const entryId = c.req.param("entryId");

		const entries = await db.getSleepEntries(user.accountId);
		const entry = entries.find((e: any) => e.id === entryId);

		if (!entry) {
			return c.json({ error: "Sleep entry not found" }, 404);
		}

		return c.json({ entry });
	} catch (error) {
		console.error("Get sleep entry error:", error);
		return c.json({ error: "Internal server error" }, 500);
	}
});

/**
 * PUT /sleep/entries/:entryId
 * Update a sleep entry
 */
sleep.put("/entries/:entryId", async (c) => {
	try {
		const db = new D1Database(c.env.DB);

		const user = getAuthenticatedUser(c);
		const entryId = c.req.param("entryId");
		const body = await c.req.json();

		// Validate enum values if provided
		const validSleepQuality = ["good", "fair", "poor"];
		const validEnergyLevel = ["energized", "alert", "tired", "exhausted"];
		const validSleepOnset = ["under-10", "10-20", "20-30", "30-60", "over-60"];

		if (body.sleepQuality && !validSleepQuality.includes(body.sleepQuality)) {
			return c.json({ error: "Invalid sleep quality value" }, 400);
		}

		if (
			(body.morningEnergy && !validEnergyLevel.includes(body.morningEnergy)) ||
			(body.afternoonEnergy && !validEnergyLevel.includes(body.afternoonEnergy))
		) {
			return c.json({ error: "Invalid energy level value" }, 400);
		}

		if (
			body.timeToFallAsleep &&
			!validSleepOnset.includes(body.timeToFallAsleep)
		) {
			return c.json({ error: "Invalid sleep onset time value" }, 400);
		}

		const success = await db.updateSleepEntry(user.accountId, entryId, body);

		if (!success) {
			return c.json({ error: "Sleep entry not found or update failed" }, 404);
		}

		return c.json({
			success: true,
			message: "Sleep entry updated successfully",
		});
	} catch (error) {
		console.error("Update sleep entry error:", error);
		return c.json({ error: "Internal server error" }, 500);
	}
});

/**
 * DELETE /sleep/entries/:entryId
 * Delete a sleep entry
 */
sleep.delete("/entries/:entryId", async (c) => {
	try {
		const db = new D1Database(c.env.DB);

		const user = getAuthenticatedUser(c);
		const entryId = c.req.param("entryId");

		const success = await db.deleteSleepEntry(user.accountId, entryId);

		if (!success) {
			return c.json({ error: "Sleep entry not found or delete failed" }, 404);
		}

		return c.json({
			success: true,
			message: "Sleep entry deleted successfully",
		});
	} catch (error) {
		console.error("Delete sleep entry error:", error);
		return c.json({ error: "Internal server error" }, 500);
	}
});

/**
 * GET /sleep/analytics
 * Get sleep analytics for authenticated user
 */
sleep.get("/analytics", async (c) => {
	try {
		const db = new D1Database(c.env.DB);

		const user = getAuthenticatedUser(c);
		const days = c.req.query("days") ? parseInt(c.req.query("days")!) : 30;

		// Validate days parameter
		if (days < 1 || days > 365) {
			return c.json({ error: "Days parameter must be between 1 and 365" }, 400);
		}

		const analytics = await db.getSleepAnalytics(user.accountId);

		return c.json(analytics);
	} catch (error) {
		console.error("Get sleep analytics error:", error);
		return c.json({ error: "Internal server error" }, 500);
	}
});

/**
 * GET /sleep/trends
 * Get sleep trends over time
 */
sleep.get("/trends", async (c) => {
	try {
		const db = new D1Database(c.env.DB);

		const user = getAuthenticatedUser(c);
		const period = c.req.query("period") || "week"; // week, month, quarter

		if (!["week", "month", "quarter"].includes(period)) {
			return c.json({ error: "Period must be week, month, or quarter" }, 400);
		}

		const trends = await db.getSleepTrends(user.accountId, period as "week" | "month" | "quarter");

		return c.json({
			period,
			trends,
		});
	} catch (error) {
		console.error("Get sleep trends error:", error);
		return c.json({ error: "Internal server error" }, 500);
	}
});

/**
 * GET /sleep/export
 * Export sleep data as CSV
 */
sleep.get("/export", async (c) => {
	try {
		const db = new D1Database(c.env.DB);

		const user = getAuthenticatedUser(c);
		const format = c.req.query("format") || "json";

		if (!["json", "csv"].includes(format)) {
			return c.json({ error: "Format must be json or csv" }, 400);
		}

		const entries = await db.getSleepEntries(user.accountId);

		if (format === "csv") {
			const csvHeaders = [
				"id",
				"date",
				"sleep_quality",
				"morning_energy",
				"time_to_fall_asleep",
				"afternoon_energy",
				"notes",
				"stress_level",
				"screen_time",
				"room_temp",
				"caffeine_time",
				"exercise_time",
				"pre_bedtime_activities",
				"anxiety_level",
				"created_at",
			].join(",");

			const csvRows = entries
				.map((entry: any) =>
					[
						entry.id,
						entry.date,
						entry.sleepQuality,
						entry.morningEnergy,
						entry.timeToFallAsleep,
						entry.afternoonEnergy,
						`"${entry.notes.replace(/"/g, '""')}"`, // Escape quotes in notes
						entry.stressLevel || "",
						entry.screenTime || "",
						entry.roomTemp || "",
						entry.caffeineTime || "",
						entry.exerciseTime || "",
						entry.preBedtimeActivities || "",
						entry.anxietyLevel || "",
						entry.createdAt,
					].join(","),
				)
				.join("\n");

			const csv = csvHeaders + "\n" + csvRows;

			return new Response(csv, {
				headers: {
					"Content-Type": "text/csv",
					"Content-Disposition": `attachment; filename="sleep-data-${user.accountId.slice(0, 8)}.csv"`,
				},
			});
		}

		return c.json({
			exportedAt: new Date().toISOString(),
			accountId: user.accountId,
			totalEntries: entries.length,
			entries,
		});
	} catch (error) {
		console.error("Export sleep data error:", error);
		return c.json({ error: "Internal server error" }, 500);
	}
});

export default sleep;
