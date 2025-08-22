/**
 * Cryptographic utilities for account management
 * Uses ECDSA P-256 for key generation and authentication
 */

export interface KeyPair {
	publicKey: CryptoKey;
	privateKey: CryptoKey;
}

export interface SerializedKeyPair {
	publicKey: string; // Base64 encoded
	privateKey: string; // Base64 encoded
}

export interface Account {
	accountId: string; // Public key as account identifier
	publicKey: string; // Base64 encoded public key
	createdAt: string;
	email?: string;
}

/**
 * Generate a new ECDSA key pair for account creation
 */
export async function generateKeyPair(): Promise<KeyPair> {
	const keyPair = await crypto.subtle.generateKey(
		{
			name: "ECDSA",
			namedCurve: "P-256",
		},
		true, // extractable
		["sign", "verify"],
	);

	return keyPair as KeyPair;
}

/**
 * Export key pair to serializable format for storage
 */
export async function serializeKeyPair(
	keyPair: KeyPair,
): Promise<SerializedKeyPair> {
	const publicKeyBuffer = await crypto.subtle.exportKey(
		"spki",
		keyPair.publicKey,
	);
	const privateKeyBuffer = await crypto.subtle.exportKey(
		"pkcs8",
		keyPair.privateKey,
	);

	return {
		publicKey: arrayBufferToBase64(publicKeyBuffer),
		privateKey: arrayBufferToBase64(privateKeyBuffer),
	};
}

/**
 * Import key pair from serialized format
 */
export async function deserializeKeyPair(
	serialized: SerializedKeyPair,
): Promise<KeyPair> {
	const publicKeyBuffer = base64ToArrayBuffer(serialized.publicKey);
	const privateKeyBuffer = base64ToArrayBuffer(serialized.privateKey);

	const publicKey = await crypto.subtle.importKey(
		"spki",
		publicKeyBuffer,
		{
			name: "ECDSA",
			namedCurve: "P-256",
		},
		true,
		["verify"],
	);

	const privateKey = await crypto.subtle.importKey(
		"pkcs8",
		privateKeyBuffer,
		{
			name: "ECDSA",
			namedCurve: "P-256",
		},
		true,
		["sign"],
	);

	return { publicKey, privateKey };
}

/**
 * Generate account ID from public key
 */
export async function generateAccountId(publicKey: CryptoKey): Promise<string> {
	const publicKeyBuffer = await crypto.subtle.exportKey("spki", publicKey);
	const hashBuffer = await crypto.subtle.digest("SHA-256", publicKeyBuffer);
	return arrayBufferToBase64(hashBuffer);
}

/**
 * Sign a challenge with private key for authentication
 */
export async function signChallenge(
	privateKey: CryptoKey,
	challenge: string,
): Promise<string> {
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

/**
 * Verify a signature with public key
 */
export async function verifySignature(
	publicKey: CryptoKey,
	signature: string,
	challenge: string,
): Promise<boolean> {
	const encoder = new TextEncoder();
	const data = encoder.encode(challenge);
	const signatureBuffer = base64ToArrayBuffer(signature);

	return await crypto.subtle.verify(
		{
			name: "ECDSA",
			hash: "SHA-256",
		},
		publicKey,
		signatureBuffer,
		data,
	);
}

/**
 * Generate a recovery phrase from private key
 * This is a simplified version - in production, use proper mnemonic generation
 */
export async function generateRecoveryPhrase(
	privateKey: CryptoKey,
): Promise<string> {
	const privateKeyBuffer = await crypto.subtle.exportKey("pkcs8", privateKey);
	const base64Key = arrayBufferToBase64(privateKeyBuffer);

	// Split into manageable chunks for easier backup
	const words = base64Key.match(/.{1,6}/g) || [];
	return words.join(" ");
}

/**
 * Restore private key from recovery phrase
 */
export async function restoreFromRecoveryPhrase(
	phrase: string,
): Promise<CryptoKey> {
	try {
		const base64Key = phrase.replace(/ /g, "");
		const privateKeyBuffer = base64ToArrayBuffer(base64Key);

		return await crypto.subtle.importKey(
			"pkcs8",
			privateKeyBuffer,
			{
				name: "ECDSA",
				namedCurve: "P-256",
			},
			true,
			["sign"],
		);
	} catch (error) {
		throw new Error("Invalid recovery phrase format");
	}
}

/**
 * Utility functions for base64 encoding/decoding
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
	const bytes = new Uint8Array(buffer);
	let binary = "";
	for (const byte of bytes) {
		binary += String.fromCharCode(byte);
	}
	return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
	const binaryString = atob(base64);
	const bytes = new Uint8Array(binaryString.length);
	for (let i = 0; i < binaryString.length; i++) {
		bytes[i] = binaryString.charCodeAt(i);
	}
	return bytes.buffer;
}

/**
 * Storage utilities for account data
 */
export const AccountStorage = {
	/**
	 * Save account to localStorage
	 */
	saveAccount(account: Account, keyPair: SerializedKeyPair): void {
		localStorage.setItem("account", JSON.stringify(account));
		localStorage.setItem("keyPair", JSON.stringify(keyPair));
	},

	/**
	 * Load account from localStorage
	 */
	loadAccount(): { account: Account; keyPair: SerializedKeyPair } | null {
		const accountData = localStorage.getItem("account");
		const keyPairData = localStorage.getItem("keyPair");

		if (!accountData || !keyPairData) {
			return null;
		}

		return {
			account: JSON.parse(accountData),
			keyPair: JSON.parse(keyPairData),
		};
	},

	/**
	 * Remove account from localStorage
	 */
	clearAccount(): void {
		localStorage.removeItem("account");
		localStorage.removeItem("keyPair");
	},

	/**
	 * Update account (e.g., bind email)
	 */
	updateAccount(updates: Partial<Account>): void {
		const stored = this.loadAccount();
		if (stored) {
			const updatedAccount = { ...stored.account, ...updates };
			localStorage.setItem("account", JSON.stringify(updatedAccount));
		}
	},
};
