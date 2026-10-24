import reminder from "@buttons/reminder";
import {
	cancelReminder,
	findReminder,
	listReminders,
	setReminderDelivery,
	type StoredReminder,
} from "@database/repositories/reminderRepository";
import { type ContainerMessage } from "@lib/discord/discord.types";
import { textOf } from "@tests/helpers/containers";

jest.mock("@database/repositories/reminderRepository", () => ({
	cancelReminder: jest.fn(() => Promise.resolve(true)),
	findReminder: jest.fn(),
	listReminders: jest.fn(() => Promise.resolve([])),
	setReminderDelivery: jest.fn(),
}));

const OWNER = "100000000000000001";
const ID = "6650a1b2c3d4e5f6a7b8c9d0";
const STORED: StoredReminder = {
	id: ID,
	userId: OWNER,
	guildId: "900000000000000001",
	channelId: "400000000000000001",
	text: "oven",
	dueAt: new Date("2026-10-23T14:00:00.000Z"),
	deliver: "channel",
	createdAt: new Date("2026-10-23T12:00:00.000Z"),
};

function press() {
	return { user: { id: OWNER }, isButton: () => true, update: jest.fn(() => Promise.resolve()) };
}

const context = (action: string, ...args: string[]) => ({ client: {} as never, action, args });
const shown = (pressed: ReturnType<typeof press>): string =>
	textOf((pressed.update.mock.calls[0] as unknown as [ContainerMessage])[0]);

beforeEach(() => {
	jest.clearAllMocks();
	jest.mocked(findReminder).mockResolvedValue(STORED);
	jest.mocked(cancelReminder).mockResolvedValue(true);
});

describe("a reminder's buttons", () => {
	it("is only ever for the person who set it", () => {
		expect(reminder.ownerOnly).toBe(true);
	});

	it("cancels it, by the presser's id as well as its own", async () => {
		const pressed = press();

		await reminder.run(pressed as never, context("cancel", ID, OWNER));

		expect(cancelReminder).toHaveBeenCalledWith(OWNER, ID);
		expect(shown(pressed)).toMatch(/Reminder cancelled/);
	});

	it("says so when it has already gone off", async () => {
		jest.mocked(findReminder).mockResolvedValue(null);

		await expect(reminder.run(press() as never, context("cancel", ID, OWNER))).rejects.toThrow(/already gone off/);
	});

	it("switches it to a DM and back", async () => {
		jest.mocked(setReminderDelivery).mockResolvedValue({ ...STORED, deliver: "dm" });
		const pressed = press();

		await reminder.run(pressed as never, context("deliver", ID, OWNER));

		expect(setReminderDelivery).toHaveBeenCalledWith(OWNER, ID, "dm");
		expect(shown(pressed)).toMatch(/by direct message/);
	});

	it("cancels one from the list and shows the same page again", async () => {
		jest.mocked(listReminders).mockResolvedValue([STORED]);
		const pressed = press();

		await reminder.run(pressed as never, context("drop", ID, "0", OWNER));

		expect(cancelReminder).toHaveBeenCalledWith(OWNER, ID);
		expect(shown(pressed)).toMatch(/Cancelled\./);
	});
});
