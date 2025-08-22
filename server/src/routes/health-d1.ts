/**
 * Health and status routes for D1 database
 */

import { Hono } from "hono";
import type { D1Database as CloudflareD1Database } from "@cloudflare/workers-types";
import { D1Database } from "../database-d1";

type Bindings = {
	DB: CloudflareD1Database;
	ENVIRONMENT?: string;
};

const health = new Hono<{ Bindings: Bindings }>();

/**
 * GET /health
 * Health check endpoint
 */
health.get("/", async (c) => {
	try {
		// Test database connection
		const testQuery = await c.env.DB.prepare("SELECT 1 as test").first();

		const isDbHealthy = testQuery?.test === 1;

		return c.json({
			status: isDbHealthy ? "healthy" : "degraded",
			timestamp: new Date().toISOString(),
			version: "1.0.0",
			message: "Sleep tracking server is running",
			database: isDbHealthy ? "connected" : "connection_failed",
			environment: c.env.ENVIRONMENT || "unknown",
		});
	} catch (error) {
		console.error("Health check database error:", error);
		return c.json(
			{
				status: "unhealthy",
				timestamp: new Date().toISOString(),
				version: "1.0.0",
				message: "Sleep tracking server is running but database is unavailable",
				database: "error",
				error: "Database connection failed",
			},
			503,
		);
	}
});

/**
 * GET /health/stats
 * Database statistics (public)
 */
health.get("/stats", async (c) => {
	try {
		const db = new D1Database(c.env.DB);

		const stats = await db.getStats();

		return c.json({
			...stats,
			timestamp: new Date().toISOString(),
			databaseType: "D1",
			environment: c.env.ENVIRONMENT || "unknown",
		});
	} catch (error) {
		console.error("Stats error:", error);
		return c.json(
			{
				error: "Unable to retrieve statistics",
				timestamp: new Date().toISOString(),
			},
			500,
		);
	}
});

/**
 * GET /health/detailed
 * Detailed health information (includes database schema validation)
 */
health.get("/detailed", async (c) => {
	try {
		const tables = await c.env.DB.prepare(`
        SELECT name, type 
        FROM sqlite_master 
        WHERE type IN ('table', 'index') 
        ORDER BY type, name
      `).all();

		const requiredTables = ["accounts", "auth_challenges", "sleep_entries"];
		const existingTables = tables.results
			.filter((t) => t.type === "table")
			.map((t) => t.name);

		const missingTables = requiredTables.filter(
			(t) => !existingTables.includes(t),
		);
		const hasValidSchema = missingTables.length === 0;

		const db = new D1Database(c.env.DB);
		const stats = await db.getStats();

		return c.json({
			status: hasValidSchema ? "healthy" : "schema_error",
			timestamp: new Date().toISOString(),
			version: "1.0.0",
			database: {
				type: "D1",
				connected: true,
				schemaValid: hasValidSchema,
				tables: existingTables,
				missingTables,
				totalTables: tables.results.filter((t) => t.type === "table").length,
				totalIndexes: tables.results.filter((t) => t.type === "index").length,
			},
			statistics: stats,
			environment: c.env.ENVIRONMENT || "unknown",
		});
	} catch (error) {
		console.error("Detailed health check error:", error);
		return c.json(
			{
				status: "error",
				timestamp: new Date().toISOString(),
				error: "Database health check failed",
				message: error instanceof Error ? error.message : "Unknown error",
			},
			500,
		);
	}
});

export default health;
