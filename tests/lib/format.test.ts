import {
	compactNumber,
	formatBytes,
	formatDuration,
	formatNumber,
	humanisePermission,
	ordinal,
	pluralise,
	progressBar,
	titleCase,
	truncate,
} from "@lib/format";

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

	it("shortens large numbers", () => {
		expect(compactNumber(1500)).toBe("1.5K");
		expect(compactNumber(2_400_000)).toBe("2.4M");
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

	it("pluralises only when it should", () => {
		expect(pluralise(1, "command")).toBe("1 command");
		expect(pluralise(2, "command")).toBe("2 commands");
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
