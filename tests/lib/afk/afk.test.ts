import { AFK } from "@config/constants";
import { setAfk } from "@database/repositories/afkRepository";
import { awayConfirm, awayNotice, goAway, shouldTell, welcomeBack } from "@lib/afk/afk.util";

jest.mock("@database/repositories/afkRepository", () => ({
	setAfk: jest.fn((_guildId: string, userId: string, note: string) =>
		Promise.resolve({ userId, note, updatedAt: new Date(0) }),
	),
}));

const GUILD = "900000000000000001";

describe("goAway", () => {
	/** A note is shown to whoever mentions its member, so what makes text read differently is stripped first. */
	it("strips invisible characters and squashes the note onto one line", async () => {
		await goAway(GUILD, "1", " back​ at\nsix ");

		expect(setAfk).toHaveBeenCalledWith(GUILD, "1", "back at six");
	});

	it("stores no note as an empty one", async () => {
		await goAway(GUILD, "1", null);

		expect(setAfk).toHaveBeenCalledWith(GUILD, "1", "");
	});

	it("refuses a note longer than the command allows", async () => {
		await expect(goAway(GUILD, "1", "x".repeat(AFK.maxNote + 1))).rejects.toThrow("Keep your note to 100 characters.");
	});
});

describe("the notices", () => {
	it("tells the member what others will see", () => {
		expect(awayConfirm({ userId: "1", note: "lunch", updatedAt: new Date() }).data.description).toContain(
			"Anybody who mentions you here is told: lunch",
		);
		expect(awayConfirm({ userId: "1", note: "", updatedAt: new Date() }).data.description).toContain(
			"told you are away.",
		);
	});

	it("lists each away member with their note and when they went", () => {
		const since = new Date(1_700_000_000_000);
		const text = awayNotice([
			{ name: "Sam_", note: "lunch", since },
			{ name: "Kit", note: "", since },
		]).data.description;

		expect(text).toBe("💤 **Sam\\_** is away: lunch · <t:1700000000:R>\n💤 **Kit** is away · <t:1700000000:R>");
	});

	it("says how long the member was away", () => {
		const text = welcomeBack({ userId: "1", note: "", updatedAt: new Date(0) }, 2 * 60 * 60 * 1_000).data.description;

		expect(text).toContain("you were away for 2 hours.");
	});
});

describe("shouldTell", () => {
	it("tells a channel once a minute about the same member", () => {
		expect(shouldTell(GUILD, "c1", "u1", 0)).toBe(true);
		expect(shouldTell(GUILD, "c1", "u1", AFK.noticeEveryMs - 1)).toBe(false);
		expect(shouldTell(GUILD, "c1", "u1", AFK.noticeEveryMs)).toBe(true);
	});

	it("counts each channel and each member separately", () => {
		expect(shouldTell(GUILD, "c2", "u2", 0)).toBe(true);
		expect(shouldTell(GUILD, "c3", "u2", 0)).toBe(true);
		expect(shouldTell(GUILD, "c2", "u3", 0)).toBe(true);
	});
});
