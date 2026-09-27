import { Collection, type Guild, type GuildMember } from "discord.js";
import { Hono } from "hono";
import { type ApiBindings } from "@api/context";
import { ApiProblem, problemBody } from "@api/errors";
import { members } from "@api/routes/members";
import { type Env } from "@config/env";
import { type TestifyClient } from "@core/client";
import { recordAudit } from "@database/repositories/dashboardAuditRepository";
import { adjustBank, adjustWallet, findAccount, getEconomyRank } from "@database/repositories/economyRepository";
import { addXp, getRank, getUserLevel, setLevel } from "@database/repositories/levelRepository";
import { deactivateSoftban, getActiveSoftban, getWarnings } from "@database/repositories/moderationRepository";
import { applyLevelRewards } from "@lib/levelling/levellingActions.util";
import { type BoardPage, type MemberDetail } from "@testify/shared";

jest.mock("@database/repositories/economyRepository", () => ({
	getLeaderboard: jest.fn(() => Promise.resolve([])),
	countAccounts: jest.fn(() => Promise.resolve(0)),
	findAccount: jest.fn(() => Promise.resolve(null)),
	getEconomyRank: jest.fn(() => Promise.resolve(null)),
	adjustWallet: jest.fn(() => Promise.resolve({ wallet: 0, bank: 0 })),
	adjustBank: jest.fn(() => Promise.resolve({ wallet: 0, bank: 0 })),
}));
jest.mock("@database/repositories/levelRepository", () => ({
	getLevelLeaderboard: jest.fn(() => Promise.resolve([])),
	countRanked: jest.fn(() => Promise.resolve(0)),
	getUserLevel: jest.fn(() => Promise.resolve(null)),
	getRank: jest.fn(() => Promise.resolve(null)),
	getLevelSettings: jest.fn(() => Promise.resolve(null)),
	setLevel: jest.fn(() => Promise.resolve({ level: 10, xp: 5_000 })),
	addXp: jest.fn(() => Promise.resolve({ level: 3, xp: 400 })),
}));
jest.mock("@database/repositories/moderationRepository", () => ({
	getWarnings: jest.fn(() => Promise.resolve(null)),
	getActiveSoftban: jest.fn(() => Promise.resolve(null)),
	deactivateSoftban: jest.fn(() => Promise.resolve(true)),
}));
jest.mock("@lib/levelling/levellingActions.util", () => ({
	applyLevelRewards: jest.fn(() => Promise.resolve({ added: [], removed: [], skipped: [] })),
}));
jest.mock("@database/repositories/dashboardAuditRepository", () => ({ recordAudit: jest.fn(() => Promise.resolve()) }));

const GUILD = "900000000000000001";
const ACTOR = "100000000000000001";
const TARGET = "100000000000000002";
const BOT = "100000000000000009";

const account = jest.mocked(findAccount);
const moneyRank = jest.mocked(getEconomyRank);
const level = jest.mocked(getUserLevel);
const levelRank = jest.mocked(getRank);
const warnings = jest.mocked(getWarnings);
const softban = jest.mocked(getActiveSoftban);
const kicked = jest.fn((_reason: string) => Promise.resolve());
const banned = jest.fn((_id: string, _options: unknown) => Promise.resolve());
const searched = jest.fn((_options: unknown) => Promise.resolve(new Collection<string, unknown>()));
const audited = jest.mocked(recordAudit);
const walletChange = jest.mocked(adjustWallet);
const bankChange = jest.mocked(adjustBank);
const levelSet = jest.mocked(setLevel);
const xpAdded = jest.mocked(addXp);
const rewarded = jest.mocked(applyLevelRewards);
const softbanLifted = jest.mocked(deactivateSoftban);

interface Scene {
	actorPosition?: number;
	targetPosition?: number;
	botPosition?: number;
	guildOwnerId?: string;
	targetMissing?: boolean;
}

function app(options: Scene = {}): Hono<ApiBindings> {
	const {
		actorPosition = 10,
		targetPosition = 5,
		botPosition = 20,
		guildOwnerId = "700000000000000001",
		targetMissing = false,
	} = options;

	const member = (id: string, position: number, name: string): GuildMember =>
		({
			id,
			displayName: name,
			user: { id, username: name, bot: false, send: () => Promise.resolve() },
			kickable: true,
			bannable: true,
			kick: kicked,
			joinedAt: new Date("2026-01-04T00:00:00.000Z"),
			roles: { highest: { position }, cache: new Collection() },
			// `requireGuild` reads this before any handler runs, so a member without it never reaches one.
			permissions: { has: () => true },
			displayAvatarURL: () => `https://cdn.example.test/${id}.png`,
		}) as unknown as GuildMember;

	const guild = {
		id: GUILD,
		name: "Test Server",
		ownerId: guildOwnerId,
		bans: { remove: jest.fn(() => Promise.resolve({})), fetch: jest.fn(() => Promise.reject(new Error("none"))) },
	} as unknown as Guild;

	const me = member(BOT, botPosition, "Testify");
	const target = member(TARGET, targetPosition, "kate");
	const actor = member(ACTOR, actorPosition, "someone");

	const lookalikeBot = { ...member("100000000000000003", 1, "kat-bot"), user: { username: "kat-bot", bot: true } };
	searched.mockResolvedValue(
		new Collection<string, unknown>([
			[TARGET, target],
			["100000000000000003", lookalikeBot],
		]),
	);

	(guild as { members: unknown }).members = {
		me,
		cache: new Collection(),
		ban: banned,
		search: searched,
		fetch: jest.fn((id: string) => {
			if (id === ACTOR) return Promise.resolve(actor);
			if (id === TARGET && !targetMissing) return Promise.resolve(target);
			return Promise.reject(new Error("Unknown Member"));
		}),
	};
	(target as { guild: unknown }).guild = guild;
	(actor as { guild: unknown }).guild = guild;

	const client = {
		user: { id: BOT },
		users: { fetch: jest.fn(() => Promise.resolve(target.user)) },
		guilds: { cache: new Collection<string, unknown>([[GUILD, guild]]) },
		isOwner: () => false,
		logger: { error: jest.fn() },
	} as unknown as TestifyClient;

	const instance = new Hono<ApiBindings>();
	instance.use("*", async (context, next) => {
		context.set("client", client);
		context.set("env", {} as Env);
		context.set("oauth", null);
		context.set("session", { _id: "s", userId: ACTOR, username: "someone" } as never);
		await next();
	});
	instance.route("/guilds/:guildId/members", members);
	instance.onError((error) => {
		const problem = error instanceof ApiProblem ? error : new ApiProblem(500, "internal", "boom");
		return Response.json(problemBody(problem), { status: problem.status });
	});

	return instance;
}

async function request(method: string, path = "", body?: unknown, scene: Scene = {}): Promise<Response> {
	return app(scene).request(`/guilds/${GUILD}/members/${TARGET}${path}`, {
		method,
		headers: { "content-type": "application/json" },
		...(body === undefined ? {} : { body: JSON.stringify(body) }),
	});
}

function withWarnings(count = 1): void {
	warnings.mockResolvedValue({
		guildId: GUILD,
		userId: TARGET,
		userTag: "kate",
		warnings: Array.from({ length: count }, (_, index) => ({
			warnId: `warn${String(index)}`,
			executorId: ACTOR,
			executorTag: "someone",
			reason: `Reason ${String(index)}`,
			timestamp: new Date("2026-08-01T12:00:00.000Z"),
			edits: [],
		})),
		createdAt: new Date(),
		updatedAt: new Date(),
	});
}

beforeEach(() => {
	jest.clearAllMocks();
	account.mockResolvedValue(null);
	moneyRank.mockResolvedValue(null);
	level.mockResolvedValue(null);
	levelRank.mockResolvedValue(null);
	warnings.mockResolvedValue(null);
	softban.mockResolvedValue(null);
	walletChange.mockResolvedValue({ wallet: 0, bank: 0 } as never);
	bankChange.mockResolvedValue({ wallet: 0, bank: 0 } as never);
	levelSet.mockResolvedValue({ level: 10, xp: 5_000 } as never);
	xpAdded.mockResolvedValue({ level: 3, xp: 400 } as never);
	rewarded.mockResolvedValue({ added: [], removed: [], skipped: [] });
	softbanLifted.mockResolvedValue(true);
});

describe("GET /members/:userId", () => {
	it("answers with a page for somebody who has no records at all", async () => {
		const body = (await (await request("GET")).json()) as MemberDetail;

		expect(body).toMatchObject({
			userId: TARGET,
			displayName: "kate",
			inGuild: true,
			economy: null,
			levels: null,
			warnings: [],
			softban: null,
			moderationProblem: null,
		});
	});

	it("reports money and levels with their ranks", async () => {
		account.mockResolvedValue({ wallet: 5_000, bank: 120 } as never);
		moneyRank.mockResolvedValue(2);
		level.mockResolvedValue({ level: 12, xp: 4_800 } as never);
		levelRank.mockResolvedValue(3);

		const body = (await (await request("GET")).json()) as MemberDetail;

		expect(body.economy).toEqual({ wallet: 5_000, bank: 120, total: 5_120, rank: 2 });
		expect(body.levels).toEqual({ level: 12, xp: 4_800, rank: 3 });
	});

	/** Newest first is what a moderator reads; the repository appends, so the order has to be reversed here. */
	it("lists warnings newest first", async () => {
		withWarnings(3);

		const body = (await (await request("GET")).json()) as MemberDetail;

		expect(body.warnings.map((warning) => warning.id)).toEqual(["warn2", "warn1", "warn0"]);
	});

	/** A balance and a warning record outlive the membership, so leaving must not turn the page into a 404. */
	it("still answers for somebody who has left, and says they cannot be acted on", async () => {
		withWarnings(1);

		const body = (await (await request("GET", "", undefined, { targetMissing: true })).json()) as MemberDetail;

		expect(body).toMatchObject({ inGuild: false, displayName: "kate" });
		expect(body.warnings).toHaveLength(1);
		expect(body.moderationProblem).toMatch(/no longer in this server/i);
	});

	it("names the hierarchy as the reason a lower moderator cannot act", async () => {
		const body = (await (await request("GET", "", undefined, { actorPosition: 1 })).json()) as MemberDetail;

		expect(body.moderationProblem).not.toBeNull();
	});

	/** `/leaderboard` and `/:userId` sit on the same segment; a router that preferred the parameter would break it. */
	it("does not swallow the leaderboard route", async () => {
		const response = await app().request(`/guilds/${GUILD}/members/leaderboard`);

		expect(response.status).toBe(200);
		expect((await response.json()) as BoardPage).toMatchObject({ board: "economy" });
	});

	it("refuses a user ID that is not a snowflake", async () => {
		expect((await app().request(`/guilds/${GUILD}/members/nope`)).status).toBe(400);
	});
});

describe("POST /members/:userId/kick", () => {
	it("kicks once the username is typed back, and audits it", async () => {
		const response = await request("POST", "/kick", { reason: "Spamming", confirm: "Kate" });

		expect(response.status).toBe(200);
		expect(kicked).toHaveBeenCalledWith("someone: Spamming");
		expect(audited).toHaveBeenCalledWith(expect.objectContaining({ action: "member.kick" }));
	});

	it("takes their Discord ID as the confirmation too", async () => {
		expect((await request("POST", "/kick", { reason: "Spamming", confirm: TARGET })).status).toBe(200);
		expect(kicked).toHaveBeenCalled();
	});

	/** The typed name is the confirmation, and the server is what compares it. */
	it("refuses without the username typed back", async () => {
		const response = await request("POST", "/kick", { reason: "Spamming", confirm: "kat" });

		expect(response.status).toBe(400);
		expect(kicked).not.toHaveBeenCalled();
	});

	it("refuses a moderator who sits below the target", async () => {
		const response = await request("POST", "/kick", { reason: "Spamming", confirm: "kate" }, { actorPosition: 1 });

		expect(response.status).toBe(403);
		expect(kicked).not.toHaveBeenCalled();
	});

	it("refuses an empty reason", async () => {
		expect((await request("POST", "/kick", { reason: " ", confirm: "kate" })).status).toBe(400);
	});
});

describe("POST /members/:userId/ban", () => {
	it("bans, deleting the days of messages asked for", async () => {
		await request("POST", "/ban", { reason: "Raiding", confirm: "kate", deleteDays: 1 });

		expect(banned).toHaveBeenCalledWith(TARGET, { reason: "someone: Raiding", deleteMessageSeconds: 86_400 });
		expect(audited).toHaveBeenCalledWith(expect.objectContaining({ action: "member.ban" }));
	});

	/** Somebody who left to dodge a ban can still be banned, which a kick cannot reach. */
	it("bans somebody who has already left", async () => {
		const response = await request("POST", "/ban", { reason: "Raiding", confirm: "kate" }, { targetMissing: true });

		expect(response.status).toBe(200);
		expect(banned).toHaveBeenCalled();
	});

	it("refuses a moderator who sits below a target still in the server", async () => {
		const response = await request("POST", "/ban", { reason: "Raiding", confirm: "kate" }, { actorPosition: 1 });

		expect(response.status).toBe(403);
		expect(banned).not.toHaveBeenCalled();
	});

	it("refuses without the username typed back", async () => {
		expect((await request("POST", "/ban", { reason: "Raiding", confirm: "" })).status).toBe(400);
		expect(banned).not.toHaveBeenCalled();
	});

	it("keeps message deletion within Discord's seven days", async () => {
		expect((await request("POST", "/ban", { reason: "Raiding", confirm: "kate", deleteDays: 8 })).status).toBe(400);
	});
});

describe("GET /members/search", () => {
	it("offers matching people and leaves bots out", async () => {
		const response = await app().request(`/guilds/${GUILD}/members/search?q=ka`);
		const body = (await response.json()) as { userId: string }[];

		expect(body.map((match) => match.userId)).toEqual([TARGET]);
		expect(searched).toHaveBeenCalledWith({ query: "ka", limit: 10 });
	});

	/** A pasted ID names one person exactly, so it is fetched rather than searched as though it were a name. */
	it("finds somebody by a pasted ID or mention", async () => {
		for (const q of [TARGET, `<@${TARGET}>`]) {
			const response = await app().request(`/guilds/${GUILD}/members/search?q=${encodeURIComponent(q)}`);
			expect(((await response.json()) as { userId: string }[]).map((match) => match.userId)).toEqual([TARGET]);
		}
		expect(searched).not.toHaveBeenCalled();
	});

	it("finds nobody for an ID that is not a member", async () => {
		const response = await app().request(`/guilds/${GUILD}/members/search?q=100000000000000004`);

		expect(await response.json()).toEqual([]);
	});

	it("refuses an empty search", async () => {
		expect((await app().request(`/guilds/${GUILD}/members/search?q=`)).status).toBe(400);
	});
});

describe("PATCH /members/:userId/money", () => {
	it("adds to the wallet and audits it", async () => {
		account.mockResolvedValue({ wallet: 500, bank: 0 } as never);

		await request("PATCH", "/money", { purse: "wallet", delta: 250 });

		expect(walletChange).toHaveBeenCalledWith(GUILD, TARGET, 250);
		expect(audited).toHaveBeenCalledWith(expect.objectContaining({ action: "member.money" }));
	});

	it("takes from the bank when that purse is named", async () => {
		account.mockResolvedValue({ wallet: 0, bank: 900 } as never);

		await request("PATCH", "/money", { purse: "bank", delta: -400 });

		expect(bankChange).toHaveBeenCalledWith(GUILD, TARGET, -400);
	});

	/** Nothing else in the economy can produce a negative balance, so the API must not either. */
	it("refuses taking more than they hold", async () => {
		account.mockResolvedValue({ wallet: 100, bank: 0 } as never);

		const response = await request("PATCH", "/money", { purse: "wallet", delta: -500 });

		expect(response.status).toBe(400);
		expect(walletChange).not.toHaveBeenCalled();
	});

	it("refuses a change of nothing", async () => {
		expect((await request("PATCH", "/money", { purse: "wallet", delta: 0 })).status).toBe(400);
	});

	it("refuses a purse it does not have", async () => {
		expect((await request("PATCH", "/money", { purse: "pocket", delta: 10 })).status).toBe(400);
	});

	it("refuses a moderator who sits below the target", async () => {
		const response = await request("PATCH", "/money", { purse: "wallet", delta: 10 }, { actorPosition: 1 });

		expect(response.status).toBe(403);
		expect(walletChange).not.toHaveBeenCalled();
	});
});

describe("PATCH /members/:userId/level", () => {
	it("sets a level outright", async () => {
		await request("PATCH", "/level", { level: 10 });

		expect(levelSet).toHaveBeenCalledWith(GUILD, TARGET, 10);
		expect(xpAdded).not.toHaveBeenCalled();
	});

	it("moves XP when that is what was sent", async () => {
		await request("PATCH", "/level", { xp: 400 });

		expect(xpAdded).toHaveBeenCalledWith(GUILD, TARGET, 400);
		expect(levelSet).not.toHaveBeenCalled();
	});

	/** Setting a level hands out its role rewards too. */
	it("hands out the role rewards the new level earns", async () => {
		await request("PATCH", "/level", { level: 10 });

		expect(rewarded).toHaveBeenCalledWith(
			expect.objectContaining({ id: TARGET }),
			expect.anything(),
			10,
			expect.anything(),
		);
	});

	it("refuses a body carrying neither", async () => {
		expect((await request("PATCH", "/level", {})).status).toBe(400);
	});

	it("refuses a body carrying both", async () => {
		expect((await request("PATCH", "/level", { level: 5, xp: 100 })).status).toBe(400);
		expect(levelSet).not.toHaveBeenCalled();
	});

	it("refuses a level past the cap", async () => {
		expect((await request("PATCH", "/level", { level: 5_000 })).status).toBe(400);
	});

	it("refuses a moderator who sits below the target", async () => {
		expect((await request("PATCH", "/level", { level: 5 }, { actorPosition: 1 })).status).toBe(403);
		expect(levelSet).not.toHaveBeenCalled();
	});
});

describe("DELETE /members/:userId/softban", () => {
	function softbanned(): void {
		softban.mockResolvedValue({
			guildId: GUILD,
			userId: TARGET,
			moderatorId: ACTOR,
			reason: "Spam",
			expiresAt: new Date("2099-01-01T00:00:00.000Z"),
			isActive: true,
		} as never);
	}

	it("lifts the Discord ban and closes the record", async () => {
		softbanned();

		const response = await request("DELETE", "/softban");

		expect(response.status).toBe(200);
		expect(softbanLifted).toHaveBeenCalledWith(GUILD, TARGET);
		expect(audited).toHaveBeenCalledWith(expect.objectContaining({ action: "member.softban.revoke" }));
	});

	/** A softbanned user is not a member, so the hierarchy check would refuse every lift. */
	it("works for somebody who is not in the server, which every softbanned user is", async () => {
		softbanned();

		expect((await request("DELETE", "/softban", undefined, { targetMissing: true })).status).toBe(200);
		expect(softbanLifted).toHaveBeenCalled();
	});

	it("says so when there is no active softban", async () => {
		expect((await request("DELETE", "/softban")).status).toBe(404);
		expect(softbanLifted).not.toHaveBeenCalled();
	});
});
