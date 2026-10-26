import { DAY_MS, HOUR_MS, MINUTE_MS } from "@config/constants";
import {
	claimDueSchedule,
	settleSchedule,
	type StoredSchedule,
} from "@database/repositories/scheduledMessageRepository";
import { postDueSchedules } from "@jobs/scheduledMessages.util";
import { deliverSchedule } from "@lib/scheduledMessages";
import { createMockClient } from "@tests/helpers/mocks";

jest.mock("@database/repositories/scheduledMessageRepository", () => ({
	claimDueSchedule: jest.fn(),
	settleSchedule: jest.fn(() => Promise.resolve()),
}));
jest.mock("@lib/scheduledMessages", () => ({
	...jest.requireActual<object>("@lib/scheduledMessages"),
	deliverSchedule: jest.fn(() => Promise.resolve("sent")),
}));

const claimed = jest.mocked(claimDueSchedule);
const settled = jest.mocked(settleSchedule);
const delivered = jest.mocked(deliverSchedule);

const NOW = new Date("2026-10-25T12:00:00.000Z");

function due(id: string, repeat: StoredSchedule["repeat"], lateByMs = MINUTE_MS): StoredSchedule {
	return {
		id,
		guildId: "900000000000000001",
		channelId: "400000000000000001",
		message: "Hello",
		repeat,
		nextAt: new Date(NOW.getTime() - lateByMs),
	};
}

/** Hands out the given posts in turn, then nothing. */
function queue(...posts: StoredSchedule[]): void {
	claimed.mockReset();
	for (const post of posts) claimed.mockResolvedValueOnce(post);
	claimed.mockResolvedValue(null);
}

beforeEach(() => {
	jest.clearAllMocks();
	delivered.mockResolvedValue("sent");
});

describe("posting due scheduled messages", () => {
	it("posts each one, moving a daily post on a day and deleting a one-off", async () => {
		const daily = due("a", "daily");
		queue(daily, due("b", "once"));

		await postDueSchedules(createMockClient(), NOW);

		expect(delivered).toHaveBeenCalledTimes(2);
		expect(settled.mock.calls).toEqual([
			[daily, new Date(daily.nextAt.getTime() + DAY_MS)],
			[expect.objectContaining({ id: "b" }), null],
		]);
	});

	/** A post hours late is stale news, so it is skipped rather than sent. */
	it("skips a post more than an hour late, moving it on without sending it", async () => {
		queue(due("a", "weekly", 2 * HOUR_MS), due("b", "once", 2 * HOUR_MS));

		await postDueSchedules(createMockClient(), NOW);

		expect(delivered).not.toHaveBeenCalled();
		expect(settled).toHaveBeenCalledTimes(2);
		expect(settled.mock.calls[1]?.[1]).toBeNull();
	});

	/** The lease runs out and the next run tries again, which is the point of keeping it until it is sent. */
	it("keeps one that failed for a reason that may pass, and carries on with the rest", async () => {
		queue(due("a", "daily"), due("b", "daily"));
		delivered.mockRejectedValueOnce(new Error("Discord is down"));
		const client = createMockClient();
		const warn = jest.spyOn(client.logger, "warn");

		await postDueSchedules(client, NOW);

		expect(settled.mock.calls.map(([post]) => post.id)).toEqual(["b"]);
		expect(warn).toHaveBeenCalledWith(expect.anything(), expect.stringContaining("[SCHEDULED]"));
	});

	it("moves on from a channel that will never take it, rather than retrying for ever", async () => {
		queue(due("a", "daily"));
		delivered.mockResolvedValueOnce("unreachable");

		await postDueSchedules(createMockClient(), NOW);

		expect(settled).toHaveBeenCalledTimes(1);
	});
});
