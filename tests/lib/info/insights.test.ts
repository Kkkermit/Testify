import { ChannelType, Collection, GuildVerificationLevel, type Guild } from "discord.js";
import { type ServerDay } from "@database/models/insights.schema";
import { readInsightRows, recentMoves, recordMove, saveActivity } from "@database/repositories/insightsRepository";
import { activity } from "@lib/info/activity.util";
import { countMove, fillDays, flushActivity, hoursOf, readInsights } from "@lib/info/insights.util";
import { averagePerDay, busiestHour } from "@testify/shared";

jest.mock("@database/repositories/insightsRepository", () => ({
	readInsightRows: jest.fn(),
	recentMoves: jest.fn(() => Promise.resolve([])),
	recordMove: jest.fn(() => Promise.resolve()),
	saveActivity: jest.fn(() => Promise.resolve()),
}));

const NOW = new Date("2026-09-27T12:00:00.000Z");
const logger = { debug: jest.fn(), warn: jest.fn() };

function day(dayKey: string, overrides: Partial<ServerDay> = {}): ServerDay {
	return { guildId: "g", day: dayKey, messages: 0, joins: 0, leaves: 0, expiresAt: NOW, ...overrides };
}

describe("fillDays", () => {
	/** A day nobody spoke on is a zero on the chart, not a missing bar that shifts every day after it. */
	it("gives every day of the window, oldest first, with zeros for quiet days", () => {
		const filled = fillDays([day("2026-09-25", { messages: 4, joins: 1 })], 3, NOW);

		expect(filled).toEqual([
			{ day: "2026-09-25", messages: 4, joins: 1, leaves: 0 },
			{ day: "2026-09-26", messages: 0, joins: 0, leaves: 0 },
			{ day: "2026-09-27", messages: 0, joins: 0, leaves: 0 },
		]);
	});
});

describe("hoursOf", () => {
	it("adds each day's hours together and ignores a key that is not an hour", () => {
		const hours = hoursOf([day("a", { hours: { "20": 3, "1": 1 } }), day("b", { hours: { "20": 2, x: 9, "24": 9 } })]);

		expect(hours[20]).toBe(5);
		expect(hours[1]).toBe(1);
		expect(hours.reduce((a, b) => a + b, 0)).toBe(6);
	});
});

describe("busiestHour and averagePerDay", () => {
	it("names the busiest hour, the earlier one on a tie, and none when silent", () => {
		expect(busiestHour([0, 2, 5, 5])).toBe(2);
		expect(busiestHour([0, 0])).toBeNull();
	});

	it("averages to one decimal place and survives an empty window", () => {
		expect(averagePerDay(10, 3)).toBe(3.3);
		expect(averagePerDay(10, 0)).toBe(0);
	});
});

describe("flushActivity", () => {
	it("writes what was counted", async () => {
		activity.count({ guildId: "g", channelId: "c", userId: "u" }, NOW);

		await flushActivity(logger);

		expect(saveActivity).toHaveBeenCalledWith(
			expect.objectContaining({ servers: [expect.objectContaining({ messages: 1 })] }),
		);
	});

	it("keeps a batch that could not be written for the next flush", async () => {
		jest.mocked(saveActivity).mockRejectedValueOnce(new Error("database down"));
		activity.count({ guildId: "g", channelId: "c", userId: "u" }, NOW);

		await flushActivity(logger);

		expect(logger.warn).toHaveBeenCalled();
		expect(activity.drain().servers[0]?.messages).toBe(1);
	});

	it("skips the write entirely when nothing was said", async () => {
		jest.mocked(saveActivity).mockClear();

		await flushActivity(logger);

		expect(saveActivity).not.toHaveBeenCalled();
	});
});

describe("countMove", () => {
	/** A welcome message must not wait on, or fail because of, the insights write. */
	it("records the move without letting a failure escape", async () => {
		jest.mocked(recordMove).mockRejectedValueOnce(new Error("database down"));

		expect(() => {
			countMove({ logger }, { guild: { id: "g" }, id: "u", user: { username: "kate" } }, "leave");
		}).not.toThrow();
		await Promise.resolve();
		await Promise.resolve();

		expect(recordMove).toHaveBeenCalledWith({ guildId: "g", userId: "u", username: "kate", kind: "leave" });
		expect(logger.debug).toHaveBeenCalled();
	});
});

describe("readInsights", () => {
	const member = (id: string, name: string) => ({
		displayName: name,
		user: { username: name.toLowerCase(), bot: false },
		joinedTimestamp: null,
		displayAvatarURL: () => `https://cdn.example/${id}.png`,
	});

	const guild = {
		id: "g",
		memberCount: 3,
		ownerId: "owner",
		createdAt: new Date("2020-01-01T00:00:00.000Z"),
		premiumTier: 1,
		premiumSubscriptionCount: 4,
		verificationLevel: GuildVerificationLevel.Medium,
		channels: {
			cache: new Collection([
				["c1", { name: "general", type: ChannelType.GuildText }],
				["c2", { name: "Lounge", type: ChannelType.GuildVoice }],
			]),
		},
		roles: {
			cache: new Collection([
				["g", {}],
				["r", {}],
			]),
		},
		emojis: { cache: new Collection([["e", {}]]) },
		stickers: { cache: new Collection() },
		members: {
			fetch: () => Promise.resolve(),
			cache: new Collection([
				["owner", member("owner", "Owner")],
				["u1", member("u1", "Kate")],
			]),
		},
	} as unknown as Guild;

	beforeEach(() => {
		jest.mocked(readInsightRows).mockResolvedValue({
			days: [day("2026-09-27", { messages: 6, joins: 2, leaves: 1, hours: { "20": 6 } })],
			channels: [
				{ channelId: "c1", messages: 5 },
				{ channelId: "gone", messages: 1 },
			],
			members: [
				{ userId: "u1", messages: 4 },
				{ userId: "left", messages: 2 },
			],
			activeMembers: 2,
			firstDay: "2026-09-20",
		});
		jest
			.mocked(recentMoves)
			.mockImplementation((_guild, kind) =>
				Promise.resolve(
					kind === "leave" ? [{ guildId: "g", userId: "left", username: "marcus", kind, at: NOW, expiresAt: NOW }] : [],
				),
			);
	});

	it("sums the window and names what it can", async () => {
		const report = await readInsights(guild, 7, NOW);

		expect(report.totals).toEqual({ messages: 6, activeMembers: 2, joins: 2, leaves: 1 });
		expect(report.daily).toHaveLength(7);
		expect(report.hours[20]).toBe(6);
		expect(report.topChannels).toEqual([
			{ channelId: "c1", name: "general", messages: 5 },
			{ channelId: "gone", name: null, messages: 1 },
		]);
		expect(report.topMembers[0]).toMatchObject({ name: "Kate", avatarUrl: "https://cdn.example/u1.png" });
		expect(report.countingSince).toBe("2026-09-20");
	});

	/** Somebody who has left can no longer be looked up, so the name stored when they left is what is shown. */
	it("names somebody who left by the username kept when they went", async () => {
		const report = await readInsights(guild, 7, NOW);

		expect(report.recentLeaves).toEqual([{ userId: "left", name: "marcus", at: NOW.toISOString() }]);
		expect(report.topMembers[1]).toMatchObject({ name: "left", avatarUrl: null });
	});

	it("describes the server from Discord's own cache", async () => {
		const { server } = await readInsights(guild, 7, NOW);

		expect(server).toMatchObject({
			ownerName: "owner",
			members: 3,
			textChannels: 1,
			voiceChannels: 1,
			roles: 1,
			emojis: 1,
			boostTier: 1,
			boosts: 4,
			verification: "medium",
		});
	});
});
