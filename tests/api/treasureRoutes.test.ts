import { Collection } from "discord.js";
import { Hono } from "hono";
import { type ApiBindings } from "@api/context";
import { ApiProblem, problemBody } from "@api/errors";
import { treasure } from "@api/routes/treasure";
import { type Env } from "@config/env";
import { type TestifyClient } from "@core/client";
import { recordAudit } from "@database/repositories/dashboardAuditRepository";
import { getTreasureConfig, saveTreasureConfig } from "@database/repositories/settingsRepository";
import { TREASURE_DEFAULTS, type TreasureSettings } from "@testify/shared";

jest.mock("@database/repositories/settingsRepository", () => ({
	getTreasureConfig: jest.fn(() => Promise.resolve(null)),
	saveTreasureConfig: jest.fn(() => Promise.resolve({})),
}));
jest.mock("@database/repositories/dashboardAuditRepository", () => ({ recordAudit: jest.fn(() => Promise.resolve()) }));

const GUILD = "900000000000000001";
const OWNER = "100000000000000001";

const stored = jest.mocked(getTreasureConfig);
const saved = jest.mocked(saveTreasureConfig);
const audited = jest.mocked(recordAudit);

function configured(overrides: Record<string, unknown> = {}): void {
	stored.mockResolvedValue({
		guildId: GUILD,
		isEnabled: true,
		minMessages: 20,
		maxMessages: 60,
		minAmount: 50,
		maxAmount: 900,
		cooldownMs: 600_000,
		createdBy: OWNER,
		lastModifiedBy: OWNER,
		createdAt: new Date(),
		updatedAt: new Date(),
		...overrides,
	});
}

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
	instance.route("/guilds/:guildId/treasure", treasure);
	instance.onError((error) => {
		const problem = error instanceof ApiProblem ? error : new ApiProblem(500, "internal", "boom");
		return Response.json(problemBody(problem), { status: problem.status });
	});

	return instance;
}

async function send(method: string, path = "", body?: unknown): Promise<Response> {
	return app().request(`/guilds/${GUILD}/treasure${path}`, {
		method,
		headers: { "content-type": "application/json" },
		...(body === undefined ? {} : { body: JSON.stringify(body) }),
	});
}

beforeEach(() => {
	jest.clearAllMocks();
	stored.mockResolvedValue(null);
});

describe("GET /treasure", () => {
	/** No record at all is how the bot stores "off", and a 404 would make the form unbuildable. */
	it("answers with the defaults a form can render when nothing is configured", async () => {
		const body = (await (await send("GET")).json()) as TreasureSettings;

		expect(body).toEqual({ ...TREASURE_DEFAULTS, enabled: false, configured: false });
	});

	it("reports what is stored", async () => {
		configured();

		const body = (await (await send("GET")).json()) as TreasureSettings;

		expect(body).toMatchObject({ enabled: true, minMessages: 20, maxAmount: 900, configured: true });
	});
});

describe("PATCH /treasure", () => {
	it("stores one field without disturbing the rest", async () => {
		configured();

		const response = await send("PATCH", "", { minAmount: 75 });

		expect(response.status).toBe(200);
		expect(saved).toHaveBeenCalledWith(GUILD, expect.objectContaining({ minAmount: 75, maxAmount: 900 }));
	});

	it("answers with the whole document, so the page cannot go half-stale", async () => {
		configured();

		const body = (await (await send("PATCH", "", { enabled: false })).json()) as TreasureSettings;

		expect(body).toMatchObject({ enabled: false, minMessages: 20, maxAmount: 900, configured: true });
	});

	/** Checking the patch alone would let one half of a pair through and store an impossible range. */
	it("refuses a half-pair that makes the merged range impossible", async () => {
		configured();

		const response = await send("PATCH", "", { minMessages: 90 });

		expect(response.status).toBe(400);
		expect(saved).not.toHaveBeenCalled();
	});

	it("refuses a value outside its bounds before it reaches the merge", async () => {
		configured();

		expect((await send("PATCH", "", { minMessages: 0 })).status).toBe(400);
		expect((await send("PATCH", "", { maxAmount: 1_000_000 })).status).toBe(400);
		expect((await send("PATCH", "", { cooldownMs: 1_000 })).status).toBe(400);
		expect(saved).not.toHaveBeenCalled();
	});

	it("writes an audit record naming what changed", async () => {
		configured();

		await send("PATCH", "", { enabled: false });

		expect(audited).toHaveBeenCalledWith(
			expect.objectContaining({ action: "treasure.update", summary: expect.stringContaining("off") }),
		);
	});
});

describe("POST /treasure/reset", () => {
	it("puts every number back to its default", async () => {
		configured();

		const response = await send("POST", "/reset");

		expect(response.status).toBe(200);
		expect(saved).toHaveBeenCalledWith(GUILD, expect.objectContaining(TREASURE_DEFAULTS));
	});

	/** Reset is about the numbers; a server that had drops running should still have them running. */
	it("leaves the switch where it was", async () => {
		configured({ isEnabled: true });

		const body = (await (await send("POST", "/reset")).json()) as TreasureSettings;

		expect(body.enabled).toBe(true);
		expect(saved).toHaveBeenCalledWith(GUILD, expect.objectContaining({ isEnabled: true }));
	});

	it("writes its own audit record", async () => {
		configured();

		await send("POST", "/reset");

		expect(audited).toHaveBeenCalledWith(expect.objectContaining({ action: "treasure.reset" }));
	});
});
