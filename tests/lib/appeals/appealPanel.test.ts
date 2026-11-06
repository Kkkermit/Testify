import { buttonsOf, idsOf, textOf } from "../../helpers/containers";
import { parseCustomId } from "@core/button";
import { type StoredAppeal } from "@database/repositories/appealRepository";
import { appealPost, appealSettingsPanel } from "@lib/appeals/appealPanel.util";
import { type AppealSettings } from "@testify/shared";

const OWNER = "100000000000000001";

const APPEAL: StoredAppeal = {
	id: "a".repeat(24),
	guildId: "900000000000000001",
	userId: "100000000000000002",
	username: "kate",
	text: "I was spamming, and I will not again.",
	status: "open",
	reason: "",
	decidedBy: null,
	decidedByName: null,
	decidedAt: null,
	channelId: "400000000000000001",
	messageId: "500000000000000001",
	createdAt: new Date("2026-11-01T00:00:00.000Z"),
};

const SETTINGS: AppealSettings = {
	enabled: false,
	channelId: null,
	canSend: false,
	cooldownDays: 30,
	dashboard: true,
	open: 0,
};

describe("appealPost", () => {
	/** A decided appeal still showing Accept would let a second moderator unban somebody already refused. */
	it("offers the buttons only while the appeal waits, and says what was decided after", () => {
		const refused = appealPost({ ...APPEAL, status: "refused", reason: "Not yet.", decidedByName: "mod" });

		expect(idsOf(appealPost(APPEAL))).toHaveLength(2);
		expect(idsOf(refused)).toEqual([]);
		expect(textOf(refused)).toMatch(/Refused.*mod[\s\S]*Not yet\./);
	});
});

describe("appealSettingsPanel", () => {
	/** The router compares the last argument with whoever pressed, so every control must end with the owner. */
	it("ends every custom ID with the person who opened it", () => {
		for (const id of idsOf(appealSettingsPanel(SETTINGS, OWNER))) expect(parseCustomId(id).args.at(-1)).toBe(OWNER);
	});

	/** Appeals are written on the dashboard; a bot without one must say why the switch does nothing. */
	it("says so, and will not switch on, when the bot runs no dashboard", () => {
		const panel = appealSettingsPanel({ ...SETTINGS, channelId: "400000000000000001", dashboard: false }, OWNER);

		expect(textOf(panel)).toContain("does not run");
		expect(buttonsOf(panel).find((button) => button.label === "Turn on")?.disabled).toBe(true);
	});
});
