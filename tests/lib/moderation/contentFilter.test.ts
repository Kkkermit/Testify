import { containsLink } from "@lib/moderation/contentFilter.util";

describe("containsLink", () => {
	it("finds a link however it is written, and nothing in ordinary text", () => {
		const links = [
			"https://x.io",
			"see www.example",
			"discord.gg/abc",
			"example.com",
			"my-site.co",
			"a.b.example.io/path",
		];
		const plain = ["hello world", "a.b", "e.g. this one", "version 1.2.3", "the community.", "--.com"];

		expect(links.filter((text) => !containsLink(text))).toEqual([]);
		expect(plain.filter((text) => containsLink(text))).toEqual([]);
	});

	/** The filter reads every message the bot sees, and its old pattern took five seconds over one long run of `a-`. */
	it("reads a long message with no link in one pass", () => {
		const started = performance.now();

		expect(containsLink(`${"a-".repeat(50_000)}.`)).toBe(false);
		expect(performance.now() - started).toBeLessThan(500);
	});
});
