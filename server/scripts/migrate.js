/**
 * D1 Migration Runner
 * Applies database migrations to Cloudflare D1
 */

const { execSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const MIGRATIONS_DIR = path.join(__dirname, "..", "migrations");

/**
 * Get list of migration files
 */
function getMigrationFiles() {
	if (!fs.existsSync(MIGRATIONS_DIR)) {
		console.log("📁 No migrations directory found");
		return [];
	}

	return fs
		.readdirSync(MIGRATIONS_DIR)
		.filter((file) => file.endsWith(".sql"))
		.sort();
}

/**
 * Get applied migrations from database
 */
async function getAppliedMigrations(local = false) {
	try {
		const localFlag = local ? "--local" : "";
		const output = execSync(
			`wrangler d1 execute sleep-tracker-db ${localFlag} --command="SELECT name FROM sqlite_master WHERE type='table' AND name='migrations'"`,
			{ encoding: "utf8", stdio: "pipe" },
		);

		// If migrations table doesn't exist, no migrations have been applied
		if (!output.includes("migrations")) {
			return [];
		}

		// Get list of applied migrations
		const migrationsOutput = execSync(
			`wrangler d1 execute sleep-tracker-db ${localFlag} --command="SELECT filename FROM migrations ORDER BY applied_at"`,
			{ encoding: "utf8", stdio: "pipe" },
		);

		return migrationsOutput
			.split("\n")
			.filter((line) => line.trim() && !line.includes("filename"))
			.map((line) => line.trim());
	} catch (error) {
		// Table probably doesn't exist yet
		return [];
	}
}

/**
 * Create migrations tracking table
 */
async function createMigrationsTable(local = false) {
	const localFlag = local ? "--local" : "";
	const createTableSQL = `
    CREATE TABLE IF NOT EXISTS migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT UNIQUE NOT NULL,
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `;

	try {
		execSync(
			`wrangler d1 execute sleep-tracker-db ${localFlag} --command="${createTableSQL}"`,
			{ stdio: "inherit" },
		);
		console.log("✅ Migrations table ready");
	} catch (error) {
		console.error("❌ Failed to create migrations table:", error.message);
		throw error;
	}
}

/**
 * Apply a single migration
 */
async function applyMigration(filename, local = false) {
	const localFlag = local ? "--local" : "";
	const migrationPath = path.join(MIGRATIONS_DIR, filename);

	console.log(`📄 Applying migration: ${filename}`);

	try {
		// Apply the migration SQL
		execSync(
			`wrangler d1 execute sleep-tracker-db ${localFlag} --file="${migrationPath}"`,
			{ stdio: "inherit" },
		);

		// Record the migration as applied
		const recordSQL = `INSERT INTO migrations (filename) VALUES ('${filename}')`;
		execSync(
			`wrangler d1 execute sleep-tracker-db ${localFlag} --command="${recordSQL}"`,
			{ stdio: "pipe" },
		);

		console.log(`✅ Migration applied: ${filename}`);
	} catch (error) {
		console.error(`❌ Failed to apply migration ${filename}:`, error.message);
		throw error;
	}
}

/**
 * Run migrations
 */
async function runMigrations(options = {}) {
	const { local = false, force = false } = options;
	const environment = local ? "local" : "remote";

	console.log(`🚀 Running migrations for ${environment} database...\n`);

	try {
		// Get available migrations
		const migrationFiles = getMigrationFiles();
		if (migrationFiles.length === 0) {
			console.log("📁 No migration files found");
			return;
		}

		console.log(
			`📋 Found ${migrationFiles.length} migration files:`,
			migrationFiles.join(", "),
		);

		// Create migrations table
		await createMigrationsTable(local);

		// Get already applied migrations
		let appliedMigrations = [];
		if (!force) {
			appliedMigrations = await getAppliedMigrations(local);
			console.log(`📊 ${appliedMigrations.length} migrations already applied`);
		}

		// Find pending migrations
		const pendingMigrations = migrationFiles.filter(
			(file) => !appliedMigrations.includes(file),
		);

		if (pendingMigrations.length === 0) {
			console.log("✅ Database is up to date");
			return;
		}

		console.log(
			`🔄 ${pendingMigrations.length} pending migrations:`,
			pendingMigrations.join(", "),
		);

		// Apply pending migrations
		for (const migration of pendingMigrations) {
			await applyMigration(migration, local);
		}

		console.log(
			`\n🎉 Successfully applied ${pendingMigrations.length} migrations to ${environment} database`,
		);
	} catch (error) {
		console.error(
			`\n❌ Migration failed for ${environment} database:`,
			error.message,
		);
		process.exit(1);
	}
}

/**
 * Show migration status
 */
async function showStatus(local = false) {
	const environment = local ? "local" : "remote";
	console.log(`📊 Migration status for ${environment} database:\n`);

	try {
		const migrationFiles = getMigrationFiles();
		const appliedMigrations = await getAppliedMigrations(local);

		console.log("📄 Available migrations:");
		migrationFiles.forEach((file) => {
			const isApplied = appliedMigrations.includes(file);
			const status = isApplied ? "✅ Applied" : "⏳ Pending";
			console.log(`   ${status} ${file}`);
		});

		console.log(
			`\n📈 Summary: ${appliedMigrations.length}/${migrationFiles.length} migrations applied`,
		);
	} catch (error) {
		console.error("❌ Failed to get migration status:", error.message);
		process.exit(1);
	}
}

// CLI interface
if (require.main === module) {
	const args = process.argv.slice(2);
	const command = args[0] || "run";

	const options = {
		local: args.includes("--local"),
		force: args.includes("--force"),
	};

	switch (command) {
		case "run":
			runMigrations(options);
			break;
		case "status":
			showStatus(options.local);
			break;
		case "help":
			console.log(`
🗃️  D1 Migration Runner

Usage:
  node scripts/migrate.js [command] [options]

Commands:
  run        Apply pending migrations (default)
  status     Show migration status
  help       Show this help

Options:
  --local    Target local database instead of remote
  --force    Reapply all migrations (use with caution)

Examples:
  node scripts/migrate.js                    # Apply pending migrations to remote DB
  node scripts/migrate.js run --local        # Apply pending migrations to local DB
  node scripts/migrate.js status             # Show remote migration status
  node scripts/migrate.js status --local     # Show local migration status
      `);
			break;
		default:
			console.error(`❌ Unknown command: ${command}`);
			console.log('Run "node scripts/migrate.js help" for usage information');
			process.exit(1);
	}
}

module.exports = { runMigrations, showStatus, getMigrationFiles };
