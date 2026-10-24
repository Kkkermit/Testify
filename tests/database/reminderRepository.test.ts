import { describeWithMongo } from "../helpers/mongo";
import {
	cancelReminder,
	claimDueReminder,
	countReminders,
	createReminder,
	findReminder,
	finishReminder,
	listReminders,
	setReminderDelivery,
} from "@database/repositories/reminderRepository";

const ALICE = "100000000000000001";
const BOB = "100000000000000002";
const NOW = new Date("2026-10-23T12:00:00.000Z");
const LEASE = 120_000;

function at(minutes: number): Date {
	return new Date(NOW.getTime() + minutes * 60_000);
}

async function remind(userId: string, dueAt: Date, text = "oven"): Promise<string> {
	const reminder = await createReminder({
		userId,
		guildId: "900000000000000001",
		channelId: "400000000000000001",
		text,
		dueAt,
		deliver: "channel",
	});
	return reminder.id;
}

describeWithMongo("reminderRepository", () => {
	it("lists a person's reminders soonest first, and only theirs", async () => {
		await remind(ALICE, at(60), "later");
		await remind(ALICE, at(10), "sooner");
		await remind(BOB, at(5), "bob's");

		expect((await listReminders(ALICE)).map((reminder) => reminder.text)).toEqual(["sooner", "later"]);
		expect(await countReminders(ALICE)).toBe(2);
	});

	/** A reminder id from one person's list must never cancel or reveal another person's reminder. */
	it("never finds, changes or cancels somebody else's reminder", async () => {
		const bobs = await remind(BOB, at(5));

		expect(await findReminder(ALICE, bobs)).toBeNull();
		expect(await setReminderDelivery(ALICE, bobs, "dm")).toBeNull();
		expect(await cancelReminder(ALICE, bobs)).toBe(false);
		expect(await findReminder(BOB, bobs)).not.toBeNull();
	});

	it("answers no for an id that is not one, rather than throwing", async () => {
		expect(await findReminder(ALICE, "nonsense")).toBeNull();
		expect(await cancelReminder(ALICE, "$where")).toBe(false);
	});

	it("changes where one arrives", async () => {
		const id = await remind(ALICE, at(5));

		expect((await setReminderDelivery(ALICE, id, "dm"))?.deliver).toBe("dm");
	});

	it("hands out only what is due, soonest first", async () => {
		await remind(ALICE, at(10), "not yet");
		await remind(ALICE, at(-1), "newer");
		await remind(ALICE, at(-5), "older");

		expect((await claimDueReminder(NOW, LEASE))?.text).toBe("older");
		expect((await claimDueReminder(NOW, LEASE))?.text).toBe("newer");
		expect(await claimDueReminder(NOW, LEASE)).toBeNull();
	});

	/** Two runs must not both send one, but a run that died mid-send must not lose it either. */
	it("holds a claimed reminder until its lease runs out", async () => {
		const id = await remind(ALICE, at(-1));

		expect((await claimDueReminder(NOW, LEASE))?.id).toBe(id);
		expect(await claimDueReminder(at(1), LEASE)).toBeNull();
		expect((await claimDueReminder(at(3), LEASE))?.id).toBe(id);
	});

	it("is gone once finished", async () => {
		const id = await remind(ALICE, at(-1));

		await finishReminder(id);

		expect(await findReminder(ALICE, id)).toBeNull();
	});
});
