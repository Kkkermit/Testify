import { Collection, DiscordAPIError, PermissionFlagsBits, RESTJSONErrorCodes } from "discord.js";
import { INSTANCE_DEFAULTS, useInstance } from "@config/instance";
import { type TestifyClient } from "@core/client";
import { findInviter, greetInviter, inviterGreeting, pickBotAdd } from "@lib/bot/inviterGreeting.util";
import { createMockClient } from "@tests/helpers/mocks";

const blocked = new Set<string>();
jest.mock("@database/repositories/blacklistRepository", () => ({
	findBlacklistEntry: jest.fn(async (id: string) => Promise.resolve(blocked.has(id) ? { userId: id } : null)),
}));
jest.mock("@database/repositories/prefixRepository", () => ({ getPrefix: jest.fn(async () => Promise.resolve("t?")) }));

const BOT = "200000000000000002";
const ADDER = "100000000000000001";
const OWNER = "100000000000000009";
const NOW = 1_800_000_000_000;

interface Person {
	id: string;
	bot: boolean;
	send: jest.Mock;
}

const person = (id: string, bot = false): Person => ({ id, bot, send: jest.fn(async () => Promise.resolve({})) });

interface GuildOptions {
	can?: bigint[];
	/** One answer per audit-log read, in order. */
	audit?: { targetId: string; executorId: string; createdTimestamp: number }[][];
	integrationUser?: Person | null;
	adder?: Person;
	owner?: Person;
}

function guildWith({ can = [], audit = [], integrationUser = null, adder, owner = person(OWNER) }: GuildOptions) {
	const reads = [...audit];
	return {
		id: "900000000000000001",
		name: "Sam's *Server*",
		members: { me: { permissions: { has: (flag: bigint) => can.includes(flag) } } },
		fetchAuditLogs: jest.fn(async () =>
			Promise.resolve({ entries: new Collection((reads.shift() ?? []).map((e, i) => [String(i), e])) }),
		),
		fetchIntegrations: jest.fn(async () =>
			Promise.resolve(
				new Collection(integrationUser === null ? [] : [["1", { account: { id: BOT }, user: integrationUser }]]),
			),
		),
		fetchOwner: jest.fn(async () => Promise.resolve({ user: owner })),
		client: { users: { fetch: jest.fn(async () => Promise.resolve(adder ?? person(ADDER))) } },
	};
}

const noWait = { wait: jest.fn(async () => Promise.resolve()), now: () => NOW };

describe("pickBotAdd", () => {
	/** A bot removed and added again has two entries, and only the newest is the person who just added it. */
	it("takes the newest entry that added this bot, and only one recent enough to be this join", () => {
		const entry = (targetId: string, executorId: string, ageMs: number) => ({
			targetId,
			executorId,
			createdTimestamp: NOW - ageMs,
		});
		const cases: [string, ReturnType<typeof entry>[], string | null][] = [
			["newest of two", [entry(BOT, "old", 60_000), entry(BOT, "new", 1_000)], "new"],
			["another bot's", [entry("300000000000000003", "other", 1_000)], null],
			["from an earlier add", [entry(BOT, "stale", 11 * 60_000)], null],
			["none", [], null],
		];

		expect(cases.filter(([, entries, want]) => pickBotAdd(entries, BOT, NOW) !== want).map(([name]) => name)).toEqual(
			[],
		);
	});
});

describe("findInviter", () => {
	/** An invite link, the Add App button and the App Directory all write this entry, so it covers every way in. */
	it("reads who added the bot from the audit log, asking again when the entry has not landed yet", async () => {
		const guild = guildWith({
			can: [PermissionFlagsBits.ViewAuditLog],
			audit: [[], [{ targetId: BOT, executorId: ADDER, createdTimestamp: NOW - 1_000 }]],
		});

		const found = await findInviter(guild as never, BOT, noWait);

		expect(found).toMatchObject({ user: { id: ADDER }, source: "audit log" });
		expect(guild.fetchAuditLogs).toHaveBeenCalledTimes(2);
		expect(noWait.wait).toHaveBeenCalledWith(3_000);
	});

	it("falls back to the bot's integration, then to the owner, when the audit log cannot say", async () => {
		const viaIntegration = guildWith({ can: [PermissionFlagsBits.ManageGuild], integrationUser: person(ADDER) });
		const viaOwner = guildWith({ can: [] });

		expect(await findInviter(viaIntegration as never, BOT, noWait)).toMatchObject({ source: "integration" });
		expect(await findInviter(viaOwner as never, BOT, noWait)).toMatchObject({ user: { id: OWNER }, source: "owner" });
		expect(viaOwner.fetchAuditLogs).not.toHaveBeenCalled();
	});
});

describe("inviterGreeting", () => {
	const text = (message: ReturnType<typeof inviterGreeting>): string => JSON.stringify(message);

	it("points at /help, the prefix and the dashboard's setup checklist", () => {
		const message = text(
			inviterGreeting({
				bot: "Testify",
				server: "Sam's *Server*",
				prefix: "!",
				setupUrl: "https://x.example/guilds/1",
			}),
		);

		expect(message).toContain("/help");
		expect(message).toContain("!help");
		expect(message).toContain("https://x.example/guilds/1");
		expect(message).toContain("Sam's \\\\*Server\\\\*");
	});

	/** A host without a support server must not send people to somebody else's. */
	it("names the setup commands without a dashboard, and leaves out a support server the host has not got", () => {
		useInstance({ ...INSTANCE_DEFAULTS, supportServer: null });
		const message = text(inviterGreeting({ bot: "Testify", server: "S", prefix: "t?", setupUrl: null }));

		expect(message).toContain("every feature has a setup command");
		expect(message).not.toContain("Set up the server");
		expect(message).not.toContain("Support server");
		expect(message).toContain(INSTANCE_DEFAULTS.repository);
	});
});

describe("greetInviter", () => {
	function client(): TestifyClient {
		return createMockClient({
			user: { id: BOT },
			env: { DASHBOARD_ENABLED: true, DASHBOARD_BASE_URL: "https://dash.example", SITE_ENABLED: true },
		} as never);
	}

	const audited = (adder: Person) =>
		guildWith({
			can: [PermissionFlagsBits.ViewAuditLog],
			audit: [[{ targetId: BOT, executorId: adder.id, createdTimestamp: NOW - 1_000 }]],
			adder,
		});

	beforeEach(() => blocked.clear());

	it("sends whoever added the bot one message with the server's setup link", async () => {
		const adder = person(ADDER);

		await greetInviter(client(), audited(adder) as never, noWait);

		expect(adder.send).toHaveBeenCalledTimes(1);
		expect(JSON.stringify(adder.send.mock.calls[0])).toContain("https://dash.example/guilds/900000000000000001");
	});

	/** Closed direct messages are the person's choice, so they must never fail the join or reach the error log. */
	it("swallows closed direct messages, noting them only at debug", async () => {
		const adder = person(ADDER);
		adder.send.mockRejectedValue(
			new DiscordAPIError(
				{ code: RESTJSONErrorCodes.CannotSendMessagesToThisUser, message: "Cannot send messages to this user" },
				RESTJSONErrorCodes.CannotSendMessagesToThisUser,
				403,
				"POST",
				"/users/@me/channels",
				{},
			),
		);
		const bot = client();
		const warn = jest.spyOn(bot.logger, "warn");

		await expect(greetInviter(bot, audited(adder) as never, noWait)).resolves.toBeUndefined();
		expect(warn).not.toHaveBeenCalled();
	});

	/** A database that could not answer the blacklist check threw into `guildCreate`, which promises nothing will. */
	it("sends nothing and throws nothing when the database cannot answer", async () => {
		const { findBlacklistEntry } = jest.requireMock<{ findBlacklistEntry: jest.Mock }>(
			"@database/repositories/blacklistRepository",
		);
		findBlacklistEntry.mockRejectedValueOnce(new Error("database is down"));
		const adder = person(ADDER);
		const bot = client();
		const warn = jest.spyOn(bot.logger, "warn");

		await expect(greetInviter(bot, audited(adder) as never, noWait)).resolves.toBeUndefined();
		expect(adder.send).not.toHaveBeenCalled();
		expect(warn).toHaveBeenCalledTimes(1);
	});

	it("writes to nobody who is a bot or blacklisted, or when the host has turned it off", async () => {
		const robot = person(ADDER, true);
		await greetInviter(client(), audited(robot) as never, noWait);

		const banned = person(ADDER);
		blocked.add(ADDER);
		await greetInviter(client(), audited(banned) as never, noWait);
		blocked.clear();

		const quiet = person(ADDER);
		useInstance({ ...INSTANCE_DEFAULTS, greetInviter: false });
		await greetInviter(client(), audited(quiet) as never, noWait);

		expect([robot, banned, quiet].filter((who) => who.send.mock.calls.length > 0)).toEqual([]);
	});
});
