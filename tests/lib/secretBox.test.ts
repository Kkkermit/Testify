import { createSecretBox, secretsMatch } from "@lib/secretBox.util";

const SECRET = "a-long-enough-dashboard-session-secret";

describe("createSecretBox", () => {
	const box = createSecretBox(SECRET);

	it("returns what it was given", () => {
		expect(box.open(box.seal("a-discord-access-token"))).toBe("a-discord-access-token");
	});

	/** A deterministic ciphertext would tell anyone reading the collection which sessions share a token. */
	it("seals the same value differently every time", () => {
		expect(box.seal("same")).not.toBe(box.seal("same"));
	});

	it("does not leave the plaintext anywhere in the sealed value", () => {
		expect(box.seal("hunter2")).not.toContain("hunter2");
	});

	it("refuses a value sealed with a different secret", () => {
		expect(createSecretBox("a-completely-different-session-secret").open(box.seal("token"))).toBeNull();
	});

	/** GCM's tag is the whole point: a database someone has edited must fail, not decrypt to something else. */
	it("refuses a tampered value", () => {
		const sealed = box.seal("token");
		const parts = sealed.split(".");
		parts[3] = Buffer.from("tampered").toString("base64url");

		expect(box.open(parts.join("."))).toBeNull();
	});

	it("refuses something that is not a sealed value at all", () => {
		expect(box.open("")).toBeNull();
		expect(box.open("v1.only.three")).toBeNull();
		expect(box.open("v2.a.b.c")).toBeNull();
	});

	/** The salt is what stops one secret protecting two unrelated things with the same key. */
	it("derives a different key per salt", () => {
		expect(createSecretBox(SECRET, "other").open(box.seal("token"))).toBeNull();
	});

	it("handles an empty string and a long one", () => {
		expect(box.open(box.seal(""))).toBe("");
		expect(box.open(box.seal("x".repeat(4_096)))).toBe("x".repeat(4_096));
	});
});

describe("secretsMatch", () => {
	it("accepts a match and rejects anything else", () => {
		expect(secretsMatch("abc", "abc")).toBe(true);
		expect(secretsMatch("abc", "abd")).toBe(false);
	});

	/** `timingSafeEqual` throws on a length mismatch, which would be a 500 instead of a 403. */
	it("rejects a different length rather than throwing", () => {
		expect(secretsMatch("abc", "abcd")).toBe(false);
		expect(secretsMatch("", "abc")).toBe(false);
	});
});
