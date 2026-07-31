import { generateSecret, withSecret } from "../../scripts/createSecret";

describe("generateSecret", () => {
	/** `env.ts` refuses anything under 32 characters, so a generator that fell short would fail at startup. */
	it("is comfortably longer than the minimum the bot enforces", () => {
		expect(generateSecret().length).toBeGreaterThanOrEqual(32);
	});

	it("is base64url, so it survives a .env file without quoting", () => {
		expect(generateSecret()).toMatch(/^[A-Za-z0-9_-]+$/);
	});

	/** A predictable secret is not a secret, and this one derives the key the OAuth tokens are encrypted with. */
	it("is different every time", () => {
		const secrets = new Set(Array.from({ length: 50 }, () => generateSecret()));

		expect(secrets.size).toBe(50);
	});
});

describe("withSecret", () => {
	it("appends the line to a file that does not have one", () => {
		expect(withSecret("DISCORD_TOKEN=abc\n", "s3cret")).toBe("DISCORD_TOKEN=abc\nDASHBOARD_SESSION_SECRET=s3cret\n");
	});

	it("adds the missing newline first", () => {
		expect(withSecret("DISCORD_TOKEN=abc", "s3cret")).toBe("DISCORD_TOKEN=abc\nDASHBOARD_SESSION_SECRET=s3cret\n");
	});

	it("writes into an empty file", () => {
		expect(withSecret("", "s3cret")).toBe("DASHBOARD_SESSION_SECRET=s3cret\n");
	});

	/** Two of these in one file and dotenv picks one of them, which is not a coin toss worth having. */
	it("replaces the existing line rather than adding a second", () => {
		const before = "DISCORD_TOKEN=abc\nDASHBOARD_SESSION_SECRET=old\nMONGODB_URI=x\n";
		const after = withSecret(before, "new");

		expect(after).toContain("DASHBOARD_SESSION_SECRET=new");
		expect(after).not.toContain("old");
		expect([...after.matchAll(/DASHBOARD_SESSION_SECRET=/g)]).toHaveLength(1);
	});

	it("leaves every other line exactly as it was", () => {
		const before = "DISCORD_TOKEN=abc\nDASHBOARD_SESSION_SECRET=old\nMONGODB_URI=mongodb://localhost:27017/x\n";
		const after = withSecret(before, "new");

		expect(after).toContain("DISCORD_TOKEN=abc");
		expect(after).toContain("MONGODB_URI=mongodb://localhost:27017/x");
	});

	/** `DASHBOARD_SESSION_TTL_DAYS` starts with the same characters and must not be clobbered. */
	it("does not touch a different variable whose name starts the same way", () => {
		const before = "DASHBOARD_SESSION_TTL_DAYS=7\n";

		expect(withSecret(before, "new")).toBe("DASHBOARD_SESSION_TTL_DAYS=7\nDASHBOARD_SESSION_SECRET=new\n");
	});
});
