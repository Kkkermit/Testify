import { STICKY_LIMITS, stickyBlocked, stickyPut } from "@testify/shared";

/**
 * The rules the form and the API share. Mounting is covered by `server.test.ts`, which reads Hono's route
 * table — a missing `guilds.route(…)` line looks exactly like a permission refusal from the outside.
 */
describe("stickyPut", () => {
	const channelId = "400000000000000001";

	it("refuses a cap outside what the bot will count to", () => {
		expect(stickyPut.safeParse({ channelId, message: "hi", cap: 0 }).success).toBe(false);
		expect(stickyPut.safeParse({ channelId, message: "hi", cap: STICKY_LIMITS.maxCap + 1 }).success).toBe(false);
		expect(stickyPut.safeParse({ channelId, message: "hi", cap: 5 }).success).toBe(true);
	});

	/** The number arrives from a form as a string, so it has to coerce rather than refuse. */
	it("takes a cap that arrived as text", () => {
		expect(stickyPut.parse({ channelId, message: "hi", cap: "8" }).cap).toBe(8);
	});

	it("refuses a channel that is not a snowflake", () => {
		expect(stickyPut.safeParse({ channelId: "not-an-id", message: "hi", cap: 5 }).success).toBe(false);
	});

	it("refuses an empty message and one past the limit", () => {
		expect(stickyPut.safeParse({ channelId, message: "   ", cap: 5 }).success).toBe(false);
		expect(stickyPut.safeParse({ channelId, message: "x".repeat(2_001), cap: 5 }).success).toBe(false);
	});

	/** A sticky is posted into a channel, so the same markup refusal as every other free-text field applies. */
	it("refuses HTML but keeps Discord syntax", () => {
		expect(stickyPut.safeParse({ channelId, message: "<b>hi</b>", cap: 5 }).success).toBe(false);
		expect(stickyPut.safeParse({ channelId, message: "Read <#400000000000000002>", cap: 5 }).success).toBe(true);
	});
});

describe("stickyBlocked", () => {
	it("asks for a channel before anything else", () => {
		expect(stickyBlocked({ channelId: null, message: "hi" }, [])).toMatch(/channel/i);
	});

	/** One sticky per channel is a unique index underneath, so the form has to say so rather than 500. */
	it("refuses a channel that already has one", () => {
		expect(stickyBlocked({ channelId: "1", message: "hi" }, ["1"])).toMatch(/already has a sticky/i);
	});

	it("refuses an empty message", () => {
		expect(stickyBlocked({ channelId: "1", message: "  " }, [])).toMatch(/something to say/i);
	});

	it("says nothing when the entry is complete", () => {
		expect(stickyBlocked({ channelId: "1", message: "hi" }, ["2"])).toBeNull();
	});
});
