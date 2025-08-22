import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import type { ApiResponse } from "shared/dist";

// Import routes
import authRoutes from './routes/auth';
import sleepRoutes from './routes/sleep';
import healthRoutes from './routes/health';

export const app = new Hono()

// Middleware
.use(cors({
	origin: ['http://localhost:5173', 'http://localhost:3000'], // Allow client origins
	credentials: true
}))
.use(logger())

// Routes
.route('/health', healthRoutes)
.route('/auth', authRoutes)
.route('/sleep', sleepRoutes)

// Legacy routes (for backwards compatibility)
.get("/", (c) => {
	return c.json({
		message: "Sleep Tracking API Server",
		version: "1.0.0",
		endpoints: {
			health: "/health",
			auth: "/auth",
			sleep: "/sleep"
		}
	});
})

.get("/hello", async (c) => {
	const data: ApiResponse = {
		message: "Sleep Tracking Server - ECDSA Authentication Ready!",
		success: true,
	};

	return c.json(data, { status: 200 });
});

// Start server
const port = process.env.PORT || 3001;
console.log(`🚀 Sleep Tracking Server starting on port ${port}`);
console.log(`📊 Health check: http://localhost:${port}/health`);
console.log(`🔐 Auth endpoints: http://localhost:${port}/auth`);
console.log(`😴 Sleep endpoints: http://localhost:${port}/sleep`);

export default {
	port,
	fetch: app.fetch,
};