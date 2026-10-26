import { DiscordAPIError, type Guild, RESTJSONErrorCodes } from "discord.js";
import { HOUR_MS, MINUTE_MS } from "@config/constants";
import {
	countSchedules,
	createSchedule,
	findSchedule,
	type StoredSchedule,
	updateSchedule,
} from "@database/repositories/scheduledMessageRepository";
import { canPostIn } from "@lib/discord/channels.util";
import { addSchedule, changeSchedule, deliverSchedule } from "@lib/scheduledMessages/scheduledMessageActions.util";
import { SCHEDULE_LIMITS } from "@testify/shared";
import { createMockClient } from "@tests/helpers/mocks";

jest.mock("@database/repositories/scheduledMessageRepository", () => ({
	countSchedules: jest.fn(() => Promise.resolve(0)),
	createSchedule: jest.fn(),
	deleteSchedule: jest.fn(),
	findSchedule: jest.fn(),
	listSchedules: jest.fn(() => Promise.resolve([])),
	updateSchedule: jest.fn(),
}));
jest.mock("@lib/discord/channels.util", () => ({ canPostIn: jest.fn(() => true) }));

const GUILD = "900000000000000001";
const CHANNEL = "400000000000000001";
const BY = "100000000000000001";
const NOW = new Date("2026-10-25T12:00:00.000Z");
const guild = { id: GUILD } as Guild;
const at = (offsetMs: number): Date => new Date(NOW.getTime() + offsetMs);

const stored = (overrides: Partial<StoredSchedule> = {}): StoredSchedule => ({
	id: "a".repeat(24),
	guildId: GUILD,
	channelId: CHANNEL,
	message: "Hello",
	repeat: "daily",
	nextAt: at(HOUR_MS),
	...overrides,
});

beforeEach(() => {
	jest.mocked(createSchedule).mockImplementation((_guild, fields) => Promise.resolve(stored(fields)));
	jest.mocked(updateSchedule).mockImplementation((_guild, _id, fields) => Promise.resolve(stored(fields)));
	jest.mocked(canPostIn).mockReturnValue(true);
});

describe("addSchedule", () => {
	it("stores the post with the stray characters taken out, and hands back the time in UTC", async () => {
		const added = await addSchedule(
			guild,
			{ channelId: CHANNEL, message: "Hello\u0007", repeat: "once", nextAt: at(HOUR_MS) },
			BY,
			NOW,
		);

		expect(createSchedule).toHaveBeenCalledWith(
			GUILD,
			{ channelId: CHANNEL, message: "Hello", repeat: "once", nextAt: at(HOUR_MS) },
			BY,
		);
		expect(added.nextAt).toBe(at(HOUR_MS).toISOString());
	});

	it("refuses one past the cap, a time already gone and a channel it cannot post in", async () => {
		const fields = { channelId: CHANNEL, message: "Hello", repeat: "once" as const, nextAt: at(HOUR_MS) };

		jest.mocked(countSchedules).mockResolvedValueOnce(SCHEDULE_LIMITS.maxPerGuild);
		await expect(addSchedule(guild, fields, BY, NOW)).rejects.toThrow(/can keep 10/);

		await expect(addSchedule(guild, { ...fields, nextAt: at(-MINUTE_MS) }, BY, NOW)).rejects.toThrow(/already gone/);

		jest.mocked(canPostIn).mockReturnValue(false);
		await expect(addSchedule(guild, fields, BY, NOW)).rejects.toThrow(/cannot post in/);
		expect(createSchedule).not.toHaveBeenCalled();
	});
});

describe("changeSchedule", () => {
	/** A post due any moment, or already being sent, can still have its words corrected. */
	it("saves new words for a post that is already due, keeping its time", async () => {
		jest.mocked(findSchedule).mockResolvedValue(stored({ nextAt: at(-MINUTE_MS) }));

		await changeSchedule(guild, "a".repeat(24), { message: "Fixed" }, BY, NOW);

		expect(updateSchedule).toHaveBeenCalledWith(
			GUILD,
			"a".repeat(24),
			{ channelId: CHANNEL, message: "Fixed", repeat: "daily" },
			BY,
		);
	});

	/** The dashboard saves the whole record, so a time sent back unchanged is not a new time. */
	it("does not hold an unchanged time against a post that is already due", async () => {
		jest.mocked(findSchedule).mockResolvedValue(stored({ nextAt: at(-MINUTE_MS) }));

		await changeSchedule(guild, "a".repeat(24), { message: "Fixed", nextAt: at(-MINUTE_MS) }, BY, NOW);

		expect(updateSchedule).toHaveBeenCalledWith(
			GUILD,
			"a".repeat(24),
			{ channelId: CHANNEL, message: "Fixed", repeat: "daily" },
			BY,
		);
	});

	it("checks a new time against the clock", async () => {
		jest.mocked(findSchedule).mockResolvedValue(stored());

		await expect(changeSchedule(guild, "a".repeat(24), { nextAt: at(-HOUR_MS) }, BY, NOW)).rejects.toThrow(
			/already gone/,
		);
	});

	it("says when it has gone", async () => {
		jest.mocked(findSchedule).mockResolvedValue(null);

		await expect(changeSchedule(guild, "a".repeat(24), { message: "x" }, BY, NOW)).rejects.toThrow(/has been deleted/);
	});
});

describe("deliverSchedule", () => {
	function clientWith(channel: unknown) {
		return createMockClient({
			guilds: {
				cache: new Map([[GUILD, { channels: { fetch: jest.fn(() => Promise.resolve(channel)) } }]]),
			},
		} as never);
	}

	/** It posts what a manager typed, so a mention in it must never ping. */
	it("posts the message pinging nobody", async () => {
		const send = jest.fn(() => Promise.resolve({}));

		await expect(deliverSchedule(clientWith({ isSendable: () => true, send }), stored())).resolves.toBe("sent");
		expect(send).toHaveBeenCalledWith({ content: "Hello", allowedMentions: { parse: [] } });
	});

	it("calls a missing server or channel unreachable", async () => {
		expect(await deliverSchedule(clientWith(null), stored())).toBe("unreachable");
		expect(await deliverSchedule(clientWith(null), stored({ guildId: "900000000000000009" }))).toBe("unreachable");
	});

	it("calls a refusal that will not pass unreachable, and lets any other failure through to be retried", async () => {
		const refused = new DiscordAPIError(
			{ code: RESTJSONErrorCodes.MissingPermissions, message: "Missing Permissions" },
			RESTJSONErrorCodes.MissingPermissions,
			403,
			"POST",
			"/channels/1/messages",
			{ body: undefined, files: undefined },
		);
		const failing = (error: Error) => clientWith({ isSendable: () => true, send: () => Promise.reject(error) });

		expect(await deliverSchedule(failing(refused), stored())).toBe("unreachable");
		await expect(deliverSchedule(failing(new Error("socket hang up")), stored())).rejects.toThrow("socket hang up");
	});
});
