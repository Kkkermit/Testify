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
import { type OwnerGuildRow, type OwnerStats, type Paged } from "@testify/shared";

jest.mock("@database/connection", () => ({ databaseConnected: jest.fn(() => true) }));
jest.mock("@database/repositories/levelRepository", () => ({ getLevelSettings: jest.fn(() => Promise.resolve(null)) }));
jest.mock("@database/repositories/settingsRepository", () => ({
	getAuditLogConfig: jest.fn(() => Promise.resolve(null)),
	getCounting: jest.fn(() => Promise.resolve(null)),
	getWelcome: jest.fn(() => Promise.resolve(null)),
}));

const OWNER = "100000000000000001";
const MANAGER = "100000000000000002";

function fleet(size: number): Collection<string, unknown> {
	return new Collection(
		Array.from({ length: size }, (_, index) => [
			`90000000000000000${String(index)}`,
			{
				id: `90000000000000000${String(index)}`,
				name: `Server ${String(index)}`,
				memberCount: (index + 1) * 100,
				iconURL: () => null,
				joinedAt: new Date("2026-01-01T00:00:00.000Z"),
			},
		]),
	);
}

function appFor(size: number, userId = OWNER): Hono<ApiBindings> {
	const client = {
		guilds: { cache: fleet(size) },
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
