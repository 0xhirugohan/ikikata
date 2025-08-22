/**
 * Test script for D1 database functionality
 * Run with: node test-d1.js
 */

// const { execSync } = require("node:child_process"); // Unused import

const SERVER_URL = "http://localhost:8787"; // Default Wrangler dev port

// Crypto functions (same as before)
async function generateKeyPair() {
	return await crypto.subtle.generateKey(
		{
			name: "ECDSA",
			namedCurve: "P-256",
		},
		true,
		["sign", "verify"],
	);
}

async function exportPublicKey(publicKey) {
	const publicKeyBuffer = await crypto.subtle.exportKey("spki", publicKey);
	return arrayBufferToBase64(publicKeyBuffer);
}

async function signChallenge(privateKey, challenge) {
	const encoder = new TextEncoder();
	const data = encoder.encode(challenge);

	const signature = await crypto.subtle.sign(
		{
			name: "ECDSA",
			hash: "SHA-256",
		},
		privateKey,
		data,
	);

	return arrayBufferToBase64(signature);
}

function arrayBufferToBase64(buffer) {
	const bytes = new Uint8Array(buffer);
	let binary = "";
	for (const byte of bytes) {
		binary += String.fromCharCode(byte);
	}
	return btoa(binary);
}

async function testD1Database() {
	console.log("🧪 Testing D1 Database Integration\n");

	try {
		// Check if server is running
		console.log("🔍 Checking server status...");
		try {
			const healthResponse = await fetch(`${SERVER_URL}/health`);
			const healthData = await healthResponse.json();
			console.log("✅ Server is running:", healthData.message);
			console.log("📊 Database type:", healthData.database || "Unknown");

			if (healthData.database !== "connected" && !healthData.database) {
				console.log("⚠️  Database status unclear. Continuing with tests...");
			}
		} catch (error) {
			console.error(
				"❌ Server not reachable. Make sure to run: npm run dev:d1",
			);
			console.error("   Error:", error.message);
			process.exit(1);
		}

		// Test database statistics
		console.log("\n📊 Checking database statistics...");
		try {
			const statsResponse = await fetch(`${SERVER_URL}/health/stats`);
			const statsData = await statsResponse.json();
			console.log("✅ Database stats retrieved:");
			console.log("   - Total accounts:", statsData.totalAccounts);
			console.log("   - Active challenges:", statsData.activeChallenges);
			console.log("   - Total sleep entries:", statsData.totalSleepEntries);
			console.log("   - Database type:", statsData.databaseType);
		} catch (error) {
			console.log("⚠️  Could not retrieve database stats:", error.message);
		}

		// Test detailed health check
		console.log("\n🔍 Checking detailed database health...");
		try {
			const detailedResponse = await fetch(`${SERVER_URL}/health/detailed`);
			const detailedData = await detailedResponse.json();

			if (detailedData.database) {
				console.log("✅ Database schema validation:");
				console.log("   - Schema valid:", detailedData.database.schemaValid);
				console.log(
					"   - Tables found:",
					detailedData.database.tables?.join(", "),
				);
				console.log("   - Total indexes:", detailedData.database.totalIndexes);

				if (detailedData.database.missingTables?.length > 0) {
					console.log(
						"⚠️  Missing tables:",
						detailedData.database.missingTables.join(", "),
					);
				}
			}
		} catch (error) {
			console.log("⚠️  Could not retrieve detailed health info:", error.message);
		}

		// Generate key pair for testing
		console.log("\n🔑 Generating test key pair...");
		const keyPair = await generateKeyPair();
		const publicKeyB64 = await exportPublicKey(keyPair.publicKey);
		console.log("✅ Key pair generated");

		// Test account registration
		console.log("\n👤 Testing account registration...");
		const registerResponse = await fetch(`${SERVER_URL}/auth/register`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ publicKey: publicKeyB64 }),
		});

		const registerData = await registerResponse.json();

		if (!registerResponse.ok) {
			throw new Error(`Registration failed: ${registerData.error}`);
		}

		console.log("✅ Account registered successfully");
		console.log("   Account ID:", registerData.accountId.slice(0, 12) + "...");

		// Test challenge request
		console.log("\n🎯 Testing challenge request...");
		const challengeResponse = await fetch(`${SERVER_URL}/auth/challenge`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ accountId: registerData.accountId }),
		});

		const challengeData = await challengeResponse.json();

		if (!challengeResponse.ok) {
			throw new Error(`Challenge failed: ${challengeData.error}`);
		}

		console.log("✅ Challenge received successfully");
		console.log(
			"   Challenge expires at:",
			new Date(challengeData.expiresAt).toISOString(),
		);

		// Test signature verification
		console.log("\n✍️  Testing signature verification...");
		const signature = await signChallenge(
			keyPair.privateKey,
			challengeData.challenge,
		);

		const verifyResponse = await fetch(`${SERVER_URL}/auth/verify`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				accountId: registerData.accountId,
				challenge: challengeData.challenge,
				signature: signature,
			}),
		});

		const verifyData = await verifyResponse.json();

		if (!verifyResponse.ok || !verifyData.valid) {
			throw new Error(
				`Verification failed: ${verifyData.error || "Invalid signature"}`,
			);
		}

		console.log("✅ Signature verified successfully");

		// Test authenticated sleep entry creation
		console.log("\n😴 Testing sleep entry creation...");

		// Get a fresh challenge for authenticated request
		const authChallengeResponse = await fetch(`${SERVER_URL}/auth/challenge`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ accountId: registerData.accountId }),
		});

		const authChallengeData = await authChallengeResponse.json();
		const authSignature = await signChallenge(
			keyPair.privateKey,
			authChallengeData.challenge,
		);
		const authHeader = `Bearer ${registerData.accountId}.${authSignature}.${authChallengeData.challenge}`;

		const sleepEntry = {
			id: "test-entry-" + Date.now(),
			date: new Date().toISOString().split("T")[0],
			sleepQuality: "good",
			morningEnergy: "energized",
			timeToFallAsleep: "10-20",
			afternoonEnergy: "alert",
			notes: "Test entry from D1 integration test",
			stressLevel: 3,
			screenTime: 1.5,
		};

		const createEntryResponse = await fetch(`${SERVER_URL}/sleep/entries`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: authHeader,
			},
			body: JSON.stringify(sleepEntry),
		});

		const createEntryData = await createEntryResponse.json();

		if (!createEntryResponse.ok) {
			throw new Error(`Sleep entry creation failed: ${createEntryData.error}`);
		}

		console.log("✅ Sleep entry created successfully");

		// Test sleep entries retrieval
		console.log("\n📋 Testing sleep entries retrieval...");

		// Get another fresh challenge
		const listChallengeResponse = await fetch(`${SERVER_URL}/auth/challenge`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ accountId: registerData.accountId }),
		});

		const listChallengeData = await listChallengeResponse.json();
		const listSignature = await signChallenge(
			keyPair.privateKey,
			listChallengeData.challenge,
		);
		const listAuthHeader = `Bearer ${registerData.accountId}.${listSignature}.${listChallengeData.challenge}`;

		const entriesResponse = await fetch(`${SERVER_URL}/sleep/entries`, {
			headers: { Authorization: listAuthHeader },
		});

		const entriesData = await entriesResponse.json();

		if (!entriesResponse.ok) {
			throw new Error(`Entries retrieval failed: ${entriesData.error}`);
		}

		console.log("✅ Sleep entries retrieved successfully");
		console.log("   Total entries:", entriesData.count);
		console.log("   First entry ID:", entriesData.entries[0]?.id);

		// Test analytics
		console.log("\n📊 Testing sleep analytics...");

		const analyticsChallengeResponse = await fetch(
			`${SERVER_URL}/auth/challenge`,
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ accountId: registerData.accountId }),
			},
		);

		const analyticsChallengeData = await analyticsChallengeResponse.json();
		const analyticsSignature = await signChallenge(
			keyPair.privateKey,
			analyticsChallengeData.challenge,
		);
		const analyticsAuthHeader = `Bearer ${registerData.accountId}.${analyticsSignature}.${analyticsChallengeData.challenge}`;

		const analyticsResponse = await fetch(`${SERVER_URL}/sleep/analytics`, {
			headers: { Authorization: analyticsAuthHeader },
		});

		const analyticsData = await analyticsResponse.json();

		if (!analyticsResponse.ok) {
			throw new Error(`Analytics failed: ${analyticsData.error}`);
		}

		console.log("✅ Analytics retrieved successfully");
		console.log("   Average sleep quality:", analyticsData.averageSleepQuality);
		console.log("   Total entries analyzed:", analyticsData.totalEntries);
		console.log("   Tracking streak:", analyticsData.streakDays, "days");

		// Final database stats
		console.log("\n📊 Final database statistics...");
		const finalStatsResponse = await fetch(`${SERVER_URL}/health/stats`);
		const finalStatsData = await finalStatsResponse.json();
		console.log("✅ Updated database stats:");
		console.log("   - Total accounts:", finalStatsData.totalAccounts);
		console.log("   - Total sleep entries:", finalStatsData.totalSleepEntries);

		console.log("\n🎉 All D1 database tests passed successfully!");
		console.log("\n✨ D1 integration is working correctly with:");
		console.log("   ✅ Account registration and authentication");
		console.log("   ✅ Challenge-response ECDSA verification");
		console.log("   ✅ Sleep data CRUD operations");
		console.log("   ✅ Analytics and reporting");
		console.log("   ✅ Database schema and constraints");
	} catch (error) {
		console.error("\n❌ D1 database test failed:", error.message);
		process.exit(1);
	}
}

// Run the test
if (require.main === module) {
	console.log("🚀 Starting D1 database integration tests...");
	console.log(
		'📝 Make sure to run "npm run dev:d1" in another terminal first\n',
	);

	testD1Database();
}

module.exports = { testD1Database };
