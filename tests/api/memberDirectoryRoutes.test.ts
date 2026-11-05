import { Collection, type Guild, PermissionFlagsBits } from "discord.js";
import { Hono } from "hono";
import { type ApiBindings } from "@api/context";
import { ApiProblem, badRequest, problemBody } from "@api/errors";
import { members } from "@api/routes/members";
import { type Env } from "@config/env";
import { type TestifyClient } from "@core/client";
import { UserFacingError } from "@core/errors";
import { recordAudit } from "@database/repositories/dashboardAuditRepository";
import { warningCounts } from "@database/repositories/moderationRepository";
import { recordCase } from "@lib/moderation/caseActions.util";
import { type BulkResult, DIRECTORY_LIMITS, type DirectoryPage } from "@testify/shared";

jest.mock("@database/repositories/dashboardAuditRepository", () => ({ recordAudit: jest.fn(() => Promise.resolve()) }));
jest.mock("@database/repositories/moderationRepository", () => ({
	warningCounts: jest.fn(() => Promise.resolve(new Map())),
}));
jest.mock("@lib/moderation/caseActions.util", () => ({
	...jest.requireActual<object>("@lib/moderation/caseActions.util"),
	recordCase: jest.fn(() => Promise.resolve(null)),
}));

const GUILD = "900000000000000001";
const ACTOR = "100000000000000010";
const OWNER = "100000000000000020";
const BOT = "100000000000000030";
const LOW = ["100000000000000041", "100000000000000042", "100000000000000043"];
const HIGH = "100000000000000050";
const STUBBORN = "100000000000000060";
const RAISED = "300000000000000001";
const ABOVE = "300000000000000002";

const audited = jest.mocked(recordAudit);
const kicked: string[] = [];

interface Scene {
	holds?: bigint[];
	extra?: number;
}

function memberOf(
	guild: Guild,
	id: string,
	position: number,
	options: { bot?: boolean; kick?: () => Promise<void> } = {},
) {
	const roles = new Collection<string, { id: string; position: number }>(
		id === LOW[0] ? [[RAISED, { id: RAISED, position: 3 }]] : [],
	);
	return {
		id,
		guild,
		displayName: `name-${id.slice(-2)}`,
		user: { id, username: `user-${id.slice(-2)}`, bot: options.bot ?? false, send: () => Promise.resolve() },
		joinedAt: new Date("2026-10-01T00:00:00.000Z"),
		joinedTimestamp: Date.parse("2026-10-01T00:00:00.000Z"),
		communicationDisabledUntilTimestamp: null,
		kickable: true,
		bannable: true,
		moderatable: true,
		kick: jest.fn(() => {
			kicked.push(id);
			return options.kick?.() ?? Promise.resolve();
		}),
		timeout: jest.fn(() => Promise.resolve()),
		roles: {
			highest: { position },
			cache: roles,
			add: jest.fn((roleId: string) => {
				roles.set(roleId, { id: roleId, position: 3 });
				return Promise.resolve();
			}),
			remove: jest.fn(() => Promise.resolve()),
		},
		permissions: { has: (_flags: bigint | bigint[]) => true },
		displayAvatarURL: () => `https://cdn.discordapp.com/avatars/${id}.png`,
	};
}

function app({ holds, extra = 0 }: Scene = {}): Hono<ApiBindings> {
	const shape: Record<string, unknown> = { id: GUILD, name: "Test Server", ownerId: OWNER, memberCount: 8 };
	const guild = shape as unknown as Guild;
	const everyone = [
		memberOf(guild, ACTOR, 10),
		memberOf(guild, OWNER, 30),
		memberOf(guild, BOT, 20, { bot: true }),
		...LOW.map((id) => memberOf(guild, id, 1)),
		memberOf(guild, HIGH, 15),
		memberOf(guild, STUBBORN, 1, { kick: () => Promise.reject(new Error("Missing Permissions")) }),
		...Array.from({ length: extra }, (_, index) => memberOf(guild, `2000000000000${String(10_000 + index)}`, 1)),
	];
	const actor = everyone[0]!;
	if (holds !== undefined) {
		actor.permissions = { has: (flags: bigint | bigint[]) => [flags].flat().every((flag) => holds.includes(flag)) };
	}
	const byId = new Map(everyone.map((member) => [member.id, member]));

	shape.roles = {
		cache: new Collection([
			[GUILD, { id: GUILD, name: "@everyone", position: 0, managed: false, hexColor: "#000000" }],
			[RAISED, { id: RAISED, name: "Regulars", position: 3, managed: false, hexColor: "#336699" }],
			[ABOVE, { id: ABOVE, name: "Admins", position: 12, managed: false, hexColor: "#000000" }],
		]),
		everyone: { id: GUILD },
	};
	shape.members = {
		me: byId.get(BOT),
		ban: jest.fn(() => Promise.resolve()),
		list: jest.fn(({ after, limit }: { after?: string; limit: number }) => {
			const sorted = [...everyone].sort((a, b) => (BigInt(a.id) < BigInt(b.id) ? -1 : 1));
			const page = sorted.filter((member) => after === undefined || BigInt(member.id) > BigInt(after)).slice(0, limit);
			return Promise.resolve(new Collection(page.map((member) => [member.id, member])));
		}),
		search: jest.fn(() => Promise.resolve(new Collection([[LOW[1]!, byId.get(LOW[1]!)]]))),
		fetch: jest.fn((query: string | { user: string | string[] }) => {
			if (typeof query !== "string" && Array.isArray(query.user)) {
				const found = query.user.flatMap((id) => [byId.get(id)].filter((member) => member !== undefined));
				return Promise.resolve(new Collection(found.map((member) => [member.id, member])));
			}
			const found = byId.get(typeof query === "string" ? query : String(query.user));
			return found === undefined ? Promise.reject(new Error("Unknown Member")) : Promise.resolve(found);
		}),
	};
	shape.bans = { fetch: () => Promise.reject(new Error("none")) };

	const client = {
		user: { id: BOT },
		guilds: { cache: new Collection([[GUILD, guild]]) },
		isOwner: () => false,
		logger: { error: jest.fn(), debug: jest.fn() },
	} as unknown as TestifyClient;
	shape.client = client;

	const instance = new Hono<ApiBindings>();
	instance.use("*", async (context, next) => {
		context.set("client", client);
		context.set("env", {} as Env);
		context.set("oauth", null);
		context.set("session", { _id: "s", userId: ACTOR, username: "user-10" } as never);
		await next();
	});
	instance.route("/guilds/:guildId/members", members);
	instance.onError((error) => {
		const problem =
			error instanceof ApiProblem
				? error
				: error instanceof UserFacingError
					? badRequest(error.message)
					: new ApiProblem(500, "internal", String(error));
		return Response.json(problemBody(problem), { status: problem.status });
	});

	return instance;
}

async function ask(method: string, path: string, body?: unknown, scene?: Scene): Promise<Response> {
	return app(scene).request(`/guilds/${GUILD}/members${path}`, {
		method,
		headers: { "content-type": "application/json" },
		...(body === undefined ? {} : { body: JSON.stringify(body) }),
	});
}

beforeEach(() => {
	audited.mockClear();
	jest.mocked(recordCase).mockClear();
	kicked.length = 0;
});

describe("GET /members", () => {
	it("lists the server's members a page at a time, in Discord's order, with what the reader may do", async () => {
		const page = (await (await ask("GET", "")).json()) as DirectoryPage;

		expect(page.rows.map((row) => row.userId)).toEqual([ACTOR, OWNER, BOT, ...LOW, HIGH, STUBBORN]);
		expect(page.next).toBeNull();
		expect(page.can).toEqual({ roles: true, timeout: true, warn: true, kick: true, ban: true });
		expect(page.rows.find((row) => row.userId === LOW[0])).toMatchObject({
			roleIds: [RAISED],
			warnings: 0,
			block: null,
		});
		expect(page.rows.find((row) => row.userId === HIGH)?.block).toBe("outranked");
		expect(page.grantable).toEqual([RAISED]);
	});

	it("filters by role and by bots, and searches by name or by ID", async () => {
		const byRole = (await (await ask("GET", `?roleId=${RAISED}`)).json()) as DirectoryPage;
		const bots = (await (await ask("GET", "?kind=bots")).json()) as DirectoryPage;
		const named = (await (await ask("GET", "?q=user")).json()) as DirectoryPage;
		const byId = (await (await ask("GET", `?q=%3C%40${HIGH}%3E`)).json()) as DirectoryPage;

		expect(byRole.rows.map((row) => row.userId)).toEqual([LOW[0]]);
		expect(bots.rows.map((row) => row.userId)).toEqual([BOT]);
		expect(named.rows.map((row) => row.userId)).toEqual([LOW[1]]);
		expect(byId.rows.map((row) => row.userId)).toEqual([HIGH]);
	});

	it("hands back a cursor when there is more, and the next page starts after it", async () => {
		const first = (await (
			await ask("GET", "", undefined, { extra: DIRECTORY_LIMITS.pageSize })
		).json()) as DirectoryPage;
		const second = (await (
			await ask("GET", `?after=${first.next ?? ""}`, undefined, { extra: DIRECTORY_LIMITS.pageSize })
		).json()) as DirectoryPage;

		expect(first.rows).toHaveLength(DIRECTORY_LIMITS.pageSize);
		expect(second.rows).toHaveLength(8);
		expect(second.next).toBeNull();
		expect(new Set([...first.rows, ...second.rows].map((row) => row.userId)).size).toBe(DIRECTORY_LIMITS.pageSize + 8);
	});

	/** Warnings are what `/warn list` shows, so a reader without Moderate Members sees no counts and cannot filter by them. */
	it("shows warnings only to Moderate Members", async () => {
		jest.mocked(warningCounts).mockResolvedValueOnce(new Map([[LOW[2]!, 3]]));
		const holds = [PermissionFlagsBits.ManageGuild];
		const warned = (await (await ask("GET", "?warned=1")).json()) as DirectoryPage;
		const plain = (await (await ask("GET", "", undefined, { holds })).json()) as DirectoryPage;

		expect(warned.rows.map((row) => [row.userId, row.warnings])).toEqual([[LOW[2], 3]]);
		expect(plain.rows.every((row) => row.warnings === null)).toBe(true);
		expect(plain.can).toEqual({ roles: false, timeout: false, warn: false, kick: false, ban: false });
		expect((await ask("GET", "?warned=1", undefined, { holds })).status).toBe(403);
	});
});

describe("POST /members/bulk/kick", () => {
	const everybody = [ACTOR, OWNER, BOT, HIGH, STUBBORN, ...LOW];

	it("asks for the number of members typed back, and the username for one", async () => {
		expect((await ask("POST", "/bulk/kick", { userIds: LOW, reason: "spam", confirm: "2" })).status).toBe(400);
		expect((await ask("POST", "/bulk/kick", { userIds: [LOW[0]], reason: "spam", confirm: "1" })).status).toBe(400);
		expect((await ask("POST", "/bulk/kick", { userIds: [LOW[0]], reason: "spam", confirm: "user-41" })).status).toBe(
			200,
		);
		expect(kicked).toEqual([LOW[0]]);
	});

	/** One request reaches many people, so the reader, the owner and the bot are never acted on even when ticked. */
	it("skips the reader, the owner, the bot and anybody above the reader, and carries on past a refusal", async () => {
		const response = await ask("POST", "/bulk/kick", {
			userIds: everybody,
			reason: "spam",
			confirm: String(everybody.length),
		});
		const { outcomes } = (await response.json()) as BulkResult;

		expect(Object.fromEntries(outcomes.map((o) => [o.userId, o.skipped]))).toEqual({
			[ACTOR]: "you",
			[OWNER]: "owner",
			[BOT]: "bot",
			[HIGH]: "outranked",
			[STUBBORN]: "failed",
			[LOW[0]!]: null,
			[LOW[1]!]: null,
			[LOW[2]!]: null,
		});
		expect(kicked).toEqual([STUBBORN, ...LOW]);
		expect(recordCase).toHaveBeenCalledTimes(3);
		expect(audited).toHaveBeenCalledTimes(1);
		expect(audited.mock.calls[0]?.[0]).toMatchObject({
			action: "member.kick.bulk",
			summary: "Kicked 3 members",
			after: { done: LOW.map((userId) => ({ userId, username: `user-${userId.slice(-2)}` })) },
		});
	});

	it("refuses more than a batch, the same member twice, and a reader without Kick Members", async () => {
		const tooMany = Array.from(
			{ length: DIRECTORY_LIMITS.maxBatch + 1 },
			(_, i) => `2000000000000${String(10_000 + i)}`,
		);
		const body = (userIds: string[]) => ({ userIds, reason: "spam", confirm: String(userIds.length) });

		expect((await ask("POST", "/bulk/kick", body(tooMany))).status).toBe(400);
		expect((await ask("POST", "/bulk/kick", body([LOW[0]!, LOW[0]!]))).status).toBe(400);
		expect((await ask("POST", "/bulk/kick", body(LOW), { holds: [PermissionFlagsBits.ManageGuild] })).status).toBe(403);
		expect(kicked).toEqual([]);
	});
});

describe("POST /members/bulk/roles", () => {
	/** Roles ask no role order of the member, as Discord asks none, but the reader, the owner and the bot are still left alone. */
	it("gives a role to those without it, says who already had it, and leaves the reader, owner and bot alone", async () => {
		const { outcomes } = (await (
			await ask("POST", "/bulk/roles", { userIds: [ACTOR, OWNER, BOT, ...LOW], roleId: RAISED, give: true })
		).json()) as BulkResult;

		expect(outcomes.map((o) => o.skipped)).toEqual(["you", "owner", "bot", "already", null, null]);
		expect(audited.mock.calls[0]?.[0]).toMatchObject({
			action: "member.roles.bulk",
			summary: "Gave Regulars to 2 members",
		});
	});

	it("refuses a role above the reader's own", async () => {
		const response = await ask("POST", "/bulk/roles", { userIds: LOW, roleId: ABOVE, give: true });

		expect(response.status).toBe(403);
		expect(audited).not.toHaveBeenCalled();
	});
});
