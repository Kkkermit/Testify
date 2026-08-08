import { Collection, type Guild, type GuildMember } from "discord.js";
import { Hono } from "hono";
import { type ApiBindings } from "@api/context";
import { ApiProblem, problemBody } from "@api/errors";
import { members } from "@api/routes/members";
import { type Env } from "@config/env";
import { type TestifyClient } from "@core/client";
import { recordAudit } from "@database/repositories/dashboardAuditRepository";
import { findAccount, getEconomyRank } from "@database/repositories/economyRepository";
import { getRank, getUserLevel } from "@database/repositories/levelRepository";
import {
	addWarning,
	clearWarnings,
	getActiveSoftban,
	getWarnings,
	removeWarning,
} from "@database/repositories/moderationRepository";
import { type BoardPage, type MemberDetail } from "@testify/shared";

jest.mock("@database/repositories/economyRepository", () => ({
	getLeaderboard: jest.fn(() => Promise.resolve([])),
	countAccounts: jest.fn(() => Promise.resolve(0)),
	findAccount: jest.fn(() => Promise.resolve(null)),
	getEconomyRank: jest.fn(() => Promise.resolve(null)),
}));
jest.mock("@database/repositories/levelRepository", () => ({
	getLevelLeaderboard: jest.fn(() => Promise.resolve([])),
	countRanked: jest.fn(() => Promise.resolve(0)),
	getUserLevel: jest.fn(() => Promise.resolve(null)),
	getRank: jest.fn(() => Promise.resolve(null)),
}));
jest.mock("@database/repositories/moderationRepository", () => ({
	getWarnings: jest.fn(() => Promise.resolve(null)),
	getActiveSoftban: jest.fn(() => Promise.resolve(null)),
	addWarning: jest.fn(() => Promise.resolve({})),
	removeWarning: jest.fn(() => Promise.resolve(true)),
	clearWarnings: jest.fn(() => Promise.resolve(true)),
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
const warned = jest.mocked(addWarning);
const unwarned = jest.mocked(removeWarning);
const cleared = jest.mocked(clearWarnings);
const audited = jest.mocked(recordAudit);

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
			user: { username: name, bot: false },
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
	} as unknown as Guild;

	const me = member(BOT, botPosition, "Testify");
	const target = member(TARGET, targetPosition, "kate");
	const actor = member(ACTOR, actorPosition, "someone");

	(guild as { members: unknown }).members = {
		me,
		cache: new Collection(),
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
	unwarned.mockResolvedValue(true);
	cleared.mockResolvedValue(true);
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

describe("POST /members/:userId/warnings", () => {
	it("records the warning and audits it", async () => {
		await request("POST", "/warnings", { reason: "Spamming in general" });

		expect(warned).toHaveBeenCalledWith(GUILD, TARGET, "kate", { id: ACTOR, tag: "someone" }, "Spamming in general");
		expect(audited).toHaveBeenCalledWith(expect.objectContaining({ action: "member.warn" }));
	});

	it("answers with the member's whole page, so the list is never stale", async () => {
		withWarnings(2);

		const body = (await (await request("POST", "/warnings", { reason: "Spamming" })).json()) as MemberDetail;

		expect(body.warnings).toHaveLength(2);
	});

	/** Hiding a button is not access control; the refusal has to run before the write. */
	it("refuses a moderator who sits below the target", async () => {
		const response = await request("POST", "/warnings", { reason: "Spamming" }, { actorPosition: 1 });

		expect(response.status).toBe(403);
		expect(warned).not.toHaveBeenCalled();
	});

	it("refuses a warning on somebody who has left", async () => {
		const response = await request("POST", "/warnings", { reason: "Spamming" }, { targetMissing: true });

		expect(response.status).toBe(403);
		expect(warned).not.toHaveBeenCalled();
	});

	it("refuses an empty reason", async () => {
		expect((await request("POST", "/warnings", { reason: "   " })).status).toBe(400);
		expect(warned).not.toHaveBeenCalled();
	});

	it("refuses a reason past the cap", async () => {
		expect((await request("POST", "/warnings", { reason: "x".repeat(501) })).status).toBe(400);
	});
});

describe("DELETE /members/:userId/warnings/:warnId", () => {
	it("removes one warning and audits it", async () => {
		await request("DELETE", "/warnings/a1b2c3d4");

		expect(unwarned).toHaveBeenCalledWith(GUILD, TARGET, "a1b2c3d4");
		expect(audited).toHaveBeenCalledWith(expect.objectContaining({ action: "member.warn.remove" }));
	});

	it("says so when the warning has already gone", async () => {
		unwarned.mockResolvedValue(false);

		expect((await request("DELETE", "/warnings/a1b2c3d4")).status).toBe(404);
	});

	/** An unvalidated id would reach a Mongo filter untouched. */
	it("refuses a warning ID that is not one", async () => {
		expect((await request("DELETE", "/warnings/..%2Fetc")).status).toBe(400);
		expect(unwarned).not.toHaveBeenCalled();
	});
});

describe("DELETE /members/:userId/warnings", () => {
	it("clears the record and counts what went in the audit line", async () => {
		withWarnings(3);

		await request("DELETE", "/warnings");

		expect(cleared).toHaveBeenCalledWith(GUILD, TARGET);
		expect(audited).toHaveBeenCalledWith(expect.objectContaining({ summary: expect.stringContaining("3 warnings") }));
	});

	it("says so when there was nothing to clear", async () => {
		cleared.mockResolvedValue(false);

		expect((await request("DELETE", "/warnings")).status).toBe(404);
	});

	it("refuses a moderator who sits below the target", async () => {
		const response = await request("DELETE", "/warnings", undefined, { actorPosition: 1 });

		expect(response.status).toBe(403);
		expect(cleared).not.toHaveBeenCalled();
	});
});
