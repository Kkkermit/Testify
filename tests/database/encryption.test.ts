import { decryptToken, encryptToken, isEncrypted } from "../../src/database/encryption";

const KEY = "a".repeat(64);

describe("token encryption", () => {
	it("round-trips a token", () => {
		const encrypted = encryptToken("secret-token", KEY);
		expect(decryptToken(encrypted, KEY)).toBe("secret-token");
	});

	it("does not store the plaintext", () => {
		expect(encryptToken("secret-token", KEY)).not.toContain("secret-token");
	});

	it("produces a different ciphertext each time", () => {
		expect(encryptToken("same", KEY)).not.toBe(encryptToken("same", KEY));
	});

	it("refuses to decrypt with the wrong key", () => {
		const encrypted = encryptToken("secret", KEY);
		expect(() => decryptToken(encrypted, "b".repeat(64))).toThrow();
	});

	it("detects tampering", () => {
		const encrypted = encryptToken("secret", KEY);
		const parts = encrypted.split(".");
		parts[3] = Buffer.from("tampered").toString("base64");

		expect(() => decryptToken(parts.join("."), KEY)).toThrow();
	});

	// Rather than silently writing plaintext, the feature refuses to run.
	it("refuses to work without a key", () => {
		expect(() => encryptToken("secret", undefined)).toThrow(/TOKEN_ENCRYPTION_KEY/);
	});

	it("rejects a payload that is not in the expected format", () => {
		expect(() => decryptToken("plaintext", KEY)).toThrow(/expected encrypted format/);
	});

	it("recognises its own format", () => {
		expect(isEncrypted(encryptToken("x", KEY))).toBe(true);
		expect(isEncrypted("plaintext")).toBe(false);
	});
});
