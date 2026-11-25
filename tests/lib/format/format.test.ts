import {
	blockquote,
	discordTime,
	escapeMarkdown,
	formatClock,
	formatDuration,
	formatDurationLong,
	humanisePermission,
	ordinal,
	progressBar,
	truncate,
} from "@lib/format/format.util";

/** Every row whose answer is not the one expected, as `input → got`, so a failure names them all. */
function wrong<In>(rows: readonly (readonly [In, string])[], read: (input: In) => string): string[] {
	return rows
		.filter(([input, expected]) => read(input) !== expected)
		.map(([input]) => `${String(input)} → ${String(read(input))}`);
}

describe("formatDuration", () => {
	it("reads compactly, and never as a negative time", () => {
		const rows = [
			[500, "0s"],
			[1_000, "1s"],
			[65_000, "1m 5s"],
			[3_661_000, "1h 1m 1s"],
			[-5_000, "0s"],
		] as const;

		expect(wrong(rows, formatDuration)).toEqual([]);
	});
});

describe("formatDurationLong", () => {
	it("collapses anything that is not a length to zero seconds", () => {
		const rows = [0, -5, Number.NaN, Number.POSITIVE_INFINITY].map((input) => [input, "0 seconds"] as const);

		expect(wrong(rows, formatDurationLong)).toEqual([]);
	});
});

describe("formatClock", () => {
	/** A track that has not started is at the beginning, not at "0s" or "NaN"; 3:07 never renders as 3:7. */
	it("pads the seconds, and renders anything that is not a position as the start", () => {
		const rows = [
			[3 * 60_000 + 7_000, "3:07"],
			[0, "0:00"],
			[-1, "0:00"],
			[Number.NaN, "0:00"],
			[Number.POSITIVE_INFINITY, "0:00"],
		] as const;

		expect(wrong(rows, formatClock)).toEqual([]);
	});
});

describe("text", () => {
	it("truncates with an ellipsis and respects the limit exactly", () => {
		expect(truncate("abcdefghij", 5)).toHaveLength(5);
		expect(truncate("abc", 10)).toBe("abc");
	});

	it("quotes every line of somebody's text", () => {
		expect(blockquote("# heading\n- item")).toBe("> # heading\n> - item");
	});

	it("stops user text from formatting the embed around it, and leaves plain text alone", () => {
		expect(escapeMarkdown("**bold**")).not.toBe("**bold**");
		expect(escapeMarkdown("hello")).toBe("hello");
	});
});

describe("progressBar", () => {
	it("is always the requested width", () => {
		for (const value of [0, 3, 10]) expect([...progressBar(value, 10, 20)]).toHaveLength(20);
	});
});

describe("discordTime", () => {
	it("renders a Discord timestamp in seconds, from a date or milliseconds, in the style asked for", () => {
		expect(discordTime(new Date(1_700_000_000_000))).toBe("<t:1700000000:f>");
		expect(discordTime(1_700_000_000_000)).toBe("<t:1700000000:f>");
		expect(discordTime(1_700_000_000_000, "R")).toBe("<t:1700000000:R>");
	});
});

describe("ordinal", () => {
	it("gives every number its English suffix, the teens included", () => {
		const rows = [
			[1, "1st"],
			[2, "2nd"],
			[3, "3rd"],
			[4, "4th"],
			[11, "11th"],
			[12, "12th"],
			[13, "13th"],
			[21, "21st"],
			[22, "22nd"],
			[23, "23rd"],
			[101, "101st"],
			[111, "111th"],
		] as const;

		expect(wrong(rows, ordinal)).toEqual([]);
	});
});

describe("humanisePermission", () => {
	// Lower case throughout, because the result is dropped into a sentence.
	it("splits a camel-case or snake-case flag into words", () => {
		const rows = [
			["BanMembers", "ban members"],
			["ManageGuild", "manage guild"],
			["MANAGE_ROLES", "manage roles"],
			["Administrator", "administrator"],
		] as const;

		expect(wrong(rows, humanisePermission)).toEqual([]);
	});
});
