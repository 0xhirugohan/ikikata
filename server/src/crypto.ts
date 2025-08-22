/**
 * Server-side cryptographic utilities for account verification
 * Only handles public key operations - never processes private keys
 */

export interface PublicKeyData {
	accountId: string;
	publicKey: string; // Base64 encoded SPKI format
	createdAt: string;
	// TODO: Add email binding support in future
	// email?: string;
}

export interface AuthChallenge {
	challenge: string;
	expiresAt: number;
	accountId: string;
}

/**
 * Import a public key from base64 SPKI format
 */
export async function importPublicKey(
	publicKeyB64: string,
): Promise<CryptoKey> {
	try {
		const publicKeyBuffer = base64ToArrayBuffer(publicKeyB64);

		return await crypto.subtle.importKey(
			"spki",
			publicKeyBuffer,
			{
				name: "ECDSA",
				namedCurve: "P-256",
			},
			true,
			["verify"],
		);
	} catch (error) {
		throw new Error("Invalid public key format");
	}
}

/**
 * Generate account ID from public key (same as client-side)
 */
export async function generateAccountIdFromPublicKey(
	publicKey: CryptoKey,
): Promise<string> {
	const publicKeyBuffer = await crypto.subtle.exportKey("spki", publicKey);
	const hashBuffer = await crypto.subtle.digest("SHA-256", publicKeyBuffer);
	return arrayBufferToBase64(hashBuffer);
}

/**
 * Verify a signature against a challenge using public key
 */
export async function verifySignature(
	publicKey: CryptoKey,
	signature: string,
	challenge: string,
): Promise<boolean> {
	try {
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
	} catch (error) {
		console.error("Signature verification failed:", error);
		return false;
	}
}

/**
 * Generate a random challenge string
 */
export function generateChallenge(): string {
	const array = new Uint8Array(32);
	crypto.getRandomValues(array);
	return arrayBufferToBase64(array.buffer);
}

/**
 * Validate that a public key is properly formatted ECDSA P-256 key
 */
export async function validatePublicKey(
	publicKeyB64: string,
): Promise<boolean> {
	try {
		const publicKey = await importPublicKey(publicKeyB64);
		// Try to export it back to ensure it's valid
		await crypto.subtle.exportKey("spki", publicKey);
		return true;
	} catch {
		return false;
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
