import { problemText } from "@lib/format/problemText.util";
import { STICKY_LIMITS, stickyBlocked, stickyPut } from "@testify/shared";

/** The rules the form and the API share; mounting is covered by `server.test.ts`. */
describe("stickyPut", () => {
	const channelId = "400000000000000001";

	it("refuses a cap outside what the bot will count to, a channel that is not one, and an empty or long message", () => {
		const refused = {
			"a cap of 0": { channelId, message: "hi", cap: 0 },
			"a cap past the most": { channelId, message: "hi", cap: STICKY_LIMITS.maxCap + 1 },
			"a channel that is not a snowflake": { channelId: "not-an-id", message: "hi", cap: 5 },
			"an empty message": { channelId, message: "   ", cap: 5 },
			"a message past the limit": { channelId, message: "x".repeat(2_001), cap: 5 },
		};

		const accepted = Object.entries(refused).filter(([, body]) => stickyPut.safeParse(body).success);
		expect(accepted.map(([name]) => name)).toEqual([]);
		expect(stickyPut.safeParse({ channelId, message: "hi", cap: 5 }).success).toBe(true);
	});

	/** The number arrives from a form as a string, so it has to coerce rather than refuse. */
	it("takes a cap that arrived as text", () => {
		expect(stickyPut.parse({ channelId, message: "hi", cap: "8" }).cap).toBe(8);
	});

	/** A sticky is posted into a channel, so the same markup refusal as every other free-text field applies. */
	it("refuses HTML but keeps Discord syntax", () => {
		expect(stickyPut.safeParse({ channelId, message: "<b>hi</b>", cap: 5 }).success).toBe(false);
		expect(stickyPut.safeParse({ channelId, message: "Read <#400000000000000002>", cap: 5 }).success).toBe(true);
	});
});

describe("stickyBlocked", () => {
	/** One sticky per channel is a unique index underneath, so the form has to say so rather than 500. */
	it("refuses a channel that already has one", () => {
		expect(problemText(stickyBlocked({ channelId: "1", message: "hi" }, ["1"]))).toMatch(/already has a sticky/i);
	});

	it("refuses an empty message", () => {
		expect(problemText(stickyBlocked({ channelId: "1", message: "  " }, []))).toMatch(/something to say/i);
	});
});
