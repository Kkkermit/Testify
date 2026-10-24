import { Collection } from "discord.js";
import { Hono } from "hono";
import { type ApiBindings } from "@api/context";
import { ApiProblem, problemBody } from "@api/errors";
import { owner } from "@api/routes/owner";
import { type Env } from "@config/env";
import { type TestifyClient } from "@core/client";
import { databaseConnected } from "@database/connection";
import { getLevelSettings } from "@database/repositories/levelRepository";
import { getAuditLogConfig, getCounting, getWelcome } from "@database/repositories/settingsRepository";
import { dashboardTallies, guildTallies } from "@database/repositories/usageRepository";
import { type OwnerGuildRow, type OwnerStats, type Paged } from "@testify/shared";

jest.mock("@database/connection", () => ({ databaseConnected: jest.fn(() => true) }));
jest.mock("@database/repositories/levelRepository", () => ({ getLevelSettings: jest.fn(() => Promise.resolve(null)) }));
jest.mock("@database/repositories/settingsRepository", () => ({
	getAuditLogConfig: jest.fn(() => Promise.resolve(null)),
	getCounting: jest.fn(() => Promise.resolve(null)),
	getWelcome: jest.fn(() => Promise.resolve(null)),
}));
jest.mock("@database/repositories/usageRepository", () => ({
	guildTallies: jest.fn(() => Promise.resolve([])),
	dashboardTallies: jest.fn(() => Promise.resolve([])),
}));

const OWNER = "100000000000000001";
const MANAGER = "100000000000000002";

interface Spec {
	name: string;
	memberCount: number;
	joined: string;
}

function guildsOf(specs: Spec[]): Collection<string, unknown> {
	return new Collection(
		specs.map((spec, index) => {
			const id = `90000000000000000${String(index)}`;
			const joinedAt = new Date(spec.joined);
			return [id, { id, ...spec, iconURL: () => null, joinedAt, joinedTimestamp: joinedAt.getTime() }];
		}),
	);
}

function fleet(size: number): Collection<string, unknown> {
	return guildsOf(
		Array.from({ length: size }, (_, index) => ({
			name: `Server ${String(index)}`,
			memberCount: (index + 1) * 100,
			joined: "2026-01-01T00:00:00.000Z",
		})),
	);
}

function appFor(size: number | Collection<string, unknown>, userId = OWNER): Hono<ApiBindings> {
	const client = {
		guilds: { cache: typeof size === "number" ? fleet(size) : size },
		isOwner: (id: string) => id === OWNER,
		commands: { size: 76 },
		startedAt: Date.now() - 60_000,
	} as unknown as TestifyClient;

	const app = new Hono<ApiBindings>();
	app.use("*", async (context, next) => {
		context.set("client", client);
		context.set("env", {} as Env);
		context.set("oauth", null);
		context.set("session", { _id: "s", userId } as never);
		await next();
	});
	app.route("/owner", owner);
	app.onError((error) => {
		const problem = error instanceof ApiProblem ? error : new ApiProblem(500, "internal", "boom");
		return Response.json(problemBody(problem), { status: problem.status });
	});

	return app;
}

beforeEach(() => {
	jest.mocked(databaseConnected).mockReturnValue(true);
	jest.mocked(getLevelSettings).mockResolvedValue(null);
	jest.mocked(getAuditLogConfig).mockResolvedValue(null);
	jest.mocked(getCounting).mockResolvedValue(null);
	jest.mocked(getWelcome).mockResolvedValue(null);
	jest.mocked(guildTallies).mockResolvedValue([]);
	jest.mocked(dashboardTallies).mockResolvedValue([]);
});

describe("the owner stats", () => {
	it("totals the fleet", async () => {
		const body = (await (await appFor(3).request("/owner/stats")).json()) as OwnerStats;

		expect(body).toMatchObject({ guilds: 3, users: 600, commands: 76, database: "connected" });
		expect(body.uptimeMs).toBeGreaterThan(0);
	});

	it("says when the database is down", async () => {
		jest.mocked(databaseConnected).mockReturnValue(false);
		const body = (await (await appFor(1).request("/owner/stats")).json()) as OwnerStats;

		expect(body.database).toBe("disconnected");
	});

	/** The console can leave guilds and blacklist people; a manager must not learn it is here. */
	it("is a 404 for anyone who is not the bot owner", async () => {
		expect((await appFor(1, MANAGER).request("/owner/stats")).status).toBe(404);
	});
});

describe("the owner guild list", () => {
	it("lists the largest first, which is where a problem is worth most", async () => {
		const body = (await (await appFor(3).request("/owner/guilds")).json()) as Paged<OwnerGuildRow>;

		expect(body.items.map((guild) => guild.memberCount)).toEqual([300, 200, 100]);
	});

	it("pages, and reports the total so the pager knows how far it goes", async () => {
		const body = (await (await appFor(30).request("/owner/guilds?page=2&perPage=25")).json()) as Paged<OwnerGuildRow>;

		expect(body).toMatchObject({ total: 30, page: 2, perPage: 25 });
		expect(body.items).toHaveLength(5);
	});

	it("returns an empty page past the end rather than failing", async () => {
		const body = (await (await appFor(3).request("/owner/guilds?page=9")).json()) as Paged<OwnerGuildRow>;

		expect(body.items).toEqual([]);
	});

	/** The question this screen exists to answer: which of my servers has never configured anything. */
	it("says a server has nothing configured when it has nothing configured", async () => {
		const body = (await (await appFor(1).request("/owner/guilds")).json()) as Paged<OwnerGuildRow>;

		expect(body.items[0]?.configured).toEqual([]);
	});

	it("names what is configured when something is", async () => {
		jest.mocked(getLevelSettings).mockResolvedValue({ isDisabled: false } as never);
		jest.mocked(getCounting).mockResolvedValue({ guildId: "1" } as never);

		const body = (await (await appFor(1).request("/owner/guilds")).json()) as Paged<OwnerGuildRow>;

		expect(body.items[0]?.configured).toEqual(["levelling", "counting"]);
	});

	/** Levelling with a row in the database but switched off is not configured, it is switched off. */
	it("does not count a disabled feature as configured", async () => {
		jest.mocked(getLevelSettings).mockResolvedValue({ isDisabled: true } as never);

		const body = (await (await appFor(1).request("/owner/guilds")).json()) as Paged<OwnerGuildRow>;

		expect(body.items[0]?.configured).toEqual([]);
	});

	it("does not count audit logging with no events chosen", async () => {
		jest.mocked(getAuditLogConfig).mockResolvedValue({ enabledLogs: [] } as never);

		const body = (await (await appFor(1).request("/owner/guilds")).json()) as Paged<OwnerGuildRow>;

		expect(body.items[0]?.configured).toEqual([]);
	});

	it("refuses a page number that is not one", async () => {
		expect((await appFor(1).request("/owner/guilds?page=-1")).status).toBe(400);
	});

	it("is a 404 for anyone who is not the bot owner", async () => {
		expect((await appFor(1, MANAGER).request("/owner/guilds")).status).toBe(404);
	});
});

describe("sorting and searching the owner guild list", () => {
	// Joined, size and name each put these three in a different order, so every sort is told apart.
	const three = (): Collection<string, unknown> =>
		guildsOf([
			{ name: "Bravo", memberCount: 50, joined: "2026-03-01T00:00:00.000Z" },
			{ name: "alpha", memberCount: 900, joined: "2026-01-01T00:00:00.000Z" },
			{ name: "Charlie", memberCount: 300, joined: "2026-05-01T00:00:00.000Z" },
		]);

	async function names(query: string, guilds = three()): Promise<string[]> {
		const body = (await (await appFor(guilds).request(`/owner/guilds${query}`)).json()) as Paged<OwnerGuildRow>;
		return body.items.map((guild) => guild.name);
	}

	it.each([
		["members", ["alpha", "Charlie", "Bravo"]],
		["fewest", ["Bravo", "Charlie", "alpha"]],
		["newest", ["Charlie", "Bravo", "alpha"]],
		["oldest", ["alpha", "Bravo", "Charlie"]],
		["name", ["alpha", "Bravo", "Charlie"]],
	])("sorts by %s", async (sort, expected) => {
		expect(await names(`?sort=${sort}`)).toEqual(expected);
	});

	it("ranks by commands run, and by dashboard use, over the last 30 days", async () => {
		jest.mocked(guildTallies).mockResolvedValue([
			{ guildId: "900000000000000002", count: 40 },
			{ guildId: "900000000000000000", count: 7 },
		]);
		jest
			.mocked(dashboardTallies)
			.mockResolvedValue([{ guildId: "900000000000000000", count: 3, lastDay: "2026-08-01" }]);

		expect(await names("?sort=commands")).toEqual(["Charlie", "Bravo", "alpha"]);
		expect(await names("?sort=dashboard")).toEqual(["Bravo", "alpha", "Charlie"]);
		expect(guildTallies).toHaveBeenCalledWith(30);
		expect(dashboardTallies).toHaveBeenCalledWith(30);
	});

	it("carries each server's command and dashboard counts, zero when it has none", async () => {
		jest.mocked(guildTallies).mockResolvedValue([{ guildId: "900000000000000000", count: 7 }]);
		jest
			.mocked(dashboardTallies)
			.mockResolvedValue([{ guildId: "900000000000000000", count: 3, lastDay: "2026-08-01" }]);

		const body = (await (await appFor(three()).request("/owner/guilds?sort=fewest")).json()) as Paged<OwnerGuildRow>;

		expect(body.items.map(({ commands, dashboardViews }) => [commands, dashboardViews])).toEqual([
			[7, 3],
			[0, 0],
			[0, 0],
		]);
	});

	it("searches by any part of a name, ignoring case, and totals only the matches", async () => {
		const body = (await (await appFor(three()).request("/owner/guilds?q=AR")).json()) as Paged<OwnerGuildRow>;

		expect(body.items.map((guild) => guild.name)).toEqual(["Charlie"]);
		expect(body.total).toBe(1);
	});

	/** A pasted ID is that server and no other, even though its digits appear inside other IDs. */
	it("finds a server by its exact ID", async () => {
		expect(await names("?q=900000000000000001")).toEqual(["alpha"]);
		expect(await names("?q=90000000000000000")).toEqual([]);
	});

	/** Equally quiet servers come oldest first, since the bot has had longest to be used there. */
	it("puts the server that ran the fewest commands first, and the oldest of equals", async () => {
		expect(await names("?sort=quietest")).toEqual(["alpha", "Bravo", "Charlie"]);

		jest.mocked(guildTallies).mockResolvedValue([{ guildId: "900000000000000001", count: 3 }]);

		expect(await names("?sort=quietest")).toEqual(["Bravo", "Charlie", "alpha"]);
	});

	it("keeps only the servers that ran no command in the last 30 days", async () => {
		jest.mocked(guildTallies).mockResolvedValue([
			{ guildId: "900000000000000000", count: 7 },
			{ guildId: "900000000000000002", count: 0 },
		]);

		const body = (await (
			await appFor(three()).request("/owner/guilds?filter=inactive")
		).json()) as Paged<OwnerGuildRow>;

		expect(body.items.map((guild) => guild.name)).toEqual(["alpha", "Charlie"]);
		expect(body.total).toBe(2);
	});

	it("refuses a filter it does not offer", async () => {
		expect((await appFor(three()).request("/owner/guilds?filter=everything")).status).toBe(400);
	});

	it("refuses a sort it does not offer", async () => {
		expect((await appFor(three()).request("/owner/guilds?sort=random")).status).toBe(400);
	});
});
