import {
	compactNumber,
	discordTime,
	formatBytes,
	formatCooldown,
	formatDuration,
	formatDurationLong,
	formatNumber,
	formatTrackTime,
	formatUptime,
	humanisePermission,
	ordinal,
	pluralise,
	progressBar,
	titleCase,
	truncate,
} from "../../src/ui/format";

describe("formatDuration", () => {
	it("formats a compound duration", () => {
		expect(formatDuration(2 * 3_600_000 + 5 * 60_000 + 3_000)).toBe("2h 5m 3s");
	});

	it("includes days", () => {
		expect(formatDuration(90_000_000)).toBe("1d 1h");
	});

	it("collapses zero and negative values", () => {
		expect(formatDuration(0)).toBe("0s");
		expect(formatDuration(-5_000)).toBe("0s");
		expect(formatDuration(Number.NaN)).toBe("0s");
	});
});

describe("formatDurationLong", () => {
	it("uses prose units and singular forms", () => {
		expect(formatDurationLong(3_600_000 + 60_000)).toBe("1 hour, 1 minute");
		expect(formatDurationLong(7_200_000)).toBe("2 hours");
	});
});

describe("formatCooldown", () => {
	it("reports the remaining time", () => {
		expect(formatCooldown(10_000, 4_000)).toBe("6s");
	});

	it("reports readiness once the instant has passed", () => {
		expect(formatCooldown(1_000, 5_000)).toBe("ready now");
	});
});

describe("formatUptime", () => {
	it("measures from the start time", () => {
		expect(formatUptime(0, 3_600_000)).toBe("1 hour");
	});
});

describe("formatTrackTime", () => {
	it("uses clock notation", () => {
		expect(formatTrackTime(187_000)).toBe("3:07");
		expect(formatTrackTime(3_753_000)).toBe("1:02:33");
	});
});

describe("ordinal", () => {
	it("handles the teens correctly", () => {
		expect(ordinal(11)).toBe("11th");
		expect(ordinal(12)).toBe("12th");
		expect(ordinal(13)).toBe("13th");
	});

	it("handles the regular suffixes", () => {
		expect(ordinal(1)).toBe("1st");
		expect(ordinal(22)).toBe("22nd");
		expect(ordinal(23)).toBe("23rd");
		expect(ordinal(104)).toBe("104th");
	});
});

describe("number formatting", () => {
	it("groups thousands", () => {
		expect(formatNumber(1_234_567)).toBe("1,234,567");
	});

	it("compacts large numbers", () => {
		expect(compactNumber(1_200)).toBe("1.2K");
		expect(compactNumber(3_400_000)).toBe("3.4M");
	});

	it("formats byte sizes", () => {
		expect(formatBytes(512)).toBe("512 B");
		expect(formatBytes(1_536)).toBe("1.5 KB");
	});

	it("pluralises", () => {
		expect(pluralise(1, "member")).toBe("1 member");
		expect(pluralise(2, "member")).toBe("2 members");
	});
});

describe("text helpers", () => {
	it("truncates with an ellipsis and leaves short text alone", () => {
		expect(truncate("abcdef", 4)).toBe("abc…");
		expect(truncate("abc", 10)).toBe("abc");
	});

	it("title-cases mixed separators", () => {
		expect(titleCase("COMMUNITY_INVITES_DISABLED")).toBe("Community Invites Disabled");
	});

	it("humanises both permission spellings", () => {
		expect(humanisePermission("MANAGE_ROLES")).toBe("manage roles");
		expect(humanisePermission("ManageRoles")).toBe("manage roles");
	});
});

describe("progressBar", () => {
	it("puts the marker at the start and end", () => {
		expect(progressBar(0, 100, 5).indexOf("🔘")).toBe(0);
		expect(progressBar(100, 100, 5).endsWith("🔘")).toBe(true);
	});

	it("keeps the requested width", () => {
		expect([...progressBar(50, 100, 10)].length).toBe(10);
	});

	it("survives a zero total", () => {
		expect(progressBar(5, 0, 4)).toBe("▬▬▬▬");
	});
});

describe("discordTime", () => {
	it("emits a relative timestamp in seconds", () => {
		expect(discordTime(1_700_000_000_000, "R")).toBe("<t:1700000000:R>");
	});
});
