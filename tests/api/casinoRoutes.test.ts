import { Collection } from "discord.js";
import { Hono } from "hono";
import { type ApiBindings } from "@api/context";
import { ApiProblem, problemBody } from "@api/errors";
import { casino } from "@api/routes/casino";
import { type Env } from "@config/env";
import { type TestifyClient } from "@core/client";
import { getCasinoSettings, saveCasinoSettings } from "@database/repositories/casinoRepository";
import { recordAudit } from "@database/repositories/dashboardAuditRepository";
import { type CasinoSettings } from "@testify/shared";

jest.mock("@database/repositories/casinoRepository", () => ({
	getCasinoSettings: jest.fn(() => Promise.resolve(null)),
	saveCasinoSettings: jest.fn(() => Promise.resolve()),
}));
jest.mock("@database/repositories/dashboardAuditRepository", () => ({ recordAudit: jest.fn(() => Promise.resolve()) }));

const GUILD = "900000000000000001";
const OWNER = "100000000000000001";

const stored = jest.mocked(getCasinoSettings);
const saved = jest.mocked(saveCasinoSettings);

function app(): Hono<ApiBindings> {
	const guild = { id: GUILD, name: "Test Server", members: { me: {} } };
	const client = {
		guilds: { cache: new Collection<string, unknown>([[GUILD, guild]]) },
		isOwner: (id: string) => id === OWNER,
		logger: { error: jest.fn() },
	} as unknown as TestifyClient;

	const instance = new Hono<ApiBindings>();
	instance.use("*", async (context, next) => {
		context.set("client", client);
		context.set("env", {} as Env);
		context.set("oauth", null);
		context.set("session", { _id: "s", userId: OWNER, username: "someone" } as never);
		await next();
	});
	instance.route("/guilds/:guildId/casino", casino);
	instance.onError((error) => {
		const problem = error instanceof ApiProblem ? error : new ApiProblem(500, "internal", "boom");
		return Response.json(problemBody(problem), { status: problem.status });
	});

	return instance;
}

async function send(method: string, body?: unknown): Promise<Response> {
	return app().request(`/guilds/${GUILD}/casino`, {
		method,
		headers: { "content-type": "application/json" },
		...(body === undefined ? {} : { body: JSON.stringify(body) }),
	});
}

beforeEach(() => {
	jest.clearAllMocks();
	stored.mockResolvedValue(null);
});

describe("GET /casino", () => {
	it("answers with every game open for a server that has never set it", async () => {
		const body = (await (await send("GET")).json()) as CasinoSettings;

		expect(body).toMatchObject({ enabled: true, minBet: 1, maxBet: null, configured: false });
		expect(Object.values(body.games).every(Boolean)).toBe(true);
	});

	it("reports what is stored", async () => {
		stored.mockResolvedValue({ enabled: false, disabledGames: ["dice"], minBet: 25, maxBet: 5_000 });
		const body = (await (await send("GET")).json()) as CasinoSettings;

		expect(body).toMatchObject({ enabled: false, minBet: 25, maxBet: 5_000, configured: true });
		expect(body.games.dice).toBe(false);
	});
});

describe("PATCH /casino", () => {
	it("closes the casino and records who did it", async () => {
		const response = await send("PATCH", { enabled: false });

		expect(response.status).toBe(200);
		expect(saved).toHaveBeenCalledWith(GUILD, expect.objectContaining({ enabled: false }), OWNER);
		expect(jest.mocked(recordAudit)).toHaveBeenCalledWith(expect.objectContaining({ summary: "Closed the casino" }));
	});

	it("switches one game off and stores only what is off", async () => {
		await send("PATCH", { games: { slots: false } });

		expect(saved).toHaveBeenCalledWith(GUILD, expect.objectContaining({ disabledGames: ["slots"] }), OWNER);
	});

	/** A hand-written request naming a game the bot does not have must not reach the stored record. */
	it("drops a game nobody offers", async () => {
		await send("PATCH", { games: { poker: false } });

		expect(saved).toHaveBeenCalledWith(GUILD, expect.objectContaining({ disabledGames: [] }), OWNER);
	});

	it("sets both limits, and a null ceiling for none", async () => {
		await send("PATCH", { minBet: 10, maxBet: null });

		expect(saved).toHaveBeenCalledWith(GUILD, expect.objectContaining({ minBet: 10, maxBet: null }), OWNER);
	});

	/** The pair is checked against what is stored, because a request can carry only one half of it. */
	it("refuses a ceiling below the floor already stored", async () => {
		stored.mockResolvedValue({ enabled: true, disabledGames: [], minBet: 500, maxBet: null });
		const response = await send("PATCH", { maxBet: 100 });

		expect(response.status).toBe(400);
		expect(saved).not.toHaveBeenCalled();
	});

	it.each([
		["a bet below one", { minBet: 0 }],
		["a fractional bet", { minBet: 2.5 }],
		["a switch that is not a switch", { enabled: "yes" }],
	])("refuses %s", async (_, body) => {
		expect((await send("PATCH", body)).status).toBe(400);
		expect(saved).not.toHaveBeenCalled();
	});
});
