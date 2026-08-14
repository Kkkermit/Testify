import {
	discordTime,
	escapeMarkdown,
	formatBytes,
	formatDuration,
	formatDurationLong,
	formatNumber,
	formatUptime,
	humanisePermission,
	ordinal,
	progressBar,
	titleCase,
	truncate,
} from "@lib/format.util";

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

describe("numbers", () => {
	it("groups thousands", () => {
		expect(formatNumber(1234567)).toBe("1,234,567");
	});

	it("handles the awkward ordinals", () => {
		expect(ordinal(1)).toBe("1st");
		expect(ordinal(11)).toBe("11th");
		expect(ordinal(22)).toBe("22nd");
		expect(ordinal(113)).toBe("113th");
	});
});

describe("text", () => {
	it("truncates with an ellipsis and respects the limit exactly", () => {
		expect(truncate("abcdefghij", 5)).toHaveLength(5);
		expect(truncate("abc", 10)).toBe("abc");
	});

	it("title-cases a sentence", () => {
		expect(titleCase("hello there world")).toBe("Hello There World");
	});

	it("turns a permission flag into something readable", () => {
		expect(humanisePermission("ManageGuild")).toBe("manage guild");
	});
});

describe("progressBar", () => {
	it("is always the requested width", () => {
		for (const value of [0, 3, 10]) expect([...progressBar(value, 10, 20)]).toHaveLength(20);
	});

	it("survives a total of zero", () => {
		expect(() => progressBar(0, 0, 10)).not.toThrow();
	});
});

describe("formatBytes", () => {
	it("picks a sensible unit", () => {
		expect(formatBytes(512)).toBe("512 B");
		expect(formatBytes(2048)).toBe("2.0 KB");
	});
});

describe("formatDurationLong", () => {
	it("writes prose rather than abbreviations", () => {
		expect(formatDurationLong(2 * 3_600_000 + 5 * 60_000)).toBe("2 hours, 5 minutes");
	});

	it("singularises a unit of one", () => {
		expect(formatDurationLong(3_600_000)).toBe("1 hour");
		expect(formatDurationLong(1_000)).toBe("1 second");
	});

	it("counts days separately from hours", () => {
		expect(formatDurationLong(25 * 3_600_000)).toBe("1 day, 1 hour");
	});

	it("leaves out units that are zero", () => {
		expect(formatDurationLong(2 * 86_400_000)).toBe("2 days");
	});

	it.each([0, -5, Number.NaN, Number.POSITIVE_INFINITY])("collapses %p to zero seconds", (input) => {
		expect(formatDurationLong(input)).toBe("0 seconds");
	});

	it("rounds a sub-second duration down to nothing", () => {
		expect(formatDurationLong(400)).toBe("0 seconds");
	});
});

describe("formatUptime", () => {
	it("measures forwards from the start time", () => {
		const now = Date.now();
		expect(formatUptime(now - 3_600_000, now)).toBe("1 hour");
	});

	it("reads as zero for a process that just started", () => {
		const now = Date.now();
		expect(formatUptime(now, now)).toBe("0 seconds");
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
