import { createSecretBox, secretsMatch } from "@lib/infra/secretBox.util";

const SECRET = "a-long-enough-dashboard-session-secret";

describe("createSecretBox", () => {
	const box = createSecretBox(SECRET);

	it("returns what it was given, empty or long", () => {
		for (const value of ["a-discord-access-token", "", "x".repeat(4_096)]) {
			expect(box.open(box.seal(value))).toBe(value);
		}
	});

	/** A deterministic ciphertext would tell anyone reading the collection which sessions share a token. */
	it("seals the same value differently every time, and never leaves the plaintext in it", () => {
		expect(box.seal("same")).not.toBe(box.seal("same"));
		expect(box.seal("hunter2")).not.toContain("hunter2");
	});

	/** The salt is what stops one secret protecting two unrelated things with the same key. */
	it("refuses a value sealed with a different secret, or the same secret and another salt", () => {
		expect(createSecretBox("a-completely-different-session-secret").open(box.seal("token"))).toBeNull();
		expect(createSecretBox(SECRET, "other").open(box.seal("token"))).toBeNull();
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
});

describe("secretsMatch", () => {
	/** `timingSafeEqual` throws on a length mismatch, which would be a 500 instead of a 403. */
	it("accepts a match, and rejects anything else, a different length included, without throwing", () => {
		expect(secretsMatch("abc", "abc")).toBe(true);
		expect(secretsMatch("abc", "abd")).toBe(false);
		expect(secretsMatch("abc", "abcd")).toBe(false);
		expect(secretsMatch("", "abc")).toBe(false);
	});
});
