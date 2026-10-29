import {
	formatClock,
	discordTime,
	escapeMarkdown,
	formatDuration,
	formatDurationLong,
	humanisePermission,
	ordinal,
	progressBar,
	truncate,
} from "@lib/format/format.util";

describe("formatDuration", () => {
	it.each([
		[500, "0s"],
		[1_000, "1s"],
		[65_000, "1m 5s"],
		[3_661_000, "1h 1m 1s"],
	])("%ims reads as %s", (ms, expected) => {
		expect(formatDuration(ms)).toBe(expected);
	});

	it("never reads as a negative time", () => {
		expect(formatDuration(-5_000)).toBe("0s");
	});
});

describe("text", () => {
	it("truncates with an ellipsis and respects the limit exactly", () => {
		expect(truncate("abcdefghij", 5)).toHaveLength(5);
		expect(truncate("abc", 10)).toBe("abc");
	});

	it("turns a permission flag into something readable", () => {
		expect(humanisePermission("ManageGuild")).toBe("manage guild");
	});
});

describe("progressBar", () => {
	it("is always the requested width", () => {
		for (const value of [0, 3, 10]) expect([...progressBar(value, 10, 20)]).toHaveLength(20);
	});
});

describe("formatDurationLong", () => {
	it.each([0, -5, Number.NaN, Number.POSITIVE_INFINITY])("collapses %p to zero seconds", (input) => {
		expect(formatDurationLong(input)).toBe("0 seconds");
	});
});

describe("discordTime", () => {
	it("renders a Discord timestamp in seconds, not milliseconds", () => {
		expect(discordTime(new Date(1_700_000_000_000))).toBe("<t:1700000000:f>");
	});

	it("accepts a raw millisecond value too", () => {
		expect(discordTime(1_700_000_000_000)).toBe("<t:1700000000:f>");
	});

	it("takes a style", () => {
		expect(discordTime(1_700_000_000_000, "R")).toBe("<t:1700000000:R>");
	});
});

describe("ordinal", () => {
	it.each([
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
	])("renders %i as %s", (input, expected) => {
		expect(ordinal(input)).toBe(expected);
	});
});

describe("escapeMarkdown", () => {
	it("stops user text from formatting the embed around it", () => {
		expect(escapeMarkdown("**bold**")).not.toBe("**bold**");
	});

	it("leaves plain text alone", () => {
		expect(escapeMarkdown("hello")).toBe("hello");
	});
});

describe("humanisePermission", () => {
	// Lower case throughout, because the result is dropped into a sentence.
	it("splits a camel-case permission flag into words", () => {
		expect(humanisePermission("BanMembers")).toBe("ban members");
	});

	it("splits a snake-case flag too", () => {
		expect(humanisePermission("MANAGE_ROLES")).toBe("manage roles");
	});

	it("leaves a single word as one word", () => {
		expect(humanisePermission("Administrator")).toBe("administrator");
	});
});

describe("formatClock", () => {
	it("pads the seconds, so 3:07 never renders as 3:7", () => {
		expect(formatClock(3 * 60_000 + 7_000)).toBe("3:07");
	});

	/** A track that has not started is at the beginning, not at "0s" or "NaN". */
	it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])("renders %p as the start", (ms) => {
		expect(formatClock(ms)).toBe("0:00");
	});
});
