import { AuditLogEvent, ChannelType, Collection, PermissionFlagsBits, PermissionsBitField } from "discord.js";
import { Hono } from "hono";
import { type ApiBindings } from "@api/context";
import { ApiProblem, problemBody } from "@api/errors";
import { guilds } from "@api/routes/guilds";
import { type Env } from "@config/env";
import { type TestifyClient } from "@core/client";
import { auditPage, auditsSince, countAudits, recentAudits } from "@database/repositories/dashboardAuditRepository";
import { type ChannelSummary, type GuildOverview, type RoleSummary, type ServerChangesPage } from "@testify/shared";

jest.mock("@database/repositories/levelRepository", () => ({ getLevelSettings: jest.fn(() => Promise.resolve(null)) }));
jest.mock("@database/repositories/casinoRepository", () => ({
	getCasinoSettings: jest.fn(() => Promise.resolve(null)),
}));
jest.mock("@database/repositories/antiLinkRepository", () => ({
	getAntiLink: jest.fn(() => Promise.resolve(null)),
}));
jest.mock("@database/repositories/auditLogRepository", () => ({
	getAuditLogConfig: jest.fn(() => Promise.resolve(null)),
}));
jest.mock("@database/repositories/scheduledMessageRepository", () => ({
	listSchedules: jest.fn(() => Promise.resolve([])),
}));
jest.mock("@database/repositories/autoResponderRepository", () => ({
	listAutoResponders: jest.fn(() => Promise.resolve([])),
}));
jest.mock("@database/repositories/birthdayRepository", () => ({
	getBirthdaySettings: jest.fn(() => Promise.resolve(null)),
	countBirthdays: jest.fn(() => Promise.resolve(0)),
}));
jest.mock("@database/repositories/caseRepository", () => ({
	getCaseSettings: jest.fn(() => Promise.resolve(null)),
}));
jest.mock("@database/repositories/raidRepository", () => ({
	getRaidSettings: jest.fn(() => Promise.resolve(null)),
}));
jest.mock("@database/repositories/autoRoleRepository", () => ({
	getAutoRoles: jest.fn(() => Promise.resolve(null)),
}));
jest.mock("@database/repositories/countingRepository", () => ({
	getCounting: jest.fn(() => Promise.resolve(null)),
}));
jest.mock("@database/repositories/botStatsRepository", () => ({
	getFixedStats: jest.fn(() => Promise.resolve(null)),
}));
jest.mock("@database/repositories/voiceCounterRepository", () => ({
	getVoiceCounter: jest.fn(() => Promise.resolve(null)),
}));
jest.mock("@database/repositories/goodbyeRepository", () => ({
	getGoodbyeSettings: jest.fn(() => Promise.resolve(null)),
}));
jest.mock("@database/repositories/welcomeRepository", () => ({
	getWelcome: jest.fn(() => Promise.resolve(null)),
}));
jest.mock("@database/repositories/stickyRepository", () => ({
	listSticky: jest.fn(() => Promise.resolve([])),
}));
jest.mock("@database/repositories/treasureRepository", () => ({
	getTreasureConfig: jest.fn(() => Promise.resolve(null)),
}));
jest.mock("@database/repositories/insightsRepository", () => ({
	readInsightRows: jest.fn(() =>
		Promise.resolve({ days: [], channels: [], members: [], activeMembers: 0, firstDay: null }),
	),
	recentMoves: jest.fn(() => Promise.resolve([])),
	recordMove: jest.fn(),
	saveActivity: jest.fn(),
}));
jest.mock("@database/repositories/ideaRepository", () => ({
	getIdeaSettings: jest.fn(() => Promise.resolve(null)),
}));
jest.mock("@database/repositories/roleMenuRepository", () => ({
	countRoleMenus: jest.fn(() => Promise.resolve(0)),
}));
jest.mock("@database/repositories/starboardRepository", () => ({
	getStarboardSettings: jest.fn(() => Promise.resolve(null)),
}));
jest.mock("@database/repositories/tempVoiceRepository", () => ({
	getTempVoiceSettings: jest.fn(() => Promise.resolve(null)),
}));
jest.mock("@database/repositories/verificationRepository", () => ({
	getVerifyConfig: jest.fn(() => Promise.resolve(null)),
}));
jest.mock("@database/repositories/ticketRepository", () => ({
	countOpenTickets: jest.fn(() => Promise.resolve(0)),
	getTicketSetup: jest.fn(() => Promise.resolve(null)),
}));
jest.mock("@database/repositories/lotteryRepository", () => ({
	getLottery: jest.fn(() => Promise.resolve(null)),
	intervalFor: jest.fn(() => 0),
}));
jest.mock("@database/repositories/dashboardAuditRepository", () => ({
	auditPage: jest.fn(() => Promise.resolve([])),
	countAudits: jest.fn(() => Promise.resolve(0)),
	recentAudits: jest.fn(() => Promise.resolve([])),
	auditsSince: jest.fn(() =>
		Promise.resolve([
			{
				actorId: "100000000000000001",
				actorTag: "kate",
				guildId: "900000000000000001",
				action: "levelling.update",
				summary: "Turned levelling on",
				at: new Date(Date.now() - 60_000),
			},
		]),
	),
}));

const GUILD = "900000000000000001";
const OWNER = "100000000000000001";
const MANAGER = "100000000000000002";

/** The bot's own highest role sits at 5, so anything at or above that is out of reach. */
const BOT_HIGHEST = 5;

interface Options {
	botPermissions?: bigint[];
	canSendIn?: Set<string>;
	hasMe?: boolean;
	/** Signs in as a manager holding these, rather than as the bot's owner, who is asked nothing. */
	readerHolds?: bigint[];
	/** Channels the manager cannot see. */
	hiddenFromReader?: Set<string>;
}

function fakeGuild(options: Options = {}) {
	const permissions = options.botPermissions ?? [
		PermissionFlagsBits.ManageRoles,
		PermissionFlagsBits.ManageMessages,
		PermissionFlagsBits.ViewAuditLog,
		PermissionFlagsBits.ManageChannels,
		PermissionFlagsBits.AttachFiles,
	];

	const me =
		options.hasMe === false
			? null
			: {
					permissions: { has: (flag: bigint) => permissions.includes(flag) },
					roles: { highest: { position: BOT_HIGHEST } },
				};

	const reader = {
		id: MANAGER,
		permissions: {
			has: (flags: bigint | bigint[]) => [flags].flat().every((flag) => options.readerHolds?.includes(flag)),
		},
	};

	const channel = (id: string, name: string, type: ChannelType, position: number) => ({
		id,
		name,
		type,
		position,
		isTextBased: () => type === ChannelType.GuildText || type === ChannelType.GuildAnnouncement,
		permissionsFor: (who: unknown) => ({
			has: () => (who === reader ? !options.hiddenFromReader?.has(id) : (options.canSendIn?.has(id) ?? true)),
		}),
	});

	const channels = new Collection<string, unknown>([
		["1", channel("1", "general", ChannelType.GuildText, 1)],
		["2", channel("2", "locked", ChannelType.GuildText, 2)],
		["3", channel("3", "Voice", ChannelType.GuildVoice, 3)],
		["4", channel("4", "Category", ChannelType.GuildCategory, 0)],
		["5", channel("5", "a-thread", ChannelType.PublicThread, 4)],
	]);

	const role = (id: string, name: string, position: number, colour: number, managed = false) => ({
		id,
		name,
		position,
		color: colour,
		managed,
		permissions: new PermissionsBitField(name === "Admin" ? [PermissionFlagsBits.Administrator] : []),
	});

	const roles = new Collection<string, unknown>([
		[GUILD, role(GUILD, "@everyone", 0, 0)],
		["r1", role("r1", "Member", 1, 0)],
		["r2", role("r2", "Booster", 3, 0x7c3aed)],
		["r3", role("r3", "Admin", 9, 0)],
		["r4", role("r4", "Bot role", 2, 0, true)],
	]);

	return {
		id: GUILD,
		name: "Test Server",
		memberCount: 1_234,
		iconURL: () => null,
		channels: { cache: channels },
		roles: { cache: roles },
		members: {
			me,
			cache: new Collection(),
			fetch: (id: string) => (id === MANAGER ? Promise.resolve(reader) : Promise.reject(new Error("Unknown Member"))),
		},
		ownerId: OWNER,
		createdAt: new Date("2020-01-01T00:00:00.000Z"),
		premiumTier: 0,
		premiumSubscriptionCount: 0,
		verificationLevel: 0,
		emojis: { cache: new Collection() },
		stickers: { cache: new Collection() },
		fetchAuditLogs: jest.fn(() =>
			Promise.resolve({
				entries: new Collection([
					[
						"a1",
						{
							id: "a1",
							action: AuditLogEvent.MemberBanAdd,
							actionType: "Delete",
							targetType: "User",
							target: { username: "marcus" },
							executorId: "100000000000000002",
							executor: { username: "mod" },
							reason: "Spam",
							createdTimestamp: Date.now() - 1_000,
							changes: [],
						},
					],
				]),
			}),
		),
	};
}

function appFor(options: Options = {}, guild = fakeGuild(options)): Hono<ApiBindings> {
	const cache = new Collection<string, unknown>([[GUILD, guild]]);
	const client = { guilds: { cache }, isOwner: (id: string) => id === OWNER } as unknown as TestifyClient;

	const app = new Hono<ApiBindings>();
	app.use("*", async (context, next) => {
		context.set("client", client);
		context.set("env", {} as Env);
		context.set("oauth", null);
		context.set("session", { _id: "s", userId: options.readerHolds === undefined ? OWNER : MANAGER } as never);
		await next();
	});
	app.route("/guilds", guilds);
	app.onError((error) => {
		const problem = error instanceof ApiProblem ? error : new ApiProblem(500, "internal", "boom");
		return Response.json(problemBody(problem), { status: problem.status });
	});

	return app;
}

describe("the guild overview", () => {
	/** A feature can be configured perfectly and do nothing, because Discord revokes permissions silently. */
	it("names a missing permission in words someone can act on", async () => {
		const app = appFor({ botPermissions: [PermissionFlagsBits.ManageMessages] });
		const body = (await (await app.request(`/guilds/${GUILD}/overview`)).json()) as GuildOverview;

		expect(body.missingPermissions).toContain("ManageRoles");
		expect(body.missingPermissions).not.toContain("ManageMessages");
	});

	it("says nothing about permissions when the bot has them all", async () => {
		const body = (await (await appFor().request(`/guilds/${GUILD}/overview`)).json()) as GuildOverview;

		expect(body.missingPermissions).toEqual([]);
	});

	/** The bot's own member is missing while the cache is still filling; that is not a permission problem. */
	it("claims nothing is missing when it cannot see its own member yet", async () => {
		const app = appFor({ hasMe: false });
		const body = (await (await app.request(`/guilds/${GUILD}/overview`)).json()) as GuildOverview;

		expect(body.missingPermissions).toEqual([]);
	});
});

describe("the channel list", () => {
	async function channelsOf(options: Options = {}): Promise<ChannelSummary[]> {
		return (await (await appFor(options).request(`/guilds/${GUILD}/channels`)).json()) as ChannelSummary[];
	}

	it("leaves out anything a setting could never point at", async () => {
		const channels = await channelsOf();

		expect(channels.map((channel) => channel.id)).not.toContain("5");
		expect(channels.map((channel) => channel.kind).sort()).toEqual(["category", "text", "text", "voice"]);
	});

	/** A channel the bot cannot post in is marked before anybody saves a configuration that cannot work. */
	it("marks a channel the bot cannot post in", async () => {
		const channels = await channelsOf({ canSendIn: new Set(["1"]) });

		expect(channels.find((channel) => channel.id === "1")?.canSend).toBe(true);
		expect(channels.find((channel) => channel.id === "2")?.canSend).toBe(false);
	});

	it("never claims it can post in a voice channel or a category", async () => {
		const channels = await channelsOf();

		expect(channels.find((channel) => channel.id === "3")?.canSend).toBe(false);
		expect(channels.find((channel) => channel.id === "4")?.canSend).toBe(false);
	});

	it("orders them the way Discord shows them", async () => {
		expect((await channelsOf()).map((channel) => channel.id)).toEqual(["4", "1", "2", "3"]);
	});

	/** Discord never names a channel to somebody who cannot view it; the id stays, so a setting is not read as deleted. */
	it("names no channel the reader cannot see", async () => {
		const channels = await channelsOf({
			readerHolds: [PermissionFlagsBits.ManageGuild],
			hiddenFromReader: new Set(["2"]),
		});

		expect(channels.find((channel) => channel.id === "2")?.name).toBeNull();
		expect(channels.find((channel) => channel.id === "1")?.name).toBe("general");
		expect(JSON.stringify(channels)).not.toContain("locked");
	});
});

describe("the role list", () => {
	async function rolesOf(): Promise<RoleSummary[]> {
		return (await (await appFor().request(`/guilds/${GUILD}/roles`)).json()) as RoleSummary[];
	}

	/** `@everyone` shares the guild's id and is never something a setting grants. */
	it("leaves out @everyone", async () => {
		expect((await rolesOf()).map((role) => role.id)).not.toContain(GUILD);
	});

	/** The check `applyLevelRewards` already does at runtime, surfaced at configuration time instead. */
	it("marks a role above the bot as not assignable", async () => {
		const roles = await rolesOf();

		expect(roles.find((role) => role.id === "r2")?.assignableByBot).toBe(true);
		expect(roles.find((role) => role.id === "r3")?.assignableByBot).toBe(false);
	});

	/** A self-assign menu offering one of these would let anybody moderate the server. */
	it("marks a role that administers as powerful", async () => {
		const roles = await rolesOf();

		expect(roles.find((role) => role.id === "r3")?.powerful).toBe(true);
		expect(roles.find((role) => role.id === "r1")?.powerful).toBe(false);
	});

	it("lists them highest first, as Discord does", async () => {
		expect((await rolesOf()).map((role) => role.id)).toEqual(["r3", "r2", "r4", "r1"]);
	});
});

describe("the audit list", () => {
	/** An unvalidated page number becomes a negative skip. */
	it("refuses a page number that is not one", async () => {
		expect((await appFor().request(`/guilds/${GUILD}/audit?page=0`)).status).toBe(400);
		expect((await appFor().request(`/guilds/${GUILD}/audit?perPage=9999`)).status).toBe(400);
	});
});

describe("the changes list", () => {
	it("puts dashboard and Discord changes in one list, newest first", async () => {
		const response = await appFor().request(`/guilds/${GUILD}/changes?days=1`);
		const body = (await response.json()) as ServerChangesPage;

		expect(response.status).toBe(200);
		expect(body.items.map((change) => [change.source, change.verb])).toEqual([
			["discord", "banned"],
			["dashboard", "updated"],
		]);
		expect(body.discordReadable).toBe(true);
	});

	/** Without View Audit Log the page still shows what it can, and says why the rest is missing. */
	it("says Discord's side cannot be read rather than failing without View Audit Log", async () => {
		const response = await appFor({ botPermissions: [] }).request(`/guilds/${GUILD}/changes`);
		const body = (await response.json()) as ServerChangesPage;

		expect(response.status).toBe(200);
		expect(body.discordReadable).toBe(false);
		expect(body.items.map((change) => change.source)).toEqual(["dashboard"]);
	});

	it("refuses a window it does not offer", async () => {
		expect((await appFor().request(`/guilds/${GUILD}/changes?days=30`)).status).toBe(400);
	});

	/** Discord shows its audit log only to View Audit Log, and `/case list` asks Moderate Members, so the page does too. */
	it("asks the reader's own permissions before it shows either record", async () => {
		const options = { readerHolds: [PermissionFlagsBits.ManageGuild] };
		const guild = fakeGuild(options);
		const body = (await (await appFor(options, guild).request(`/guilds/${GUILD}/changes`)).json()) as ServerChangesPage;

		expect(body).toMatchObject({ discordWithheld: true, moderationWithheld: true });
		expect(body.items.map((change) => change.source)).toEqual(["dashboard"]);
		expect(jest.mocked(auditsSince)).toHaveBeenLastCalledWith(GUILD, expect.any(Date), undefined, {
			moderation: false,
			auditLog: false,
		});
		expect(guild.fetchAuditLogs).not.toHaveBeenCalled();
	});

	it("shows both to a reader who holds what Discord asks", async () => {
		const options = {
			readerHolds: [
				PermissionFlagsBits.ManageGuild,
				PermissionFlagsBits.ViewAuditLog,
				PermissionFlagsBits.ModerateMembers,
			],
		};
		const body = (await (await appFor(options).request(`/guilds/${GUILD}/changes`)).json()) as ServerChangesPage;

		expect(body).toMatchObject({ discordWithheld: false, moderationWithheld: false });
		expect(body.items.map((change) => change.source)).toContain("discord");
	});
});

describe("the dashboard's own records", () => {
	/** A warning, kick or ban made on the web is a moderation record, which only Moderate Members reads in Discord. */
	it("leaves moderation out of the audit list and the overview for a manager without Moderate Members", async () => {
		const app = appFor({ readerHolds: [PermissionFlagsBits.ManageGuild] });

		await app.request(`/guilds/${GUILD}/audit`);
		await app.request(`/guilds/${GUILD}/overview`);

		expect(jest.mocked(auditPage)).toHaveBeenLastCalledWith(GUILD, 1, expect.any(Number), { moderation: false });
		expect(jest.mocked(countAudits)).toHaveBeenLastCalledWith(GUILD, { moderation: false });
		expect(jest.mocked(recentAudits)).toHaveBeenLastCalledWith(GUILD, 8, { moderation: false });
	});
});

describe("the insights report", () => {
	it("refuses a window it does not keep", async () => {
		expect((await appFor().request(`/guilds/${GUILD}/insights?days=90`)).status).toBe(400);
	});
});
