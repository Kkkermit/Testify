import { claimDueReminder, finishReminder, type StoredReminder } from "@database/repositories/reminderRepository";
import { deliverDueReminders } from "@jobs/reminders.util";
import { deliverReminder } from "@lib/reminders";
import { createMockClient } from "@tests/helpers/mocks";

jest.mock("@database/repositories/reminderRepository", () => ({
	claimDueReminder: jest.fn(),
	finishReminder: jest.fn(() => Promise.resolve()),
}));
jest.mock("@lib/reminders", () => ({
	...jest.requireActual<object>("@lib/reminders"),
	deliverReminder: jest.fn(() => Promise.resolve("channel")),
}));

const claimed = jest.mocked(claimDueReminder);
const finished = jest.mocked(finishReminder);
const delivered = jest.mocked(deliverReminder);

const NOW = new Date("2026-10-23T12:00:00.000Z");

function due(id: string, dueAt = NOW): StoredReminder {
	return {
		id,
		userId: "100000000000000001",
		guildId: null,
		channelId: null,
		text: "oven",
		dueAt,
		deliver: "dm",
		createdAt: NOW,
	};
}

/** Hands out the given reminders in turn, then nothing. */
function queue(...reminders: StoredReminder[]): void {
	claimed.mockReset();
	for (const reminder of reminders) claimed.mockResolvedValueOnce(reminder);
	claimed.mockResolvedValue(null);
}

beforeEach(() => {
	jest.clearAllMocks();
	delivered.mockResolvedValue("channel");
});

describe("delivering due reminders", () => {
	it("deletes each one once it has been sent", async () => {
		queue(due("a"), due("b"));

		await deliverDueReminders(createMockClient(), NOW);

		expect(delivered).toHaveBeenCalledTimes(2);
		expect(finished.mock.calls.map(([id]) => id)).toEqual(["a", "b"]);
	});

	/** The lease runs out and the next run tries again, which is the point of keeping it until it is sent. */
	it("keeps one that failed for a reason that may pass, and carries on with the rest", async () => {
		queue(due("a"), due("b"));
		delivered.mockRejectedValueOnce(new Error("Discord is down"));

		await deliverDueReminders(createMockClient(), NOW);

		expect(finished.mock.calls.map(([id]) => id)).toEqual(["b"]);
	});

	it("drops one that still fails a day after it was due", async () => {
		queue(due("a", new Date(NOW.getTime() - 25 * 3_600_000)));
		delivered.mockRejectedValueOnce(new Error("Discord is down"));

		await deliverDueReminders(createMockClient(), NOW);

		expect(finished).toHaveBeenCalledWith("a");
	});

	it("drops one nobody can be reached for", async () => {
		queue(due("a"));
		delivered.mockResolvedValueOnce(null);

		await deliverDueReminders(createMockClient(), NOW);

		expect(finished).toHaveBeenCalledWith("a");
	});

	it("delivers at most a run's worth at once", async () => {
		claimed.mockResolvedValue(due("a"));

		await deliverDueReminders(createMockClient(), NOW);

		expect(delivered).toHaveBeenCalledTimes(25);
	});
});
