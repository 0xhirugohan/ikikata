/**
 * D1 Database Setup Script for Sleep Tracker
 * Based on Cloudflare D1 migration patterns
 */

const { execSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

async function setupD1Database() {
	console.log("🗄️  Setting up Cloudflare D1 database for Sleep Tracker...\n");

	try {
		// Check if wrangler is available
		try {
			execSync("wrangler --version", { stdio: "pipe" });
			console.log("✅ Wrangler CLI found");
		} catch (error) {
			console.error("❌ Wrangler CLI not found. Please install it first:");
			console.error("   npm install -g wrangler");
			process.exit(1);
		}

		// Check authentication
		try {
			execSync("wrangler whoami", { stdio: "pipe" });
			console.log("✅ Authenticated with Cloudflare");
		} catch (error) {
			console.error("❌ Not authenticated. Please login first:");
			console.error("   wrangler login");
			process.exit(1);
		}

		// Check if database already exists
		let databaseExists = false;
		let databaseId = "";

		try {
			const listOutput = execSync("wrangler d1 list", { encoding: "utf8" });
			if (listOutput.includes("sleep-tracker-db")) {
				console.log('📊 Database "sleep-tracker-db" already exists');
				databaseExists = true;

				// Extract database ID from existing config if available
				const wranglerTomlPath = path.join(__dirname, "..", "wrangler.toml");
				if (fs.existsSync(wranglerTomlPath)) {
					const tomlContent = fs.readFileSync(wranglerTomlPath, "utf8");
					const idMatch = tomlContent.match(/database_id = "([^"]+)"/);
					if (idMatch) {
						databaseId = idMatch[1];
						console.log(`✅ Found existing database ID: ${databaseId}`);
					}
				}
			}
		} catch (error) {
			console.log("📊 No existing database found, will create new one");
		}

		// Create database if it doesn't exist
		if (!databaseExists) {
			console.log("📊 Creating new D1 database...");
			try {
				const createOutput = execSync("wrangler d1 create sleep-tracker-db", {
					encoding: "utf8",
				});
				console.log("✅ Database created successfully");

				// Extract database ID from output
				const idMatch = createOutput.match(/database_id = "([^"]+)"/);
				if (idMatch) {
					databaseId = idMatch[1];
					console.log(`📝 Database ID: ${databaseId}`);
				} else {
					console.error("❌ Could not extract database ID from output");
					console.log("Create output:", createOutput);
					process.exit(1);
				}
			} catch (error) {
				console.error("❌ Failed to create database:", error.message);
				process.exit(1);
			}
		}

		// Update wrangler.toml with database ID
		if (databaseId) {
			console.log("📝 Updating wrangler.toml configuration...");
			const wranglerTomlPath = path.join(__dirname, "..", "wrangler.toml");

			if (fs.existsSync(wranglerTomlPath)) {
				let tomlContent = fs.readFileSync(wranglerTomlPath, "utf8");

				// Replace placeholder database ID
				if (tomlContent.includes("replace-with-your-d1-database-id")) {
					tomlContent = tomlContent.replace(
						'database_id = "replace-with-your-d1-database-id"',
						`database_id = "${databaseId}"`,
					);
					fs.writeFileSync(wranglerTomlPath, tomlContent);
					console.log("✅ wrangler.toml updated with database ID");
				} else if (tomlContent.includes(databaseId)) {
					console.log("✅ wrangler.toml already contains correct database ID");
				} else {
					console.log(
						"⚠️  Please manually update wrangler.toml with database ID:",
						databaseId,
					);
				}
			} else {
				console.error("❌ wrangler.toml not found");
				process.exit(1);
			}
		}

		// Apply database schema to remote database
		console.log("🏗️  Applying database schema to remote database...");
		const schemaPath = path.join(__dirname, "..", "schema.sql");

		if (!fs.existsSync(schemaPath)) {
			console.error("❌ Schema file not found:", schemaPath);
			process.exit(1);
		}

		try {
			execSync(`wrangler d1 execute sleep-tracker-db --file=${schemaPath}`, {
				stdio: "inherit",
			});
			console.log("✅ Remote database schema applied successfully");
		} catch (error) {
			console.error("❌ Failed to apply remote schema:", error.message);
			process.exit(1);
		}

		// Apply schema to local database for development
		console.log("🏠 Setting up local database for development...");
		try {
			execSync(
				`wrangler d1 execute sleep-tracker-db --local --file=${schemaPath}`,
				{ stdio: "inherit" },
			);
			console.log("✅ Local database schema applied successfully");
		} catch (error) {
			console.log(
				"⚠️  Local database setup failed (this is okay if you only need production)",
			);
			console.log("   Error:", error.message);
		}

		// Verify database setup
		console.log("🔍 Verifying database setup...");
		try {
			const tablesOutput = execSync(
				"wrangler d1 execute sleep-tracker-db --command=\"SELECT name FROM sqlite_master WHERE type='table' ORDER BY name\"",
				{ encoding: "utf8" },
			);

			const requiredTables = ["accounts", "auth_challenges", "sleep_entries"];
			const hasAllTables = requiredTables.every((table) =>
				tablesOutput.includes(table),
			);

			if (hasAllTables) {
				console.log("✅ All required tables found in database");
				console.log("📊 Tables:", requiredTables.join(", "));
			} else {
				console.log("⚠️  Some tables may be missing. Tables found:");
				console.log(tablesOutput);
			}
		} catch (error) {
			console.log("⚠️  Could not verify table creation:", error.message);
		}

		// Success message
		console.log("\n🎉 D1 database setup complete!\n");
		console.log("📋 Next steps:");
		console.log("   1. Test locally: npm run dev:d1");
		console.log("   2. Deploy to Cloudflare: npm run deploy");
		console.log("   3. Test production deployment\n");

		console.log("🔧 Useful commands:");
		console.log(
			'   • View accounts: wrangler d1 execute sleep-tracker-db --command="SELECT * FROM accounts LIMIT 5"',
		);
		console.log("   • Local development: wrangler dev --local");
		console.log("   • Deploy: wrangler deploy");
		console.log("   • View logs: wrangler tail\n");

		console.log("📖 Database information:");
		console.log(`   • Database ID: ${databaseId}`);
		console.log(`   • Database Name: sleep-tracker-db`);
		console.log(`   • Environment: production`);
	} catch (error) {
		console.error("\n❌ Setup failed:", error.message);
		process.exit(1);
	}
}

// Run setup if this script is executed directly
if (require.main === module) {
	setupD1Database();
}

module.exports = { setupD1Database };
