import { Collection, type Guild, type GuildMember } from "discord.js";
import { Hono } from "hono";
import { type ApiBindings } from "@api/context";
import { ApiProblem, problemBody } from "@api/errors";
import { warnings } from "@api/routes/warnings";
import { type Env } from "@config/env";
import { type TestifyClient } from "@core/client";
import { recordAudit } from "@database/repositories/dashboardAuditRepository";
import {
	addWarning,
	clearWarnings,
	countWarnings,
	editWarning,
	getWarnings,
	getWarnLadder,
	listGuildWarnings,
	removeWarning,
	saveWarnLadder,
} from "@database/repositories/moderationRepository";
import { type GuildWarningsPage, type WarningAdded } from "@testify/shared";

jest.mock("@database/repositories/moderationRepository", () => ({
	addWarning: jest.fn(),
	clearWarnings: jest.fn(() => Promise.resolve(true)),
	countWarnings: jest.fn(() => Promise.resolve(1)),
	editWarning: jest.fn(() => Promise.resolve(true)),
	getWarnings: jest.fn(() => Promise.resolve(null)),
	getWarnLadder: jest.fn(() => Promise.resolve(null)),
	listGuildWarnings: jest.fn(() => Promise.resolve([])),
	removeWarning: jest.fn(() => Promise.resolve(true)),
	saveWarnLadder: jest.fn((_guildId: string, steps: unknown) => Promise.resolve({ steps })),
	setWarningStep: jest.fn(() => Promise.resolve()),
}));
jest.mock("@database/repositories/dashboardAuditRepository", () => ({ recordAudit: jest.fn(() => Promise.resolve()) }));

const GUILD = "900000000000000001";
const ACTOR = "100000000000000001";
const TARGET = "100000000000000002";
const BOT = "100000000000000009";

const added = jest.mocked(addWarning);
const counted = jest.mocked(countWarnings);
const edited = jest.mocked(editWarning);
const stored = jest.mocked(getWarnings);
const ladder = jest.mocked(getWarnLadder);
const listed = jest.mocked(listGuildWarnings);
const removed = jest.mocked(removeWarning);
const cleared = jest.mocked(clearWarnings);
const savedLadder = jest.mocked(saveWarnLadder);
const audited = jest.mocked(recordAudit);

interface Scene {
	actorPosition?: number;
	targetMissing?: boolean;
	targetIsBot?: boolean;
}

const timeout = jest.fn((_ms: number, _reason: string) => Promise.resolve());

function app(options: Scene = {}): Hono<ApiBindings> {
	const { actorPosition = 10, targetMissing = false, targetIsBot = false } = options;

	const member = (id: string, position: number, name: string, bot = false): GuildMember =>
		({
			id,
			displayName: name,
			user: { id, username: name, bot, send: () => Promise.resolve() },
			roles: { highest: { position }, cache: new Collection() },
			permissions: { has: () => true },
			moderatable: true,
			kickable: true,
			bannable: true,
			timeout,
		}) as unknown as GuildMember;

	const guild = { id: GUILD, name: "Test Server", ownerId: "700000000000000001" } as unknown as Guild;
	const target = member(TARGET, 5, "kate", targetIsBot);
	const actor = member(ACTOR, actorPosition, "someone");

	(guild as { members: unknown }).members = {
		me: member(BOT, 20, "Testify"),
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
	instance.route("/guilds/:guildId/warnings", warnings);
	instance.onError((error) => {
		const problem = error instanceof ApiProblem ? error : new ApiProblem(500, "internal", "boom");
		return Response.json(problemBody(problem), { status: problem.status });
	});

	return instance;
}

async function send(method: string, path = "", body?: unknown, scene: Scene = {}): Promise<Response> {
	return app(scene).request(`/guilds/${GUILD}/warnings${path}`, {
		method,
		headers: { "content-type": "application/json" },
		...(body === undefined ? {} : { body: JSON.stringify(body) }),
	});
}

const entry = (warnId: string, reason = "Spamming") => ({
	warnId,
	executorId: ACTOR,
	executorTag: "someone",
	reason,
	timestamp: new Date("2026-09-01T12:00:00.000Z"),
	edits: [],
});

beforeEach(() => {
	jest.clearAllMocks();
	counted.mockResolvedValue(1);
	ladder.mockResolvedValue(null);
	stored.mockResolvedValue(null);
	removed.mockResolvedValue(true);
	cleared.mockResolvedValue(true);
	edited.mockResolvedValue(true);
	added.mockResolvedValue(entry("abcd1234"));
});

describe("GET /warnings", () => {
	it("lists every member's warnings in one page", async () => {
		listed.mockResolvedValue([{ userId: TARGET, userTag: "kate", warnings: [entry("abcd1234")] }] as never);

		const body = (await (await send("GET")).json()) as GuildWarningsPage;

		expect(body.items).toEqual([expect.objectContaining({ id: "abcd1234", userId: TARGET, username: "kate" })]);
		expect(body.total).toBe(1);
	});

	describe("searching", () => {
		beforeEach(() => {
			listed.mockResolvedValue([
				{ userId: TARGET, userTag: "kkermits.alt", warnings: [entry("aaaa1111")] },
				{ userId: "100000000000000005", userTag: "marcus", warnings: [entry("bbbb2222"), entry("cccc3333")] },
			] as never);
		});

		it("finds a member's warnings by part of their name, whatever its case", async () => {
			const body = (await (await send("GET", "?q=Kkermit")).json()) as GuildWarningsPage;

			expect(body.items.map((warning) => warning.id)).toEqual(["aaaa1111"]);
		});

		it("finds a member's warnings by a pasted ID or mention", async () => {
			for (const q of ["100000000000000005", "<@100000000000000005>"]) {
				const body = (await (await send("GET", `?q=${encodeURIComponent(q)}`)).json()) as GuildWarningsPage;
				expect(body.items.map((warning) => warning.id).sort()).toEqual(["bbbb2222", "cccc3333"]);
			}
		});

		/** An ID matches exactly, or searching one person's ID would list everybody whose ID shares its digits. */
		it("does not treat an ID as part of a name", async () => {
			const body = (await (await send("GET", "?q=100000000000000009")).json()) as GuildWarningsPage;

			expect(body.total).toBe(0);
		});

		it("answers with only as many as were asked for, counting them all", async () => {
			const body = (await (await send("GET", "?perPage=1")).json()) as GuildWarningsPage;

			expect(body.items).toHaveLength(1);
			expect(body.total).toBe(3);
		});

		it("refuses a page size past the cap", async () => {
			expect((await send("GET", "?perPage=500")).status).toBe(400);
		});
	});

	it("refuses a page that is not a number", async () => {
		expect((await send("GET", "?page=first")).status).toBe(400);
	});
});

describe("POST /warnings", () => {
	it("records the warning and audits it", async () => {
		await send("POST", "", { userId: TARGET, reason: "Spamming in general" });

		expect(added).toHaveBeenCalledWith(GUILD, TARGET, "kate", { id: ACTOR, tag: "someone" }, "Spamming in general");
		expect(audited).toHaveBeenCalledWith(expect.objectContaining({ action: "member.warn" }));
	});

	/** The web goes through the same step as `/warn`, so a second warning mutes whichever surface gave it. */
	it("carries out the step the warning lands on and says so", async () => {
		ladder.mockResolvedValue({ steps: [{ action: "warn" }, { action: "timeout", minutes: 10 }] } as never);
		counted.mockResolvedValue(2);

		const body = (await (await send("POST", "", { userId: TARGET, reason: "Again" })).json()) as WarningAdded;

		expect(timeout).toHaveBeenCalledWith(600_000, expect.any(String));
		expect(body.outcome).toEqual({ count: 2, step: { action: "timeout", minutes: 10 }, problem: null });
	});

	/** Hiding a button is not access control; the refusal has to run before the write. */
	it("refuses a moderator who sits below the target", async () => {
		const response = await send("POST", "", { userId: TARGET, reason: "Spamming" }, { actorPosition: 1 });

		expect(response.status).toBe(403);
		expect(added).not.toHaveBeenCalled();
	});

	it("refuses somebody who is not in the server", async () => {
		const response = await send("POST", "", { userId: TARGET, reason: "Spamming" }, { targetMissing: true });

		expect(response.status).toBe(404);
		expect(added).not.toHaveBeenCalled();
	});

	it("refuses a bot, as /warn does", async () => {
		expect((await send("POST", "", { userId: TARGET, reason: "x" }, { targetIsBot: true })).status).toBe(403);
	});

	it("refuses an empty reason and one past the cap", async () => {
		expect((await send("POST", "", { userId: TARGET, reason: "   " })).status).toBe(400);
		expect((await send("POST", "", { userId: TARGET, reason: "x".repeat(501) })).status).toBe(400);
		expect(added).not.toHaveBeenCalled();
	});
});

describe("PATCH /warnings/:userId/:warnId", () => {
	it("rewrites the reason and answers with the warning as it now reads", async () => {
		stored.mockResolvedValue({
			userId: TARGET,
			userTag: "kate",
			warnings: [{ ...entry("abcd1234", "Rude"), edits: [{}] }],
		} as never);

		const body = await (await send("PATCH", `/${TARGET}/abcd1234`, { reason: "Rude" })).json();

		expect(edited).toHaveBeenCalledWith(GUILD, TARGET, "abcd1234", "Rude", { id: ACTOR, tag: "someone" });
		expect(body).toMatchObject({ id: "abcd1234", reason: "Rude", edited: true });
	});

	it("says so when the warning has already gone", async () => {
		edited.mockResolvedValue(false);

		expect((await send("PATCH", `/${TARGET}/abcd1234`, { reason: "Rude" })).status).toBe(404);
	});

	it("refuses a moderator who sits below a member still in the server", async () => {
		expect((await send("PATCH", `/${TARGET}/abcd1234`, { reason: "Rude" }, { actorPosition: 1 })).status).toBe(403);
		expect(edited).not.toHaveBeenCalled();
	});
});

describe("DELETE /warnings/:userId/:warnId", () => {
	it("removes one warning and audits it", async () => {
		expect((await send("DELETE", `/${TARGET}/a1b2c3d4`)).status).toBe(204);

		expect(removed).toHaveBeenCalledWith(GUILD, TARGET, "a1b2c3d4");
		expect(audited).toHaveBeenCalledWith(expect.objectContaining({ action: "member.warn.remove" }));
	});

	/** Somebody who has left has no roles to compare, and their record must still be tidied up. */
	it("removes a warning from somebody who has left", async () => {
		expect((await send("DELETE", `/${TARGET}/a1b2c3d4`, undefined, { targetMissing: true })).status).toBe(204);
	});

	/** An unvalidated id would reach a Mongo filter untouched. */
	it("refuses a warning ID that is not one", async () => {
		expect((await send("DELETE", `/${TARGET}/..%2Fetc`)).status).toBe(400);
		expect(removed).not.toHaveBeenCalled();
	});
});

describe("DELETE /warnings/:userId", () => {
	it("clears the record and counts what went in the audit line", async () => {
		stored.mockResolvedValue({
			userId: TARGET,
			userTag: "kate",
			warnings: [entry("a"), entry("b"), entry("c")],
		} as never);

		await send("DELETE", `/${TARGET}`);

		expect(cleared).toHaveBeenCalledWith(GUILD, TARGET);
		expect(audited).toHaveBeenCalledWith(expect.objectContaining({ summary: expect.stringContaining("3 warnings") }));
	});

	it("refuses a moderator who sits below the target", async () => {
		expect((await send("DELETE", `/${TARGET}`, undefined, { actorPosition: 1 })).status).toBe(403);
		expect(cleared).not.toHaveBeenCalled();
	});
});

describe("the punishments", () => {
	it("reads an empty list for a server that never set one", async () => {
		expect(await (await send("GET", "/punishments")).json()).toEqual({ steps: [] });
	});

	it("replaces the whole list and audits it", async () => {
		const steps = [{ action: "warn" }, { action: "timeout", minutes: 10 }, { action: "kick" }, { action: "ban" }];

		const body = await (await send("PUT", "/punishments", { steps })).json();

		expect(savedLadder).toHaveBeenCalledWith(GUILD, steps, ACTOR);
		expect(body).toEqual({ steps });
		expect(audited).toHaveBeenCalledWith(expect.objectContaining({ action: "warnings.punishments" }));
	});

	it("refuses a timeout length nobody offered", async () => {
		expect((await send("PUT", "/punishments", { steps: [{ action: "timeout", minutes: 7 }] })).status).toBe(400);
		expect(savedLadder).not.toHaveBeenCalled();
	});
});
