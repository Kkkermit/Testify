import { ChannelType, Collection, PermissionFlagsBits } from "discord.js";
import { Hono } from "hono";
import { type ApiBindings } from "@api/context";
import { ApiProblem, problemBody } from "@api/errors";
import { guilds } from "@api/routes/guilds";
import { type Env } from "@config/env";
import { type TestifyClient } from "@core/client";
import { type ChannelSummary, type GuildOverview, type RoleSummary } from "@testify/shared";

jest.mock("@database/repositories/levelRepository", () => ({ getLevelSettings: jest.fn(() => Promise.resolve(null)) }));
jest.mock("@database/repositories/settingsRepository", () => ({
	getAntiLink: jest.fn(() => Promise.resolve(null)),
	getAuditLogConfig: jest.fn(() => Promise.resolve(null)),
	getAutoRoles: jest.fn(() => Promise.resolve(null)),
	getCounting: jest.fn(() => Promise.resolve(null)),
	getVoiceCounter: jest.fn(() => Promise.resolve(null)),
	getWelcome: jest.fn(() => Promise.resolve(null)),
	listSticky: jest.fn(() => Promise.resolve([])),
	getTreasureConfig: jest.fn(() => Promise.resolve(null)),
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
}));

const GUILD = "900000000000000001";
const OWNER = "100000000000000001";

/** The bot's own highest role sits at 5, so anything at or above that is out of reach. */
const BOT_HIGHEST = 5;

interface Options {
	botPermissions?: bigint[];
	canSendIn?: Set<string>;
	hasMe?: boolean;
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

	const channel = (id: string, name: string, type: ChannelType, position: number) => ({
		id,
		name,
		type,
		position,
		isTextBased: () => type === ChannelType.GuildText || type === ChannelType.GuildAnnouncement,
		permissionsFor: () => ({ has: () => options.canSendIn?.has(id) ?? true }),
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
		members: { me, fetch: () => Promise.reject(new Error("Unknown Member")) },
	};
}

function appFor(options: Options = {}): Hono<ApiBindings> {
	const guild = fakeGuild(options);
	const cache = new Collection<string, unknown>([[GUILD, guild]]);
	const client = { guilds: { cache }, isOwner: (id: string) => id === OWNER } as unknown as TestifyClient;

	const app = new Hono<ApiBindings>();
	app.use("*", async (context, next) => {
		context.set("client", client);
		context.set("env", {} as Env);
		context.set("oauth", null);
		context.set("session", { _id: "s", userId: OWNER } as never);
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
	it("reports the counts from the live cache", async () => {
		const body = (await (await appFor().request(`/guilds/${GUILD}/overview`)).json()) as GuildOverview;

		expect(body).toMatchObject({ name: "Test Server", memberCount: 1_234, channelCount: 5, roleCount: 5 });
	});

	it("lists every feature, on or off, so nothing is invisible", async () => {
		const body = (await (await appFor().request(`/guilds/${GUILD}/overview`)).json()) as GuildOverview;

		expect(body.features.map((feature) => feature.key)).toContain("levelling");
		expect(body.features.every((feature) => !feature.enabled)).toBe(true);
		expect(body.features.every((feature) => feature.detail === null)).toBe(true);
	});

	/** A feature can be configured perfectly and do nothing, because Discord revokes permissions silently. */
	it("names a missing permission in words someone can act on", async () => {
		const app = appFor({ botPermissions: [PermissionFlagsBits.ManageMessages] });
		const body = (await (await app.request(`/guilds/${GUILD}/overview`)).json()) as GuildOverview;

		expect(body.missingPermissions.join(" ")).toMatch(/Manage Roles/);
		expect(body.missingPermissions.join(" ")).not.toMatch(/Manage Messages/);
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

	/**
	 * The single biggest reason this API lives in the bot process: the picker can grey out a channel before
	 * anyone saves a configuration that cannot work.
	 */
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

	it("marks an integration's own role as not assignable", async () => {
		expect((await rolesOf()).find((role) => role.id === "r4")?.assignableByBot).toBe(false);
	});

	it("gives a colour only when the role has one", async () => {
		const roles = await rolesOf();

		expect(roles.find((role) => role.id === "r2")?.colour).toBe("#7c3aed");
		expect(roles.find((role) => role.id === "r1")?.colour).toBeNull();
	});

	it("lists them highest first, as Discord does", async () => {
		expect((await rolesOf()).map((role) => role.id)).toEqual(["r3", "r2", "r4", "r1"]);
	});
});

describe("the audit list", () => {
	it("pages", async () => {
		const response = await appFor().request(`/guilds/${GUILD}/audit?page=2&perPage=10`);

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ items: [], total: 0, page: 2, perPage: 10 });
	});

	/** An unvalidated page number becomes a negative skip. */
	it("refuses a page number that is not one", async () => {
		expect((await appFor().request(`/guilds/${GUILD}/audit?page=0`)).status).toBe(400);
		expect((await appFor().request(`/guilds/${GUILD}/audit?perPage=9999`)).status).toBe(400);
	});
});
