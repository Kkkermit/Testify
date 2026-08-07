import { Collection } from "discord.js";
import { Hono } from "hono";
import { type ApiBindings } from "@api/context";
import { ApiProblem, problemBody } from "@api/errors";
import { lottery } from "@api/routes/lottery";
import { type Env } from "@config/env";
import { type TestifyClient } from "@core/client";
import { recordAudit } from "@database/repositories/dashboardAuditRepository";
import { deleteLottery, getLottery, saveLottery } from "@database/repositories/lotteryRepository";
import { type LotterySettings } from "@testify/shared";

jest.mock("@database/repositories/lotteryRepository", () => {
	const actual = jest.requireActual("@database/repositories/lotteryRepository");
	return {
		intervalFor: actual.intervalFor,
		getLottery: jest.fn(() => Promise.resolve(null)),
		saveLottery: jest.fn(() => Promise.resolve({})),
		deleteLottery: jest.fn(() => Promise.resolve(true)),
	};
});
jest.mock("@database/repositories/dashboardAuditRepository", () => ({ recordAudit: jest.fn(() => Promise.resolve()) }));

const GUILD = "900000000000000001";
const OWNER = "100000000000000001";
const CHANNEL = "400000000000000001";

const stored = jest.mocked(getLottery);
const saved = jest.mocked(saveLottery);
const removed = jest.mocked(deleteLottery);
const audited = jest.mocked(recordAudit);

function running(overrides: Record<string, unknown> = {}): void {
	stored.mockResolvedValue({
		guildId: GUILD,
		isActive: true,
		isFrozen: false,
		entryFee: 100,
		prizePool: 2_500,
		basePrizePool: 500,
		maxWinners: 2,
		frequency: "weekly",
		nextDrawTime: new Date("2026-08-14T12:00:00.000Z"),
		announcementChannelId: CHANNEL,
		createdBy: OWNER,
		lastModifiedBy: OWNER,
		entries: [{ userId: "1", userTag: "kate", tickets: 12, enteredAt: new Date() }],
		history: [],
		createdAt: new Date(),
		updatedAt: new Date(),
		...overrides,
	} as never);
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
	instance.route("/guilds/:guildId/lottery", lottery);
	instance.onError((error) => {
		const problem = error instanceof ApiProblem ? error : new ApiProblem(500, "internal", "boom");
		return Response.json(problemBody(problem), { status: problem.status });
	});

	return instance;
}

async function request(method: string, body?: unknown): Promise<Response> {
	return app().request(`/guilds/${GUILD}/lottery`, {
		method,
		headers: { "content-type": "application/json" },
		...(body === undefined ? {} : { body: JSON.stringify(body) }),
	});
}

beforeEach(() => {
	jest.clearAllMocks();
	stored.mockResolvedValue(null);
	removed.mockResolvedValue(true);
});

describe("GET /lottery", () => {
	it("answers with something a form can render before one exists", async () => {
		const body = (await (await request("GET")).json()) as LotterySettings;

		expect(body).toMatchObject({ enabled: false, announcementChannelId: null, prizePool: 0 });
	});

	it("reports the live pot and the tickets behind it", async () => {
		running();

		const body = (await (await request("GET")).json()) as LotterySettings;

		expect(body).toMatchObject({ enabled: true, prizePool: 2_500, ticketsSold: 12, entrants: 1 });
	});

	/** Entrant user IDs are not something a settings page needs; only the counts and the public winners are. */
	it("carries no user IDs", async () => {
		running();

		const raw = await (await request("GET")).text();

		expect(raw).not.toContain('"userId"');
	});
});

describe("PATCH /lottery", () => {
	it("refuses before a channel is chosen", async () => {
		const response = await request("PATCH", { entryFee: 100 });

		expect(response.status).toBe(400);
		expect(saved).not.toHaveBeenCalled();
	});

	it("starts the lottery when a complete configuration is saved", async () => {
		const response = await request("PATCH", { announcementChannelId: CHANNEL, entryFee: 100 });

		expect(response.status).toBe(200);
		expect(saved).toHaveBeenCalledWith(GUILD, expect.objectContaining({ isActive: true }));
	});

	it("refuses a value outside its bounds", async () => {
		running();

		expect((await request("PATCH", { maxWinners: 99 })).status).toBe(400);
		expect((await request("PATCH", { entryFee: 0 })).status).toBe(400);
		expect((await request("PATCH", { frequency: "fortnightly" })).status).toBe(400);
		expect(saved).not.toHaveBeenCalled();
	});

	it("freezes without disturbing the rest", async () => {
		running();

		const body = (await (await request("PATCH", { frozen: true })).json()) as LotterySettings;

		expect(body).toMatchObject({ frozen: true, entryFee: 100 });
	});

	it("names a freeze as a freeze in the audit record", async () => {
		running();

		await request("PATCH", { frozen: true });

		expect(audited).toHaveBeenCalledWith(
			expect.objectContaining({ action: "lottery.update", summary: expect.stringMatching(/froze/i) }),
		);
	});
});

describe("DELETE /lottery", () => {
	it("ends it and answers with the empty shape", async () => {
		running();

		const response = await request("DELETE");

		expect(response.status).toBe(200);
		expect(removed).toHaveBeenCalledWith(GUILD);
		expect(((await response.json()) as LotterySettings).enabled).toBe(false);
	});

	/** Two tabs, both pressing End: the second finds nothing, which is a 404 rather than a 500. */
	it("answers 404 when there was nothing to end", async () => {
		removed.mockResolvedValue(false);

		expect((await request("DELETE")).status).toBe(404);
		expect(audited).not.toHaveBeenCalled();
	});
});
