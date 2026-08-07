import { TICKET_LIMITS, ticketBlocked, ticketPatch } from "@testify/shared";

const ID = "400000000000000001";

describe("ticketPatch", () => {
	it("takes each field on its own, because the form saves what changed", () => {
		expect(ticketPatch.safeParse({ panelChannelId: ID }).success).toBe(true);
		expect(ticketPatch.safeParse({}).success).toBe(true);
	});

	/** An id that is not a snowflake must never reach a channel fetch as arbitrary text. */
	it("refuses an id that is not a snowflake", () => {
		expect(ticketPatch.safeParse({ categoryId: "not-an-id" }).success).toBe(false);
		expect(ticketPatch.safeParse({ staffRoleId: "12" }).success).toBe(false);
	});

	it("refuses an empty message and one past the limit", () => {
		expect(ticketPatch.safeParse({ description: "   " }).success).toBe(false);
		expect(ticketPatch.safeParse({ description: "x".repeat(TICKET_LIMITS.maxDescription + 1) }).success).toBe(false);
	});

	it("refuses a button label past the limit", () => {
		expect(ticketPatch.safeParse({ buttonLabel: "x".repeat(TICKET_LIMITS.maxButtonLabel + 1) }).success).toBe(false);
	});

	/** The message is posted into a public channel, so it takes the same strip as every free-text field. */
	it("refuses HTML but keeps Discord syntax", () => {
		expect(ticketPatch.safeParse({ description: "<b>hi</b>" }).success).toBe(false);
		expect(ticketPatch.safeParse({ description: "Ask <@&300000000000000003>" }).success).toBe(true);
	});

	/** A button label is one line on Discord, so a pasted newline is collapsed rather than refused. */
	it("flattens a button label onto one line", () => {
		expect(ticketPatch.parse({ buttonLabel: "Open\na ticket" }).buttonLabel).toBe("Open a ticket");
	});

	it("takes the publish flag as its own decision", () => {
		expect(ticketPatch.parse({ publish: true }).publish).toBe(true);
	});
});

describe("ticketBlocked", () => {
	const complete = {
		panelChannelId: ID,
		categoryId: "400000000000000005",
		transcriptChannelId: "400000000000000002",
		staffRoleId: "300000000000000003",
	};

	it("says nothing once all four are chosen", () => {
		expect(ticketBlocked(complete)).toBeNull();
	});

	it.each([
		["panelChannelId", /where the panel is posted/i],
		["categoryId", /category/i],
		["transcriptChannelId", /transcripts/i],
		["staffRoleId", /role/i],
	] as const)("asks for %s when it is missing", (field, expected) => {
		expect(ticketBlocked({ ...complete, [field]: null })).toMatch(expected);
	});
});
