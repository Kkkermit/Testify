import { Collection } from "discord.js";
import { Hono } from "hono";
import { type ApiBindings } from "@api/context";
import { ApiProblem, problemBody } from "@api/errors";
import { auditLog } from "@api/routes/auditLog";
import { type Env } from "@config/env";
import { type TestifyClient } from "@core/client";
import { recordAudit } from "@database/repositories/dashboardAuditRepository";
import { disableAuditLog, getAuditLogConfig, setAuditLogConfig } from "@database/repositories/settingsRepository";
import { AUDIT_EVENTS, type AuditLogConfigResponse } from "@testify/shared";

jest.mock("@database/repositories/settingsRepository", () => ({
	disableAuditLog: jest.fn(() => Promise.resolve(true)),
	getAuditLogConfig: jest.fn(() => Promise.resolve(null)),
	setAuditLogConfig: jest.fn(() => Promise.resolve({})),
}));
jest.mock("@database/repositories/dashboardAuditRepository", () => ({ recordAudit: jest.fn(() => Promise.resolve()) }));

const GUILD = "900000000000000001";
const OWNER = "100000000000000001";
const CHANNEL = "400000000000000001";

const stored = jest.mocked(getAuditLogConfig);
const saved = jest.mocked(setAuditLogConfig);
const disabled = jest.mocked(disableAuditLog);
const audited = jest.mocked(recordAudit);

function app(): Hono<ApiBindings> {
	const guild = { id: GUILD, name: "Test Server" };
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
	instance.route("/guilds/:guildId/audit-log", auditLog);
	instance.onError((error) => {
		const problem = error instanceof ApiProblem ? error : new ApiProblem(500, "internal", "boom");
		return Response.json(problemBody(problem), { status: problem.status });
	});

	return instance;
}

async function send(method: string, body?: unknown): Promise<Response> {
	return app().request(`/guilds/${GUILD}/audit-log`, {
		method,
		headers: { "content-type": "application/json" },
		...(body === undefined ? {} : { body: JSON.stringify(body) }),
	});
}

async function bodyOf(response: Response): Promise<AuditLogConfigResponse> {
	return (await response.json()) as AuditLogConfigResponse;
}

function configured(enabledLogs: string[] = ["all"]): void {
	stored.mockResolvedValue({ guildId: GUILD, channelId: CHANNEL, enabledLogs } as never);
}

beforeEach(() => {
	jest.clearAllMocks();
	stored.mockResolvedValue(null);
});

describe("reading the configuration", () => {
	/** The bot stores "off" as no record at all, so a form still needs something to render. */
	it("gives an unconfigured guild something to render rather than a 404", async () => {
		const config = await bodyOf(await send("GET"));

		expect(config.enabled).toBe(false);
		expect(config.channelId).toBeNull();
		expect(config.events).toHaveLength(AUDIT_EVENTS.length);
	});

	/** `all` is a shorthand for every event; a checklist has to tick them individually. */
	it("expands the all shorthand into every event", async () => {
		configured(["all"]);

		const config = await bodyOf(await send("GET"));

		expect(config).toMatchObject({ enabled: true, channelId: CHANNEL, all: true });
		expect(config.events).toEqual([...AUDIT_EVENTS]);
	});

	it("reports a partial selection as chosen rather than all", async () => {
		configured(["banAdd", "roleCreate"]);

		const config = await bodyOf(await send("GET"));

		expect(config.events).toEqual(["banAdd", "roleCreate"]);
		expect(config.all).toBe(false);
	});

	/** A stored name that no longer exists must not reach the browser as an unknown checkbox. */
	it("drops an event the bot no longer has", async () => {
		configured(["banAdd", "somethingRemoved"]);

		expect((await bodyOf(await send("GET"))).events).toEqual(["banAdd"]);
	});
});

describe("saving the configuration", () => {
	it("writes the chosen channel and events", async () => {
		await send("PUT", { enabled: true, channelId: CHANNEL, events: ["banAdd", "roleCreate"] });

		expect(saved).toHaveBeenCalledWith(GUILD, CHANNEL, ["banAdd", "roleCreate"]);
	});

	/** Storing every name would freeze the guild at today's list; `all` keeps it opted in to later ones. */
	it("collapses a full selection back to the all shorthand", async () => {
		await send("PUT", { enabled: true, channelId: CHANNEL, events: [...AUDIT_EVENTS] });

		expect(saved).toHaveBeenCalledWith(GUILD, CHANNEL, ["all"]);
	});

	it("deletes the record when logging is turned off", async () => {
		configured();

		await send("PUT", { enabled: false, channelId: CHANNEL, events: [] });

		expect(disabled).toHaveBeenCalledWith(GUILD);
		expect(saved).not.toHaveBeenCalled();
	});

	/** The stored record requires a channel, and a log with nowhere to post is not a configuration. */
	it("refuses to turn logging on before a channel is chosen", async () => {
		const response = await send("PUT", { enabled: true, channelId: null, events: ["banAdd"] });

		expect(response.status).toBe(400);
		expect(saved).not.toHaveBeenCalled();
	});

	it("rejects an event name the bot cannot log", async () => {
		const response = await send("PUT", { enabled: true, channelId: CHANNEL, events: ["dropDatabase"] });

		expect(response.status).toBe(400);
		expect(saved).not.toHaveBeenCalled();
	});

	it("rejects a channel id that is not a snowflake", async () => {
		expect((await send("PUT", { enabled: true, channelId: "../../etc/passwd", events: [] })).status).toBe(400);
	});

	/** A partial body would let one field's absence mean "leave it", which is not what a whole-list PUT means. */
	it("rejects a body that omits a field", async () => {
		expect((await send("PUT", { enabled: true })).status).toBe(400);
	});

	/** Every mutation is recorded, and the summary is what the overview's recent-changes card reads. */
	it("writes an audit record saying what changed", async () => {
		configured();

		await send("PUT", { enabled: false, channelId: CHANNEL, events: [] });

		expect(audited).toHaveBeenCalledWith(
			expect.objectContaining({ action: "audit-log.update", summary: "Turned audit logging off" }),
		);
	});
});
