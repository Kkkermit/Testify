import { type Guild, type User } from "discord.js";
import {
	getBirthdaySettings,
	listBirthdays,
	saveBirthdaySettings,
	shareBirthday,
} from "@database/repositories/birthdayRepository";
import {
	applyBirthdaySettings,
	birthdayPost,
	postBirthday,
	setOwnBirthday,
	upcomingBirthdays,
} from "@lib/birthdays/birthdayActions.util";
import { canPostIn } from "@lib/discord/channels.util";
import { createMockClient } from "@tests/helpers/mocks";

jest.mock("@database/repositories/birthdayRepository", () => ({
	countBirthdays: jest.fn(() => Promise.resolve(0)),
	findBirthday: jest.fn(),
	forgetBirthday: jest.fn(),
	getBirthdaySettings: jest.fn(() => Promise.resolve(null)),
	listBirthdays: jest.fn(() => Promise.resolve([])),
	saveBirthdaySettings: jest.fn(() => Promise.resolve({})),
	shareBirthday: jest.fn((guildId: string, userId: string, username: string, day: number, month: number) =>
		Promise.resolve({ guildId, userId, username, day, month }),
	),
}));
jest.mock("@lib/discord/channels.util", () => ({ canPostIn: jest.fn(() => true) }));

const GUILD = "900000000000000001";
const CHANNEL = "400000000000000001";
const guild = { id: GUILD, name: "Test Server", memberCount: 40, members: { cache: new Map() } } as unknown as Guild;

beforeEach(() => {
	jest.clearAllMocks();
	jest.mocked(canPostIn).mockReturnValue(true);
	jest.mocked(getBirthdaySettings).mockResolvedValue(null);
});

describe("applyBirthdaySettings", () => {
	it("refuses to turn on with nowhere to post, and a channel it cannot post in", async () => {
		await expect(applyBirthdaySettings(guild, { enabled: true }, null)).rejects.toThrow(/Pick a channel/);

		jest.mocked(canPostIn).mockReturnValue(false);
		await expect(applyBirthdaySettings(guild, { channelId: CHANNEL }, null)).rejects.toThrow(/cannot post/);
		expect(saveBirthdaySettings).not.toHaveBeenCalled();
	});

	it("turns itself off when its channel is cleared", async () => {
		jest.mocked(getBirthdaySettings).mockResolvedValue({ enabled: true, channelId: CHANNEL, message: "Hi" });

		await applyBirthdaySettings(guild, { channelId: null }, null);

		expect(saveBirthdaySettings).toHaveBeenCalledWith(GUILD, { enabled: false, channelId: null, message: "Hi" }, null);
	});
});

describe("setOwnBirthday", () => {
	const sam = { id: "100000000000000001", username: "sam" } as User;

	it("stores the day and month, with the name they had", async () => {
		await setOwnBirthday(GUILD, sam, 29, 2);

		expect(shareBirthday).toHaveBeenCalledWith(GUILD, sam.id, "sam", 29, 2);
	});

	it("refuses a day the month does not have", async () => {
		await expect(setOwnBirthday(GUILD, sam, 31, 4)).rejects.toThrow(/not a day in that month/);
		expect(shareBirthday).not.toHaveBeenCalled();
	});
});

describe("upcomingBirthdays", () => {
	it("lists them soonest first, today included, named as the server knows them", async () => {
		jest.mocked(listBirthdays).mockResolvedValue([
			{ guildId: GUILD, userId: "1", username: "past", day: 24, month: 10 },
			{ guildId: GUILD, userId: "2", username: "today", day: 25, month: 10 },
			{ guildId: GUILD, userId: "3", username: "soon", day: 1, month: 11 },
		]);
		const named = {
			...guild,
			members: { cache: new Map([["3", { displayName: "Soon Nickname" }]]) },
		} as unknown as Guild;

		const upcoming = await upcomingBirthdays(named, new Date("2026-10-25T08:00:00.000Z"));

		expect(upcoming.map((entry) => entry.name)).toEqual(["today", "Soon Nickname", "past"]);
	});
});

describe("birthdayPost", () => {
	/** The text is whatever a manager typed, so the member it is for is the only one it may ping. */
	it("fills the message and pings only the member", () => {
		const post = birthdayPost({ id: "1", username: "sam" }, guild, {
			message: "@everyone, it is {username}'s day! {user}",
		});

		expect(post).toEqual({
			content: "@everyone, it is sam's day! <@1>",
			allowedMentions: { users: ["1"] },
		});
	});
});

describe("postBirthday", () => {
	const settings = { enabled: true, channelId: CHANNEL, message: "Happy birthday, {user}!" };
	const stored = { guildId: GUILD, userId: "1", username: "sam", day: 25, month: 10 };

	function clientWith(member: unknown, channel: unknown) {
		return createMockClient({
			guilds: {
				cache: new Map([
					[
						GUILD,
						{
							...guild,
							members: {
								fetch: jest.fn(() =>
									member === null ? Promise.reject(new Error("unknown")) : Promise.resolve(member),
								),
							},
							channels: { fetch: jest.fn(() => Promise.resolve(channel)) },
						},
					],
				]),
			},
		} as never);
	}

	it("posts in the chosen channel", async () => {
		const send = jest.fn(() => Promise.resolve({}));
		const outcome = await postBirthday(
			clientWith({ id: "1", user: { username: "sam" } }, { isSendable: () => true, send }),
			stored,
			settings,
		);

		expect(outcome).toBe("sent");
		expect(send).toHaveBeenCalledWith(expect.objectContaining({ content: "Happy birthday, <@1>!" }));
	});

	it("says when the member has gone, or the channel will not take it", async () => {
		expect(await postBirthday(clientWith(null, null), stored, settings)).toBe("gone");
		expect(
			await postBirthday(
				clientWith({ id: "1", user: { username: "sam" } }, { isSendable: () => false }),
				stored,
				settings,
			),
		).toBe("unreachable");
		expect(await postBirthday(clientWith(null, null), { ...stored, guildId: "9" }, settings)).toBe("unreachable");
	});
});
