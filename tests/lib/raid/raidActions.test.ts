import { type Guild, type GuildMember, PermissionFlagsBits, PermissionsBitField } from "discord.js";
import { DAY_MS } from "@config/constants";
import { getRaidSettings, saveRaidSettings } from "@database/repositories/raidRepository";
import { canPostIn } from "@lib/discord/channels.util";
import { JoinWatch } from "@lib/raid/raid.util";
import { applyRaidSettings, guardJoin, holdNewAccount, overviewOf, spikePost } from "@lib/raid/raidActions.util";
import { type RaidSettings } from "@testify/shared";
import { createMockClient } from "@tests/helpers/mocks";

jest.mock("@database/repositories/raidRepository", () => ({
	getRaidSettings: jest.fn(() => Promise.resolve(null)),
	saveRaidSettings: jest.fn(() => Promise.resolve({})),
}));
jest.mock("@lib/discord/channels.util", () => ({ canPostIn: jest.fn(() => true) }));

const NOW = Date.UTC(2026, 9, 25, 12);
const GUILD = "900000000000000001";
const CHANNEL = "400000000000000001";
const ROLE = "300000000000000001";

const ON: RaidSettings = {
	enabled: true,
	alertChannelId: CHANNEL,
	pingRoleId: null,
	minAccountAgeDays: 7,
	spikeJoins: 3,
	spikeMinutes: 1,
};

function guildWith(options: { permissions?: bigint[]; mentionable?: boolean; send?: jest.Mock } = {}) {
	const send = options.send ?? jest.fn(() => Promise.resolve());
	return {
		id: GUILD,
		name: "Test Server",
		members: {
			me: { permissions: new PermissionsBitField(options.permissions ?? [PermissionFlagsBits.ModerateMembers]) },
		},
		roles: { cache: new Map([[ROLE, { id: ROLE, mentionable: options.mentionable ?? true }]]) },
		channels: { fetch: jest.fn(() => Promise.resolve({ isSendable: () => true, send })) },
		send,
	};
}

function memberOf(
	guild: ReturnType<typeof guildWith>,
	options: { ageDays?: number; bot?: boolean; moderatable?: boolean } = {},
) {
	return {
		id: "100000000000000001",
		guild,
		moderatable: options.moderatable ?? true,
		user: {
			bot: options.bot ?? false,
			username: "newcomer",
			createdTimestamp: NOW - (options.ageDays ?? 1) * DAY_MS,
			displayAvatarURL: () => "https://cdn.example/avatar.png",
		},
		timeout: jest.fn(() => Promise.resolve()),
		send: jest.fn(() => Promise.resolve()),
		toString: () => "<@100000000000000001>",
	};
}

beforeEach(() => {
	jest.clearAllMocks();
	jest.mocked(canPostIn).mockReturnValue(true);
	jest.mocked(getRaidSettings).mockResolvedValue(null);
});

describe("applyRaidSettings", () => {
	const guild = guildWith() as unknown as Guild;

	it("refuses to turn on with nothing to do", async () => {
		await expect(applyRaidSettings(guild, { enabled: true }, null)).rejects.toThrow(/minimum account age or an alert/);
		expect(saveRaidSettings).not.toHaveBeenCalled();
	});

	it("refuses a channel it cannot post in, @everyone, and a role from somewhere else", async () => {
		jest.mocked(canPostIn).mockReturnValue(false);
		await expect(applyRaidSettings(guild, { alertChannelId: CHANNEL }, null)).rejects.toThrow(/cannot post/);

		await expect(applyRaidSettings(guild, { pingRoleId: GUILD }, null)).rejects.toThrow(/@everyone/);
		await expect(applyRaidSettings(guild, { pingRoleId: "300000000000000999" }, null)).rejects.toThrow(/not in this/);
		expect(saveRaidSettings).not.toHaveBeenCalled();
	});

	/** On with nothing to do would read as protected while protecting nothing. */
	it("turns itself off when the last thing it did is taken away", async () => {
		jest.mocked(getRaidSettings).mockResolvedValue({ ...ON, alertChannelId: null });

		await applyRaidSettings(guild, { minAccountAgeDays: 0 }, "100000000000000009");

		expect(saveRaidSettings).toHaveBeenCalledWith(
			GUILD,
			expect.objectContaining({ enabled: false, minAccountAgeDays: 0 }),
			"100000000000000009",
		);
	});
});

describe("overviewOf", () => {
	it("says when a hold cannot happen, an alert cannot post or a ping cannot land", () => {
		jest.mocked(canPostIn).mockReturnValue(false);
		const guild = guildWith({ permissions: [], mentionable: false }) as unknown as Guild;

		expect(overviewOf(guild, { ...ON, pingRoleId: ROLE })).toEqual(
			expect.objectContaining({ canSend: false, canHold: false, canPing: false }),
		);
	});

	it("can ping a role that is not mentionable when it may mention everyone", () => {
		const guild = guildWith({
			permissions: [PermissionFlagsBits.MentionEveryone],
			mentionable: false,
		}) as unknown as Guild;

		expect(overviewOf(guild, { ...ON, pingRoleId: ROLE }).canPing).toBe(true);
	});
});

describe("holdNewAccount", () => {
	it("leaves an old enough account, a bot and everybody at 0 alone", async () => {
		const guild = guildWith();
		const old = memberOf(guild, { ageDays: 30 });
		const bot = memberOf(guild, { bot: true });

		expect(await holdNewAccount(old as unknown as GuildMember, ON, NOW)).toBeNull();
		expect(await holdNewAccount(bot as unknown as GuildMember, ON, NOW)).toBeNull();
		expect(await holdNewAccount(old as unknown as GuildMember, { minAccountAgeDays: 0 }, NOW)).toBeNull();
		expect(old.timeout).not.toHaveBeenCalled();
		expect(bot.timeout).not.toHaveBeenCalled();
	});

	it("says why a young account could not be held", async () => {
		const unable = memberOf(guildWith({ permissions: [] }));
		const outranks = memberOf(guildWith(), { moderatable: false });
		const refused = memberOf(guildWith());
		refused.timeout.mockRejectedValue(new Error("Missing Permissions"));

		expect(await holdNewAccount(unable as unknown as GuildMember, ON, NOW)).toEqual({
			held: false,
			reason: "permission",
		});
		expect(await holdNewAccount(outranks as unknown as GuildMember, ON, NOW)).toEqual({
			held: false,
			reason: "outranked",
		});
		expect(await holdNewAccount(refused as unknown as GuildMember, ON, NOW)).toEqual({
			held: false,
			reason: "refused",
		});
		expect(refused.send).not.toHaveBeenCalled();
	});
});

describe("spikePost", () => {
	const spike = {
		joins: 14,
		minutes: 1,
		held: 2,
		newest: [{ userId: "100000000000000001", username: "a", createdAt: NOW - DAY_MS, at: NOW, held: true }],
	};

	/** The joiners are named in the alert; only the staff role a manager chose may ever be pinged by it. */
	it("pings the chosen role and nobody else", () => {
		expect(spikePost(spike, { pingRoleId: ROLE }, NOW)).toEqual(
			expect.objectContaining({ content: `<@&${ROLE}>`, allowedMentions: { roles: [ROLE] } }),
		);
		const quiet = spikePost(spike, { pingRoleId: null }, NOW);
		expect(quiet.content).toBeUndefined();
		expect(quiet.allowedMentions).toEqual({ parse: [] });
	});

	it("counts the joins it does not name, and never claims to have kicked anybody", () => {
		const description = spikePost(spike, { pingRoleId: null }, NOW).embeds?.[0];
		const json = JSON.stringify(description);

		expect(json).toContain("…and 13 more.");
		expect(json).toContain("2 of them were held back");
		expect(json).toContain("Nobody has been kicked or banned.");
	});
});

describe("guardJoin", () => {
	const client = createMockClient();

	it("reports each hold, then one alert for a spike, then nothing more while it lasts", async () => {
		jest.mocked(getRaidSettings).mockResolvedValue(ON);
		const guild = guildWith();
		const watch = new JoinWatch();

		for (let n = 0; n < 5; n += 1) {
			await guardJoin(client, memberOf(guild) as unknown as GuildMember, watch, NOW + n * 1_000);
		}

		const titles = guild.send.mock.calls.map((call) => /"title":"([^"]+)"/.exec(JSON.stringify(call[0]))?.[1]);
		expect(titles).toEqual(["🛡️ Held back a new account", "🛡️ Held back a new account", "🚨 Joins are spiking"]);
	});

	/** A failure here must not stop the welcome, auto-roles and the rest of the join from running. */
	it("contains its own failures", async () => {
		jest.mocked(getRaidSettings).mockRejectedValue(new Error("database down"));
		const warn = jest.fn();
		const logged = createMockClient({ logger: { warn } } as never);

		await expect(
			guardJoin(logged, memberOf(guildWith()) as unknown as GuildMember, new JoinWatch(), NOW),
		).resolves.toBeUndefined();
		expect(warn).toHaveBeenCalledWith(expect.anything(), "[RAID] Could not check a join");
	});
});
