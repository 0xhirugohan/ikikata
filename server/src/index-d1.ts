/**
 * Sleep Tracking API Server with Cloudflare D1 Support
 * Production version using D1 database
 */

import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import type { ApiResponse } from "shared/dist";

// Cloudflare D1 types
import type { D1Database as CloudflareD1Database } from "@cloudflare/workers-types";

// Import D1 routes
import authRoutes from "./routes/auth-d1";
import sleepRoutes from "./routes/sleep-d1";
import healthRoutes from "./routes/health-d1";

type Bindings = {
	DB: CloudflareD1Database;
	ENVIRONMENT?: string;
};

type Variables = {
	useD1: boolean;
	user?: any;
};

export const app = new Hono<{ Bindings: Bindings; Variables: Variables }>()

	// Middleware
	.use(
		cors({
			origin: ["http://localhost:5173", "http://localhost:3000"], // Allow client origins
			credentials: true,
		}),
	)
	.use(logger())

	// Log database type on startup
	.use("*", async (c, next) => {
		if (!c.env.DB) {
			console.error(
				"D1 database binding not found. Make sure DB is configured in wrangler.toml",
			);
			return c.json({ error: "Database not configured" }, 500);
		}
		await next();
	})

	// Routes
	.route("/health", healthRoutes)
	.route("/auth", authRoutes)
	.route("/sleep", sleepRoutes)

	// Root endpoint
	.get("/", (c) => {
		const useD1 = c.get("useD1");
		const environment = c.env.ENVIRONMENT || "unknown";

		return c.json({
			message: "Sleep Tracking API Server",
			version: "1.0.0",
			database: useD1 ? "D1" : "In-Memory",
			environment,
			endpoints: {
				health: "/health",
				auth: "/auth",
				sleep: "/sleep",
			},
			documentation: "See API.md for complete documentation",
		});
	})

	// Legacy hello endpoint
	.get("/hello", async (c) => {
		const useD1 = c.get("useD1");
		const environment = c.env.ENVIRONMENT || "development";

		const data: ApiResponse = {
			message: `Sleep Tracking Server - ECDSA Authentication Ready! (${useD1 ? "D1" : "In-Memory"})`,
			success: true,
		};

		return c.json(data, { status: 200 });
	});

// Error handling
app.onError((err, c) => {
	console.error("Unhandled error:", err);
	return c.json(
		{
			error: "Internal server error",
			message: "An unexpected error occurred",
			timestamp: new Date().toISOString(),
		},
		500,
	);
});

// 404 handler
app.notFound((c) => {
	return c.json(
		{
			error: "Not found",
			message: "The requested endpoint does not exist",
			availableEndpoints: ["/health", "/auth", "/sleep"],
			timestamp: new Date().toISOString(),
		},
		404,
	);
});

// Export for Cloudflare Workers
export default {
	fetch: app.fetch,
};

// Start message for local development
if (typeof process !== "undefined" && process.env.NODE_ENV !== "production") {
	const port = process.env.PORT || 3001;
	console.log(`🚀 Sleep Tracking Server (D1) starting on port ${port}`);
	console.log(`📊 Health check: http://localhost:${port}/health`);
	console.log(`🔐 Auth endpoints: http://localhost:${port}/auth`);
	console.log(`😴 Sleep endpoints: http://localhost:${port}/sleep`);
	console.log(`🗄️  Database: Cloudflare D1`);
}
