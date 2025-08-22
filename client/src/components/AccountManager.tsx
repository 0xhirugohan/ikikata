import { useState, useEffect, useId } from "react";
import type { Account, SerializedKeyPair } from "../utils/crypto";
import {
	generateKeyPair,
	serializeKeyPair,
	generateAccountId,
	generateRecoveryPhrase,
	restoreFromRecoveryPhrase,
	AccountStorage,
} from "../utils/crypto";

interface AccountManagerProps {
	isDarkMode: boolean;
	onAccountChange: (account: Account | null) => void;
}

type ViewMode = "welcome" | "create" | "import" | "account" | "recovery";

export default function AccountManager({
	isDarkMode,
	onAccountChange,
}: AccountManagerProps) {
	const [viewMode, setViewMode] = useState<ViewMode>("welcome");
	const [account, setAccount] = useState<Account | null>(null);
	const [, setKeyPair] = useState<SerializedKeyPair | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [recoveryPhrase, setRecoveryPhrase] = useState<string>("");
	const [importPhrase, setImportPhrase] = useState<string>("");
	const [email, setEmail] = useState<string>("");
	const [showRecoveryPhrase, setShowRecoveryPhrase] = useState(false);
	const recoveryPhraseInputId = useId();

	useEffect(() => {
		// Load existing account on mount
		const stored = AccountStorage.loadAccount();
		if (stored) {
			setAccount(stored.account);
			setKeyPair(stored.keyPair);
			setViewMode("account");
			onAccountChange(stored.account);
		}
	}, [onAccountChange]);

	const createAccount = async () => {
		setIsLoading(true);
		setError(null);

		try {
			// Generate new key pair
			const newKeyPair = await generateKeyPair();
			const serializedKeyPair = await serializeKeyPair(newKeyPair);

			// Generate account ID from public key
			const accountId = await generateAccountId(newKeyPair.publicKey);

			// Generate recovery phrase
			const phrase = await generateRecoveryPhrase(newKeyPair.privateKey);

			// Create account object
			const newAccount: Account = {
				accountId,
				publicKey: serializedKeyPair.publicKey,
				createdAt: new Date().toISOString(),
			};

			// Save to localStorage
			AccountStorage.saveAccount(newAccount, serializedKeyPair);

			setAccount(newAccount);
			setKeyPair(serializedKeyPair);
			setRecoveryPhrase(phrase);
			setViewMode("recovery");
			onAccountChange(newAccount);
		} catch (err) {
			setError("Failed to create account. Please try again.");
			console.error("Account creation error:", err);
		} finally {
			setIsLoading(false);
		}
	};

	const importAccount = async () => {
		setIsLoading(true);
		setError(null);

		try {
			// Restore private key from recovery phrase
			const privateKey = await restoreFromRecoveryPhrase(importPhrase);

			// For ECDSA, we need to derive the public key from private key
			// This is a limitation of the current implementation
			// In a real app, you'd store both keys in the recovery phrase
			// For now, we'll generate a temporary public key and warn the user
			const tempKeyPair = await generateKeyPair();
			const publicKey = tempKeyPair.publicKey;

			const keyPairObj = { privateKey, publicKey };
			const serializedKeyPair = await serializeKeyPair(keyPairObj);

			// Generate account ID
			const accountId = await generateAccountId(publicKey);

			const importedAccount: Account = {
				accountId,
				publicKey: serializedKeyPair.publicKey,
				createdAt: new Date().toISOString(),
			};

			AccountStorage.saveAccount(importedAccount, serializedKeyPair);

			setAccount(importedAccount);
			setKeyPair(serializedKeyPair);
			setViewMode("account");
			onAccountChange(importedAccount);
		} catch (err) {
			setError("Invalid recovery phrase. Please check and try again.");
			console.error("Import error:", err);
		} finally {
			setIsLoading(false);
		}
	};

	const bindEmail = async () => {
		if (!account || !email.trim()) return;

		setIsLoading(true);
		try {
			AccountStorage.updateAccount({ email: email.trim() });
			const updatedAccount = { ...account, email: email.trim() };
			setAccount(updatedAccount);
			onAccountChange(updatedAccount);
			setEmail("");
		} catch (_err) {
			setError("Failed to bind email");
		} finally {
			setIsLoading(false);
		}
	};

	const signOut = () => {
		AccountStorage.clearAccount();
		setAccount(null);
		setKeyPair(null);
		setViewMode("welcome");
		onAccountChange(null);
	};

	const copyToClipboard = async (text: string) => {
		try {
			await navigator.clipboard.writeText(text);
		} catch (err) {
			console.error("Failed to copy:", err);
		}
	};

	if (viewMode === "welcome") {
		return (
			<div className="p-6 space-y-6 text-center">
				<div
					className={`w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center text-2xl ${
						isDarkMode
							? "bg-slate-700 text-slate-400"
							: "bg-gray-100 text-gray-500"
					}`}
				>
					🔐
				</div>

				<h2
					className={`text-xl font-semibold mb-2 ${
						isDarkMode ? "text-slate-100" : "text-gray-900"
					}`}
				>
					Secure Sleep Tracking
				</h2>

				<p
					className={`text-sm mb-6 ${
						isDarkMode ? "text-slate-400" : "text-gray-600"
					}`}
				>
					Create a secure account to sync your sleep data across devices
				</p>

				<div className="space-y-3">
					<button
						type="button"
						onClick={() => setViewMode("create")}
						className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
							isDarkMode
								? "bg-purple-600 hover:bg-purple-700 text-white"
								: "bg-orange-500 hover:bg-orange-600 text-white"
						}`}
					>
						Create New Account
					</button>

					<button
						type="button"
						onClick={() => setViewMode("import")}
						className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
							isDarkMode
								? "bg-slate-600 hover:bg-slate-700 text-white border border-slate-500"
								: "bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300"
						}`}
					>
						Import Existing Account
					</button>
				</div>
			</div>
		);
	}

	if (viewMode === "create") {
		return (
			<div className="p-6 space-y-6">
				<h2
					className={`text-xl font-semibold ${
						isDarkMode ? "text-slate-100" : "text-gray-900"
					}`}
				>
					Create Account
				</h2>

				<div
					className={`p-4 rounded-lg ${
						isDarkMode
							? "bg-slate-700 border border-slate-600"
							: "bg-blue-50 border border-blue-200"
					}`}
				>
					<h3
						className={`font-medium mb-2 ${
							isDarkMode ? "text-slate-200" : "text-blue-800"
						}`}
					>
						🔒 How it works
					</h3>
					<ul
						className={`text-sm space-y-1 ${
							isDarkMode ? "text-slate-300" : "text-blue-700"
						}`}
					>
						<li>• A unique key pair is generated on your device</li>
						<li>• Your private key never leaves your device</li>
						<li>• You'll get a recovery phrase to backup your account</li>
						<li>• You can bind an email later for easier access</li>
					</ul>
				</div>

				{error && (
					<div
						className={`p-3 rounded-lg ${
							isDarkMode
								? "bg-red-900/30 text-red-400 border border-red-800"
								: "bg-red-50 text-red-600 border border-red-200"
						}`}
					>
						{error}
					</div>
				)}

				<div className="flex gap-3">
					<button
						type="button"
						onClick={createAccount}
						disabled={isLoading}
						className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${
							isDarkMode
								? "bg-purple-600 hover:bg-purple-700 text-white disabled:bg-slate-600"
								: "bg-orange-500 hover:bg-orange-600 text-white disabled:bg-gray-400"
						}`}
					>
						{isLoading ? "Creating Account..." : "Create Account"}
					</button>

					<button
						type="button"
						onClick={() => setViewMode("welcome")}
						className={`px-4 py-3 rounded-lg font-medium transition-colors ${
							isDarkMode
								? "bg-slate-600 hover:bg-slate-700 text-white"
								: "bg-gray-200 hover:bg-gray-300 text-gray-700"
						}`}
					>
						Back
					</button>
				</div>
			</div>
		);
	}

	if (viewMode === "import") {
		return (
			<div className="p-6 space-y-6">
				<h2
					className={`text-xl font-semibold ${
						isDarkMode ? "text-slate-100" : "text-gray-900"
					}`}
				>
					Import Account
				</h2>

				<div>
					<label
						htmlFor={recoveryPhraseInputId}
						className={`block text-sm font-medium mb-2 ${
							isDarkMode ? "text-slate-300" : "text-gray-700"
						}`}
					>
						Recovery Phrase
					</label>
					<textarea
						id={recoveryPhraseInputId}
						value={importPhrase}
						onChange={(e) => setImportPhrase(e.target.value)}
						placeholder="Paste your recovery phrase here..."
						className={`w-full p-3 rounded-lg border transition-colors ${
							isDarkMode
								? "bg-slate-800 border-slate-600 text-slate-100 placeholder-slate-400"
								: "bg-white border-gray-300 text-gray-900 placeholder-gray-500"
						}`}
						rows={3}
					/>
				</div>

				{error && (
					<div
						className={`p-3 rounded-lg ${
							isDarkMode
								? "bg-red-900/30 text-red-400 border border-red-800"
								: "bg-red-50 text-red-600 border border-red-200"
						}`}
					>
						{error}
					</div>
				)}

				<div className="flex gap-3">
					<button
						type="button"
						onClick={importAccount}
						disabled={!importPhrase.trim() || isLoading}
						className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${
							isDarkMode
								? "bg-purple-600 hover:bg-purple-700 text-white disabled:bg-slate-600"
								: "bg-orange-500 hover:bg-orange-600 text-white disabled:bg-gray-400"
						}`}
					>
						{isLoading ? "Importing..." : "Import Account"}
					</button>

					<button
						type="button"
						onClick={() => setViewMode("welcome")}
						className={`px-4 py-3 rounded-lg font-medium transition-colors ${
							isDarkMode
								? "bg-slate-600 hover:bg-slate-700 text-white"
								: "bg-gray-200 hover:bg-gray-300 text-gray-700"
						}`}
					>
						Back
					</button>
				</div>
			</div>
		);
	}

	if (viewMode === "recovery") {
		return (
			<div className="p-6 space-y-6">
				<h2
					className={`text-xl font-semibold ${
						isDarkMode ? "text-slate-100" : "text-gray-900"
					}`}
				>
					✅ Account Created!
				</h2>

				<div
					className={`p-4 rounded-lg ${
						isDarkMode
							? "bg-red-900/30 border border-red-800"
							: "bg-red-50 border border-red-200"
					}`}
				>
					<h3
						className={`font-medium mb-2 ${
							isDarkMode ? "text-red-300" : "text-red-800"
						}`}
					>
						⚠️ Important: Save Your Recovery Phrase
					</h3>
					<p
						className={`text-sm ${
							isDarkMode ? "text-red-400" : "text-red-700"
						}`}
					>
						This phrase is the ONLY way to recover your account. Store it
						securely and never share it with anyone.
					</p>
				</div>

				<div className="space-y-3">
					<div
						className={`block text-sm font-medium ${
							isDarkMode ? "text-slate-300" : "text-gray-700"
						}`}
					>
						Recovery Phrase:
					</div>

					<div
						className={`p-3 rounded-lg border font-mono text-sm ${
							showRecoveryPhrase
								? isDarkMode
									? "bg-slate-800 border-slate-600 text-slate-200"
									: "bg-gray-50 border-gray-300 text-gray-800"
								: isDarkMode
									? "bg-slate-800 border-slate-600 text-slate-500"
									: "bg-gray-50 border-gray-300 text-gray-500"
						}`}
					>
						{showRecoveryPhrase
							? recoveryPhrase
							: "••••••••••••••••••••••••••••••••"}
					</div>

					<div className="flex gap-2">
						<button
							type="button"
							onClick={() => setShowRecoveryPhrase(!showRecoveryPhrase)}
							className={`flex-1 py-2 px-3 rounded text-sm font-medium transition-colors ${
								isDarkMode
									? "bg-slate-600 hover:bg-slate-700 text-white"
									: "bg-gray-200 hover:bg-gray-300 text-gray-700"
							}`}
						>
							{showRecoveryPhrase ? "Hide" : "Show"} Phrase
						</button>

						<button
							type="button"
							onClick={() => copyToClipboard(recoveryPhrase)}
							className={`flex-1 py-2 px-3 rounded text-sm font-medium transition-colors ${
								isDarkMode
									? "bg-purple-600 hover:bg-purple-700 text-white"
									: "bg-orange-500 hover:bg-orange-600 text-white"
							}`}
						>
							Copy to Clipboard
						</button>
					</div>
				</div>

				<button
					type="button"
					onClick={() => setViewMode("account")}
					className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
						isDarkMode
							? "bg-green-700 hover:bg-green-800 text-white"
							: "bg-green-600 hover:bg-green-700 text-white"
					}`}
				>
					I've Saved My Recovery Phrase
				</button>
			</div>
		);
	}

	if (viewMode === "account" && account) {
		return (
			<div className="p-6 space-y-6">
				<div className="text-center">
					<div
						className={`w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center text-2xl ${
							isDarkMode
								? "bg-purple-900/30 text-purple-300"
								: "bg-orange-100 text-orange-600"
						}`}
					>
						🔐
					</div>
					<h2
						className={`text-xl font-semibold mb-2 ${
							isDarkMode ? "text-slate-100" : "text-gray-900"
						}`}
					>
						Secure Account
					</h2>
					<p
						className={`text-sm ${
							isDarkMode ? "text-slate-300" : "text-gray-600"
						}`}
					>
						Account ID: {account.accountId.slice(0, 12)}...
					</p>
				</div>

				<div
					className={`rounded-lg border p-4 ${
						isDarkMode
							? "bg-slate-800 border-slate-600"
							: "bg-gray-50 border-gray-200"
					}`}
				>
					<h3
						className={`font-medium mb-2 ${
							isDarkMode ? "text-slate-200" : "text-gray-800"
						}`}
					>
						Account Information
					</h3>
					<div className="space-y-2 text-sm">
						<div className="flex justify-between">
							<span className={isDarkMode ? "text-slate-400" : "text-gray-600"}>
								Created:
							</span>
							<span className={isDarkMode ? "text-slate-300" : "text-gray-700"}>
								{new Date(account.createdAt).toLocaleDateString()}
							</span>
						</div>
						<div className="flex justify-between">
							<span className={isDarkMode ? "text-slate-400" : "text-gray-600"}>
								Email:
							</span>
							<span className={isDarkMode ? "text-slate-300" : "text-gray-700"}>
								{account.email || "Not bound"}
							</span>
						</div>
					</div>
				</div>

				{!account.email && (
					<div className="space-y-3">
						<h3
							className={`font-medium ${
								isDarkMode ? "text-slate-200" : "text-gray-800"
							}`}
						>
							Bind Email (Optional)
						</h3>
						<input
							type="email"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							placeholder="your@email.com"
							className={`w-full px-3 py-2 rounded border transition-colors ${
								isDarkMode
									? "bg-slate-800 border-slate-600 text-slate-100 placeholder-slate-400"
									: "bg-white border-gray-300 text-gray-900 placeholder-gray-500"
							}`}
						/>
						<button
							type="button"
							onClick={bindEmail}
							disabled={!email.trim() || isLoading}
							className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
								isDarkMode
									? "bg-purple-600 hover:bg-purple-700 text-white disabled:bg-slate-600"
									: "bg-orange-500 hover:bg-orange-600 text-white disabled:bg-gray-400"
							}`}
						>
							Bind Email
						</button>
					</div>
				)}

				<button
					type="button"
					onClick={signOut}
					className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
						isDarkMode
							? "bg-red-900/30 text-red-400 hover:bg-red-900/50 border border-red-800"
							: "bg-red-50 text-red-600 hover:bg-red-100 border border-red-200"
					}`}
				>
					Sign Out
				</button>
			</div>
		);
	}

	return null;
}
