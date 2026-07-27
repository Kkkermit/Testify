import { type Guild } from "discord.js";
import { type TestifyClient } from "@core/client";
import { announceGuildChange, buildGuildEmbed } from "@lib/guildLifecycle.util";
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
	it("describes a join, in green", async () => {
		const data = (await buildGuildEmbed(clientWith(12), guildWith(), "joined")).toJSON();

		expect(data.title).toBe("Joined a new server");
		expect(data.description).toContain("Test Server");
	});

	/** The delete handler used to log a `[GUILD_CREATE]` tag; wording must match the event. */
	it("describes a leave differently from a join", async () => {
		const data = (await buildGuildEmbed(clientWith(12), guildWith(), "left")).toJSON();

		expect(data.title).toBe("Left a server");
		expect(data.description).toContain("no longer in");
	});

	it("reports the owner, member count and server total", async () => {
		const data = (await buildGuildEmbed(clientWith(12), guildWith(), "joined")).toJSON();
		const rendered = JSON.stringify(data.fields);

		expect(rendered).toContain("owner");
		expect(rendered).toContain("250");
		expect(rendered).toContain("12");
	});

	it("includes an invite when joining", async () => {
		const data = (await buildGuildEmbed(clientWith(1), guildWith(), "joined")).toJSON();
		expect(JSON.stringify(data.fields)).toContain("https://discord.gg/abc");
	});

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

	it("carries on without an invite when no channel allows one", async () => {
		const guild = guildWith({ channels: { cache: mockCollection([]) } });
		const data = (await buildGuildEmbed(clientWith(1), guild, "joined")).toJSON();

		expect(JSON.stringify(data.fields)).not.toContain("discord.gg");
	});

	it("carries on when creating the invite is refused", async () => {
		const guild = guildWith({ invites: { create: jest.fn(() => Promise.reject(new Error("Missing Access"))) } });

		await expect(buildGuildEmbed(clientWith(1), guild, "joined")).resolves.toBeDefined();
	});

	it("uses the server icon as the thumbnail when there is one", async () => {
		const data = (await buildGuildEmbed(clientWith(1), guildWith(), "joined")).toJSON();
		expect(data.thumbnail?.url).toBe("https://cdn.discord/icon.png");
	});

	it("omits the thumbnail when the server has no icon", async () => {
		const guild = guildWith({ iconURL: jest.fn(() => null) });
		const data = (await buildGuildEmbed(clientWith(1), guild, "joined")).toJSON();

		expect(data.thumbnail).toBeUndefined();
	});
});

describe("announceGuildChange", () => {
	it("always logs, even with no channel configured", async () => {
		const client = clientWith(1);
		await announceGuildChange(client, guildWith(), "joined");

		expect(client.logger.info).toHaveBeenCalled();
	});

	it("posts nothing when no guild log channel is set", async () => {
		const send = jest.fn();
		const client = clientWith(1, { channels: { fetch: jest.fn(() => Promise.resolve({ send })) } });

		await announceGuildChange(client, guildWith(), "joined");

		expect(send).not.toHaveBeenCalled();
	});

	it("posts to the configured channel", async () => {
		const send = jest.fn(() => Promise.resolve({}));
		const client = clientWith(1, {
			env: { DISCORD_OWNER_IDS: [], CHANNEL_GUILD_LOG: "123" },
			channels: {
				fetch: jest.fn(() => Promise.resolve({ isTextBased: () => true, isSendable: () => true, send })),
			},
		});

		await announceGuildChange(client, guildWith(), "joined");

		expect(send).toHaveBeenCalled();
	});

	it("warns rather than throwing when the channel is unreachable", async () => {
		const client = clientWith(1, {
			env: { DISCORD_OWNER_IDS: [], CHANNEL_GUILD_LOG: "123" },
			channels: { fetch: jest.fn(() => Promise.reject(new Error("Unknown Channel"))) },
		});

		await expect(announceGuildChange(client, guildWith(), "left")).resolves.toBeUndefined();
		expect(client.logger.warn).toHaveBeenCalled();
	});

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
