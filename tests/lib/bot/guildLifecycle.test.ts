import { type Guild } from "discord.js";
import { type TestifyClient } from "@core/client";
import { announceGuildChange, buildGuildEmbed } from "@lib/bot/guildLifecycle.util";
import { createMockClient, createMockGuild, createMockUser, mockCollection, OWNER_ID } from "@tests/helpers/mocks";

function guildWith(overrides: Record<string, unknown> = {}): Guild {
	const inviteChannel = {
		isTextBased: () => true,
		permissionsFor: () => ({ has: () => true }),
		id: "chan",
	};

	return createMockGuild({
		name: "Test Server",
		memberCount: 250,
		fetchOwner: jest.fn(() => Promise.resolve({ id: OWNER_ID, user: createMockUser({ username: "owner" }) })),
		channels: { cache: mockCollection([["chan", inviteChannel]]) },
		invites: { create: jest.fn(() => Promise.resolve({ url: "https://discord.gg/abc" })) },
		iconURL: jest.fn(() => "https://cdn.discord/icon.png"),
		bannerURL: jest.fn(() => null),
		premiumTier: 2,
		premiumSubscriptionCount: 9,
		preferredLocale: "en-GB",
		...overrides,
	} as never);
}

function clientWith(servers: number, overrides: Record<string, unknown> = {}): TestifyClient {
	return createMockClient({
		guilds: { cache: { size: servers } },
		user: { username: "Testify" },
		logger: { info: jest.fn(), warn: jest.fn() },
		env: { DISCORD_OWNER_IDS: [] },
		...overrides,
	} as never);
}

describe("buildGuildEmbed", () => {
	/** An invite to a server the bot has left is useless and often unauthorised. */
	it("does not try to create an invite when leaving", async () => {
		const guild = guildWith();
		await buildGuildEmbed(clientWith(1), guild, "left");

		expect(guild.invites.create).not.toHaveBeenCalled();
	});

	it("falls back to the owner ID when the owner cannot be fetched", async () => {
		const guild = guildWith({ fetchOwner: jest.fn(() => Promise.reject(new Error("Unknown member"))) });
		const data = (await buildGuildEmbed(clientWith(1), guild, "joined")).toJSON();

		expect(JSON.stringify(data.fields)).toContain("Unknown");
	});

	it("carries on when creating the invite is refused", async () => {
		const guild = guildWith({ invites: { create: jest.fn(() => Promise.reject(new Error("Missing Access"))) } });

		await expect(buildGuildEmbed(clientWith(1), guild, "joined")).resolves.toBeDefined();
	});
});

describe("announceGuildChange", () => {
	it("skips a channel it cannot send to", async () => {
		const send = jest.fn();
		const client = clientWith(1, {
			env: { DISCORD_OWNER_IDS: [], CHANNEL_GUILD_LOG: "123" },
			channels: {
				fetch: jest.fn(() => Promise.resolve({ isTextBased: () => true, isSendable: () => false, send })),
			},
		});

		await announceGuildChange(client, guildWith(), "joined");

		expect(send).not.toHaveBeenCalled();
	});
});
