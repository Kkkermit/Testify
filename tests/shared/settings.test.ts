import {
	antiLinkPatch,
	autoRolePut,
	BYPASS_LABELS,
	BYPASS_PERMISSIONS,
	countingPatch,
	isBypassPermission,
	prefixPatch,
	SETTINGS_LIMITS,
	voiceStatsPatch,
} from "@testify/shared";

describe("the bypass permissions", () => {
	/** A missing label renders an empty option, so the map has to cover the list exactly. */
	it("labels every one it offers", () => {
		for (const permission of BYPASS_PERMISSIONS) expect(BYPASS_LABELS[permission]).not.toBe("");
	});

	it("does not accept a permission it never offered", () => {
		expect(isBypassPermission("BanMembers")).toBe(false);
		expect(isBypassPermission("ManageMessages")).toBe(true);
	});
});

describe("prefixPatch", () => {
	it("accepts an ordinary prefix", () => {
		expect(prefixPatch.safeParse({ prefix: "!" }).success).toBe(true);
	});

	/** Whitespace alone matches every message; a space inside means the prefix can never be typed. */
	it("refuses one nobody could use", () => {
		expect(prefixPatch.safeParse({ prefix: "" }).success).toBe(false);
		expect(prefixPatch.safeParse({ prefix: "   " }).success).toBe(false);
		expect(prefixPatch.safeParse({ prefix: "a b" }).success).toBe(false);
		expect(prefixPatch.safeParse({ prefix: "x".repeat(SETTINGS_LIMITS.maxPrefix + 1) }).success).toBe(false);
	});

	it("refuses a body that changes nothing", () => {
		expect(prefixPatch.safeParse({}).success).toBe(false);
	});
});

describe("antiLinkPatch", () => {
	it("refuses a permission outside the four", () => {
		expect(antiLinkPatch.safeParse({ bypassPermission: "Administrator" }).success).toBe(true);
		expect(antiLinkPatch.safeParse({ bypassPermission: "KickMembers" }).success).toBe(false);
	});
});

describe("autoRolePut", () => {
	it("takes the whole list, empty included", () => {
		expect(autoRolePut.safeParse({ roleIds: [] }).success).toBe(true);
	});

	it("refuses more roles than the bot hands out", () => {
		const tooMany = Array.from({ length: SETTINGS_LIMITS.maxAutoRoles + 1 }, () => "300000000000000001");

		expect(autoRolePut.safeParse({ roleIds: tooMany }).success).toBe(false);
	});
});

describe("countingPatch", () => {
	it("refuses a target that is not a whole number in range", () => {
		for (const maxCount of [0, -1, 1.5, SETTINGS_LIMITS.maxCount + 1]) {
			expect(countingPatch.safeParse({ maxCount }).success).toBe(false);
		}
	});

	/** Reset is a verb, not a value — only `true` means anything, so `false` must not be accepted. */
	it("only accepts a reset that asks for one", () => {
		expect(countingPatch.safeParse({ reset: true }).success).toBe(true);
		expect(countingPatch.safeParse({ reset: false }).success).toBe(false);
	});
});

describe("voiceStatsPatch", () => {
	/** Null is a real value here — it is how a channel stops being renamed. */
	it("accepts null as well as a snowflake", () => {
		expect(voiceStatsPatch.safeParse({ memberChannelId: null }).success).toBe(true);
		expect(voiceStatsPatch.safeParse({ memberChannelId: "400000000000000001" }).success).toBe(true);
		expect(voiceStatsPatch.safeParse({ memberChannelId: "nope" }).success).toBe(false);
	});
});
