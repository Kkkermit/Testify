import { parseCustomId } from "@core/button";
import { type StoredReminder } from "@database/repositories/reminderRepository";
import { deliveredText, reminderConfirm, reminderList } from "@lib/reminders/reminderPanel.util";
import { buttonsOf, idsOf, textOf } from "@tests/helpers/containers";

const OWNER = "100000000000000001";
const REMINDER: StoredReminder = {
	id: "6650a1b2c3d4e5f6a7b8c9d0",
	userId: OWNER,
	guildId: "900000000000000001",
	channelId: "400000000000000001",
	text: "check the oven\nand the timer",
	dueAt: new Date("2026-10-23T14:00:00.000Z"),
	deliver: "channel",
	createdAt: new Date("2026-10-23T12:00:00.000Z"),
};

describe("the reminder's confirmation", () => {
	it("puts its owner last in every button", () => {
		for (const id of idsOf(reminderConfirm(REMINDER, OWNER))) expect(parseCustomId(id).args.at(-1)).toBe(OWNER);
	});

	/** A reminder set in a DM has no channel to ping in, so offering one would be a button that does nothing. */
	it("offers no choice when it was set in a DM", () => {
		const direct = { ...REMINDER, guildId: null, channelId: null, deliver: "dm" as const };

		expect(buttonsOf(reminderConfirm(direct, OWNER)).map((entry) => entry.label)).toEqual(["Cancel it"]);
		expect(textOf(reminderConfirm(direct, OWNER))).toContain("by direct message");
	});
});

describe("the list of reminders", () => {
	const many = Array.from({ length: 14 }, (_, index) => ({
		...REMINDER,
		id: `${String(index).padStart(2, "0")}50a1b2c3d4e5f6a7b8c9d0`,
	}));

	it("shows the last page for a page past the end", () => {
		const cancels = idsOf(reminderList(many, 99, OWNER)).filter((id) => parseCustomId(id).action === "drop");

		expect(cancels).toHaveLength(2);
	});
});

describe("the delivered reminder", () => {
	it("mentions its owner in the channel, and links back to where it was set by DM", () => {
		expect(deliveredText(REMINDER, "channel")).toMatch(/^⏰ <@100000000000000001>, you asked me to remind you/);

		const direct = deliveredText(REMINDER, "dm");
		expect(direct).not.toContain("<@");
		expect(direct).toContain("https://discord.com/channels/900000000000000001/400000000000000001");
	});
});
