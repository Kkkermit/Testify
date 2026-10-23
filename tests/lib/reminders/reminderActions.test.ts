import { Collection, DiscordAPIError, RESTJSONErrorCodes } from "discord.js";
import { type TestifyClient } from "@core/client";
import { UserFacingError } from "@core/errors";
import { countReminders, createReminder, type StoredReminder } from "@database/repositories/reminderRepository";
import { deliverReminder, reminderDelay, reminderText, setReminder } from "@lib/reminders/reminderActions.util";

jest.mock("@database/repositories/reminderRepository", () => ({
	countReminders: jest.fn(() => Promise.resolve(0)),
	createReminder: jest.fn((fields: object) => Promise.resolve({ id: "r1", createdAt: new Date(), ...fields })),
}));

const counted = jest.mocked(countReminders);
const created = jest.mocked(createReminder);

const USER = "100000000000000001";
const GUILD = "900000000000000001";
const CHANNEL = "400000000000000001";
const NOW = new Date("2026-10-23T12:00:00.000Z");

const REMINDER: StoredReminder = {
	id: "6650a1b2c3d4e5f6a7b8c9d0",
	userId: USER,
	guildId: GUILD,
	channelId: CHANNEL,
	text: "check the oven",
	dueAt: NOW,
	deliver: "channel",
	createdAt: new Date("2026-10-23T10:00:00.000Z"),
};

function discordError(code: number): DiscordAPIError {
	return new DiscordAPIError({ code, message: "refused" }, code, 403, "POST", "/", {});
}

function clientWith(options: { member?: boolean; channel?: object | null; dm?: jest.Mock } = {}) {
	const channelSend = jest.fn(() => Promise.resolve());
	const channel = options.channel === undefined ? { isSendable: () => true, send: channelSend } : options.channel;
	const dm = options.dm ?? jest.fn(() => Promise.resolve());
	const guild = {
		members: {
			fetch: jest.fn(() => (options.member === false ? Promise.reject(new Error("left")) : Promise.resolve({}))),
		},
		channels: { fetch: jest.fn(() => Promise.resolve(channel)) },
	};
	const client = {
		guilds: { cache: new Collection([[GUILD, guild]]) },
		users: { fetch: jest.fn(() => Promise.resolve({ send: dm })) },
	} as unknown as TestifyClient;

	return { client, channelSend, dm };
}

beforeEach(() => {
	jest.clearAllMocks();
	counted.mockResolvedValue(0);
});

describe("when a reminder is due", () => {
	it("reads the lengths people type", () => {
		expect(reminderDelay("10m")).toBe(10 * 60_000);
		expect(reminderDelay("2h30m")).toBe(150 * 60_000);
	});

	it("refuses something that is not a length of time, too soon or too far", () => {
		expect(() => reminderDelay("tomorrow")).toThrow(/length of time/);
		expect(() => reminderDelay("30s")).toThrow(/at least/);
		expect(() => reminderDelay("400d")).toThrow(/at most/);
	});
});

describe("what a reminder says", () => {
	/** A string padded with zero-width spaces must not pass as something to say. */
	it("strips invisible characters before checking it is there", () => {
		expect(() => reminderText("​​")).toThrow(UserFacingError);
		expect(reminderText("  water the plants  ")).toBe("water the plants");
	});

	it("refuses one longer than the limit", () => {
		expect(() => reminderText("x".repeat(501))).toThrow(/under 500/);
	});
});

describe("setting a reminder", () => {
	it("pings in the channel it was set in, when set in a server", async () => {
		await setReminder({ userId: USER, guildId: GUILD, channelId: CHANNEL, when: "2h", about: "oven", now: NOW });

		expect(created).toHaveBeenCalledWith({
			userId: USER,
			guildId: GUILD,
			channelId: CHANNEL,
			text: "oven",
			dueAt: new Date(NOW.getTime() + 2 * 3_600_000),
			deliver: "channel",
		});
	});

	it("arrives by DM when set in a direct message", async () => {
		await setReminder({ userId: USER, guildId: null, channelId: "dm-channel", when: "2h", about: "oven", now: NOW });

		expect(created).toHaveBeenCalledWith(expect.objectContaining({ guildId: null, channelId: null, deliver: "dm" }));
	});

	it("stops at the limit", async () => {
		counted.mockResolvedValue(25);

		await expect(
			setReminder({ userId: USER, guildId: GUILD, channelId: CHANNEL, when: "2h", about: "oven" }),
		).rejects.toThrow(/already have 25/);
		expect(created).not.toHaveBeenCalled();
	});
});

describe("delivering a reminder", () => {
	/** The reminder's own text is whatever somebody typed, so the post may mention its owner and nobody else. */
	it("pings its owner where it was set, and nobody else", async () => {
		const { client, channelSend, dm } = clientWith();

		expect(await deliverReminder(client, REMINDER)).toBe("channel");
		expect(channelSend).toHaveBeenCalledWith(expect.objectContaining({ allowedMentions: { users: [USER] } }));
		expect(dm).not.toHaveBeenCalled();
	});

	it("sends a DM instead when its owner has left the server", async () => {
		const { client, channelSend, dm } = clientWith({ member: false });

		expect(await deliverReminder(client, REMINDER)).toBe("dm");
		expect(channelSend).not.toHaveBeenCalled();
		expect(dm).toHaveBeenCalledTimes(1);
	});

	it("sends a DM instead when it can no longer post in the channel", async () => {
		const send = jest.fn(() => Promise.reject(discordError(RESTJSONErrorCodes.MissingPermissions)));
		const { client, dm } = clientWith({ channel: { isSendable: () => true, send } });

		expect(await deliverReminder(client, REMINDER)).toBe("dm");
		expect(dm).toHaveBeenCalledTimes(1);
	});

	it("goes straight to DMs when its owner asked for that", async () => {
		const { client, channelSend } = clientWith();

		expect(await deliverReminder(client, { ...REMINDER, deliver: "dm" })).toBe("dm");
		expect(channelSend).not.toHaveBeenCalled();
	});

	it("answers null when DMs are closed too, which is not worth retrying", async () => {
		const dm = jest.fn(() => Promise.reject(discordError(RESTJSONErrorCodes.CannotSendMessagesToThisUser)));
		const { client } = clientWith({ member: false, dm });

		expect(await deliverReminder(client, REMINDER)).toBeNull();
	});

	/** Discord being down is not the same as the person being unreachable, so the reminder is kept for a retry. */
	it("throws a failure that may pass, so the job tries again", async () => {
		const dm = jest.fn(() => Promise.reject(new Error("socket hang up")));
		const { client } = clientWith({ member: false, dm });

		await expect(deliverReminder(client, REMINDER)).rejects.toThrow(/socket hang up/);
	});
});
